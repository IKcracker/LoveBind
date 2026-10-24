import { ConflictException, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { storage } from '../photos/photo.controller';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { age, preferenceAccepts } from './eligibility';
import { lockMemberPair, validateOtherMember } from './member-pair';
import type { Prisma } from '@prisma/client';
@Controller('discovery')
@UseGuards(AuthGuard)
export class DiscoveryController {
  constructor(private readonly db: PrismaService) {}
  private async eligible(id:string, db: Prisma.TransactionClient = this.db) {
    const u=await db.user.findUniqueOrThrow({where:{id},select:{
      status:true,adminApprovalStatus:true,profile:{select:{
        isVisible:true,birthDate:true,gender:true,city:true,relationshipGoal:true,photoReviewStatus:true,
      }},identityVerification:{select:{status:true,ageEvidenceStatus:true,ageVerifiedAt:true}},
      preferences:{select:{minAge:true,maxAge:true,preferredCities:true,relationshipGoals:true,partnerGenders:true}},
    }});
    if(u.status!=='ACTIVE' || u.adminApprovalStatus!=='APPROVED' ||
      u.identityVerification?.status!=='Approved' || u.identityVerification.ageEvidenceStatus!=='VERIFIED' || !u.identityVerification.ageVerifiedAt ||
      u.profile?.photoReviewStatus!=='APPROVED' || age(u.profile.birthDate)<18) {
      throw new ConflictException('Your account is awaiting full safety approval');
    }
    return u;
  }
  @Get()
  async browse(@Req() req:AuthenticatedRequest) {
    const me=await this.eligible(req.authUserId);
    if(!me.profile?.isVisible) return {needsOptIn:true,candidates:[]};
    const excluded=await this.db.block.findMany({where:{OR:[
      {blockerId:req.authUserId},{blockedId:req.authUserId}]},select:{blockerId:true,blockedId:true}});
    const blocked=new Set(excluded.flatMap(x=>[x.blockerId,x.blockedId]));
    const passes=await this.db.pass.findMany({where:{OR:[{fromId:req.authUserId},{toId:req.authUserId}]},select:{fromId:true,toId:true}});
    passes.forEach(p=>{blocked.add(p.fromId);blocked.add(p.toId);});
    const liked=await this.db.like.findMany({where:{fromId:req.authUserId},select:{toId:true}});
    const likedIds=new Set(liked.map(x=>x.toId));
    const priorMatches=await this.db.match.findMany({where:{OR:[{userAId:req.authUserId},{userBId:req.authUserId}]},select:{userAId:true,userBId:true}});
    priorMatches.forEach(m=>{blocked.add(m.userAId);blocked.add(m.userBId);});
    const fetchCandidates=(cursor?:string)=>this.db.user.findMany({where:{
      id:{notIn:[req.authUserId,...blocked,...likedIds]},status:'ACTIVE',adminApprovalStatus:'APPROVED',
      profile:{is:{isVisible:true,photoReviewStatus:'APPROVED'}},
      identityVerification:{is:{status:'Approved',ageEvidenceStatus:'VERIFIED',ageVerifiedAt:{not:null}}},
    },select:{id:true,profile:{select:{displayName:true,birthDate:true,gender:true,city:true,
      bio:true,occupation:true,relationshipGoal:true,interests:true,coreValues:true,photoObjectKey:true}},
      preferences:{select:{minAge:true,maxAge:true,preferredCities:true,relationshipGoals:true,partnerGenders:true}}},
      take:100,orderBy:[{createdAt:'desc'},{id:'asc'}],
      ...(cursor?{cursor:{id:cursor},skip:1}:{})});
    let batch=await fetchCandidates();
    const selected:typeof batch=[];
    while(batch.length) {
      selected.push(...batch.filter(c=>c.profile && preferenceAccepts(me.preferences,c.profile) &&
        !!me.profile && preferenceAccepts(c.preferences,me.profile)).slice(0,15-selected.length));
      if(selected.length>=15 || batch.length<100)break;
      batch=await fetchCandidates(batch[batch.length-1].id);
    }
    let signer:ReturnType<typeof storage>|null=null;
    const cards=await Promise.all(selected.map(async c=>{
      const p=c.profile!;
      let photoUrl:string|null=null;
      if(p.photoObjectKey) {
        try {
          signer??=storage();
          photoUrl=await getSignedUrl(signer.client,new GetObjectCommand({
            Bucket:signer.bucket,Key:p.photoObjectKey}),{expiresIn:120});
        }catch { photoUrl=null; }
      }
      return {id:c.id,name:p.displayName,age:age(p.birthDate),city:p.city,bio:p.bio,
        occupation:p.occupation,relationshipGoal:p.relationshipGoal,
        interests:p.interests,coreValues:p.coreValues,photoUrl};
    }));
    return {needsOptIn:false,candidates:cards};
  }
  @Get('likes')
  async receivedLikes(@Req() req:AuthenticatedRequest) {
    const me=await this.eligible(req.authUserId);
    if(!me.profile?.isVisible)return {likes:[]};
    const likes=await this.db.like.findMany({where:{toId:req.authUserId},
      select:{fromId:true,createdAt:true},orderBy:{createdAt:'desc'},take:80});
    const blocked=await this.db.block.findMany({where:{OR:[{blockerId:req.authUserId},{blockedId:req.authUserId}]},
      select:{blockerId:true,blockedId:true}});
    const excluded=new Set(blocked.flatMap(x=>[x.blockerId,x.blockedId]));
    const passes=await this.db.pass.findMany({where:{OR:[{fromId:req.authUserId},{toId:req.authUserId}]},select:{fromId:true,toId:true}});
    passes.forEach(p=>{excluded.add(p.fromId);excluded.add(p.toId);});
    const profiles=await this.db.user.findMany({where:{
      id:{in:likes.map(x=>x.fromId)},status:'ACTIVE',adminApprovalStatus:'APPROVED',
      identityVerification:{is:{status:'Approved',ageEvidenceStatus:'VERIFIED',ageVerifiedAt:{not:null}}},
      profile:{is:{isVisible:true,photoReviewStatus:'APPROVED'}},
    },select:{id:true,profile:{select:{displayName:true,city:true,birthDate:true,gender:true,relationshipGoal:true}},preferences:{select:{minAge:true,maxAge:true,preferredCities:true,relationshipGoals:true,partnerGenders:true}}}});
    const byId=new Map(profiles.map(x=>[x.id,x]));
    const previouslyLiked=await this.db.like.findMany({where:{fromId:req.authUserId,toId:{in:likes.map(x=>x.fromId)}},
      select:{toId:true}});
    const already=new Set(previouslyLiked.map(x=>x.toId));
    return {likes:likes.flatMap(l=>{
      const person=byId.get(l.fromId);
      const profile=person?.profile;
      if(!profile || excluded.has(l.fromId) || already.has(l.fromId) || !me.profile || !person ||
        !preferenceAccepts(me.preferences,profile) || !preferenceAccepts(person.preferences,me.profile))return [];
      return [{id:l.fromId,name:profile.displayName,city:profile.city,
        age:age(profile.birthDate),relationshipGoal:profile.relationshipGoal,receivedAt:l.createdAt}];
    })};
  }

  @Get('matches')
  async matches(@Req() req:AuthenticatedRequest) {
    await this.eligible(req.authUserId);
    const matches=await this.db.match.findMany({where:{
      status:'ACTIVE',OR:[{userAId:req.authUserId},{userBId:req.authUserId}]},
      select:{id:true,userAId:true,userBId:true,createdAt:true,
        conversation:{select:{id:true}},
      },orderBy:{createdAt:'desc'},take:40});
    const ids=matches.map(m=>m.userAId===req.authUserId?m.userBId:m.userAId);
    const people=await this.db.user.findMany({where:{id:{in:ids}},select:{
      id:true,status:true,adminApprovalStatus:true,
      profile:{select:{displayName:true,city:true,isVisible:true,photoReviewStatus:true}},
      identityVerification:{select:{status:true,ageEvidenceStatus:true,ageVerifiedAt:true}},
    }});
    const blocked=await this.db.block.findMany({where:{OR:[
      {blockerId:req.authUserId},{blockedId:req.authUserId}]},
      select:{blockerId:true,blockedId:true}});
    const exclude=new Set(blocked.flatMap(x=>[x.blockerId,x.blockedId]));
    const users=new Map(people.map(p=>[p.id,p]));
    return {matches:matches.flatMap(m=>{
      const otherId=m.userAId===req.authUserId?m.userBId:m.userAId;
      const person=users.get(otherId);
      if(!person || exclude.has(otherId) || person.status!=='ACTIVE' ||
        person.adminApprovalStatus!=='APPROVED' ||
        person.identityVerification?.status!=='Approved' ||
        person.identityVerification.ageEvidenceStatus!=='VERIFIED' ||
        person.profile?.photoReviewStatus!=='APPROVED' || !person.identityVerification.ageVerifiedAt) return [];
      return [{id:m.id,memberId:otherId,name:person.profile.displayName,
        city:person.profile.city,createdAt:m.createdAt,conversationId:m.conversation?.id??null}];
    })};
  }
  @Post(':id/pass')
  async pass(@Req() req:AuthenticatedRequest,@Param('id') id:string) {
    validateOtherMember(req.authUserId,id);
    return this.db.$transaction(async tx=>{
      await lockMemberPair(tx,req.authUserId,id);
      const me=await this.eligible(req.authUserId,tx);
      const target=await tx.profile.findUnique({where:{userId:id},select:{userId:true}});
      if(!me.profile?.isVisible || !target)throw new ConflictException('Profile not available');
      const [userAId,userBId]=[req.authUserId,id].sort();
      if(await tx.match.count({where:{userAId,userBId,status:'ACTIVE'}}))throw new ConflictException('Use unmatch to end this match');
      await tx.pass.upsert({where:{fromId_toId:{fromId:req.authUserId,toId:id}},
        create:{fromId:req.authUserId,toId:id},update:{}});
      await tx.like.deleteMany({where:{OR:[{fromId:req.authUserId,toId:id},{fromId:id,toId:req.authUserId}]}});
      return {passed:true};
    });
  }

  @Post(':id/like')
  async like(@Req() req:AuthenticatedRequest,@Param('id') id:string) {
    validateOtherMember(req.authUserId,id);
    return this.db.$transaction(async tx=>{
      await lockMemberPair(tx,req.authUserId,id);
      const me=await this.eligible(req.authUserId,tx);
      if(!me.profile?.isVisible)throw new ConflictException('Join discovery first');
      const other=await tx.user.findUnique({where:{id},select:{status:true,adminApprovalStatus:true,
        profile:{select:{isVisible:true,birthDate:true,gender:true,city:true,relationshipGoal:true,photoReviewStatus:true}},
        identityVerification:{select:{status:true,ageEvidenceStatus:true,ageVerifiedAt:true}},
        preferences:{select:{minAge:true,maxAge:true,preferredCities:true,relationshipGoals:true,partnerGenders:true}}}});
      if(!other || other.status!=='ACTIVE' || other.adminApprovalStatus!=='APPROVED' ||
        !other.profile?.isVisible || other.profile.photoReviewStatus!=='APPROVED' ||
        other.identityVerification?.status!=='Approved' || other.identityVerification.ageEvidenceStatus!=='VERIFIED' ||
        !other.identityVerification.ageVerifiedAt || !me.profile ||
        !preferenceAccepts(me.preferences,other.profile) ||
        !preferenceAccepts(other.preferences,me.profile))throw new ConflictException('This profile is not available');
      const block=await tx.block.count({where:{OR:[{blockerId:req.authUserId,blockedId:id},
        {blockerId:id,blockedId:req.authUserId}]}});
      const passes=await tx.pass.count({where:{OR:[{fromId:req.authUserId,toId:id},{fromId:id,toId:req.authUserId}]}});
      if(block || passes)throw new ConflictException('Profile not available');
      const [userAId,userBId]=[id,req.authUserId].sort();
      const existing=await tx.match.findUnique({where:{userAId_userBId:{userAId,userBId}}});
      if(existing?.status==='CLOSED')throw new ConflictException('This match has ended');
      await tx.like.upsert({where:{fromId_toId:{fromId:req.authUserId,toId:id}},
        create:{fromId:req.authUserId,toId:id},update:{}});
      const reciprocated=await tx.like.findUnique({where:{fromId_toId:{fromId:id,toId:req.authUserId}}});
      if(!reciprocated)return {matched:false};
      const match=await tx.match.upsert({where:{userAId_userBId:{userAId,userBId}},
        create:{userAId,userBId,status:'ACTIVE',conversation:{create:{}}},update:{},
        select:{id:true}});
      return {matched:true,matchId:match.id};
    });
  }
}
