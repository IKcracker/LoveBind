import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity, AlertCircle, ArrowDownRight, ArrowRight, BadgeCheck, Check, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, FileCheck2, Filter,
  Images, LayoutDashboard, Loader2, LockKeyhole, LogOut, Menu, RefreshCw,
  Search, ShieldAlert, ShieldCheck, ShieldX, UserRoundCheck, Users, X,
} from 'lucide-react';
import { request, baseUrl, type Activity as ActivityData, type MemberDetail,
  type MemberList, type Overview, type PhotoQueue } from './api';

type View='overview'|'members'|'photos'|'activity';
type Intent={kind:'photo'|'account';id:string;name:string;decision:'APPROVED'|'REJECTED'};
const DATE=(x:string|undefined|null)=>x?new Date(x).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}):'—';
const DATE_TIME=(x:string|undefined|null)=>x?new Date(x).toLocaleString('en-ZA',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';

function Initials({name}:{name:string}){return <span className="initials">{name.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'LB'}</span>}
function Status({value}:{value:string}) {
 const key=value.toLowerCase().replaceAll(' ','-');
 return <span className={'pill '+(key==='approved'||key==='active'||key==='verified'?'pill-success':key==='pending'||key==='in-review'||key==='not-started'?'pill-pending':key==='rejected'||key==='declined'||key==='suspended'?'pill-danger':'pill-neutral')}>
  <span className="pill-dot"/>{value.replaceAll('_',' ')}
 </span>;
}
function SectionTitle({eyebrow,title,description,action}:{eyebrow:string;title:string;description:string;action?:ReactNode}){
 return <div className="section-top"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subheading">{description}</p></div>{action}</div>;
}

export default function App(){
 const [token,setToken]=useState<string|null>(null);
 const [username,setUsername]=useState('');
 const [password,setPassword]=useState('');
 const [signingIn,setSigningIn]=useState(false);
 const [view,setView]=useState<View>('overview');
 const [overview,setOverview]=useState<Overview|null>(null);
 const [members,setMembers]=useState<MemberList>({members:[],page:1,pages:1,total:0});
 const [photos,setPhotos]=useState<PhotoQueue>({photos:[]});
 const [activity,setActivity]=useState<ActivityData>({events:[]});
 const [detail,setDetail]=useState<MemberDetail|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState('');
 const [page,setPage]=useState(1);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [intent,setIntent]=useState<Intent|null>(null);
 const [reason,setReason]=useState('');
 const [mobileOpen,setMobileOpen]=useState(false);
 const [rechecking,setRechecking]=useState(false);
 const [recheckHistory,setRecheckHistory]=useState<{id:string;source:string;outcome:string;previousStatus:string;resultStatus:string|null;issue:string|null;checkedAt:string}[]>([]);

 const logout=useCallback(async()=>{
  if(token)await request('/auth/logout',token,'POST',{}).catch(()=>undefined);
  setToken(null);setUsername('');setPassword('');setSelected(null);setDetail(null);
  setOverview(null);setMembers({members:[],page:1,pages:1,total:0});
 },[token]);

 const load=useCallback(async(currentView:View,currentToken:string,search:string,selectedFilter:string,currentPage:number)=>{
  switch(currentView){
   case 'overview':{
    const [stats,list]=await Promise.all([
     request<Overview>('/moderation/admin/overview',currentToken),
     request<MemberList>('/moderation/admin/members?page=1',currentToken),
    ]);
    setOverview(stats);setMembers(list);break;
   }
   case 'members':{
    const params=new URLSearchParams({page:String(currentPage)});
    if(search.trim())params.set('q',search.trim());
    if(selectedFilter)params.set('status',selectedFilter);
    setMembers(await request<MemberList>('/moderation/admin/members?'+params,currentToken));break;
   }
   case 'photos':setPhotos(await request<PhotoQueue>('/moderation/photos',currentToken));break;
   case 'activity':setActivity(await request<ActivityData>('/moderation/admin/activity',currentToken));break;
  }
 },[]);

 const refresh=useCallback(async()=>{
  if(!token)return;
  setLoading(true);setError('');
  try{await load(view,token,query,filter,page);}
  catch(e){setError(e instanceof Error?e.message:'Unable to load workspace');}
  finally{setLoading(false);}
 },[token,view,query,filter,page,load]);

 useEffect(()=>{
  if(!token)return;
  let active=true;
  const timer=setTimeout(()=>{
   load(view,token,query,filter,page).catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load workspace');});
  },view==='members'?260:0);
  return()=>{active=false;clearTimeout(timer);};
 },[token,view,query,filter,page,load]);

 async function signIn(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError('');setSigningIn(true);
  try{
   const res=await request<{accessToken:string}>('/auth/login',null,'POST',{email:username.trim(),password});
   const access=await request<{canModerate:boolean}>('/moderation/access',res.accessToken);
   if(!access.canModerate)throw new Error('This account is not authorized for LoveBind administration.');
   setToken(res.accessToken);setPassword('');setView('overview');setNotice('');
  }catch(e){setError(e instanceof Error?e.message:'Unable to sign in');}
  finally{setSigningIn(false);}
 }

 function navigate(next:View){setView(next);setSelected(null);setDetail(null);setNotice('');setError('');setMobileOpen(false);}
 async function openMember(id:string){
  if(!token)return;setSelected(id);setDetail(null);setError('');
  try{
    const [member,history]=await Promise.all([
      request<MemberDetail>('/moderation/admin/members/'+encodeURIComponent(id),token),
      request<{events:typeof recheckHistory}>('/moderation/admin/members/'+encodeURIComponent(id)+'/age-rechecks',token),
    ]);
    setDetail(member);setRecheckHistory(history.events);
   }
  catch(e){setError(e instanceof Error?e.message:'Unable to open this member');setSelected(null);}
 }
 async function recheckAge(id:string){
  if(!token||rechecking)return;
  setRechecking(true);setError('');setNotice('');
  try{
   const response=await request<{ageEvidenceStatus:string;ageEvidenceIssue:string|null}>(
    '/moderation/admin/members/'+encodeURIComponent(id)+'/recheck-age',token,'POST',{});
   setNotice('Age recheck: '+response.ageEvidenceStatus+(response.ageEvidenceIssue?' ('+response.ageEvidenceIssue+')':''));
   const [member,history]=await Promise.all([
    request<MemberDetail>('/moderation/admin/members/'+encodeURIComponent(id),token),
    request<{events:typeof recheckHistory}>('/moderation/admin/members/'+encodeURIComponent(id)+'/age-rechecks',token),
   ]);
   setDetail(member);setRecheckHistory(history.events);
   await load(view,token,query,filter,page);
  }catch(e){setError(e instanceof Error?e.message:'Age recheck failed');}
  finally{setRechecking(false);}
 }
 async function batchRecheck(){
  if(!token||rechecking)return;
  setRechecking(true);setError('');setNotice('');
  try{
   const response=await request<{processed:number;maxPerRequest:number;results:{result:string}[]}>(
    '/moderation/admin/recheck-age/batch',token,'POST',{});
   setNotice('Rechecked '+response.processed+' existing Didit sessions (max '+response.maxPerRequest+' per request).');
   await load(view,token,query,filter,page);
  }catch(e){setError(e instanceof Error?e.message:'Batch recheck failed');}
  finally{setRechecking(false);}
 }
 function prepare(kind:Intent['kind'],id:string,name:string,decision:Intent['decision']){
  setIntent({kind,id,name,decision});setReason('');setError('');
 }
 async function applyDecision(){
  if(!token||!intent||busy)return;
  if(intent.decision==='REJECTED'&&reason.trim().length<5){setError('Provide a rejection reason of at least five characters.');return;}
  setBusy(true);setError('');
  try{
   const path=intent.kind==='account'?'/moderation/admin/members/'+encodeURIComponent(intent.id)+'/decision'
     :'/moderation/photos/'+encodeURIComponent(intent.id)+'/decision';
   await request(path,token,'POST',{decision:intent.decision,reason:reason.trim()});
   const label=intent.kind==='account'?'Account':'Profile photo';
   setNotice(label+' '+intent.decision.toLowerCase()+'. Review history has been updated.');
   setIntent(null);setReason('');
   await load(view,token,query,filter,page);
   if(selected===intent.id){
    setDetail(await request<MemberDetail>('/moderation/admin/members/'+encodeURIComponent(intent.id),token));
   }
  }catch(e){setError(e instanceof Error?e.message:'Unable to save decision');}
  finally{setBusy(false);}
 }

 if(!token)return <div className="login-shell">
  <div className="login-art"><div className="brand brand-light"><span className="brand-mark">♡</span><span>lovebind<span className="brand-light-dim">.</span></span></div>
   <div className="login-art-content"><div className="small-line"/><div className="eyebrow login-eyebrow">TRUST & SAFETY PLATFORM</div>
   <h2>Real connections start<br/>with <em>real trust.</em></h2>
   <p>A dedicated space to protect the people behind every meaningful LoveBind connection.</p></div>
   <span className="art-foot">PRIVATE ADMINISTRATION · AUTHORIZED ACCESS ONLY</span>
   <div className="art-orb one"/><div className="art-orb two"/>
  </div>
  <div className="login-form-area"><div className="login-form-box"><div className="login-badge"><ShieldCheck size={17}/> LOVE BIND ADMIN</div>
   <h1>Welcome back<span className="plum">.</span></h1><p className="login-lede">Sign in with your authorized LoveBind moderator account.</p>
   <form onSubmit={signIn} className="login-form"><label>Email address<input autoComplete="username" type="email" placeholder="name@company.com" required value={username} onChange={e=>setUsername(e.target.value)}/></label>
    <label>Password<input autoComplete="current-password" type="password" placeholder="Enter your password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
    {error&&<div className="alert alert-error" role="alert"><AlertCircle size={16}/>{error}</div>}
    <button className="btn btn-primary login-submit" disabled={signingIn}>{signingIn?<Loader2 className="spin" size={18}/>:<LockKeyhole size={17}/>} Sign in securely <ArrowRight size={16}/></button></form>
   <div className="login-note"><ShieldCheck size={17}/><span>Access is restricted and every approval is recorded. Sessions are kept in memory only.</span></div>
   <p className="login-api">API endpoint: {baseUrl}</p>
  </div></div>
 </div>;

 const menuItems:[View,React.ReactNode,string][]=[
  ['overview',<LayoutDashboard size={19}/>, 'Overview'],
  ['members',<Users size={19}/>, 'Members'],
  ['photos',<Images size={19}/>, 'Photo reviews'],
  ['activity',<Activity size={19}/>, 'Audit activity'],
 ];
 const selectedName=detail?.profile?.displayName??'Member';
 return <div className="app-shell">
  {mobileOpen&&<button className="mobile-scrim" aria-label="Close navigation" onClick={()=>setMobileOpen(false)}/>}
  <aside className={'sidebar '+(mobileOpen?'sidebar-open':'')}>
   <div className="brand"><span className="brand-mark">♡</span><span>lovebind<span className="plum">.</span></span></div>
   <div className="sidebar-caption">WORKSPACE</div>
   <nav aria-label="Admin navigation">{menuItems.map(([id,icon,label])=><button key={id} onClick={()=>navigate(id)} className={'nav-button '+(view===id?'selected':'')}>{icon}<span>{label}</span>{view===id&&<span className="nav-active-dot"/>}</button>)}</nav>
   <div className="sidebar-bottom"><div className="sidebar-info"><ShieldCheck size={18}/><div><strong>Safety first</strong><small>Moderator workspace</small></div></div>
    <button className="nav-button signout" onClick={()=>void logout()}><LogOut size={18}/> Sign out</button>
   </div>
  </aside>
  <div className="main-column">
   <header className="topbar">
    <div className="topbar-left"><button className="mobile-menu" aria-label="Open menu" onClick={()=>setMobileOpen(true)}><Menu size={21}/></button>
     <span className="topbar-product">LoveBind / <b>Trust & Safety</b></span><span className="env-pill"><span/> PRIVATE WORKSPACE</span></div>
    <div className="topbar-right"><span className="header-meta"><ShieldCheck size={15}/> Secured admin</span><button className="top-avatar" aria-label="Moderator account"><span>LB</span></button></div>
   </header>
   <main className="main-content">
    {notice&&<div className="alert alert-success" role="status"><CheckCircle2 size={18}/>{notice}<button aria-label="Dismiss" onClick={()=>setNotice('')}><X size={15}/></button></div>}
    {error&&<div className="alert alert-error" role="alert"><AlertCircle size={18}/>{error}<button aria-label="Dismiss" onClick={()=>setError('')}><X size={15}/></button></div>}
    {view==='overview'&&<>
      <SectionTitle eyebrow="WORKSPACE OVERVIEW" title="Good to have you here." description="Keep your community safe, one thoughtful decision at a time."
       action={<button className="btn btn-white" onClick={()=>void refresh()}><RefreshCw size={16} className={loading?'spin':undefined}/> Refresh data</button>}/>
      <div className="metric-grid">
       {[
         {label:'Total members',value:overview?.total,icon:<Users size={20}/>,note:'All registered accounts',tone:'ink',target:'members' as View},
         {label:'Active members',value:overview?.active,icon:<UserRoundCheck size={20}/>,note:'Verified and approved',tone:'green',target:'members' as View},
         {label:'Awaiting approval',value:overview?.awaitingAdmin,icon:<Clock3 size={20}/>,note:'Manual review required',tone:'purple',target:'members' as View},
         {label:'Pending photos',value:overview?.pendingPhotos,icon:<Images size={20}/>,note:'Waiting in photo queue',tone:'rose',target:'photos' as View},
       ].map(x=><button className="metric-card" key={x.label} onClick={()=>navigate(x.target)}>
        <div className="metric-card-top"><span className="metric-label">{x.label}</span><span className={'metric-icon '+x.tone}>{x.icon}</span></div>
        <strong>{x.value??'—'}</strong><div className="metric-footer">{x.note}<ArrowDownRight size={15}/></div>
       </button>)}
      </div>
      <div className="dashboard-grid"><section className="card dashboard-queue">
       <div className="card-titlebar"><div><div className="eyebrow">PRIORITY QUEUE</div><h2>Members to review</h2></div><button className="text-button" onClick={()=>navigate('members')}>View all <ArrowRight size={16}/></button></div>
       <div className="review-list">{members.members.filter(m=>m.status==='PENDING').slice(0,5).map(m=><button className="review-row" key={m.id} onClick={()=>void openMember(m.id)}>
        <Initials name={m.name}/><div className="review-row-info"><strong>{m.name}</strong><small>{m.city||'Location not set'} · Joined {DATE(m.createdAt)}</small></div>
        <Status value={m.eligible?'Ready to review':'Pending checks'}/><ChevronRight size={16}/>
       </button>)}
       {!members.members.some(m=>m.status==='PENDING')&&<div className="empty-compact"><CheckCircle2 size={27}/><strong>All caught up</strong><span>No pending members in the latest records.</span></div>}</div>
      </section>
      <aside className="card snapshot-card"><div className="eyebrow">COMMUNITY HEALTH</div><h2>Safety snapshot</h2>
       <div className="snapshot-feature"><div className="snapshot-symbol"><ShieldCheck size={30}/></div><h3>A better place to connect.</h3><p>Careful checks help create a dating experience built around genuine people and good intentions.</p></div>
       <div className="snapshot-list"><div><span><BadgeCheck size={16}/> Verified age checks</span><strong>{overview?.verifiedAges??'—'}</strong></div><div><span><ShieldAlert size={16}/> Open safety reports</span><strong>{overview?.openReports??'—'}</strong></div></div>
       <button className="text-button" onClick={()=>navigate('activity')}>View audit activity <ArrowRight size={16}/></button>
      </aside></div>
    </>}
    {view==='members'&&<>
      <SectionTitle eyebrow="MEMBER MANAGEMENT" title="Your community." description="Find people, review their verification progress, and make account decisions."
      action={<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="btn btn-white" disabled={rechecking} onClick={()=>void batchRecheck()}>{rechecking?<Loader2 className="spin" size={16}/>:<RefreshCw size={16}/>} Recheck pending ages (up to 5)</button><button className="btn btn-white" onClick={()=>void refresh()}><RefreshCw size={16}/> Refresh</button></div>}/>
      <section className="card table-card">
       <div className="table-toolbar"><div className="searchbox"><Search size={19}/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Search name, email or member ID…" aria-label="Search members"/></div>
        <div className="select-wrap"><Filter size={17}/><select value={filter} aria-label="Filter approvals" onChange={e=>{setFilter(e.target.value);setPage(1)}}><option value="">All approvals</option><option value="PENDING">Awaiting review</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select><ChevronDown size={14}/></div>
       </div>
       <div className="table-scroll"><table><thead><tr><th>Member</th><th>Identity</th><th>Profile photo</th><th>Approval</th><th>Joined</th><th/></tr></thead><tbody>
       {members.members.map(m=><tr key={m.id}><td><div className="table-person"><Initials name={m.name}/><div><strong>{m.name}</strong><span>{m.email}</span></div></div></td><td><Status value={m.identityStatus}/></td><td><Status value={m.photoStatus}/></td><td><Status value={m.approval}/></td>
       <td className="muted-cell">{DATE(m.createdAt)}</td><td><button className="icon-button" aria-label={'Open '+m.name} onClick={()=>void openMember(m.id)}><ArrowRight size={18}/></button></td></tr>)}
       </tbody></table></div>
       {members.members.length===0&&<div className="empty-compact"><Search size={28}/><strong>No matching members</strong><span>Try a different search or filter.</span></div>}
       <div className="table-footer"><span>Showing {members.members.length} of {members.total} members</span><div className="pager"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={17}/></button><span>Page {members.page} of {members.pages}</span><button disabled={page>=members.pages} onClick={()=>setPage(p=>p+1)}><ChevronRight size={17}/></button></div></div>
      </section>
    </>}
    {view==='photos'&&<>
     <SectionTitle eyebrow="CONTENT SAFETY" title="Photo review queue." description="Make sure every profile photo meets the community's standards."
     action={<button className="btn btn-white" onClick={()=>void refresh()}><RefreshCw size={16}/> Refresh queue</button>}/>
     <div className="queue-intro"><ShieldCheck size={20}/><div><strong>Private, secure photo reviews</strong><p>Images are loaded through short-lived URLs. ID documents are never shown here. You cannot review your own photo.</p></div></div>
     {photos.photos.length?<div className="photo-grid">{photos.photos.map(photo=><article className="photo-review-card" key={photo.userId}>
      <div className="photo-review-media"><img src={photo.photoUrl} alt={'Profile photograph awaiting review for '+photo.displayName}/></div>
      <div className="photo-review-meta"><div><strong>{photo.displayName}</strong><span>Submitted {DATE(photo.submittedAt)}</span></div><Status value="PENDING"/></div>
      <div className="photo-review-actions"><button className="btn btn-white" onClick={()=>void openMember(photo.userId)}>View member</button>
       <button className="btn btn-primary" onClick={()=>prepare('photo',photo.userId,photo.displayName,'APPROVED')}><Check size={16}/> Approve</button>
       <button className="btn btn-subtle-danger" title="Reject photograph" onClick={()=>prepare('photo',photo.userId,photo.displayName,'REJECTED')}><X size={17}/></button></div>
     </article>)}</div>:<div className="empty-large"><div className="empty-icon"><Images size={28}/></div><h2>No photos awaiting review</h2><p>New profile photographs will appear here after upload.</p></div>}
    </>}
    {view==='activity'&&<>
      <SectionTitle eyebrow="TRANSPARENCY & ACCOUNTABILITY" title="Audit activity." description="A chronological record of account and photo moderation decisions."
      action={<button className="btn btn-white" onClick={()=>void refresh()}><RefreshCw size={16}/> Refresh history</button>}/>
      <section className="card table-card"><div className="card-titlebar activity-titlebar"><div><h2>Recent decisions</h2><p>Most recent activity first</p></div><span className="mini-count">{activity.events.length} entries</span></div>
       <div className="table-scroll"><table><thead><tr><th>Action</th><th>Decision</th><th>Member</th><th>Reason</th><th>When</th></tr></thead><tbody>
       {activity.events.map(evt=><tr key={evt.id}><td><span className="activity-kind">{evt.type==='PHOTO'?<Images size={16}/>:<FileCheck2 size={16}/>} {evt.type==='PHOTO'?'Photo review':'Account review'}</span></td><td><Status value={evt.decision}/></td>
        <td><button className="text-button" onClick={()=>void openMember(evt.memberId)}>{evt.memberId.slice(0,13)}…</button></td><td className="reason-cell">{evt.reason||'—'}</td><td className="muted-cell">{DATE_TIME(evt.createdAt)}</td></tr>)}</tbody></table></div>
       {!activity.events.length&&<div className="empty-compact"><Activity size={30}/><strong>No decisions recorded yet</strong><span>Moderation actions will appear here automatically.</span></div>}
      </section>
    </>}
    <div className="bottom-caption">LoveBind Trust & Safety <span>•</span> Restricted administration <span>•</span> Built for better connections</div>
   </main>
  </div>

  {selected&&<div className="drawer-root"><button className="drawer-overlay" aria-label="Close member details" onClick={()=>{setSelected(null);setDetail(null)}}/>
   <aside className="drawer" aria-label="Member details">
    <div className="drawer-header"><div><span className="eyebrow">MEMBER REVIEW</span><h2>Profile details</h2></div><button className="icon-button" onClick={()=>{setSelected(null);setDetail(null)}} aria-label="Close drawer"><X size={21}/></button></div>
    {!detail?<div className="drawer-loading"><Loader2 className="spin" size={26}/> Loading member information…</div>:
     <div className="drawer-content">
      <div className="drawer-person"><Initials name={selectedName}/><div><h3>{selectedName}</h3><span>{detail.email}</span><small>Joined {DATE(detail.createdAt)}</small></div></div>
      <div className="drawer-status"><Status value={detail.status}/><Status value={detail.approval}/></div>
      <div className="drawer-photo">{detail.profile?.photoUrl?<img src={detail.profile.photoUrl} alt={'Profile photograph of '+selectedName}/>:<div className="photo-missing"><Images size={29}/><p>No profile photo uploaded</p></div>}</div>
      <div className="drawer-section"><div className="drawer-title"><h4>Verification checklist</h4><ShieldCheck size={17}/></div>
       <div className="check-list">
        <div><span>{detail.verification?.status==='Approved'?<CheckCircle2 className="good"/>:<Clock3/>} Didit identity</span><Status value={detail.verification?.status??'Not Started'}/></div>
        <div><span>{detail.verification?.ageEvidenceStatus==='VERIFIED'?<CheckCircle2 className="good"/>:<Clock3/>} Adult age evidence</span><Status value={detail.verification?.ageEvidenceStatus??'PENDING'}/></div>
        <div><span>{detail.profile?.photoStatus==='APPROVED'?<CheckCircle2 className="good"/>:<Clock3/>} Profile photograph</span><Status value={detail.profile?.photoStatus??'NONE'}/></div>
        <div><span>{detail.profile?.bio&&detail.profile.city&&detail.profile.relationshipGoal?<CheckCircle2 className="good"/>:<Clock3/>} Profile complete</span><Status value={detail.profile?.bio&&detail.profile.city&&detail.profile.relationshipGoal?'Ready':'Pending'}/></div>
       </div>
       <p className="detail-hint">Identity documents and biometric data remain with Didit. Only verification results are visible here.</p>
      </div>
      <div className="drawer-section"><div className="drawer-title"><h4>About this member</h4><CircleHelp size={17}/></div>
       <div className="detail-two-col"><div><span>City</span><strong>{detail.profile?.city||'Not set'}</strong></div><div><span>Occupation</span><strong>{detail.profile?.occupation||'Not set'}</strong></div><div><span>Looking for</span><strong>{detail.profile?.relationshipGoal||'Not set'}</strong></div><div><span>Profile visibility</span><strong>{detail.profile?.visible?'Visible':'Private'}</strong></div></div>
       <p className="detail-bio">{detail.profile?.bio||'No introduction provided yet.'}</p>
       <div className="tag-list">{detail.profile?.interests.slice(0,8).map(x=><span className="interest" key={x}>{x}</span>)}</div>
      </div>
      <div className="drawer-section"><div className="drawer-title"><h4>Recent decisions</h4><Activity size={17}/></div>
       {[...detail.accountDecisions.map(x=>({ ...x,type:'Account',at:x.createdAt })),
         ...detail.photoReviews.map(x=>({...x,type:'Photo',at:x.reviewedAt}))]
        .sort((a,b)=>new Date(b.at||0).getTime()-new Date(a.at||0).getTime()).slice(0,6).map(event=><div className="history-row" key={event.id}>
         <div><strong>{event.type} · {event.decision}</strong><small>{event.reason||'No reason recorded'}</small></div><span>{DATE(event.at)}</span></div>)}
       {!detail.accountDecisions.length&&!detail.photoReviews.length&&<p className="detail-hint">No review decisions yet.</p>}
      </div>
      {detail.profile?.photoStatus==='PENDING'&&<div className="drawer-actions"><h4>Photograph</h4>
       <button className="btn btn-primary" onClick={()=>prepare('photo',detail.id,selectedName,'APPROVED')}><Check size={17}/> Approve photograph</button>
       <button className="btn btn-outline-danger" onClick={()=>prepare('photo',detail.id,selectedName,'REJECTED')}><X size={17}/> Reject photograph</button></div>}
      {detail.status!=='SUSPENDED'&&detail.status!=='DELETED'&&<div className="drawer-actions"><h4>Account decision</h4>
       {!detail.eligible&&<p className="detail-hint">Account approval is disabled until identity, verified age, photo approval and profile completion pass.</p>}
       <button className="btn btn-primary" disabled={!detail.eligible||detail.approval==='APPROVED'} onClick={()=>prepare('account',detail.id,selectedName,'APPROVED')}>
        <UserRoundCheck size={17}/> Approve account</button>
       <button className="btn btn-outline-danger" disabled={detail.approval==='REJECTED'} onClick={()=>prepare('account',detail.id,selectedName,'REJECTED')}>
        <ShieldX size={17}/> Reject account</button>
      </div>}
     </div>}
   </aside>
  </div>}

  {intent&&<div className="modal-root"><button className="modal-scrim" aria-label="Cancel decision" onClick={()=>{setIntent(null);setError('')}}/>
   <section className="decision-modal" role="dialog" aria-modal="true" aria-label="Confirm moderation decision">
    <div className={'modal-icon '+(intent.decision==='APPROVED'?'modal-icon-success':'modal-icon-danger')}>
      {intent.decision==='APPROVED'?<BadgeCheck size={27}/>:<ShieldAlert size={27}/>}</div>
    <h2>{intent.decision==='APPROVED'?'Approve':'Reject'} {intent.kind==='account'?'account':'photograph'}?</h2>
    <p>You are about to {intent.decision.toLowerCase()} the {intent.kind==='account'?'account':'profile photo'} of <strong>{intent.name}</strong>. This decision will be recorded in the audit history.</p>
    {intent.kind==='account'&&intent.decision==='APPROVED'&&<div className="modal-warning"><ShieldCheck size={18}/> Approval will activate the account only when every server-side safety check is satisfied.</div>}
    <label>Review note {intent.decision==='REJECTED'?'(required)':'(optional)'}<textarea value={reason} onChange={e=>setReason(e.target.value)}
      placeholder={intent.decision==='REJECTED'?'Explain why this submission was rejected…':'Optional note for the audit trail…'} maxLength={500}/></label>
    {error&&<p className="modal-error">{error}</p>}
    <div className="modal-buttons"><button className="btn btn-white" disabled={busy} onClick={()=>{setIntent(null);setError('')}}>Cancel</button>
     <button className={'btn '+(intent.decision==='REJECTED'?'btn-danger':'btn-primary')} disabled={busy||(intent.decision==='REJECTED'&&reason.trim().length<5)} onClick={()=>void applyDecision()}>
      {busy?<Loader2 className="spin" size={16}/>:intent.decision==='APPROVED'?<Check size={16}/>:<X size={16}/>} Confirm {intent.decision.toLowerCase()}
     </button></div>
   </section></div>}
 </div>;
}
