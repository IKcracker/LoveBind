import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, Love, serif } from '@/components/auth-screens';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';
type Like={id:string;name:string;city:string|null;age:number;relationshipGoal:string|null;receivedAt:string};
export default function Likes(){
 const {user,token,loading}=useSession();
 const [likes,setLikes]=useState<Like[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 useEffect(()=>{
   if(!token)return;
   let active=true;
   apiRequest<{likes:Like[]}>('/discovery/likes','GET',undefined,token)
     .then(x=>{if(active)setLikes(x.likes)})
     .catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load likes')});
   return()=>{active=false};
 },[token]);
 async function respond(id:string){
   if(!token||busy)return;
   setBusy(true);setError('');
   try{
     const result=await apiRequest<{matched:boolean}>('/discovery/'+encodeURIComponent(id)+'/like','POST',{},token);
     setLikes(current=>current.filter(x=>x.id!==id));
     if(result.matched)setNotice('It is mutual! Your new match is in Matches.');
     else setNotice('Interest sent.');
   }catch(e){setError(e instanceof Error?e.message:'Could not respond')}
   finally{setBusy(false)}
 }
 if(loading)return <View style={s.center}><ActivityIndicator color={Love.wine}/></View>;
 if(!user||!token)return <Redirect href="/login"/>;
 return <SafeAreaView style={s.safe} edges={['top','left','right']}><ScrollView contentContainerStyle={s.content}>
  <BrandLockup/>
  <Text style={s.eyebrow}>YOUR ADMIRERS</Text>
  <Text style={s.title}>Someone noticed you.</Text>
  <Text style={s.description}>Real interest from approved members, never simulated likes. Connections happen only when you both choose each other.</Text>
  {!!error&&<Text style={s.error}>{error}</Text>}
  {!!notice&&<Text style={s.notice}>{notice}</Text>}
  {likes.map(x=><View key={x.id} style={s.card}>
    <View style={s.avatar}><Text style={s.heart}>♡</Text></View>
    <View style={s.person}><Text style={s.name}>{x.name}, {x.age}</Text>
      <Text style={s.detail}>{x.city||'Location undisclosed'}</Text>
      <Text style={s.detail}>{x.relationshipGoal||'Looking for a connection'}</Text>
    </View>
    <Pressable disabled={busy} accessibilityRole="button" onPress={()=>void respond(x.id)} style={s.action}>
      <Text style={s.actionText}>Like back</Text>
    </Pressable>
  </View>)}
  {!likes.length&&!error&&<View style={s.empty}>
    <Text style={s.emptyIcon}>♡</Text><Text style={s.emptyTitle}>A connection is worth the wait.</Text>
    <Text style={s.description}>When someone likes you, you will see them here. Your profile must be visible in Discover to meet new people.</Text>
    <Pressable accessibilityRole="button" onPress={()=>router.push('/(member)/discover')} style={s.button}>
      <Text style={s.buttonText}>Explore people</Text>
    </Pressable>
  </View>}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:Love.paper},center:{flex:1,alignItems:'center',justifyContent:'center'},
 content:{width:'100%',maxWidth:550,alignSelf:'center',paddingHorizontal:24,paddingTop:28,paddingBottom:70,gap:18},
 eyebrow:{fontSize:11,color:Love.wine,letterSpacing:1.7,fontWeight:'800',marginTop:18},
 title:{fontSize:40,lineHeight:46,fontFamily:serif,color:Love.ink},
 description:{fontSize:14,lineHeight:23,color:Love.muted},
 card:{padding:18,backgroundColor:Love.white,borderColor:Love.line,borderWidth:1,borderRadius:18,
  flexDirection:'row',alignItems:'center',gap:13,flexWrap:'wrap'},
 avatar:{height:56,width:56,backgroundColor:'#F5E8ED',borderRadius:28,alignItems:'center',justifyContent:'center'},
 heart:{fontSize:28,color:Love.wine},person:{flex:1,gap:5,minWidth:130},
 name:{fontWeight:'800',fontSize:17,color:Love.ink},detail:{fontSize:12,color:Love.muted},
 action:{backgroundColor:Love.wine,paddingHorizontal:13,paddingVertical:12,borderRadius:12},
 actionText:{color:Love.white,fontSize:12,fontWeight:'800'},
 empty:{backgroundColor:Love.white,borderColor:Love.line,borderWidth:1,borderRadius:22,
 padding:30,alignItems:'center',gap:17,marginTop:15},
 emptyIcon:{fontSize:60,color:Love.blush},
 emptyTitle:{fontFamily:serif,fontSize:29,color:Love.ink,textAlign:'center'},
 button:{backgroundColor:Love.wine,paddingHorizontal:26,paddingVertical:16,borderRadius:14},
 buttonText:{color:Love.white,fontWeight:'800'},
 error:{padding:14,color:Love.error,backgroundColor:Love.errorBg,borderRadius:9},
 notice:{padding:14,color:'#256544',backgroundColor:'#E7F2EA',borderRadius:9},
});