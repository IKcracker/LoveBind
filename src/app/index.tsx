import { router } from 'expo-router';
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, Brand, Heading, InfoCard, Page } from '@/components/lovebind-ui';
import { BrandLockup, Love, serif } from '@/components/auth-screens';
import { useSession } from '@/lib/session';

const HERO_URL = 'https://images.unsplash.com/photo-1771946892179-41c95be77cfd?fm=jpg&fit=crop&w=1200&h=1800&q=80';

function WelcomeScreen() {
  return (
    <View style={styles.background}>
      <ImageBackground
        source={{ uri: HERO_URL }}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject}
        imageStyle={styles.photo}
        accessibilityIgnoresInvertColors
      />
      <View style={[StyleSheet.absoluteFillObject, styles.photoTint]} pointerEvents="none" />
      <View style={styles.topShade} pointerEvents="none" />
      <View style={styles.bottomShade} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.column}>
            <View style={styles.header}>
              <BrandLockup inverse />
              <Text style={styles.age}>18+ ONLY</Text>
            </View>

            <View style={styles.bottom}>
              <Text style={styles.eyebrow}>LOVE, ON YOUR TERMS</Text>
              <Text style={styles.title} accessibilityRole="header">
                Meet someone who <Text style={styles.italic}>gets you.</Text>
              </Text>
              <Text style={styles.subtitle}>
                Real conversations. Shared values. A connection worth exploring.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create your LoveBind account"
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
                onPress={() => router.push('/register')}
              >
                <Text style={styles.primaryLabel}>Get started</Text>
                <Text style={styles.arrow}>→</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in to your LoveBind account"
                onPress={() => router.push('/login')}
                style={({ pressed }) => [styles.signIn, pressed && styles.pressed]}
              >
                <Text style={styles.signInLabel}>Already a member? <Text style={styles.signInBold}>Sign in</Text></Text>
              </Pressable>
              <Text style={styles.disclaimer}>LoveBind is in development. Matching and dates are not yet available.</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
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
  if (loading) return <View style={styles.loading}><ActivityIndicator color={Love.wine} accessibilityLabel="Loading LoveBind" /></View>;
  return user ? <AccountHome /> : <WelcomeScreen />;
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#382934' },
  loading: { flex: 1, backgroundColor: Love.paper, justifyContent: 'center', alignItems: 'center' },
  photo: { backgroundColor: '#47343E' },
  photoTint: { backgroundColor: 'rgba(24,17,22,0.19)' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, backgroundColor: 'rgba(20,14,20,0.22)' },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '48%', backgroundColor: 'rgba(18,11,17,0.72)' },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 27, paddingBottom: 18 },
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', flexGrow: 1 },
  header: { paddingTop: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  age: { color: 'rgba(255,255,255,0.87)', fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  bottom: { marginTop: 'auto', paddingTop: 230 },
  eyebrow: { color: '#F7E7DF', letterSpacing: 2, fontSize: 11, fontWeight: '800', marginBottom: 16 },
  title: { fontFamily: serif, color: '#FFFFFF', fontSize: 48, lineHeight: 53, letterSpacing: -1, maxWidth: 385 },
  italic: { fontStyle: 'italic', color: '#F4D5D1' },
  subtitle: { color: '#F6EDEB', fontSize: 15, lineHeight: 24, maxWidth: 350, marginTop: 16, marginBottom: 30 },
  primary: { backgroundColor: '#FFFFFF', minHeight: 60, borderRadius: 11, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 18 },
  primaryLabel: { color: Love.ink, fontSize: 15, fontWeight: '800' },
  arrow: { color: Love.ink, fontSize: 21, position: 'absolute', right: 19 },
  signIn: { minHeight: 59, justifyContent: 'center', alignItems: 'center' },
  signInLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  signInBold: { color: '#FFFFFF', fontWeight: '800', textDecorationLine: 'underline' },
  pressed: { opacity: 0.8 },
  disclaimer: { color: 'rgba(255,255,255,0.67)', textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: 7 },
});
