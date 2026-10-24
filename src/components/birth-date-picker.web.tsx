import { View, Text, StyleSheet } from 'react-native';
import { Love } from '@/components/auth-screens';
export function BirthDatePicker({value,onChange,error}:{value:string;onChange:(v:string)=>void;error?:string}){
 const now=new Date(),max=new Date(Date.UTC(now.getUTCFullYear()-18,now.getUTCMonth(),now.getUTCDate())).toISOString().slice(0,10);
 const min=new Date(Date.UTC(now.getUTCFullYear()-115,now.getUTCMonth(),now.getUTCDate())).toISOString().slice(0,10);
 return <View style={s.group}><Text style={s.label}>Your date of birth</Text>
 <input aria-label="Date of birth" type="date" min={min} max={max} value={value} onChange={e=>onChange(e.target.value)} style={{height:58,border:'1px solid #DED9D5',borderRadius:10,padding:'0 16px',background:'#FFFFFF',fontSize:16,color:'#232025',width:'100%',boxSizing:'border-box'}}/>
 <Text style={s.note}>You must be at least 18. Your birth date stays private.</Text>
 {error?<Text style={s.error}>{error}</Text>:null}</View>;
}
const s=StyleSheet.create({group:{gap:8},label:{color:Love.ink,fontWeight:'600',fontSize:13},note:{color:Love.muted,fontSize:12},error:{color:Love.error,fontSize:12}});
