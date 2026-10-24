const configured = import.meta.env.VITE_API_URL as string | undefined;
export const baseUrl = (configured?.trim() || 'http://localhost:4000').replace(/\/$/, '');
const configurationError = !configured?.trim() && typeof window !== 'undefined' &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'Admin API URL is not configured. Set VITE_API_URL to the HTTPS backend origin in the frontend deployment settings, then rebuild the CRM.'
  : null;

export class HttpError extends Error {
  constructor(message:string, public status:number){super(message);this.name='HttpError';}
}
export async function request<T>(
  path:string, token:string | null, method:'GET'|'POST'='GET', body?:unknown,
):Promise<T>{
  if (configurationError) throw new Error(configurationError);
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && baseUrl.startsWith('http:')) {
    throw new Error('Insecure API URL: the CRM uses HTTPS but VITE_API_URL is HTTP. Configure the HTTPS backend URL and rebuild.');
  }
  const abort = new AbortController();
  const timer = setTimeout(()=>abort.abort(),20000);
  try{
    const res=await fetch(baseUrl+path,{
      method,signal:abort.signal,cache:'no-store',credentials:'omit',
      headers:{Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{}),
        ...(body===undefined?{}:{'Content-Type':'application/json'})},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
    });
    const payload:unknown=await res.json().catch(()=>null);
    if(!res.ok){
      const value=payload && typeof payload==='object'?payload as Record<string,unknown>:{};
      const message=typeof value.message==='string'?value.message:'Request failed. Please try again.';
      throw new HttpError(res.status>=500?'The API encountered a problem. Check server logs.':message,res.status);
    }
    return payload as T;
  }catch(error){
    if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
      throw new Error('Cannot connect to LoveBind API ('+baseUrl+'). Verify the backend is online, VITE_API_URL is configured, and CORS_ORIGINS includes the CRM website.');
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('LoveBind API did not respond within 20 seconds ('+baseUrl+'). Check backend health and deployment logs.');
    }
    throw error;
  }finally{clearTimeout(timer);}
}

export type Overview={total:number;active:number;awaitingAdmin:number;pendingPhotos:number;verifiedAges:number;openReports:number};
export type Member={id:string;email:string;status:string;approval:string;createdAt:string;name:string;city:string|null;
  photoStatus:string;identityStatus:string;ageStatus:string;eligible:boolean};
export type MemberList={members:Member[];page:number;pages:number;total:number};
export type PhotoQueue={photos:{userId:string;displayName:string;submittedAt:string;photoUrl:string}[]};
export type Audit={id:string;decision:string;reason:string|null;createdAt?:string;reviewedAt?:string};
export type MemberDetail={id:string;email:string;status:string;approval:string;createdAt:string;eligible:boolean;
  profile:{displayName:string;city:string|null;occupation:string|null;bio:string|null;relationshipGoal:string|null;
    interests:string[];coreValues:string[];photoStatus:string;visible:boolean;photoUrl:string|null}|null;
  verification:{status:string;ageEvidenceStatus:string;ageVerifiedAt:string|null;lastCheckedAt:string|null}|null;
  photoReviews:Audit[];accountDecisions:Audit[]};
export type Activity={events:{id:string;type:'ACCOUNT'|'PHOTO';memberId:string;moderatorId:string;decision:string;reason:string|null;createdAt:string}[]};
