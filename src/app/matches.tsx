import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, Love, serif } from '@/components/auth-screens';
import { LoveBindNav } from '@/components/lovebind-nav';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { MatchCard, SocialAccess } from '@/lib/social';

export default function MatchesScreen() {
 const {loading,user,token}=useSession();
 const [items,setItems]=useState<MatchCard[]>([]);
 const [access,setAccess]=useState<SocialAccess|null>(null);
 const [pending,setPending]=useState(true);
 const [error,setError]=useState<string|null>(null);
 async function load(){
  if(!token)return;setPending(true);setError(null);
  try {
   const a=await apiRequest<SocialAccess>('/social/access','GET',undefined,token);
   setAccess(a);
   if(a.ready){const r=await apiRequest<{matches:MatchCard[]}>('/social/matches','GET',undefined,token);setItems(r.matches);}
   else setItems([]);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load matches');}
  finally{setPending(false)}
 }
 useEffect(()=>{if(token)void load();},[token]);
 if(loading)return <View style={s.loading}><ActivityIndicator color={Love.wine}/></View>;
 if(!token||!user)return <Redirect href="/login"/>;
 return <SafeAreaView style={s.safe}>
  <ScrollView style={s.scroll} contentContainerStyle={s.container}>
   <View style={s.header}><BrandLockup/><Text style={s.eyebrow}>YOUR CONNECTIONS</Text></View>
   <Text style={s.title}>A little spark<Text style={s.dot}>.</Text></Text>
   <Text style={s.description}>When the feeling is mutual, you can start talking here.</Text>
   {pending?<ActivityIndicator size="large" color={Love.wine}/>:
    access?.ready===false?<View style={s.empty}>
      <Text style={s.emptyTitle}>Your connections are waiting.</Text>
      <Text style={s.emptyBody}>Once your identity and profile photo are approved, you can discover members and build real connections.</Text>
      <Pressable onPress={()=>router.push('/verification')} style={s.cta}><Text style={s.ctaText}>Complete verification →</Text></Pressable>
    </View>:
    items.length?<View style={s.list}>{items.map(item=><Pressable key={item.id} style={s.matchRow} onPress={()=>router.push({pathname:'/conversations/[matchId]',params:{matchId:item.id}})} accessibilityRole="button">
      {item.photoUrl?<Image source={{uri:item.photoUrl}} style={s.avatar}/>:
        <View style={s.avatarPlaceholder}><Text style={s.heart}>♡</Text></View>}
      <View style={s.matchMeta}><Text style={s.matchName}>{item.name}</Text><Text style={s.matchSub}>{item.city??'Location not shared'} · Say hello</Text></View>
      <Text style={s.arrow}>→</Text>
     </Pressable>)}</View>:
    <View style={s.empty}>
      <Text style={s.heartLarge}>♡</Text><Text style={s.emptyTitle}>Every story begins somewhere.</Text>
      <Text style={s.emptyBody}>You have no mutual matches yet. Browse member profiles and send a like to someone who catches your interest.</Text>
      <Pressable onPress={()=>router.push('/explore')} style={s.cta}><Text style={s.ctaText}>Explore people →</Text></Pressable>
    </View>}
   {error?<Text style={s.error}>{error}</Text>:null}
   <Pressable style={s.refresh} onPress={()=>void load()} accessibilityRole="button"><Text style={s.refreshText}>↻  Refresh matches</Text></Pressable>
  </ScrollView>
  <LoveBindNav active="matches"/>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:Love.paper},loading:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:Love.paper},
 scroll:{flex:1},container:{maxWidth:520,width:'100%',alignSelf:'center',padding:25,paddingBottom:45},
 header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingBottom:48},
 eyebrow:{fontWeight:'800',fontSize:10,letterSpacing:1.7,color:Love.wine},
 title:{fontFamily:serif,fontSize:43,color:Love.ink},dot:{color:Love.blush},
 description:{fontSize:15,lineHeight:23,color:Love.muted,marginTop:12,marginBottom:35},
 list:{borderTopWidth:1,borderColor:Love.line},matchRow:{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:18,borderBottomWidth:1,borderColor:Love.line},
 avatar:{width:67,height:67,borderRadius:33.5},avatarPlaceholder:{width:67,height:67,borderRadius:33.5,backgroundColor:'#F1DEE4',alignItems:'center',justifyContent:'center'},
 heart:{fontSize:32,color:Love.wine},matchMeta:{flex:1,gap:6},matchName:{fontFamily:serif,fontSize:23,color:Love.ink},
 matchSub:{fontSize:13,color:Love.muted},arrow:{fontSize:22,color:Love.wine},
 empty:{backgroundColor:Love.white,borderRadius:16,borderColor:Love.line,borderWidth:1,padding:26,gap:18},
 heartLarge:{fontFamily:serif,fontSize:57,color:Love.blush,textAlign:'center'},
 emptyTitle:{fontFamily:serif,fontSize:29,lineHeight:37,color:Love.ink},
 emptyBody:{fontSize:15,lineHeight:24,color:Love.muted},
 cta:{backgroundColor:Love.wine,paddingVertical:17,borderRadius:12,alignItems:'center'},
 ctaText:{fontSize:15,fontWeight:'800',color:Love.white},
 error:{color:Love.error,backgroundColor:Love.errorBg,padding:13,borderRadius:8,marginTop:12},
 refresh:{padding:17,alignItems:'center',marginTop:15},refreshText:{color:Love.wine,fontWeight:'700',fontSize:13},
});
