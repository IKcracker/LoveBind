import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, FormButton, Love, serif } from '@/components/auth-screens';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

type Match={id:string;name:string;city:string|null;createdAt:string;memberId:string};
export default function Connections(){
 const {user,token,loading}=useSession();
 const [matches,setMatches]=useState<Match[]|null>(null);
 const [error,setError]=useState('');
 const [loadingData,setLoadingData]=useState(false);
 async function refresh(){
  if(!token)return;setLoadingData(true);
  try{const result=await apiRequest<{matches:Match[]}>('/discovery/matches','GET',undefined,token);
    setMatches(result.matches);setError('');
  }catch(e){setError(e instanceof Error?e.message:'Unable to load connections');}
  finally{setLoadingData(false);}
 }
 useEffect(()=>{void refresh()},[token]);
 if(loading)return <View style={s.center}><ActivityIndicator color={Love.wine}/></View>;
 if(!user||!token)return <Redirect href="/login"/>;
 return <SafeAreaView style={s.safe}><View style={{flex:1}}><ScrollView contentContainerStyle={s.content}>
  <View style={s.top}><BrandLockup/></View>
  <Text style={s.kicker}>YOUR CONNECTIONS</Text>
  <Text style={s.title}>A mutual spark.</Text>
  <Text style={s.description}>Connections appear here when both members express interest. Only currently eligible profiles are shown.</Text>
  {error?<View style={s.panel}><Text style={s.description}>{error}</Text><FormButton text="Retry" secondary onPress={()=>void refresh()}/></View>:null}
  {loadingData?<ActivityIndicator color={Love.wine}/>:null}
  {matches?.map(m=><View key={m.id} style={s.match}>
    <View style={s.avatar}><Text style={s.heart}>♡</Text></View>
    <View style={s.info}><Text style={s.name}>{m.name}</Text><Text style={s.meta}>{m.city||'Location undisclosed'}</Text><Text style={s.meta}>Matched {new Date(m.createdAt).toLocaleDateString()}</Text></View>
    <Text style={s.heart}>♡</Text>
  </View>)}
  {matches?.length===0&&!error?<View style={s.panel}>
   <Text style={s.panelTitle}>Great connections take two.</Text>
   <Text style={s.description}>You have not matched yet. Browse verified members and express interest when someone feels right.</Text>
   <FormButton text="Discover members" onPress={()=>router.push('/(member)/discover')}/>
  </View>:null}
  {matches?.length? <View style={s.panel}><Text style={s.panelTitle}>What happens next?</Text><Text style={s.description}>We are building private conversations and a shared compatibility quiz. We will not display fake conversations or enable date bookings before those safety checks are ready.</Text></View>:null}
  <Pressable onPress={()=>void refresh()}><Text style={[s.link,{textAlign:'center',padding:15}]}>Refresh connections</Text></Pressable>
 </ScrollView></View></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:Love.paper},center:{flex:1,justifyContent:'center',alignItems:'center'},
 content:{maxWidth:540,width:'100%',alignSelf:'center',padding:24,paddingBottom:45,gap:18},
 top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},
 link:{fontSize:14,color:Love.wine,fontWeight:'700'},kicker:{fontSize:10,color:Love.wine,fontWeight:'800',letterSpacing:2},
 title:{fontFamily:serif,fontSize:39,color:Love.ink},description:{fontSize:14,color:Love.muted,lineHeight:23},
 panel:{borderRadius:16,backgroundColor:Love.white,padding:22,gap:15,borderWidth:1,borderColor:Love.line},
 panelTitle:{fontFamily:serif,fontSize:27,color:Love.ink},
 match:{backgroundColor:Love.white,borderRadius:14,padding:16,flexDirection:'row',gap:14,alignItems:'center',borderColor:Love.line,borderWidth:1},
 avatar:{width:54,height:54,borderRadius:27,backgroundColor:'#F7EAED',alignItems:'center',justifyContent:'center'},
 heart:{color:Love.wine,fontSize:27},info:{flex:1,gap:3},name:{color:Love.ink,fontWeight:'700',fontSize:17},
 meta:{fontSize:12,color:Love.muted}
});