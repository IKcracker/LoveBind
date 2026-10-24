import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException,
  Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { lockMemberPair } from '../discovery/member-pair';
import { decryptQuizAnswer, encryptQuizAnswer } from './quiz-crypto';
import { QUESTIONS, QUIZ_VERSION, scoreAnswers, validAnswer, type Response } from './questions';

type DB=Prisma.TransactionClient|PrismaClient;
const identity={status:true,ageEvidenceStatus:true,ageVerifiedAt:true} as const;

@Controller('quizzes')
@UseGuards(AuthGuard)
export class QuizzesController {
  constructor(private readonly db: PrismaService) {}

  private async authorized(db: DB, matchId: string, viewer: string) {
    if(!/^[a-zA-Z0-9_-]{10,100}$/.test(matchId))throw new BadRequestException('Invalid match');
    const match=await db.match.findUnique({where:{id:matchId},select:{
      id:true,userAId:true,userBId:true,status:true}});
    if(!match||match.status!=='ACTIVE'||![match.userAId,match.userBId].includes(viewer))
      throw new NotFoundException('Quiz unavailable');
    const members=await db.user.findMany({where:{id:{in:[match.userAId,match.userBId]}},
      select:{id:true,status:true,adminApprovalStatus:true,
        profile:{select:{photoReviewStatus:true}},identityVerification:{select:identity}}});
    if(members.length!==2||members.some(m=>m.status!=='ACTIVE'||m.adminApprovalStatus!=='APPROVED'||
      m.profile?.photoReviewStatus!=='APPROVED' || m.identityVerification?.status!=='Approved'||
      m.identityVerification.ageEvidenceStatus!=='VERIFIED'||!m.identityVerification.ageVerifiedAt))
      throw new NotFoundException('Quiz unavailable');
    if(await db.block.count({where:{OR:[
      {blockerId:match.userAId,blockedId:match.userBId},
      {blockerId:match.userBId,blockedId:match.userAId},
    ]}}))throw new NotFoundException('Quiz unavailable');
    return {...match,otherId:match.userAId===viewer?match.userBId:match.userAId};
  }

  @Get('matches/:matchId')
  async view(@Req() req:AuthenticatedRequest,@Param('matchId') matchId:string) {
    const pair=await this.authorized(this.db,matchId,req.authUserId);
    const session=await this.db.quizSession.findFirst({where:{matchId},
      orderBy:[{createdAt:'desc'},{id:'desc'}],
      include:{answers:{select:{userId:true,questionId:true,ciphertext:true}},
        assessment:{select:{score:true,rubricVersion:true,summary:true}}}});
    const mine=session?.answers.filter(a=>a.userId===req.authUserId)??[];
    const theirs=session?.answers.filter(a=>a.userId===pair.otherId)??[];
    const result=session?.status==='COMPLETED'&&session.assessment?{
      score:session.assessment.score,rubricVersion:session.assessment.rubricVersion,
      summary:session.assessment.summary,
    }:null;
    return {matchId,version:QUIZ_VERSION,status:session?.status??'NOT_STARTED',
      sessionId:session?.id??null,questions:QUESTIONS,
      myAnswers:mine.map(x=>({questionId:x.questionId,value:decryptQuizAnswer(x.ciphertext)})),
      myProgress:mine.length,partnerProgress:theirs.length,
      total:QUESTIONS.length,result};
  }

  @Post('matches/:matchId/start')
  async start(@Req() req:AuthenticatedRequest,@Param('matchId') matchId:string) {
    await this.db.$transaction(async tx=>{
      const pair=await this.authorized(tx,matchId,req.authUserId);
      await lockMemberPair(tx,pair.userAId,pair.userBId);
      // A single versioned questionnaire per match; concurrent starts are serialized.
      const existing=await tx.quizSession.findFirst({where:{matchId},select:{id:true}});
      if(existing)return;
      const template=await tx.quizTemplate.upsert({where:{version:QUIZ_VERSION},
        update:{},create:{version:QUIZ_VERSION,questions:[...QUESTIONS],isActive:true},select:{id:true}});
      await tx.quizSession.create({data:{matchId,templateId:template.id,status:'PENDING'}});
    });
    return this.view(req,matchId);
  }

  @Put('matches/:matchId/answer')
  async answer(@Req() req:AuthenticatedRequest,@Param('matchId') matchId:string,@Body() body:unknown) {
    if(!validAnswer(body))throw new BadRequestException('Select one answer between 1 and 5 for a valid question');
    // Use the member-pair lock to serialize answer writes, completion and safety actions.
    await this.db.$transaction(async tx=>{
      const pair=await this.authorized(tx,matchId,req.authUserId);
      await lockMemberPair(tx,pair.userAId,pair.userBId);
      const session=await tx.quizSession.findFirst({where:{matchId},select:{id:true,status:true,
        template:{select:{version:true}}}});
      if(!session)throw new ConflictException('Start the compatibility quiz first');
      if(session.template.version!==QUIZ_VERSION)throw new ConflictException('Unsupported quiz version');
      if(session.status==='COMPLETED')throw new ConflictException('This quiz is already completed');
      const answer=body as Response;
      await tx.quizAnswer.upsert({
        where:{sessionId_userId_questionId:{sessionId:session.id,userId:req.authUserId,questionId:answer.questionId}},
        create:{sessionId:session.id,userId:req.authUserId,questionId:answer.questionId,
          ciphertext:encryptQuizAnswer(answer.value)},
        update:{ciphertext:encryptQuizAnswer(answer.value)},
      });
      const all=await tx.quizAnswer.findMany({where:{sessionId:session.id},
        select:{userId:true,questionId:true,ciphertext:true}});
      const mine=all.filter(a=>a.userId===req.authUserId);
      const other=all.filter(a=>a.userId===pair.otherId);
      if(mine.length===QUESTIONS.length&&other.length===QUESTIONS.length) {
        const result=scoreAnswers(
          mine.map(a=>({questionId:a.questionId,value:decryptQuizAnswer(a.ciphertext)})),
          other.map(a=>({questionId:a.questionId,value:decryptQuizAnswer(a.ciphertext)})));
        await tx.compatibilityAssessment.create({data:{sessionId:session.id,score:result.score,
          rubricVersion:result.rubricVersion,summary:{
            recommendation:result.recommendation,
            explanation:'Shared questionnaire preferences only; not a prediction of relationship success.',
            // Preview only. Payment quotes must be generated separately.
            suggestedCredits:result.suggestedCredits,
          }}});
        await tx.quizSession.update({where:{id:session.id},data:{
          status:'COMPLETED',completedAt:new Date()}});
      }else if(session.status==='PENDING'){
        await tx.quizSession.update({where:{id:session.id},data:{status:'IN_PROGRESS'}});
      }
    });
    return this.view(req,matchId);
  }
}
