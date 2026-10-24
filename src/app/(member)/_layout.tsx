import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Love } from '@/components/auth-screens';
import { useSession } from '@/lib/session';
import { Redirect } from 'expo-router';

const icon = (ios:string, android:string, color:string) => (
  <SymbolView name={{ios,android,web:android}} size={23} tintColor={color} />
);

export default function MemberTabs() {
  const {user,loading}=useSession();
  if (!loading && !user) return <Redirect href="/login"/>;
  if (!loading && user?.status!=='ACTIVE') return <Redirect href="/"/>;
  return <Tabs screenOptions={{
    headerShown:false,
    tabBarActiveTintColor:Love.wine,
    tabBarInactiveTintColor:Love.muted,
    tabBarStyle:{backgroundColor:Love.white,borderTopColor:Love.line,height:60,paddingTop:7},
    tabBarLabelStyle:{fontSize:11,fontWeight:'700'},
    sceneStyle:{backgroundColor:Love.paper},
  }}>
    <Tabs.Screen name="discover" options={{title:'Discover',tabBarIcon:({color})=>icon('safari','explore',color)}}/>
    <Tabs.Screen name="likes" options={{title:'Likes',tabBarIcon:({color})=>icon('heart','favorite',color)}}/>
    <Tabs.Screen name="connections" options={{title:'Matches',tabBarIcon:({color})=>icon('bubble.left.and.bubble.right','chat',color)}}/>
    <Tabs.Screen name="profile" options={{title:'Profile',tabBarIcon:({color})=>icon('person.crop.circle','person',color)}}/>
  </Tabs>;
}
