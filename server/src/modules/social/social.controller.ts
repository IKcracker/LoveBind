import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { storage } from '../photos/photo.controller';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function age(birth: Date): number {
  const now = new Date();
  let years = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) years--;
  return years;
}
type Account = {status:string; identityVerification:{status:string}|null;
 profile:{ city:string|null; bio:string|null; relationshipGoal:string|null; photoReviewStatus:string;
 photoObjectKey:string|null;isVisible:boolean;birthDate:Date}|null};
function eligibility(user: Account) {
  const missing:string[]=[];
  if(user.status!=='ACTIVE'||user.identityVerification?.status!=='Approved')missing.push('identity');
  if(!user.profile?.city||!user.profile.bio||!user.profile.relationshipGoal)missing.push('profile');
  if(!user.profile?.photoObjectKey||user.profile.photoReviewStatus!=='APPROVED')missing.push('photo');
  if(user.profile&&age(user.profile.birthDate)<18)missing.push('age');
  return {ready:missing.length===0,missing};
}
function input(body:unknown):Record<string,unknown> {
  if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Expected a JSON object');
  return body as Record<string,unknown>;
}
function validId(value:unknown):string {
  if(typeof value!=='string'||value.length<10||value.length>100||!/^[A-Za-z0-9_-]+$/.test(value))
    throw new BadRequestException('Invalid member or match identifier');
  return value;
}
@Controller('social')
@UseGuards(AuthGuard)
export class SocialController {
 constructor(private readonly prisma:PrismaService){}
 private account(id:string) {
  return this.prisma.user.findUniqueOrThrow({where:{id},select:{
   status:true, identityVerification:{select:{status:true}},
   profile:{select:{city:true,bio:true,relationshipGoal:true,photoReviewStatus:true,
    photoObjectKey:true,isVisible:true,birthDate:true}},
  }});
 }
 private async ready(id:string) {
  const u=await this.account(id);
  if(!eligibility(u).ready)throw new ForbiddenException('Finish identity verification and profile photo review first');
  return u;
 }
 private async photo(key:string|null) {
  if(!key)return null;
  const {client,bucket}=storage();
  return getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:key}),{expiresIn:120});
 }
 @Get('access')
 async access(@Req() req:AuthenticatedRequest) {
  const u=await this.account(req.authUserId);
  return {...eligibility(u),visible:u.profile?.isVisible??false};
 }
 @Put('visibility')
 async visibility(@Req() req:AuthenticatedRequest,@Body() body:unknown) {
  const visible=input(body).visible;
  if(typeof visible!=='boolean')throw new BadRequestException('visible must be true or false');
  if(visible)await this.ready(req.authUserId);
  await this.prisma.profile.update({where:{userId:req.authUserId},data:{isVisible:visible}});
  return {visible};
 }
 @Get('discover')
 async discover(@Req() req:AuthenticatedRequest) {
  const viewer=await this.account(req.authUserId);
  const access={...eligibility(viewer),visible:viewer.profile?.isVisible??false};
  if(!access.ready||!access.visible)return {access,profiles:[]};
  const prefs=await this.prisma.partnerPreference.findUnique({where:{userId:req.authUserId}});
  const people=await this.prisma.user.findMany({
   where:{
    id:{not:req.authUserId},status:'ACTIVE',
    identityVerification:{is:{status:'Approved'}},
    profile:{is:{
     isVisible:true,photoReviewStatus:'APPROVED',photoObjectKey:{not:null},
     city:prefs?.preferredCities.length?{in:prefs.preferredCities}:{not:null},
     bio:{not:null},
     ...(prefs?.relationshipGoals.length?{relationshipGoal:{in:prefs.relationshipGoals}}:{}),
    }},
    blocksSent:{none:{blockedId:req.authUserId}},
    blocksReceived:{none:{blockerId:req.authUserId}},
    receivedLikes:{none:{fromId:req.authUserId}},
   },
   select:{id:true,profile:{select:{displayName:true,city:true,bio:true,
    birthDate:true,relationshipGoal:true,occupation:true,interests:true,
    coreValues:true,photoObjectKey:true}}},
   orderBy:{createdAt:'desc'},take:120,
  });
  const filtered=people.filter(p=>p.profile&&
    age(p.profile.birthDate)>=(prefs?.minAge??18)&&age(p.profile.birthDate)<=(prefs?.maxAge??100) &&
    age(p.profile.birthDate)>=18).slice(0,12);
  const profiles=await Promise.all(filtered.map(async p=>({
    id:p.id,displayName:p.profile!.displayName,age:age(p.profile!.birthDate),
    city:p.profile!.city,bio:p.profile!.bio,relationshipGoal:p.profile!.relationshipGoal,
    occupation:p.profile!.occupation,interests:p.profile!.interests,coreValues:p.profile!.coreValues,
    photoUrl:await this.photo(p.profile!.photoObjectKey),
  })));
  return {access,profiles};
 }
 @Post('likes')
 async like(@Req() req:AuthenticatedRequest,@Body() body:unknown) {
  const fromId=req.authUserId,toId=validId(input(body).toId);
  if(fromId===toId)throw new BadRequestException('Cannot like your own profile');
  const viewer=await this.ready(fromId);
  if(!viewer.profile?.isVisible)throw new ForbiddenException('Turn on discovery to like people');
  const [target,blocked]=await Promise.all([
    this.prisma.user.findUnique({where:{id:toId},select:{
     status:true,identityVerification:{select:{status:true}},
     profile:{select:{city:true,bio:true,relationshipGoal:true,photoReviewStatus:true,
      photoObjectKey:true,isVisible:true,birthDate:true}},
    }}),
    this.prisma.block.findFirst({where:{OR:[
     {blockerId:fromId,blockedId:toId},{blockerId:toId,blockedId:fromId},
    ]}}),
  ]);
  if(blocked||!target||!eligibility(target).ready||!target.profile?.isVisible)throw new NotFoundException('Member is unavailable');
  const [userAId,userBId]=[fromId,toId].sort();
  for(let attempt=0;attempt<3;attempt++){
   try{return await this.prisma.$transaction(async tx=>{
    await tx.like.upsert({where:{fromId_toId:{fromId,toId}},create:{fromId,toId},update:{}});
    const back=await tx.like.findUnique({where:{fromId_toId:{fromId:toId,toId:fromId}}});
    if(!back)return {matched:false,matchId:null};
    const match=await tx.match.upsert({where:{userAId_userBId:{userAId,userBId}},
      create:{userAId,userBId,status:'ACTIVE'},update:{status:'ACTIVE'}});
    await tx.conversation.upsert({where:{matchId:match.id},create:{matchId:match.id},update:{}});
    return {matched:true,matchId:match.id};
   },{isolationLevel:'Serializable'});}catch(e:unknown){
    if(attempt<2&&typeof e==='object'&&e!==null&&'code' in e&&e.code==='P2034')continue;
    throw e;
   }
  }
  throw new ForbiddenException('Please try again');
 }
 private async match(id:string,userId:string) {
  const m=await this.prisma.match.findUnique({where:{id}});
  if(!m||m.status!=='ACTIVE'||(m.userAId!==userId&&m.userBId!==userId))
    throw new NotFoundException('Match not available');
  const otherId=m.userAId===userId?m.userBId:m.userAId;
  const [other,block]=await Promise.all([
   this.account(otherId).catch(()=>null),
   this.prisma.block.findFirst({where:{OR:[
    {blockerId:userId,blockedId:otherId},{blockerId:otherId,blockedId:userId},
   ]}}),
  ]);
  if(!other||!eligibility(other).ready||block)throw new NotFoundException('Match not available');
  return m;
 }
 @Get('matches')
 async matches(@Req() req:AuthenticatedRequest) {
  await this.ready(req.authUserId);
  const rows=await this.prisma.match.findMany({where:{status:'ACTIVE',
   OR:[{userAId:req.authUserId},{userBId:req.authUserId}]},orderBy:{createdAt:'desc'},take:60});
  const output=[];
  for(const m of rows){
   const id=m.userAId===req.authUserId?m.userBId:m.userAId;
   const [other,blocked]=await Promise.all([
    this.prisma.user.findUnique({where:{id},select:{
     status:true,identityVerification:{select:{status:true}},
     profile:{select:{city:true,bio:true,relationshipGoal:true,photoReviewStatus:true,
      photoObjectKey:true,isVisible:true,birthDate:true,displayName:true}},
    }}),
    this.prisma.block.findFirst({where:{OR:[
     {blockerId:req.authUserId,blockedId:id},{blockerId:id,blockedId:req.authUserId},
    ]}}),
   ]);
   if(!other||!eligibility(other).ready||blocked)continue;
   output.push({id:m.id,memberId:id,name:other.profile!.displayName,city:other.profile!.city,
    createdAt:m.createdAt,photoUrl:await this.photo(other.profile!.photoObjectKey)});
  }
  return {matches:output};
 }
 @Get('matches/:matchId/messages')
 async messages(@Req() req:AuthenticatedRequest,@Param('matchId') id:string) {
  await this.ready(req.authUserId);
  const m=await this.match(validId(id),req.authUserId);
  const c=await this.prisma.conversation.findUnique({where:{matchId:m.id}});
  if(!c)return {messages:[]};
  const rows=await this.prisma.message.findMany({where:{conversationId:c.id},
   select:{id:true,senderId:true,content:true,createdAt:true},
   orderBy:{createdAt:'desc'},take:100});
  return {messages:rows.reverse()};
 }
 @Post('matches/:matchId/messages')
 async send(@Req() req:AuthenticatedRequest,@Param('matchId') id:string,@Body() body:unknown) {
  await this.ready(req.authUserId);
  const m=await this.match(validId(id),req.authUserId);
  const content=input(body).content;
  if(typeof content!=='string'||content.trim().length<1||content.trim().length>1500)
    throw new BadRequestException('Message must be 1-1500 characters');
  const c=await this.prisma.conversation.findUnique({where:{matchId:m.id}});
  if(!c)throw new NotFoundException('Conversation not available');
  const last=await this.prisma.message.findFirst({where:{conversationId:c.id,senderId:req.authUserId},
   select:{createdAt:true},orderBy:{createdAt:'desc'}});
  if(last&&Date.now()-last.createdAt.getTime()<2500)throw new BadRequestException('Please wait before sending another message');
  return this.prisma.message.create({data:{conversationId:c.id,senderId:req.authUserId,content:content.trim()},
   select:{id:true,senderId:true,content:true,createdAt:true}});
 }
 @Post('blocks')
 async block(@Req() req:AuthenticatedRequest,@Body() body:unknown) {
  const memberId=validId(input(body).memberId);
  if(memberId===req.authUserId)throw new BadRequestException('Cannot block yourself');
  if(!await this.prisma.user.findUnique({where:{id:memberId},select:{id:true}}))throw new NotFoundException('Member not found');
  await this.prisma.$transaction(async tx=>{
   await tx.block.upsert({where:{blockerId_blockedId:{blockerId:req.authUserId,blockedId:memberId}},
    create:{blockerId:req.authUserId,blockedId:memberId},update:{}});
   await tx.match.updateMany({where:{OR:[
    {userAId:req.authUserId,userBId:memberId},{userAId:memberId,userBId:req.authUserId},
   ]},data:{status:'CLOSED'}});
  });
  return {blocked:true};
 }
 @Post('reports')
 async report(@Req() req:AuthenticatedRequest,@Body() body:unknown) {
  const data=input(body),memberId=validId(data.memberId);
  if(memberId===req.authUserId)throw new BadRequestException('Cannot report yourself');
  if(!['HARASSMENT','SCAM','UNDERAGE','INAPPROPRIATE','OTHER'].includes(String(data.category)))
    throw new BadRequestException('Choose a valid report category');
  if(data.details!==undefined&&(typeof data.details!=='string'||data.details.length>1500))
    throw new BadRequestException('Report details must be under 1500 characters');
  if(!await this.prisma.user.findUnique({where:{id:memberId},select:{id:true}}))throw new NotFoundException('Member not found');
  await this.prisma.safetyReport.create({data:{reporterId:req.authUserId,reportedId:memberId,
   category:data.category as string,details:data.details as string|undefined}});
  return {submitted:true};
 }
}
