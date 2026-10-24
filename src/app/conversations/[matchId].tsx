import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Love, serif } from '@/components/auth-screens';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { MatchCard, Message } from '@/lib/social';

export default function ConversationScreen(){
 const {matchId}=useLocalSearchParams<{matchId:string}>();
 const {loading,token,user}=useSession();
 const [match,setMatch]=useState<MatchCard|null>(null);
 const [messages,setMessages]=useState<Message[]>([]);
 const [draft,setDraft]=useState('');
 const [busy,setBusy]=useState(false);
 const [waiting,setWaiting]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const [options,setOptions]=useState(false);
 const [confirmBlock,setConfirmBlock]=useState(false);
 const scroll=useRef<ScrollViewInstance | null>(null);
 async function load(){
  if(!token||typeof matchId!=='string')return;
  setError(null);
  try{
   const result=await apiRequest<{matches:MatchCard[]}>('/social/matches','GET',undefined,token);
   const member=result.matches.find(x=>x.id===matchId);
   if(!member){setError('This conversation is no longer available.');setMatch(null);return;}
   setMatch(member);
   const history=await apiRequest<{messages:Message[]}>('/social/matches/'+encodeURIComponent(matchId)+'/messages','GET',undefined,token);
   setMessages(history.messages);
  }catch(e){setError(e instanceof Error?e.message:'Unable to open this conversation');}
  finally{setWaiting(false)}
 }
 useEffect(()=>{void load();},[token,matchId]);
 async function send(){
  if(!token||!match||!draft.trim()||busy)return;
  setBusy(true);setError(null);
  try{
   const saved=await apiRequest<Message>('/social/matches/'+encodeURIComponent(match.id)+'/messages','POST',{content:draft.trim()},token);
   setMessages(current=>[...current.filter(x=>x.id!==saved.id),saved]);
   setDraft('');
   requestAnimationFrame(()=>scroll.current?.scrollToEnd({animated:true}));
  }catch(e){setError(e instanceof Error?e.message:'Could not send this message');}
  finally{setBusy(false)}
 }
 async function block(){
  if(!token||!match||busy)return;
  setBusy(true);setError(null);
  try{await apiRequest('/social/blocks','POST',{memberId:match.memberId},token);router.replace('/matches');}
  catch(e){setError(e instanceof Error?e.message:'Unable to block this member');}
  finally{setBusy(false)}
 }
 if(loading)return <View style={s.center}><ActivityIndicator color={Love.wine}/></View>;
 if(!token||!user)return <Redirect href="/login"/>;
 return <SafeAreaView style={s.safe} edges={['top','left','right','bottom']}>
  <KeyboardAvoidingView style={s.flex} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={10}>
   <View style={s.header}>
    <Pressable accessibilityRole="button" onPress={()=>router.replace('/matches')} style={s.back}><Text style={s.backIcon}>‹</Text></Pressable>
    <View style={s.heading}><Text style={s.name}>{match?.name??'Conversation'}</Text><Text style={s.subhead}>A new connection starts with hello.</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Conversation safety" onPress={()=>setOptions(!options)} style={s.more}><Text style={s.moreText}>···</Text></Pressable>
   </View>
   {options&&match?<View style={s.options}>
    <Text style={s.optionHint}>Stay safe: never send money or share private documents with a new match.</Text>
    {!confirmBlock?<Pressable onPress={()=>setConfirmBlock(true)}><Text style={s.danger}>Block and close conversation</Text></Pressable>:
     <View style={s.confirm}><Text style={s.optionHint}>Are you sure? This will close your match.</Text><Pressable disabled={busy} onPress={()=>void block()}><Text style={s.danger}>Yes, block this member</Text></Pressable><Pressable onPress={()=>setConfirmBlock(false)}><Text style={s.cancel}>Cancel</Text></Pressable></View>}
   </View>:null}
   {waiting?<View style={s.center}><ActivityIndicator color={Love.wine}/></View>:
    <ScrollView style={s.flex} ref={scroll} contentContainerStyle={s.messages} onContentSizeChange={()=>scroll.current?.scrollToEnd({animated:false})}>
      {messages.length===0?<View style={s.hello}><Text style={s.helloIcon}>♡</Text><Text style={s.helloTitle}>Say hello, thoughtfully.</Text><Text style={s.helloDesc}>A thoughtful question about a shared interest makes a lovely start.</Text></View>:null}
      {messages.map(item=>{
       const mine=item.senderId===user.id;
       return <View key={item.id} style={[s.bubble,mine?s.mine:s.theirs]}>
        <Text style={[s.message,mine?s.mineText:s.theirText]}>{item.content}</Text>
        <Text style={[s.time,mine?s.mineTime:s.theirTime]}>{new Date(item.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</Text>
       </View>;
      })}
    </ScrollView>}
   {error?<Text style={s.error}>{error}</Text>:null}
   {match?<View style={s.composer}>
    <TextInput multiline maxLength={1500} value={draft} onChangeText={setDraft}
      placeholder="Write something thoughtful…" placeholderTextColor={Love.mutedSoft}
      accessibilityLabel="Your message" style={s.input}/>
    <Pressable style={[s.send,(!draft.trim()||busy)&&s.sendDisabled]}
      disabled={!draft.trim()||busy} accessibilityRole="button" onPress={()=>void send()}>
      <Text style={s.sendText}>{busy?'…':'↑'}</Text>
    </Pressable>
   </View>:null}
   <Pressable accessibilityRole="button" style={s.refresh} onPress={()=>void load()} disabled={waiting}>
    <Text style={s.refreshText}>↻ Refresh messages</Text>
   </Pressable>
  </KeyboardAvoidingView>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:Love.paper},flex:{flex:1},center:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:Love.paper},
 header:{minHeight:78,flexDirection:'row',alignItems:'center',backgroundColor:Love.white,borderBottomWidth:1,borderColor:Love.line,paddingHorizontal:13,gap:10},
 back:{width:38,alignItems:'center'},backIcon:{fontSize:36,color:Love.wine},heading:{flex:1,gap:4},name:{fontFamily:serif,fontSize:25,color:Love.ink},
 subhead:{fontSize:11,color:Love.muted},more:{padding:12},moreText:{fontSize:25,color:Love.wine},
 options:{padding:17,backgroundColor:'#F6E8E8',gap:15},optionHint:{fontSize:12,color:Love.ink,lineHeight:20},danger:{fontWeight:'700',color:Love.error,fontSize:14},
 confirm:{gap:13},cancel:{color:Love.wine,fontWeight:'700',fontSize:14},
 messages:{padding:19,paddingBottom:30,gap:12,flexGrow:1},hello:{alignItems:'center',justifyContent:'center',flex:1,gap:15,padding:22},
 helloIcon:{fontFamily:serif,fontSize:63,color:Love.blush},helloTitle:{fontFamily:serif,fontSize:27,color:Love.ink,textAlign:'center'},
 helloDesc:{fontSize:14,lineHeight:22,color:Love.muted,textAlign:'center'},
 bubble:{maxWidth:'82%',paddingHorizontal:15,paddingVertical:12,borderRadius:16,gap:6},mine:{backgroundColor:Love.wine,alignSelf:'flex-end',borderBottomRightRadius:4},
 theirs:{backgroundColor:Love.white,alignSelf:'flex-start',borderWidth:1,borderColor:Love.line,borderBottomLeftRadius:4},
 message:{fontSize:15,lineHeight:22},mineText:{color:Love.white},theirText:{color:Love.ink},time:{fontSize:10,alignSelf:'flex-end'},
 mineTime:{color:'#EBD8E1'},theirTime:{color:Love.muted},
 composer:{flexDirection:'row',padding:12,gap:10,alignItems:'flex-end',backgroundColor:Love.white,borderTopWidth:1,borderColor:Love.line},
 input:{flex:1,minHeight:48,maxHeight:110,backgroundColor:Love.paper,padding:12,borderRadius:12,fontSize:15,color:Love.ink,textAlignVertical:'center'},
 send:{height:46,width:46,borderRadius:23,backgroundColor:Love.wine,alignItems:'center',justifyContent:'center'},sendDisabled:{opacity:.4},sendText:{fontSize:25,fontWeight:'700',color:Love.white},
 refresh:{paddingVertical:9,alignItems:'center'},refreshText:{color:Love.muted,fontSize:11,fontWeight:'600'},
 error:{color:Love.error,backgroundColor:Love.errorBg,padding:12,fontSize:12},
});
