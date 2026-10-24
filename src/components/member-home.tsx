import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, Love, serif } from '@/components/auth-screens';
import { useSession } from '@/lib/session';

function Shortcut({ title, description, arrow = true, onPress }: {
  title: string; description: string; arrow?: boolean; onPress: () => void;
}) {
  return <Pressable style={({ pressed })=>[s.link,pressed&&s.pressed]} onPress={onPress} accessibilityRole="button">
    <View style={s.linkContent}><Text style={s.linkTitle}>{title}</Text><Text style={s.linkDescription}>{description}</Text></View>
    {arrow ? <Text style={s.arrow}>→</Text> : null}
  </Pressable>;
}
export function MemberHome() {
  const { user, signOut } = useSession();
  if (!user) return null;
  const name = user.profile?.displayName ?? 'there';
  const profile = user.profile;
  const details = !!(profile?.city && profile?.bio && profile?.relationshipGoal);
  const hasPhoto = profile?.photoReviewStatus === 'PENDING' || profile?.photoReviewStatus === 'APPROVED';
  const steps = Number(details) + Number(hasPhoto);
  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.header}><BrandLockup/><Text style={s.headTag}>YOUR SPACE</Text></View>
      <Text style={s.welcome}>Good to see you,</Text>
      <Text style={s.name}>{name}<Text style={s.dot}>.</Text></Text>
      <Text style={s.caption}>The best stories are the ones you get to write together.</Text>
      <View style={s.panel}>
        <Text style={s.kicker}>GETTING STARTED</Text>
        <Text style={s.panelTitle}>Your story is taking shape.</Text>
        <Text style={s.panelDesc}>Finish setting up your account before you start meeting people.</Text>
        <View style={s.track}><View style={[s.fill,{width: (steps / 3 * 100) + '%'}]}/></View>
        <Text style={s.progressText}>{steps} of 3 setup steps completed</Text>
      </View>
      <Text style={s.section}>Continue your journey</Text>
      <Shortcut title="Your story" description={details ? 'Review your profile and interests' : 'Tell people what makes you, you'} onPress={()=>router.push('/onboarding')}/>
      <Shortcut title="Profile photo" description={hasPhoto ? 'Photo submitted for private review' : 'Add a genuine photo of yourself'} onPress={()=>router.push('/profile-photo')}/>
      <Shortcut title="Verify your identity" description="Continue secure age and identity checks" onPress={()=>router.push('/verification')}/>
      <View style={s.callout}>
        <Text style={s.calloutTitle}>A safer place to connect</Text>
        <Text style={s.calloutText}>Your profile is private while identity checks and safety moderation are being completed. Discovery and messaging are coming later.</Text>
      </View>
      <Pressable style={s.signout} onPress={()=>{void signOut()}}><Text style={s.signoutText}>Sign out</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:Love.paper},container:{paddingHorizontal:26,paddingBottom:45,maxWidth:510,width:'100%',alignSelf:'center'},
  header:{paddingTop:24,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:55},
  headTag:{letterSpacing:1.4,fontSize:10,fontWeight:'700',color:Love.wine},
  welcome:{fontFamily:serif,fontSize:31,color:Love.ink,lineHeight:38},
  name:{fontFamily:serif,fontSize:48,lineHeight:53,color:Love.ink},dot:{color:Love.blush},
  caption:{fontSize:15,color:Love.muted,lineHeight:24,marginTop:14,marginBottom:34},
  panel:{backgroundColor:Love.wine,borderRadius:14,padding:23,gap:13,marginBottom:35},
  kicker:{fontSize:10,fontWeight:'700',letterSpacing:2,color:'#EFDDE5'},
  panelTitle:{fontFamily:serif,fontSize:29,color:Love.white,lineHeight:34},
  panelDesc:{color:'#F0E3E8',fontSize:13,lineHeight:21},
  track:{height:5,borderRadius:4,backgroundColor:'rgba(255,255,255,0.22)',overflow:'hidden',marginTop:10},
  fill:{height:5,borderRadius:4,backgroundColor:'#F5D7D9'},
  progressText:{fontSize:11,color:'#F4E5EB'},
  section:{fontFamily:serif,color:Love.ink,fontSize:25,marginBottom:10},
  link:{borderBottomWidth:1,borderColor:Love.line,flexDirection:'row',paddingVertical:21,alignItems:'center',gap:10},
  linkContent:{flex:1,gap:5},linkTitle:{fontSize:17,fontWeight:'700',color:Love.ink},
  linkDescription:{fontSize:13,color:Love.muted,lineHeight:19},
  arrow:{fontSize:23,color:Love.wine},pressed:{opacity:0.65},
  callout:{borderRadius:12,backgroundColor:'#EEE6E1',padding:21,marginTop:34,gap:8},
  calloutTitle:{fontSize:17,color:Love.ink,fontWeight:'700'},
  calloutText:{fontSize:13,color:Love.muted,lineHeight:22},
  signout:{alignItems:'center',paddingVertical:25},signoutText:{fontSize:13,color:Love.muted,textDecorationLine:'underline'}
});
