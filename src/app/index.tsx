import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, Brand, Heading, InfoCard, Page, Palette } from '@/components/lovebind-ui';
import { useSession } from '@/lib/session';

function ConnectionIllustration() {
  return (
    <View style={landing.art} accessible accessibilityLabel="Illustration of two people finding connection through understanding">
      <View style={landing.artHaloA} />
      <View style={landing.artHaloB} />
      <View style={landing.artCircleLeft}><Text style={landing.avatarLetter}>A</Text></View>
      <View style={landing.artCircleRight}><Text style={landing.avatarLetter}>B</Text></View>
      <View style={landing.heartContainer}><Text style={landing.heartIcon}>♥</Text></View>
      <View style={landing.smallLabelTop}><Text style={landing.smallLabelText}>💬  Talk naturally</Text></View>
      <View style={landing.smallLabelBottom}><Text style={landing.smallLabelText}>✦  Understand each other</Text></View>
      <Text style={landing.artFootnote}>A connection built from both sides</Text>
    </View>
  );
}

function WelcomeScreen() {
  return (
    <SafeAreaView style={landing.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={landing.scroll} showsVerticalScrollIndicator={false}>
        <View style={landing.column}>
          <View style={landing.brandHeader}>
            <View style={landing.mark}><Text style={landing.markHeart}>♥</Text></View>
            <Text style={landing.wordmark}>lovebind<Text style={{ color: Palette.rose }}>.</Text></Text>
            <View style={landing.agePill}><Text style={landing.ageText}>18+</Text></View>
          </View>

          <View style={landing.copy}>
            <View style={landing.labelPill}><Text style={landing.labelText}>DATING WITH INTENTION</Text></View>
            <Text style={landing.headline}>A better way to <Text style={landing.highlight}>find your person.</Text></Text>
            <Text style={landing.subheadline}>
              Make a genuine connection, explore what matters to both of you, and take the next step when you’re both ready.
            </Text>
          </View>

          <ConnectionIllustration />

          <View style={landing.howItWorks}>
            <Text style={landing.sectionTitle}>A little more meaning. A lot less guessing.</Text>
            <View style={landing.stepRow}>
              <View style={landing.step}><Text style={landing.stepNumber}>01</Text><Text style={landing.stepText}>Connect</Text></View>
              <Text style={landing.stepDivider}>→</Text>
              <View style={landing.step}><Text style={landing.stepNumber}>02</Text><Text style={landing.stepText}>Understand</Text></View>
              <Text style={landing.stepDivider}>→</Text>
              <View style={landing.step}><Text style={landing.stepNumber}>03</Text><Text style={landing.stepText}>Meet</Text></View>
            </View>
          </View>

          <View style={landing.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/register')}
              style={({ pressed }) => [landing.primaryButton, pressed && { opacity: 0.84 }]}
            >
              <Text style={landing.primaryText}>Create my account</Text>
              <Text style={landing.primaryArrow}>→</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/login')}
              style={({ pressed }) => [landing.outlineButton, pressed && { opacity: 0.75 }]}
            >
              <Text style={landing.outlineText}>I already have an account</Text>
            </Pressable>
          </View>
          <Text style={landing.disclaimer}>LoveBind is being built for adults 18+. Meeting and compatibility features are coming soon.</Text>
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
      <Brand caption="Meaningful connections, at your pace" />
      <Heading title={'Hello, ' + (profile?.displayName || 'there') + ' ♥'} subtitle="Your LoveBind journey begins with knowing yourself." />
      <InfoCard title="Your LoveBind profile">
        {profile?.city ? 'Based in ' + profile.city + '. ' : 'Add your city to complete your profile. '}
        {profile?.relationshipGoal ? 'Relationship goal: ' + profile.relationshipGoal : 'Choose your relationship intention.'}
      </InfoCard>
      <ActionButton title="Edit my profile" onPress={() => router.push('/profile')} />
      <ActionButton title="My ideal partner" onPress={() => router.push('/preferences')} secondary />
      <InfoCard title="What’s next">
        Discover, matching, conversations, AI-assisted quizzes and dates are being developed. No fake matches or purchases will be shown.
      </InfoCard>
      <InfoCard title="Account verification">
        Your account is {user.status.toLowerCase()}. Discovery will stay unavailable until identity verification and safety controls are in place.
      </InfoCard>
      <ActionButton title="Sign out" secondary onPress={() => { void signOut(); }} />
      <Text style={{ textAlign: 'center', color: Palette.muted, fontSize: 12 }}>LoveBind • Adults only • Your choice always matters.</Text>
    </Page>
  );
}

export default function Index() {
  const { user, loading } = useSession();
  if (loading) return (
    <View style={landing.loading}>
      <ActivityIndicator color={Palette.rose} size="large" accessibilityLabel="Loading LoveBind" />
    </View>
  );
  return user ? <AccountHome /> : <WelcomeScreen />;
}

const landing = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.background },
  loading: { flex: 1, backgroundColor: Palette.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 26 },
  column: { width: '100%', maxWidth: 540, alignSelf: 'center', gap: 20 },
  brandHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 2, gap: 9 },
  mark: { width: 38, height: 38, borderRadius: 13, backgroundColor: Palette.rose, alignItems: 'center', justifyContent: 'center' },
  markHeart: { color: '#FFF', fontSize: 21, fontWeight: '900' },
  wordmark: { color: Palette.plum, fontSize: 25, letterSpacing: -1.4, fontWeight: '900' },
  agePill: { marginLeft: 'auto', borderRadius: 100, backgroundColor: '#F4E0E8', paddingHorizontal: 13, paddingVertical: 7 },
  ageText: { color: Palette.plum, fontSize: 11, fontWeight: '800' },
  copy: { gap: 16, marginTop: 14 },
  labelPill: { backgroundColor: '#FCE6EF', borderRadius: 100, alignSelf: 'flex-start', paddingHorizontal: 15, paddingVertical: 9 },
  labelText: { letterSpacing: 1.5, color: Palette.rose, fontWeight: '900', fontSize: 10 },
  headline: { color: Palette.ink, fontSize: 42, lineHeight: 46, fontWeight: '900', letterSpacing: -1.9 },
  highlight: { color: Palette.rose },
  subheadline: { color: '#786A76', fontSize: 15, lineHeight: 23, maxWidth: 450 },
  art: { height: 248, backgroundColor: '#552944', borderRadius: 29, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  artHaloA: { position: 'absolute', width: 222, height: 222, borderRadius: 111, borderWidth: 1, borderColor: '#8D6380', top: -80, left: -80 },
  artHaloB: { position: 'absolute', width: 290, height: 290, borderRadius: 145, borderWidth: 1, borderColor: '#8D6380', right: -100, bottom: -160 },
  artCircleLeft: { width: 93, height: 93, borderRadius: 47, backgroundColor: '#F0B5C8', borderWidth: 4, borderColor: '#FFF8F7', position: 'absolute', left: '19%', top: 77, alignItems: 'center', justifyContent: 'center' },
  artCircleRight: { width: 93, height: 93, borderRadius: 47, backgroundColor: '#DCA2CA', borderWidth: 4, borderColor: '#FFF8F7', position: 'absolute', right: '19%', top: 77, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#552944', fontWeight: '800', fontSize: 37 },
  heartContainer: { position: 'absolute', width: 54, height: 54, borderRadius: 18, backgroundColor: '#FFF8F7', justifyContent: 'center', alignItems: 'center', top: 97, shadowColor: '#20091B', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  heartIcon: { fontSize: 28, color: Palette.rose },
  smallLabelTop: { position: 'absolute', top: 20, left: 18, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 100, backgroundColor: '#744562' },
  smallLabelBottom: { position: 'absolute', right: 15, bottom: 36, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 100, backgroundColor: '#744562' },
  smallLabelText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  artFootnote: { position: 'absolute', bottom: 15, left: 18, color: '#E5C5DA', fontSize: 10 },
  howItWorks: { gap: 14, marginTop: 1 },
  sectionTitle: { color: Palette.ink, fontWeight: '800', fontSize: 15 },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
  step: { gap: 4, alignItems: 'center', flexShrink: 1 },
  stepNumber: { color: Palette.rose, fontWeight: '900', fontSize: 12 },
  stepText: { color: Palette.plum, fontWeight: '800', fontSize: 12 },
  stepDivider: { color: '#BA9BAB', fontSize: 15 },
  actions: { gap: 11, marginTop: 7 },
  primaryButton: { minHeight: 58, paddingHorizontal: 20, borderRadius: 16, backgroundColor: Palette.rose, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  primaryArrow: { color: '#FFF', position: 'absolute', right: 20, fontSize: 21 },
  outlineButton: { minHeight: 56, borderRadius: 16, borderColor: '#EAD9DF', borderWidth: 1, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  outlineText: { color: Palette.plum, fontWeight: '800', fontSize: 14 },
  disclaimer: { color: '#8D7E8B', fontSize: 11, lineHeight: 17, textAlign: 'center', marginBottom: 14 },
});
