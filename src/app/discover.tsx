import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, FormButton, Love, serif } from '@/components/auth-screens';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

type Candidate={id:string;name:string;age:number;city:string|null;bio:string|null;
  occupation:string|null;relationshipGoal:string|null;interests:string[];coreValues:string[];photoUrl:string|null};
type Result={needsOptIn:boolean;candidates:Candidate[]};
export default function Discover() {
 const {user,token,loading,refresh}=useSession();
 const [data,setData]=useState<Result|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const load=useCallback(async()=>{
  if(!token)return;
  try{setData(await apiRequest<Result>('/discovery','GET',undefined,token));setError('');}
  catch(e){setError(e instanceof Error?e.message:'Unable to load discovery');}
 },[token]);
 useEffect(()=>{void Promise.resolve().then(load);},[load]);
 async function optIn(visible:boolean) {
  if(!token||busy)return;
  setBusy(true);setError('');
  try{
   await apiRequest('/profiles/me/visibility','PUT',{visible},token);
   await refresh();await load();
   setNotice(visible?'You are now visible to eligible members.':'Your profile is hidden from discovery.');
  }catch(e){setError(e instanceof Error?e.message:'Unable to update visibility');}
  finally{setBusy(false);}
 }
 async function like(id:string){
  if(!token||busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const res=await apiRequest<{matched:boolean}>('/discovery/'+encodeURIComponent(id)+'/like','POST',{},token);
   setNotice(res.matched?'It is mutual! You have a new connection.':'Interest sent privately. A match appears only if they like you too.');
   setData(x=>x?{...x,candidates:x.candidates.filter(c=>c.id!==id)}:x);
  }catch(e){setError(e instanceof Error?e.message:'Unable to send interest');}
  finally{setBusy(false);}
 }
 if(loading)return <View style={s.center}><ActivityIndicator color={Love.wine}/></View>;
 if(!user||!token)return <Redirect href="/login"/>;
 const card=data?.candidates[0];
 return <SafeAreaView style={s.safe}><View style={{flex:1}}><ScrollView contentContainerStyle={s.content}>
  <View style={s.top}><BrandLockup/></View>
  <Text style={s.kicker}>DISCOVER · REAL CONNECTIONS</Text>
  <Text style={s.title}>Find your kind of person.</Text>
  <Text style={s.sub}>Every profile is verified, photo-approved and chosen using mutual age, location and relationship preferences.</Text>
  {error?<View style={s.error}><Text style={s.errorText}>{error}</Text><Pressable onPress={()=>void load()}><Text style={s.link}>Try again</Text></Pressable></View>:null}
  {notice?<View style={s.notice}><Text style={s.noticeText}>{notice}</Text></View>:null}
  {data?.needsOptIn?<View style={s.panel}><Text style={s.panelTitle}>Ready to be discovered?</Text>
   <Text style={s.panelText}>Your dating profile is private by default. Choose to become visible only to eligible verified adults. You can turn this off any time.</Text>
   <FormButton text="Join discovery" busy={busy} onPress={()=>void optIn(true)}/>
   <Pressable onPress={()=>router.push('/preferences')}><Text style={s.link}>Edit who you are looking for →</Text></Pressable></View>:null}
  {data&&!data.needsOptIn&&<View style={s.tools}>
    <Text style={s.meta}>VISIBLE TO ELIGIBLE MEMBERS</Text>
    <Pressable disabled={busy} onPress={()=>void optIn(false)}><Text style={s.link}>Hide my profile</Text></Pressable>
   </View>}
  {card&&<View style={s.profile}>
    {card.photoUrl?<Image source={{uri:card.photoUrl}} style={s.image} resizeMode="cover"/>:
      <View style={s.placeholder}><Text style={s.placeholderText}>A meaningful connection starts here ♡</Text></View>}
    <View style={s.profileContent}><Text style={s.person}>{card.name}, {card.age}</Text>
      <Text style={s.city}>{[card.city,card.occupation].filter(Boolean).join(' · ')}</Text>
      <Text style={s.bio}>{card.bio}</Text>
      <Text style={s.section}>Looking for</Text><Text style={s.detail}>{card.relationshipGoal||'A genuine connection'}</Text>
      <Text style={s.section}>Interests</Text><View style={s.tags}>{card.interests.map(x=><Text key={x} style={s.tag}>{x}</Text>)}</View>
      <Text style={s.section}>Core values</Text><View style={s.tags}>{card.coreValues.map(x=><Text key={x} style={s.tag}>{x}</Text>)}</View>
      <FormButton text="I'm interested ♡" busy={busy} onPress={()=>void like(card.id)}/>
      <Pressable disabled={busy} onPress={()=>setData(d=>d?{...d,candidates:d.candidates.slice(1)}:d)} style={s.skip}><Text style={s.link}>Maybe later →</Text></Pressable>
    </View>
  </View>}
  {data&&!data.needsOptIn&&!card?<View style={s.panel}>
    <Text style={s.panelTitle}>A little patience, a better connection.</Text>
    <Text style={s.panelText}>No new people currently meet both your preferences. Adjust your preferences or check back when more members join.</Text>
    <FormButton text="Edit partner preferences" secondary onPress={()=>router.push('/preferences')}/>
    <FormButton text="Refresh discovery" secondary onPress={()=>void load()}/>
  </View>:null}
  {!data&&!error?<ActivityIndicator color={Love.wine}/>:null}
 </ScrollView></View></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:Love.paper},center:{flex:1,justifyContent:'center',alignItems:'center'},
 content:{width:'100%',maxWidth:540,alignSelf:'center',padding:24,paddingBottom:50,gap:18},
 top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},
 link:{color:Love.wine,fontWeight:'700',fontSize:14},kicker:{fontSize:10,color:Love.wine,letterSpacing:2,fontWeight:'800'},
 title:{fontFamily:serif,fontSize:39,lineHeight:45,color:Love.ink},
 sub:{fontSize:14,color:Love.muted,lineHeight:23},tools:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 meta:{fontSize:10,fontWeight:'700',color:'#286847',letterSpacing:0.6},
 panel:{backgroundColor:Love.white,borderWidth:1,borderColor:Love.line,borderRadius:16,padding:23,gap:17},
 panelTitle:{fontFamily:serif,fontSize:27,color:Love.ink},panelText:{fontSize:14,color:Love.muted,lineHeight:22},
 profile:{backgroundColor:Love.white,borderRadius:18,overflow:'hidden',borderWidth:1,borderColor:Love.line},
 image:{width:'100%',height:350},placeholder:{height:220,backgroundColor:'#F3E5E7',justifyContent:'center',alignItems:'center',padding:20},
 placeholderText:{fontFamily:serif,fontSize:27,color:Love.wine,textAlign:'center'},
 profileContent:{padding:22,gap:12},person:{fontFamily:serif,color:Love.ink,fontSize:32},
 city:{color:Love.muted,fontSize:13},bio:{fontSize:15,lineHeight:23,color:Love.ink},
 section:{fontSize:11,color:Love.wine,fontWeight:'800',letterSpacing:1,marginTop:7},
 detail:{color:Love.ink,fontSize:14},tags:{flexDirection:'row',gap:8,flexWrap:'wrap'},
 tag:{paddingVertical:7,paddingHorizontal:11,backgroundColor:'#F5ECEB',color:Love.wine,borderRadius:16,fontSize:12},
 skip:{alignItems:'center',padding:10},
 notice:{backgroundColor:'#E7F2EA',borderRadius:12,padding:14},noticeText:{color:'#256544',fontSize:13,lineHeight:20},
 error:{backgroundColor:Love.errorBg,padding:14,borderRadius:10,gap:10},errorText:{color:Love.error,fontSize:13}
});