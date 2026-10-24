import { ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { evaluateDiditAgeEvidence, reconcileAccount, summarizeDiditEvidence } from './activation';

const DIDIT = 'https://verification.didit.me/v3/session/';
const COOLDOWN_MS = 5 * 60 * 1000;
const KNOWN = ['Not Started','In Progress','In Review','Approved','Declined','Resubmitted','Awaiting User','Expired','Abandoned','Kyc Expired'];

@Injectable()
export class AgeRecheckService {
  constructor(private readonly prisma: PrismaService) {}

  async recheck(memberId: string, moderatorId: string, source: 'MANUAL'|'BATCH') {
    const key = process.env.DIDIT_API_KEY;
    if (!key?.trim()) throw new ServiceUnavailableException('Didit is not configured on this backend');
    const member = await this.prisma.user.findUnique({where:{id:memberId},
      select:{status:true,profile:{select:{birthDate:true}},identityVerification:{
        select:{providerSessionId:true,status:true,ageEvidenceStatus:true}}}});
    if (!member?.profile || !member.identityVerification || ['DELETED','SUSPENDED'].includes(member.status))
      throw new ConflictException('Member has no eligible existing verification session');

    // DB-backed per-member lock works across Render instances and prevents a stampede.
    const cutoff = new Date(Date.now()-COOLDOWN_MS);
    const claim = await this.prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${memberId}, 971))::text AS lock_acquired`;
      const recent=await tx.ageEvidenceRecheck.findFirst({where:{memberId,checkedAt:{gt:cutoff}},
        orderBy:{checkedAt:'desc'},select:{id:true}});
      if(recent)throw new ConflictException('Recently rechecked. Try again in five minutes');
      return tx.ageEvidenceRecheck.create({data:{memberId,moderatorId,source,
        previousStatus:member.identityVerification!.ageEvidenceStatus}});
    });
    try {
      const response=await fetch(DIDIT+encodeURIComponent(member.identityVerification.providerSessionId)+'/decision/',{
        headers:{'x-api-key':key},signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('Didit request failed');
      const payload:unknown=await response.json();
      if(!payload || typeof payload!=='object' || Array.isArray(payload))
        throw new Error('Didit returned an invalid decision response');
      const result=payload as Record<string,unknown>;
      const status=typeof result.status==='string'&&KNOWN.includes(result.status)?result.status:'In Review';
      const evidence=status==='Approved'
        ?evaluateDiditAgeEvidence(result,member.profile.birthDate)
        :{status:'PENDING' as const,issue:null};
      const ageVerifiedAt=evidence.status==='VERIFIED'?new Date():null;

      const outcome=await this.prisma.$transaction(async tx=>{
        // Never write an old session's decision into a replacement session.
        const current=await tx.identityVerification.findUnique({where:{userId:memberId},
          select:{providerSessionId:true}});
        if(current?.providerSessionId!==member.identityVerification!.providerSessionId)
          throw new ConflictException('Member verification session was replaced during recheck');
        if(evidence.status!=='VERIFIED') {
          await tx.user.update({where:{id:memberId},data:{adminApprovalStatus:'PENDING'}});
        }
        await tx.identityVerification.update({where:{userId:memberId},
          data:{status,ageEvidenceStatus:evidence.status,
            ageVerifiedAt,lastCheckedAt:new Date()}});
        const accountActive=await reconcileAccount(tx,memberId);
        await tx.ageEvidenceRecheck.update({where:{id:claim.id},data:{
          outcome:'COMPLETED',resultStatus:evidence.status,issue:evidence.issue,completedAt:new Date()}});
        return {status,ageEvidenceStatus:evidence.status,ageEvidenceIssue:evidence.issue,accountActive};
      });
      return {memberId,...outcome};
    }catch(error){
      await this.prisma.ageEvidenceRecheck.update({where:{id:claim.id},data:{
        outcome:'FAILED',issue:'PROVIDER_OR_SESSION_ERROR',completedAt:new Date(),
      }}).catch(()=>undefined);
      throw error instanceof ConflictException ? error :
        new ServiceUnavailableException('Age recheck failed. Existing evidence remains unchanged.');
    }
  }

  async batch(moderatorId:string) {
    // One operator action = at most five provider calls. Must be repeated manually.
    const candidates=await this.prisma.identityVerification.findMany({
      where:{status:'Approved',ageEvidenceStatus:{in:['PENDING','CHECKS_INCOMPLETE','MISSING']},
        user:{status:'PENDING',profile:{isNot:null}}},
      orderBy:{lastCheckedAt:'asc'},take:20,select:{userId:true}});
    const results:{memberId:string;result:string;issue?:string|null}[]=[];
    for(const candidate of candidates) {
      if(results.length>=5)break;
      try {
        const out=await this.recheck(candidate.userId,moderatorId,'BATCH');
        results.push({memberId:candidate.userId,result:out.ageEvidenceStatus,issue:out.ageEvidenceIssue});
      }catch(error) {
        if(error instanceof ConflictException && error.message.includes('Recently rechecked'))continue;
        results.push({memberId:candidate.userId,result:'FAILED'});
      }
    }
    return {processed:results.length,results,maxPerRequest:5};
  }

  async diagnose(memberId: string) {
    const key=process.env.DIDIT_API_KEY;
    if(!key?.trim())throw new ServiceUnavailableException('Didit is not configured');
    const member=await this.prisma.user.findUnique({where:{id:memberId},
      select:{identityVerification:{select:{providerSessionId:true}}}});
    if(!member?.identityVerification)throw new ConflictException('No existing Didit session');
    const res=await fetch(DIDIT+encodeURIComponent(member.identityVerification.providerSessionId)+'/decision/',{
      headers:{'x-api-key':key},signal:AbortSignal.timeout(15000),
    }).catch(()=>{throw new ServiceUnavailableException('Didit is unavailable');});
    if(!res.ok)throw new ServiceUnavailableException('Didit decision unavailable');
    const payload:unknown=await res.json();
    // Report only presence counts, not names, DOB, provider IDs or biometric data.
    return summarizeDiditEvidence(payload,process.env.DIDIT_WORKFLOW_ID);
  }

  async history(memberId:string) {
    return this.prisma.ageEvidenceRecheck.findMany({where:{memberId},
      select:{id:true,source:true,outcome:true,previousStatus:true,resultStatus:true,
        issue:true,checkedAt:true,completedAt:true},
      orderBy:{checkedAt:'desc'},take:15});
  }
}
