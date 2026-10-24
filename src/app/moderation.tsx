import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, Love, serif } from '@/components/auth-screens';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

type Review = { userId:string; displayName:string; submittedAt:string; photoUrl:string };
export default function ModerationScreen() {
 const { loading, user, token } = useSession();
 const [allowed,setAllowed]=useState<boolean|null>(null);
 const [photos,setPhotos]=useState<Review[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [reason,setReason]=useState<Record<string,string>>({});
 const [notice,setNotice]=useState('');
 useEffect(()=>{
  if(!token)return;
  let active=true;
  apiRequest<{canModerate:boolean}>('/moderation/access','GET',undefined,token)
   .then(x=>{if(active)setAllowed(x.canModerate);})
   .catch(()=>{if(active)setAllowed(false);});
  return()=>{active=false};
 },[token]);
 useEffect(()=>{
  if(!token||allowed!==true)return;
  let active=true;
  apiRequest<{photos:Review[]}>('/moderation/photos','GET',undefined,token)
   .then(x=>{if(active)setPhotos(x.photos);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load moderation queue');});
  return()=>{active=false};
 },[token,allowed]);
 async function refresh(){
  if(!token||busy)return;setError(null);
  try{const r=await apiRequest<{photos:Review[]}>('/moderation/photos','GET',undefined,token);setPhotos(r.photos);}
  catch(e){setError(e instanceof Error?e.message:'Unable to refresh reviews');}
 }
 async function review(item:Review,decision:'APPROVED'|'REJECTED'){
  if(!token||busy)return;
  if(decision==='REJECTED'&&(reason[item.userId]??'').trim().length<5){
   setError('Please provide a rejection reason of at least five characters.');return;
  }
  setBusy(true);setError(null);setNotice('');
  try {
   const result=await apiRequest<{status:string;accountActive:boolean}>(
    '/moderation/photos/'+encodeURIComponent(item.userId)+'/decision',
    'POST',{decision,reason:(reason[item.userId]??'').trim()},token);
   setPhotos(current=>current.filter(x=>x.userId!==item.userId));
   setNotice(result.status==='APPROVED'
    ? 'Photo approved. '+(result.accountActive?'Account activated.':'Account remains pending identity and age evidence.')
    : 'Photo rejected; member may upload a new one.');
  }catch(e){setError(e instanceof Error?e.message:'Photo review failed');}
  finally{setBusy(false)}
 }
 if(loading)return <View style={s.loading}><ActivityIndicator color={Love.wine}/></View>;
 if(!user||!token)return <Redirect href="/login"/>;
 if(allowed===null)return <View style={s.loading}><ActivityIndicator color={Love.wine}/></View>;
 if(!allowed)return <SafeAreaView style={s.safe}><View style={s.denied}><Text style={s.title}>Not available.</Text>
  <Text style={s.description}>Only authorized LoveBind moderators can review photos.</Text>
  <Pressable onPress={()=>router.replace('/')}><Text style={s.link}>Back to LoveBind</Text></Pressable>
 </View></SafeAreaView>;
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <View style={s.header}><BrandLockup/><Pressable onPress={()=>router.canGoBack()?router.back():router.replace('/profile')} hitSlop={10} accessibilityRole="button"><Text style={s.link}>Done</Text></Pressable></View>
  <Text style={s.eyebrow}>RESTRICTED · LOVE BIND TRUST TEAM</Text>
  <Text style={s.title}>Photo review.</Text>
  <Text style={s.description}>Review the submitted profile photo, not the member’s identity document. Approved photos remain private until the member meets every account requirement.</Text>
  <Text style={s.counter}>{photos.length} awaiting review</Text>
  {photos.map(p=><View style={s.card} key={p.userId}>
    <Text style={s.name}>{p.displayName}</Text>
    <Text style={s.meta}>Submitted {new Date(p.submittedAt).toLocaleDateString()}</Text>
    <Image style={s.photo} source={{uri:p.photoUrl}} resizeMode="contain"/>
    <Text style={s.note}>Check the image for authenticity, safety and policy compliance. Do not approve your own account.</Text>
    <Pressable disabled={busy} style={s.approve} onPress={()=>void review(p,'APPROVED')}>
      <Text style={s.approveText}>Approve photograph</Text></Pressable>
    <TextInput multiline placeholder="Reason for rejecting (required)" value={reason[p.userId]??''}
      onChangeText={v=>setReason(x=>({...x,[p.userId]:v}))} maxLength={500}
      placeholderTextColor={Love.muted} style={s.input} accessibilityLabel="Rejection reason"/>
    <Pressable disabled={busy} style={s.reject} onPress={()=>void review(p,'REJECTED')}>
      <Text style={s.rejectText}>Reject photograph</Text></Pressable>
   </View>)}
  {photos.length===0?<View style={s.empty}><Text style={s.emptyHeading}>All caught up.</Text>
    <Text style={s.description}>There are no pending profile photos right now.</Text></View>:null}
  {notice?<Text style={s.success}>{notice}</Text>:null}
  {error?<Text style={s.error}>{error}</Text>:null}
  <Pressable onPress={()=>void refresh()} style={s.refresh}><Text style={s.link}>↻ Refresh moderation queue</Text></Pressable>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:Love.paper},loading:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:Love.paper},
 content:{paddingHorizontal:24,paddingVertical:25,maxWidth:520,width:'100%',alignSelf:'center',gap:20},
 denied:{flex:1,justifyContent:'center',padding:32,gap:24},
 header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:35},
 eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.5,color:Love.wine},title:{fontSize:43,fontFamily:serif,color:Love.ink},
 description:{fontSize:14,lineHeight:22,color:Love.muted},link:{color:Love.wine,fontWeight:'700',fontSize:14},
 counter:{fontSize:13,fontWeight:'700',color:Love.wine},
 card:{backgroundColor:Love.white,borderWidth:1,borderColor:Love.line,borderRadius:14,padding:20,gap:14},
 name:{fontFamily:serif,fontSize:25,color:Love.ink},meta:{fontSize:12,color:Love.muted},
 photo:{width:'100%',height:315,backgroundColor:'#EDE4DF',borderRadius:11},
 note:{fontSize:12,color:Love.muted,lineHeight:19},approve:{backgroundColor:Love.wine,borderRadius:10,padding:16,alignItems:'center'},
 approveText:{color:Love.white,fontWeight:'800',fontSize:15},
 input:{height:84,backgroundColor:Love.paper,borderRadius:9,borderWidth:1,borderColor:Love.line,padding:12,color:Love.ink,textAlignVertical:'top'},
 reject:{borderRadius:10,borderWidth:1,borderColor:Love.error,padding:15,alignItems:'center'},
 rejectText:{color:Love.error,fontWeight:'700',fontSize:14},
 empty:{backgroundColor:Love.white,padding:25,borderWidth:1,borderColor:Love.line,borderRadius:12,gap:8},
 emptyHeading:{fontFamily:serif,fontSize:27,color:Love.ink},
 refresh:{paddingVertical:20,alignItems:'center'},
 success:{backgroundColor:'#E3F4EB',color:'#216544',padding:12,borderRadius:8},
 error:{backgroundColor:Love.errorBg,color:Love.error,padding:12,borderRadius:8},
});
