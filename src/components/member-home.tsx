import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, Love, serif } from '@/components/auth-screens';
import { MemberTabBar } from '@/components/member-tab-bar';
import { useSession } from '@/lib/session';

export function MemberHome() {
  const { user } = useSession();
  if (!user) return null;
  const profile = user.profile;
  const name = profile?.displayName?.split(' ')[0] || 'there';
  const profileReady = !!(profile?.city && profile?.bio && profile?.relationshipGoal);
  const photoReady = profile?.photoReviewStatus === 'APPROVED';
  const ageReady = user.identityVerification?.status === 'Approved' &&
    user.identityVerification.ageEvidenceStatus === 'VERIFIED';
  const active = user.status === 'ACTIVE';
  const steps = Number(profileReady) + Number(photoReady) + Number(ageReady);

  return <SafeAreaView style={styles.safe} edges={['top','left','right']}>
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><BrandLockup/><Text style={styles.headerTag}>YOUR SPACE</Text></View>
        <Text style={styles.intro}>Good to see you,</Text>
        <Text style={styles.name}>{name}<Text style={styles.dot}>.</Text></Text>
        <Text style={styles.subtitle}>Real connections begin with being yourself.</Text>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>{active?'YOUR LOVEBIND JOURNEY':'YOUR ACCOUNT STATUS'}</Text>
          <Text style={styles.heroTitle}>{active?'Your next chapter starts here.':'Your story is taking shape.'}</Text>
          <Text style={styles.heroText}>{active
            ?'Your profile is approved. Discover people at your own pace, and keep the conversation meaningful.'
            :'Your profile stays private while identity, photo and account reviews are completed.'}</Text>
          {!active?<View style={styles.progress}><View style={[styles.progressFill,{width:(steps/3*100)+'%'}]}/></View>:null}
          {!active?<Text style={styles.progressLabel}>{steps} of 3 checks completed. Final account review may still be required.</Text>:null}
        </View>
        <Text style={styles.section}>Your journey at a glance</Text>
        <View style={styles.metricRow}>
          <View style={styles.metric}><Text style={styles.metricValue}>{active?'Active':'Pending'}</Text><Text style={styles.metricLabel}>Account</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{ageReady?'Verified':'Awaiting'}</Text><Text style={styles.metricLabel}>Identity & age</Text></View>
        </View>
        <View style={styles.info}><Text style={styles.infoTitle}>A safer place to connect ♡</Text>
          <Text style={styles.infoText}>Your profile is private until you choose to join discovery. Interest stays private until both members like each other.</Text>
        </View>
      </ScrollView>
      <MemberTabBar active="home" approved={active}/>
    </View>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:Love.paper},body:{flex:1},
  content:{maxWidth:530,width:'100%',alignSelf:'center',paddingHorizontal:24,paddingTop:24,paddingBottom:36,gap:15},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:25},
  headerTag:{fontSize:10,fontWeight:'700',letterSpacing:1.5,color:Love.wine},
  intro:{fontFamily:serif,fontSize:29,lineHeight:35,color:Love.ink},
  name:{fontFamily:serif,fontSize:45,lineHeight:50,color:Love.ink},
  dot:{color:Love.blush},subtitle:{fontSize:14,lineHeight:22,color:Love.muted,marginBottom:14},
  hero:{borderRadius:20,backgroundColor:Love.wine,padding:24,gap:15},
  heroEyebrow:{color:'#F7E8EE',fontSize:10,fontWeight:'800',letterSpacing:2},
  heroTitle:{fontFamily:serif,color:Love.white,fontSize:31,lineHeight:37},
  heroText:{color:'#F4E6EC',fontSize:14,lineHeight:22},
  progress:{height:6,borderRadius:6,backgroundColor:'rgba(255,255,255,0.22)',overflow:'hidden',marginTop:8},
  progressFill:{height:6,backgroundColor:'#F7DCE4'},
  progressLabel:{color:'#F4E6EC',fontSize:12,lineHeight:18},
  section:{fontFamily:serif,fontSize:25,color:Love.ink,marginTop:18},
  metricRow:{flexDirection:'row',gap:12},
  metric:{backgroundColor:Love.white,borderWidth:1,borderColor:Love.line,borderRadius:15,padding:18,flex:1,gap:7},
  metricValue:{fontSize:18,fontWeight:'700',color:Love.wine},
  metricLabel:{fontSize:12,color:Love.muted},
  info:{backgroundColor:'#EEE6E1',borderRadius:15,padding:21,gap:9,marginTop:12},
  infoTitle:{fontSize:17,fontWeight:'700',color:Love.ink},
  infoText:{fontSize:13,lineHeight:21,color:Love.muted},
});