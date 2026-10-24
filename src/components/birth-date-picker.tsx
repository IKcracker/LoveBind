import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Love } from '@/components/auth-screens';
function iso(d:Date){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
export function BirthDatePicker({value,onChange,error}:{value:string;onChange:(v:string)=>void;error?:string}){
 const today=new Date();
 const max=new Date(today.getFullYear()-18,today.getMonth(),today.getDate());
 const min=new Date(today.getFullYear()-115,today.getMonth(),today.getDate());
 const parsed=value?new Date(value+'T12:00:00'):max;
 const [open,setOpen]=useState(false);
 const [draft,setDraft]=useState(parsed);
 const current=Number.isNaN(parsed.getTime())?max:parsed;
 return <View style={s.field}>
  <Text style={s.label}>Your date of birth</Text>
  <Pressable onPress={()=>{setDraft(current);setOpen(true)}} accessibilityRole="button" style={s.button}>
   <Text style={[s.date,!value&&s.placeholder]}>{value||'Choose date of birth'}</Text><Text style={s.calendar}>▦</Text>
  </Pressable>
  <Text style={s.note}>You must be at least 18. Your birth date stays private.</Text>
  {error?<Text style={s.error}>{error}</Text>:null}
  {Platform.OS==='android'&&open?<DateTimePicker value={current} mode="date" display="default" maximumDate={max} minimumDate={min} onChange={(event,date)=>{setOpen(false);if(event.type==='set'&&date)onChange(iso(date));}}/>:null}
  {Platform.OS==='ios'?<Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
   <View style={s.overlay}><View style={s.panel}><Text style={s.panelTitle}>Your birth date</Text>
    <DateTimePicker value={draft} mode="date" display="spinner" maximumDate={max} minimumDate={min} onChange={(_,date)=>{if(date)setDraft(date)}}/>
    <View style={s.actions}><Pressable onPress={()=>setOpen(false)}><Text style={s.link}>Cancel</Text></Pressable><Pressable onPress={()=>{onChange(iso(draft));setOpen(false)}}><Text style={s.link}>Done</Text></Pressable></View>
   </View></View>
  </Modal>:null}
 </View>;
}
const s=StyleSheet.create({field:{gap:8},label:{fontSize:13,fontWeight:'600',color:Love.ink},button:{minHeight:58,borderWidth:1,borderColor:Love.line,borderRadius:10,backgroundColor:Love.white,paddingHorizontal:16,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},date:{color:Love.ink,fontSize:16},placeholder:{color:Love.mutedSoft},calendar:{fontSize:26,color:Love.wine},note:{fontSize:12,color:Love.muted,lineHeight:19},error:{fontSize:12,color:Love.error},overlay:{flex:1,justifyContent:'center',backgroundColor:'rgba(0,0,0,.4)',padding:25},panel:{backgroundColor:Love.white,borderRadius:18,padding:20},panelTitle:{fontSize:20,fontWeight:'700',color:Love.ink},actions:{flexDirection:'row',justifyContent:'space-between',padding:15},link:{color:Love.wine,fontWeight:'700',fontSize:16}});
