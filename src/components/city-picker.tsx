import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthField, Love } from '@/components/auth-screens';
import { apiRequest } from '@/lib/api';
type Suggestion = {placeId:string;label:string};
export function CityPicker({token,city,placeId,onSelect}:{
 token:string;city:string;placeId:string|null;onSelect:(city:string,placeId:string|null)=>void;
}) {
 const [suggestions,setSuggestions]=useState<Suggestion[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [selecting,setSelecting]=useState(false);
 const latest=useRef(0);
 useEffect(()=>{
  const requestId=++latest.current;
  if(placeId||city.trim().length<3){return;}
  const timer=setTimeout(()=>{
   setBusy(true);setError('');
   apiRequest<Suggestion[]>('/locations/cities?q='+encodeURIComponent(city.trim()),'GET',undefined,token)
   .then(rows=>{if(requestId===latest.current)setSuggestions(rows);})
   .catch((e:unknown)=>{if(requestId===latest.current){setSuggestions([]);setError(e instanceof Error?e.message:'City search unavailable');}})
   .finally(()=>{if(requestId===latest.current)setBusy(false);});
  },350);
  return()=>clearTimeout(timer);
 },[city,placeId,token]);
 async function pick(value:Suggestion){
  setSelecting(true);setError('');
  try {
   const selection=await apiRequest<{city:string;placeId:string}>('/locations/place?id='+encodeURIComponent(value.placeId),'GET',undefined,token);
   onSelect(selection.city,selection.placeId);setSuggestions([]);
  }catch(e){setError(e instanceof Error?e.message:'Unable to verify city');}
  finally{setSelecting(false);}
 }
 return <View style={s.root}>
   <AuthField label="Your city" placeholder="Start typing a city..." value={city} onChangeText={v=>{onSelect(v,null);setSuggestions([]);setError('');}} autoCorrect={false} maxLength={100} helper={placeId?'Verified city selected':'Select a city from the location suggestions'}/>
   {(busy||selecting)?<ActivityIndicator color={Love.wine}/>:null}
   {!placeId&&suggestions.map(item=><Pressable key={item.placeId} onPress={()=>void pick(item)} style={s.option} accessibilityRole="button">
    <Text style={s.pin}>⌖</Text><Text style={s.optionText}>{item.label}</Text>
   </Pressable>)}
   {error?<Text style={s.error}>{error}</Text>:null}
 </View>;
}
const s=StyleSheet.create({root:{gap:6},option:{padding:13,minHeight:48,borderWidth:1,borderColor:Love.line,backgroundColor:Love.white,borderRadius:8,flexDirection:'row',alignItems:'center',gap:10},pin:{color:Love.wine,fontSize:24},optionText:{flex:1,color:Love.ink,fontSize:14},error:{color:Love.error,fontSize:12}});
