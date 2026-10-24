import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, Brand, Heading, InfoCard, Page } from '@/components/lovebind-ui';
import { BrandLockup, FormButton, Love, serif } from '@/components/auth-screens';
import { useSession } from '@/lib/session';

function EditorialGraphic() {
  return (
    <View style={s.graphic} accessible accessibilityLabel="Two intersecting circles symbolize an equal connection">
      <View style={s.graphicTop}><Text style={s.graphicTag}>THE SPACE BETWEEN TWO PEOPLE</Text><Text style={s.graphicIndex}>01 / 03</Text></View>
      <View style={s.bigRingLeft} />
      <View style={s.bigRingRight} />
      <View style={s.ringCenter}><Text style={s.centerLetter}>∩</Text></View>
      <View style={s.graphicBottom}><Text style={s.graphicBottomText}>Some connections deserve more than a swipe.</Text></View>
    </View>
  );
}

function WelcomeScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.column}>
          <View style={s.top}><BrandLockup /><Text style={s.age}>18+ COMMUNITY</Text></View>
          <View style={s.intro}>
            <Text style={s.overline}>DATING, RECONSIDERED</Text>
            <Text style={s.hero} accessibilityRole="header">A connection that <Text style={s.heroItalic}>goes deeper.</Text></Text>
            <Text style={s.description}>Meet with intention. Discover where your values align. Let the conversation lead the way.</Text>
          </View>
          <EditorialGraphic />
          <View style={s.bottom}>
            <Text style={s.supporting}>Less performance. More understanding.</Text>
            <Text style={s.caption}>A thoughtful way to meet people, built around mutual interest and meaningful conversations.</Text>
          </View>
          <View style={s.actions}>
            <FormButton text="Get started" onPress={() => router.push('/register')} />
            <Pressable style={s.signin} accessibilityRole="button" onPress={() => router.push('/login')}>
              <Text style={s.signinText}>I already have an account  <Text style={s.signinLink}>Sign in →</Text></Text>
            </Pressable>
            <Text style={s.footnote}>For adults 18+. LoveBind is in development; matching and dates are not yet available.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccountHome() {
  const { user, signOut } = useSession();
  const profile = user?.profile;
  if (!user) return null;
  return (
    <Page>
      <Brand />
      <Heading title={'Hello, ' + (profile?.displayName || 'there')} subtitle="Start with your story. The rest comes later." />
      <InfoCard title="Your profile">
        {profile?.city ? 'Based in ' + profile.city + '. ' : 'Add your city. '}
        {profile?.relationshipGoal ? 'Looking for: ' + profile.relationshipGoal : 'Tell us what kind of connection you want.'}
      </InfoCard>
      <ActionButton title="Edit profile" onPress={() => router.push('/profile')} />
      <ActionButton title="Partner preferences" secondary onPress={() => router.push('/preferences')} />
      <InfoCard title="In development">Matching, messaging, compatibility conversations and date planning will be available after safety and verification controls are ready.</InfoCard>
      <InfoCard title="Account status">Your account is {user.status.toLowerCase()}. Your profile is not discoverable until verification is available.</InfoCard>
      <ActionButton title="Sign out" secondary onPress={() => { void signOut(); }} />
    </Page>
  );
}

export default function Index() {
  const { user, loading } = useSession();
  if (loading) return (
    <View style={s.loading}><ActivityIndicator color={Love.wine} accessibilityLabel="Loading LoveBind" /></View>
  );
  return user ? <AccountHome /> : <WelcomeScreen />;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Love.paper },
  loading: { flex: 1, backgroundColor: Love.paper, justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 24 },
  column: { width: '100%', maxWidth: 460, alignSelf: 'center', flexGrow: 1 },
  top: { paddingTop: 26, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  age: { fontSize: 10, letterSpacing: 1.3, color: Love.muted, fontWeight: '700' },
  intro: { marginTop: 60, gap: 18 },
  overline: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: Love.wine },
  hero: { fontSize: 49, lineHeight: 53, letterSpacing: -1.5, fontFamily: serif, color: Love.ink, maxWidth: 385 },
  heroItalic: { fontStyle: 'italic', color: Love.wine },
  description: { color: Love.muted, fontSize: 15, lineHeight: 24, maxWidth: 370 },
  graphic: { height: 246, backgroundColor: '#D9C9C1', borderRadius: 4, overflow: 'hidden', marginTop: 32 },
  graphicTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 19, paddingTop: 18 },
  graphicTag: { color: Love.wine, letterSpacing: 1, fontSize: 8, fontWeight: '800' },
  graphicIndex: { color: Love.wine, fontSize: 9, letterSpacing: 1 },
  bigRingLeft: { width: 205, height: 205, borderRadius: 103, backgroundColor: '#9D6478', position: 'absolute', top: 34, left: 18, opacity: 0.82 },
  bigRingRight: { width: 205, height: 205, borderRadius: 103, backgroundColor: '#5C3B50', position: 'absolute', top: 34, right: 18, opacity: 0.85 },
  ringCenter: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#E9D9C8', position: 'absolute', alignSelf: 'center', top: 100, justifyContent: 'center', alignItems: 'center' },
  centerLetter: { fontFamily: serif, fontSize: 49, color: Love.wine, lineHeight: 58 },
  graphicBottom: { position: 'absolute', bottom: 13, left: 18, right: 18 },
  graphicBottomText: { color: Love.white, fontSize: 11, fontWeight: '600' },
  bottom: { marginTop: 25, gap: 7 },
  supporting: { fontFamily: serif, fontSize: 24, color: Love.ink },
  caption: { color: Love.muted, fontSize: 13, lineHeight: 21 },
  actions: { marginTop: 'auto', paddingTop: 30 },
  signin: { alignItems: 'center', justifyContent: 'center', minHeight: 58 },
  signinText: { color: Love.muted, fontSize: 13 },
  signinLink: { color: Love.wine, fontWeight: '700' },
  footnote: { color: Love.mutedSoft, textAlign: 'center', fontSize: 10, lineHeight: 16, paddingTop: 10 },
});
