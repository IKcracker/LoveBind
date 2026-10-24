import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FormButton, Love, serif } from '@/components/auth-screens';
import { LoadingScreen, Notice, StackScreen } from '@/components/member-ui';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

type Question={id:string;category:string;prompt:string;low:string;high:string};
type Quiz={matchId:string;version:string;status:'NOT_STARTED'|'PENDING'|'IN_PROGRESS'|'COMPLETED';
  questions:Question[];myAnswers:{questionId:string;value:number}[];myProgress:number;
  partnerProgress:number;total:number;result:null|{
    score:number;rubricVersion:string;summary:{recommendation:string;explanation:string;suggestedCredits:number};
  }};
export default function CompatibilityQuiz(){
 const {matchId}=useLocalSearchParams<{matchId?:string}>();
 const {user,token,loading}=useSession();
 const valid=typeof matchId==='string'&&/^[a-zA-Z0-9_-]{10,100}$/.test(matchId);
 const [quiz,setQuiz]=useState<Quiz|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  if(!token||typeof matchId!=='string'||!valid)return;
  let active=true;
  apiRequest<Quiz>('/quizzes/matches/'+encodeURIComponent(matchId),'GET',undefined,token)
   .then(data=>{if(active){setQuiz(data);setError(null);}})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load compatibility quiz')});
  return()=>{active=false};
 },[matchId,token,valid,refresh]);
 const next=useMemo(()=>quiz?.questions.find(q=>!quiz.myAnswers.some(a=>a.questionId===q.id)),[quiz]);
 async function action(endpoint:string,method:'POST'|'PUT',body?:object){
  if(!token||typeof matchId!=='string'||!valid||busy)return;
  setBusy(true);setError(null);
  try{
   const updated=await apiRequest<Quiz>('/quizzes/matches/'+encodeURIComponent(matchId)+endpoint,method,body??{},token);
   setQuiz(updated);
  }catch(e){setError(e instanceof Error?e.message:'Could not save your answer')}
  finally{setBusy(false)}
 }
 if(loading)return <LoadingScreen/>;
 if(!user||!token)return <Redirect href="/login"/>;
 if(!valid)return <StackScreen title="Compatibility quiz"><Notice tone="error" message="Invalid match"/></StackScreen>;
 return <StackScreen title="Compatibility quiz">
  <View style={s.top}><Text style={s.eyebrow}>THE LOVE BIND REFLECTION</Text>
   <Text style={s.heading}>Get to know each other more deeply.</Text>
   <Text style={s.body}>Answer seven questions independently. Your responses stay private; only a shared alignment summary appears after both people finish. There are no right or wrong answers.</Text>
  </View>
  <Notice tone="error" message={error} actionLabel="Try again" onAction={()=>setRefresh(n=>n+1)}/>
  {!quiz&&!error?<ActivityIndicator color={Love.wine}/>:null}
  {quiz?<View style={s.progressCard}>
    <Text style={s.progressTitle}>Quiz progress</Text>
    <Text style={s.progress}>You: {quiz.myProgress} of {quiz.total} · Partner: {quiz.partnerProgress} of {quiz.total}</Text>
    <View style={s.track}><View style={[s.fill,{width:Math.round(100*quiz.myProgress/quiz.total)+'%'}]}/></View>
  </View>:null}
  {quiz?.status==='NOT_STARTED'?<View style={s.card}>
    <Text style={s.cardTitle}>One conversation. Two perspectives.</Text>
    <Text style={s.body}>This short questionnaire explores values, communication and plans for the future. It is not a clinical test or a guarantee of relationship success.</Text>
    <FormButton text="Begin our quiz" busy={busy} onPress={()=>void action('/start','POST')}/>
  </View>:null}
  {next&&quiz?.status!=='NOT_STARTED'?<View style={s.card}>
    <Text style={s.counter}>QUESTION {quiz!.myProgress+1} OF {quiz!.total}</Text>
    <Text style={s.cardTitle}>{next.prompt}</Text>
    <View style={s.scale}>{[1,2,3,4,5].map(v=><Pressable key={v} accessibilityRole="button"
      accessibilityLabel={'Choose '+v+' of 5'} disabled={busy}
      onPress={()=>void action('/answer','PUT',{questionId:next.id,value:v})}
      style={({pressed})=>[s.choice,pressed&&s.choicePressed,busy&&s.dim]}>
      <Text style={s.choiceText}>{v}</Text>
    </Pressable>)}</View>
    <View style={s.labels}><Text style={s.label}>{next.low}</Text><Text style={[s.label,{textAlign:'right'}]}>{next.high}</Text></View>
  </View>:null}
  {quiz&&quiz.myProgress===quiz.total&&quiz.status!=='COMPLETED'?<View style={s.card}>
    <Text style={s.cardTitle}>Your answers are complete ♡</Text>
    <Text style={s.body}>Your partner can finish at their own pace. The shared summary will appear after both of you complete all questions.</Text>
    <FormButton text="Check partner progress" secondary onPress={()=>setRefresh(n=>n+1)}/>
  </View>:null}
  {quiz?.status==='COMPLETED'&&quiz.result?<View style={s.card}>
    <Text style={s.eyebrow}>YOUR MUTUAL ALIGNMENT</Text>
    <Text style={s.score}>{quiz.result.score}%</Text>
    <Text style={s.cardTitle}>{quiz.result.summary.recommendation.replace(/_/g,' ').toLowerCase()}</Text>
    <Text style={s.body}>{quiz.result.summary.explanation}</Text>
    <Text style={s.body}>This score compares questionnaire preferences only. Your choices, feelings and consent matter much more than a score.</Text>
    <Text style={s.caption}>Love Bind bookings and PayFast payments are not enabled yet.</Text>
  </View>:null}
  <FormButton text="Back to conversation" secondary onPress={()=>router.navigate({pathname:'/chat/[matchId]',params:{matchId:matchId!}})}/>
 </StackScreen>;
}
const s=StyleSheet.create({
 top:{gap:12},eyebrow:{color:Love.wine,fontSize:11,fontWeight:'800',letterSpacing:1.5},
 heading:{fontSize:32,lineHeight:38,fontFamily:serif,color:Love.ink},
 body:{fontSize:14,lineHeight:23,color:Love.muted},
 progressCard:{borderRadius:17,backgroundColor:Love.wineSoft,padding:18,gap:9},
 progressTitle:{fontSize:14,fontWeight:'800',color:Love.ink},
 progress:{fontSize:13,color:Love.muted},track:{height:7,borderRadius:8,overflow:'hidden',backgroundColor:Love.white},
 fill:{height:7,backgroundColor:Love.wine},card:{gap:19,padding:22,borderRadius:20,backgroundColor:Love.white,borderColor:Love.line,borderWidth:1},
 cardTitle:{fontFamily:serif,fontSize:26,lineHeight:32,color:Love.ink},
 counter:{fontSize:11,fontWeight:'800',letterSpacing:1.3,color:Love.wine},
 scale:{flexDirection:'row',justifyContent:'space-between',gap:8},
 choice:{flex:1,minHeight:55,borderRadius:14,borderColor:Love.line,borderWidth:1,backgroundColor:Love.paper,justifyContent:'center',alignItems:'center'},
 choiceText:{fontSize:20,fontWeight:'800',color:Love.wine},choicePressed:{backgroundColor:Love.wineSoft},
 dim:{opacity:0.45},labels:{flexDirection:'row',justifyContent:'space-between',gap:12},
 label:{flex:1,fontSize:12,color:Love.muted,lineHeight:18},
 score:{fontSize:64,fontWeight:'900',color:Love.wine},caption:{fontSize:12,color:Love.muted}
});
