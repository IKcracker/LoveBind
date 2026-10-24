import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, Love, serif } from '@/components/auth-screens';
import { LoveBindNav } from '@/components/lovebind-nav';
import { apiRequest } from '@/lib/api';
import type { DiscoverResponse, LikeResponse } from '@/lib/social';
import { useSession } from '@/lib/session';

export default function DiscoverScreen() {
 const {user,token,loading}=useSession();
 const [data,setData]=useState<DiscoverResponse|null>(null);
 const [busy,setBusy]=useState(false);
 const [loadingList,setLoadingList]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const [matched,setMatched]=useState<string|null>(null);
 const [safety,setSafety]=useState(false);
 const [confirmBlock,setConfirmBlock]=useState(false);
 const [notice,setNotice]=useState('');
 const [index,setIndex]=useState(0);
 async function refresh() {
  if(!token)return;
  setLoadingList(true);setError(null);
  try {const r=await apiRequest<DiscoverResponse>('/social/discover','GET',undefined,token);setData(r);setIndex(0);}
  catch(e){setError(e instanceof Error?e.message:'Cannot load discovery');}
  finally{setLoadingList(false)}
 }
 useEffect(()=>{
  if(!token)return;
  let active=true;
  apiRequest<DiscoverResponse>('/social/discover','GET',undefined,token)
    .then(r=>{if(active){setData(r);setIndex(0);setLoadingList(false);}})
    .catch(e=>{if(active){setError(e instanceof Error?e.message:'Cannot load discovery');setLoadingList(false);}});
  return ()=>{active=false;};
 },[token]);
 async function enable(){
  if(!token||busy)return;setBusy(true);setError(null);
  try{await apiRequest('/social/visibility','PUT',{visible:true},token);await refresh();}
  catch(e){setError(e instanceof Error?e.message:'Cannot enable discovery');}
  finally{setBusy(false)}
 }
 const person=data?.profiles[index];
 async function like(){
  if(!token||!person||busy)return;setBusy(true);setError(null);
  try {
   const r=await apiRequest<LikeResponse>('/social/likes','POST',{toId:person.id},token);
   if(r.matched&&r.matchId)setMatched(r.matchId);
   else setNotice('Your like was sent. You can chat if the feeling is mutual.');
   setIndex(v=>v+1);setSafety(false);setConfirmBlock(false);
  }catch(e){setError(e instanceof Error?e.message:'Like could not be sent');}
  finally{setBusy(false)}
 }
 async function block(){
  if(!token||!person||busy)return;setBusy(true);setError(null);
  try {await apiRequest('/social/blocks','POST',{memberId:person.id},token);
   setIndex(v=>v+1);setSafety(false);setConfirmBlock(false);setNotice('Member blocked.');}
  catch(e){setError(e instanceof Error?e.message:'Could not block member');}
  finally{setBusy(false)}
 }
 async function report(category:string){
  if(!token||!person||busy)return;setBusy(true);setError(null);
  try {await apiRequest('/social/reports','POST',{memberId:person.id,category},token);
   setSafety(false);setNotice('Your report was submitted for safety review.');}
  catch(e){setError(e instanceof Error?e.message:'Could not report member');}
  finally{setBusy(false)}
 }
 if(loading)return <View style={s.center}><ActivityIndicator color={Love.wine}/></View>;
 if(!user||!token)return <Redirect href="/login"/>;
 const ready=data?.access.ready===true;
 const missing=data?.access.missing??[];
 return <SafeAreaView style={s.safe} edges={['top','left','right','bottom']}>
  <ScrollView style={s.scroll} contentContainerStyle={s.content}>
   <View style={s.header}><BrandLockup/><Text style={s.headerTag}>DISCOVER</Text></View>
   <Text style={s.eyebrow}>REAL CONNECTIONS BEGIN HERE</Text>
   <Text style={s.title}>Your next chapter<Text style={s.dot}>.</Text></Text>
   <Text style={s.description}>Find someone who shares what matters to you, at your own pace.</Text>
   {loadingList?<View style={s.loading}><ActivityIndicator size="large" color={Love.wine}/></View>:
   !data?<View style={s.panel}><Text style={s.panelTitle}>Discovery is unavailable</Text><Text style={s.body}>Please try again later.</Text></View>:
   !ready?<View style={s.panel}>
    <Text style={s.kicker}>PRIVATE UNTIL YOU ARE READY</Text>
    <Text style={s.panelTitle}>A safer way to meet.</Text>
    <Text style={s.body}>Only adults whose identity and photo have passed review can appear in discovery. Your own profile stays private for now.</Text>
    {missing.includes('identity')?<Pressable style={s.option} onPress={()=>router.push('/verification')}><Text style={s.optionText}>◯  Complete identity verification</Text><Text style={s.arrow}>→</Text></Pressable>:null}
    {missing.includes('photo')?<Pressable style={s.option} onPress={()=>router.push('/profile-photo')}><Text style={s.optionText}>◯  Submit your profile photo for review</Text><Text style={s.arrow}>→</Text></Pressable>:null}
    {missing.includes('profile')?<Pressable style={s.option} onPress={()=>router.push('/onboarding')}><Text style={s.optionText}>◯  Complete your profile</Text><Text style={s.arrow}>→</Text></Pressable>:null}
    <Text style={s.note}>No real member profiles will be shown until those checks are complete.</Text>
   </View>:
   !data.access.visible?<View style={s.panel}>
    <Text style={s.kicker}>YOUR CHOICE</Text><Text style={s.panelTitle}>Ready to be seen?</Text>
    <Text style={s.body}>Your verified profile is private by default. Turn on discovery when you choose to start meeting people.</Text>
    <Pressable style={s.primary} disabled={busy} onPress={()=>void enable()}><Text style={s.primaryText}>Turn on discovery →</Text></Pressable>
   </View>:
   person?<View style={s.profileCard}>
    <View style={s.imageFrame}>{person.photoUrl?
      <Image style={s.photo} source={{uri:person.photoUrl}} resizeMode="cover"/>:
      <View style={s.photoFallback}><Text style={s.photoFallbackText}>♡</Text></View>}
      <View style={s.photoBadge}><Text style={s.badgeText}>VERIFIED MEMBER</Text></View>
    </View>
    <View style={s.profileBody}>
     <Text style={s.name}>{person.displayName}, {person.age}</Text>
     <Text style={s.city}>{person.city??'Location not shared'}</Text>
     <Text style={s.intention}>{person.relationshipGoal??'Looking to connect'}</Text>
     {person.occupation?<Text style={s.body}>{person.occupation}</Text>:null}
     <Text style={s.bio}>{person.bio}</Text>
     {person.interests.length?<View style={s.tags}>{person.interests.slice(0,6).map((x,i)=><View style={s.tag} key={i}><Text style={s.tagText}>{x}</Text></View>)}</View>:null}
     {person.coreValues.length?<Text style={s.values}>VALUES · {person.coreValues.slice(0,4).join(' · ')}</Text>:null}
     <View style={s.actions}>
      <Pressable style={s.pass} disabled={busy} accessibilityRole="button" onPress={()=>{setIndex(v=>v+1);setNotice('Skipped for now.');setSafety(false)}}>
       <Text style={s.passText}>Not now</Text>
      </Pressable>
      <Pressable style={s.like} disabled={busy} accessibilityRole="button" onPress={()=>void like()}>
       <Text style={s.likeText}>{busy?'Sending…':'♡  Like'}</Text>
      </Pressable>
     </View>
     <Pressable style={s.safetyButton} accessibilityRole="button" onPress={()=>setSafety(!safety)}><Text style={s.safetyLabel}>Safety & reporting {safety?'−':'+'}</Text></Pressable>
     {safety?<View style={s.safetyPanel}>
      <Text style={s.body}>You can block or report anyone who makes you uncomfortable.</Text>
      {!confirmBlock?<Pressable onPress={()=>setConfirmBlock(true)}><Text style={s.danger}>Block this member</Text></Pressable>:
      <View style={s.confirm}><Text style={s.body}>Block this member and close any conversation?</Text><Pressable onPress={()=>void block()} disabled={busy}><Text style={s.danger}>Yes, block member</Text></Pressable><Pressable onPress={()=>setConfirmBlock(false)}><Text style={s.optionText}>Cancel</Text></Pressable></View>}
      <Text style={s.label}>Report a concern</Text>
      {(['HARASSMENT','SCAM','UNDERAGE','INAPPROPRIATE','OTHER'] as const).map(x=><Pressable key={x} disabled={busy} onPress={()=>void report(x)} style={s.report}><Text style={s.optionText}>{x.replace('_',' ').toLowerCase()}</Text></Pressable>)}
     </View>:null}
    </View>
   </View>:<View style={s.panel}>
    <Text style={s.kicker}>YOU ARE ALL CAUGHT UP</Text><Text style={s.panelTitle}>Good things take time.</Text>
    <Text style={s.body}>There are no more available profiles matching your preferences right now. Check back later or adjust your preferences.</Text>
    <Pressable style={s.option} onPress={()=>router.push('/preferences')}><Text style={s.optionText}>Adjust preferences</Text><Text style={s.arrow}>→</Text></Pressable>
   </View>}
   {notice?<Text style={s.notice}>{notice}</Text>:null}
   {error?<Text style={s.error}>{error}</Text>:null}
   <Pressable style={s.refresh} onPress={()=>void refresh()} disabled={loadingList}><Text style={s.refreshText}>↻  Refresh discovery</Text></Pressable>
  </ScrollView>
  <LoveBindNav active="discover"/>
  <Modal visible={matched!==null} transparent animationType="fade" onRequestClose={()=>setMatched(null)}>
    <View style={s.modalBack}><View style={s.modalCard}>
      <Text style={s.modalHeart}>♡</Text>
      <Text style={s.matchTitle}>It's a match!</Text>
      <Text style={s.matchBody}>You both liked each other. Start a meaningful conversation.</Text>
      <Pressable style={s.primary} onPress={()=>{
        const id=matched;
        if(id){setMatched(null);router.push({pathname:'/conversations/[matchId]',params:{matchId:id}});}
      }}><Text style={s.primaryText}>Say hello →</Text></Pressable>
      <Pressable onPress={()=>setMatched(null)} style={s.modalLater}><Text style={s.later}>Keep discovering</Text></Pressable>
    </View></View>
  </Modal>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:Love.paper},center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:Love.paper},scroll:{flex:1},content:{maxWidth:520,width:'100%',alignSelf:'center',paddingHorizontal:24,paddingTop:22,paddingBottom:40},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:42},headerTag:{color:Love.wine,fontSize:11,letterSpacing:2,fontWeight:'700'},
 eyebrow:{color:Love.wine,fontSize:10,letterSpacing:2,fontWeight:'700'},title:{fontFamily:serif,color:Love.ink,fontSize:39,marginTop:10},dot:{color:Love.blush},
 description:{fontSize:14,color:Love.muted,lineHeight:23,marginTop:8,marginBottom:25},loading:{padding:80},
 panel:{backgroundColor:Love.white,padding:23,borderWidth:1,borderColor:Love.line,borderRadius:15,gap:16},
 kicker:{color:Love.wine,fontWeight:'700',letterSpacing:1.6,fontSize:10},panelTitle:{fontFamily:serif,fontSize:30,color:Love.ink,lineHeight:38},
 body:{color:Love.muted,lineHeight:22,fontSize:14},note:{fontSize:12,color:Love.muted,lineHeight:20},
 option:{borderTopWidth:1,borderTopColor:Love.line,paddingVertical:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 optionText:{color:Love.ink,fontSize:14,fontWeight:'600',flex:1},arrow:{color:Love.wine,fontSize:19},
 primary:{backgroundColor:Love.wine,padding:17,borderRadius:11,alignItems:'center'},primaryText:{color:Love.white,fontWeight:'800',fontSize:15},
 profileCard:{backgroundColor:Love.white,overflow:'hidden',borderRadius:17,borderWidth:1,borderColor:Love.line},
 imageFrame:{height:330,backgroundColor:'#E7DAD4',position:'relative'},photo:{width:'100%',height:'100%'},
 photoFallback:{flex:1,justifyContent:'center',alignItems:'center'},photoFallbackText:{fontSize:75,color:Love.blush},
 photoBadge:{position:'absolute',bottom:14,left:14,paddingHorizontal:11,paddingVertical:8,borderRadius:30,backgroundColor:Love.white},
 badgeText:{color:Love.wine,fontSize:10,fontWeight:'800',letterSpacing:1},profileBody:{padding:23,gap:12},
 name:{fontFamily:serif,color:Love.ink,fontSize:34},city:{color:Love.muted,fontSize:14},intention:{color:Love.wine,fontWeight:'700',fontSize:14},
 bio:{color:Love.ink,fontSize:15,lineHeight:24,marginVertical:4},tags:{flexDirection:'row',gap:7,flexWrap:'wrap'},
 tag:{paddingHorizontal:11,paddingVertical:7,borderRadius:25,backgroundColor:'#F6E8E8'},tagText:{fontSize:12,color:Love.wine},
 values:{fontSize:11,color:Love.muted,letterSpacing:0.5,marginVertical:4},
 actions:{flexDirection:'row',gap:12,marginTop:10},pass:{flex:1,padding:17,borderWidth:1,borderColor:Love.line,borderRadius:12,alignItems:'center'},
 passText:{fontSize:14,fontWeight:'700',color:Love.muted},like:{flex:1.3,padding:17,backgroundColor:Love.wine,borderRadius:12,alignItems:'center'},
 likeText:{fontSize:16,fontWeight:'800',color:Love.white},safetyButton:{alignSelf:'center',padding:12},
 safetyLabel:{fontSize:12,color:Love.muted,textDecorationLine:'underline'},safetyPanel:{gap:12,padding:18,backgroundColor:Love.paper,borderRadius:12},
 danger:{fontSize:14,fontWeight:'700',color:Love.error},confirm:{gap:13},label:{fontWeight:'700',fontSize:12,color:Love.ink},
 report:{paddingVertical:10,borderBottomWidth:1,borderColor:Love.line},
 notice:{color:Love.wine,textAlign:'center',padding:12,marginTop:10,fontSize:13},
 modalBack:{flex:1,backgroundColor:'rgba(30,15,28,.55)',alignItems:'center',justifyContent:'center',padding:25},
 modalCard:{width:'100%',maxWidth:460,backgroundColor:Love.white,borderRadius:20,padding:30,gap:18},
 modalHeart:{fontSize:62,color:Love.blush,textAlign:'center'},modalLater:{alignItems:'center',padding:10},
 matchTitle:{fontFamily:serif,color:Love.wine,fontSize:30},matchBody:{color:Love.ink,fontSize:14,lineHeight:22},
 later:{color:Love.wine,textAlign:'center',padding:8,fontWeight:'700'},
 error:{color:Love.error,backgroundColor:Love.errorBg,padding:14,marginTop:16,borderRadius:8,fontSize:13},
 refresh:{padding:18,marginTop:15,alignItems:'center'},refreshText:{color:Love.wine,fontWeight:'700',fontSize:13},
});
