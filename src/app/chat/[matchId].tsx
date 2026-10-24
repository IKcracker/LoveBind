import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Love, serif } from '@/components/auth-screens';
import { Icon } from '@/components/icon';
import { LoadingScreen, Notice } from '@/components/member-ui';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

type Message={id:string;senderId:string;content:string;createdAt:string};
type Thread={matchId:string;other:{id:string;name:string};messages:Message[];nextCursor:string|null};

export default function ConversationScreen(){
 const {matchId}=useLocalSearchParams<{matchId?:string}>();
 const {user,token,loading}=useSession();
 const [thread,setThread]=useState<Thread|null>(null);
 const [text,setText]=useState('');
 const [error,setError]=useState<string|null>(null);
 const [sending,setSending]=useState(false);
 const [historyBusy,setHistoryBusy]=useState(false);
 const [refreshCount,setRefreshCount]=useState(0);
 const validId=typeof matchId==='string'&&/^[A-Za-z0-9_-]{10,100}$/.test(matchId);
 const reload=useCallback(()=>setRefreshCount(n=>n+1),[]);
 useEffect(()=>{
  if(!token||!validId)return;
  let live=true;
  apiRequest<Thread>('/conversations/'+encodeURIComponent(matchId)+'/messages','GET',undefined,token)
   .then(t=>{if(live){setThread(t);setError(null);}})
   .catch(e=>{if(live)setError(e instanceof Error?e.message:'Could not load the conversation')});
  return()=>{live=false};
 },[token,matchId,validId,refreshCount]);

 async function earlier(){
  if(!token||!thread?.nextCursor||!validId||historyBusy)return;
  setHistoryBusy(true);
  try{
   const older=await apiRequest<Thread>('/conversations/'+encodeURIComponent(matchId)+'/messages?cursor='+
    encodeURIComponent(thread.nextCursor),'GET',undefined,token);
   setThread(prev=>prev?{...prev,messages:[...older.messages,...prev.messages],nextCursor:older.nextCursor}:older);
  }catch(e){setError(e instanceof Error?e.message:'Could not load earlier messages')}
  finally{setHistoryBusy(false)}
 }
 async function send(){
  if(!token||!validId||sending||!text.trim())return;
  setSending(true);setError(null);
  try{
   const response=await apiRequest<{message:Message}>('/conversations/'+encodeURIComponent(matchId)+'/messages',
    'POST',{content:text.trim()},token);
   setText('');
   setThread(prev=>prev?{...prev,messages:[...prev.messages,response.message]}:prev);
  }catch(e){setError(e instanceof Error?e.message:'Could not send message')}
  finally{setSending(false)}
 }
 if(loading)return <LoadingScreen/>;
 if(!user||!token)return <Redirect href="/login"/>;
 if(!validId)return <View style={s.center}><Text style={s.error}>Invalid conversation</Text></View>;
 return <SafeAreaView style={s.safe} edges={['top','bottom','left','right']}>
  <View style={s.header}>
   <Pressable accessibilityRole="button" accessibilityLabel="Back to matches" onPress={()=>router.navigate('/matches')} style={s.headerAction}><Icon name="back" size={22} color={Love.ink}/></Pressable>
   <View style={s.headerTitle}><Text style={s.member}>{thread?.other.name||'Private chat'}</Text><Text style={s.hint}>Verified connection · Private chat</Text></View>
   <Pressable accessibilityRole="button" accessibilityLabel="Refresh messages" onPress={reload} style={s.headerAction}><Icon name="refresh" size={20} color={Love.wine}/></Pressable>
   {thread?<Pressable accessibilityRole="button" accessibilityLabel="Safety options" onPress={()=>router.push({pathname:'/member-safety',params:{memberId:thread.other.id,name:thread.other.name,matchId}})} style={s.headerAction}>
      <Icon name="shield" size={22} color={Love.wine}/></Pressable>:<View style={s.headerAction}/>}
  </View>
  {error?<View style={s.errorBox}><Notice tone="error" message={error}/><Pressable onPress={reload}><Text style={s.retry}>Retry</Text></Pressable></View>:null}
  <KeyboardAvoidingView style={s.body} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={8}>
   <ScrollView contentContainerStyle={s.messages} keyboardShouldPersistTaps="handled">
    {thread?.nextCursor?<Pressable disabled={historyBusy} onPress={()=>void earlier()} style={s.loadEarlier}><Text style={s.retry}>{historyBusy?'Loading…':'Load earlier messages'}</Text></Pressable>:null}
    {!thread&&!error?<ActivityIndicator color={Love.wine}/>:null}
    {thread&&!thread.messages.length?<View style={s.empty}><Text style={s.emptyHeading}>A little hello goes a long way.</Text><Text style={s.emptyBody}>You both expressed interest. Take your time, stay respectful, and get to know each other.</Text></View>:null}
    {thread?.messages.map(m=>{
     const mine=m.senderId===user.id;
     return <View key={m.id} style={[s.bubble,mine?s.mine:s.theirs]}>
      <Text style={[s.messageText,mine?s.mineText:s.theirsText]}>{m.content}</Text>
      <Text style={[s.time,mine&&s.mineText]}>{new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</Text>
     </View>
    })}
   </ScrollView>
   <View style={s.composer}>
    <TextInput value={text} onChangeText={setText} multiline maxLength={1500}
      placeholder="Say something thoughtful…" placeholderTextColor={Love.mutedSoft}
      accessibilityLabel="Message" style={s.input}/>
    <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={sending||!text.trim()||!thread}
      onPress={()=>void send()} style={[s.send,(sending||!text.trim()||!thread)&&s.disabled]}>
      {sending?<ActivityIndicator color={Love.white}/>:<Icon name="chevron" size={22} color={Love.white}/>}
    </Pressable>
   </View>
  </KeyboardAvoidingView>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:Love.paper},body:{flex:1},
 center:{flex:1,justifyContent:'center',alignItems:'center'},
 header:{flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:Love.line,backgroundColor:Love.white,paddingVertical:7,paddingHorizontal:10,gap:8},
 headerAction:{height:46,width:44,alignItems:'center',justifyContent:'center'},
 headerTitle:{flex:1,gap:3},member:{fontWeight:'800',color:Love.ink,fontSize:16},
 hint:{fontSize:11,color:Love.muted},messages:{flexGrow:1,paddingHorizontal:18,paddingTop:22,paddingBottom:32,gap:12},
 loadEarlier:{paddingVertical:9,alignItems:'center'},retry:{fontSize:13,color:Love.wine,fontWeight:'800',textAlign:'center'},
 empty:{flex:1,alignItems:'center',justifyContent:'center',gap:12,paddingHorizontal:25,paddingVertical:50},
 emptyHeading:{fontFamily:serif,fontSize:27,color:Love.ink,textAlign:'center'},
 emptyBody:{fontSize:14,lineHeight:22,color:Love.muted,textAlign:'center'},
 bubble:{maxWidth:'84%',paddingHorizontal:15,paddingVertical:11,borderRadius:17,gap:4},
 mine:{backgroundColor:Love.wine,alignSelf:'flex-end',borderBottomRightRadius:5},
 theirs:{backgroundColor:Love.white,borderWidth:1,borderColor:Love.line,alignSelf:'flex-start',borderBottomLeftRadius:5},
 messageText:{fontSize:15,lineHeight:22},mineText:{color:Love.white},theirsText:{color:Love.ink},
 time:{fontSize:10,color:Love.muted,textAlign:'right',opacity:0.8},
 composer:{flexDirection:'row',alignItems:'flex-end',paddingHorizontal:15,paddingVertical:12,gap:10,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:Love.line,backgroundColor:Love.white},
 input:{flex:1,color:Love.ink,fontSize:15,lineHeight:21,minHeight:44,maxHeight:110,borderColor:Love.line,borderWidth:1,borderRadius:20,paddingHorizontal:15,paddingVertical:10,backgroundColor:Love.paper},
 send:{width:45,height:45,borderRadius:23,backgroundColor:Love.wine,alignItems:'center',justifyContent:'center',transform:[{rotate:'-90deg'}]},
 disabled:{opacity:0.35},errorBox:{paddingHorizontal:14,paddingVertical:8,gap:6},error:{color:Love.error}
});