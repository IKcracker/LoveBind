import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Love } from '@/components/auth-screens';

type Section = 'home' | 'discover' | 'matches' | 'profile';
const choices: { id:Section; title:string; icon:string; path:'/'|'/explore'|'/matches'|'/profile' }[] = [
 {id:'home',title:'Home',icon:'⌂',path:'/'},
 {id:'discover',title:'Discover',icon:'♡',path:'/explore'},
 {id:'matches',title:'Matches',icon:'✉',path:'/matches'},
 {id:'profile',title:'Profile',icon:'◯',path:'/profile'},
];
export function LoveBindNav({ active }: { active: Section }) {
  return <View style={s.bar} accessibilityRole="toolbar">
    {choices.map(item => <Pressable key={item.id} accessibilityRole="button"
      accessibilityState={{ selected: active === item.id }} onPress={() => router.replace(item.path)}
      style={s.tab}>
      <Text style={[s.icon,active === item.id && s.selected]}>{item.icon}</Text>
      <Text style={[s.label,active === item.id && s.selected]}>{item.title}</Text>
    </Pressable>)}
  </View>;
}
const s=StyleSheet.create({
 bar:{flexDirection:'row',backgroundColor:Love.white,borderTopWidth:1,borderColor:Love.line,
   minHeight:70,alignItems:'center',paddingHorizontal:7,paddingBottom:4},
 tab:{flex:1,minHeight:58,alignItems:'center',justifyContent:'center',gap:2},
 icon:{fontSize:26,color:Love.muted},label:{fontSize:10,fontWeight:'700',color:Love.muted},
 selected:{color:Love.wine},
});
