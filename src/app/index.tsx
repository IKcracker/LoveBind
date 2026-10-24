import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useWindowDimensions, ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, Brand, Heading, InfoCard, Page } from '@/components/lovebind-ui';
import { BrandLockup, Love, serif } from '@/components/auth-screens';
import { useSession } from '@/lib/session';

/**
 * Welcome has three distinct layers:
 * 1. A viewport-sized image, clipped to the device (never participates in layout).
 * 2. Noninteractive scrims for readable text.
 * 3. An independent, foreground safe-area/scroll layout.
 *
 * Do not put the full-screen image inside the ScrollView or use a large
 * paddingTop spacer to position the buttons; both can hide the UI on iOS.
 */
function WelcomeScreen() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableHeight = Math.max(0, height - insets.top - insets.bottom);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.backgroundLayer} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Image
          source={require('../../assets/images/lovebind-hero.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
          accessible={false}
        />
        <View style={styles.globalScrim} />
        <View style={styles.topScrim} />
        <View style={styles.lowerScrim} />
        <View style={styles.footerScrim} />
      </View>

      <SafeAreaView style={styles.foreground} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[styles.scrollContent, { minHeight: availableHeight }]}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <BrandLockup inverse />
              <Text style={styles.ageBadge}>18+ ONLY</Text>
            </View>

            <View style={styles.bottom}>
              <Text style={styles.eyebrow}>LOVE, ON YOUR TERMS</Text>
              <Text style={styles.headline} accessibilityRole="header">
                Meet someone who <Text style={styles.italic}>gets you.</Text>
              </Text>
              <Text style={styles.subtitle}>
                Real conversations. Shared values. A connection worth exploring.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create your LoveBind account"
                onPress={() => router.push('/register')}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryText}>Get started</Text>
                <Text style={styles.primaryArrow}>→</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in to your LoveBind account"
                onPress={() => router.push('/login')}
                style={({ pressed }) => [styles.signInButton, pressed && styles.pressed]}
              >
                <Text style={styles.signInText}>
                  Already a member? <Text style={styles.signInEmphasis}>Sign in</Text>
                </Text>
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
  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator color={Love.wine} accessibilityLabel="Loading LoveBind" />
    </View>
  );
  return user ? <AccountHome /> : <WelcomeScreen />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#241720', overflow: 'hidden' },
  loading: { flex: 1, backgroundColor: Love.paper, justifyContent: 'center', alignItems: 'center' },

  // Absolute fill belongs to a wrapping View, NOT directly to the Image.
  // This guarantees React Native measures the photo against the viewport.
  backgroundLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  globalScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20,12,19,0.31)' },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 135, backgroundColor: 'rgba(20,12,19,0.30)' },
  lowerScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', backgroundColor: 'rgba(20,12,19,0.32)' },
  footerScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '24%', backgroundColor: 'rgba(20,12,19,0.26)' },

  foreground: { flex: 1, zIndex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 26, paddingBottom: 15 },
  content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, minHeight: 58 },
  ageBadge: { color: 'rgba(255,255,255,0.92)', fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },

  // No artificial 230px spacer. The content naturally sits at the bottom,
  // with padding only for small/short devices and scroll available if needed.
  bottom: { paddingTop: 40, paddingBottom: 10 },
  eyebrow: { color: '#F7E7DF', letterSpacing: 1.7, fontSize: 11, fontWeight: '700', marginBottom: 13 },
  headline: { fontFamily: serif, fontSize: 45, lineHeight: 49, color: '#FFFFFF', maxWidth: 390, letterSpacing: -0.8 },
  italic: { fontStyle: 'italic', color: '#F4D5D1' },
  subtitle: { color: '#F5E8EA', fontSize: 15, lineHeight: 23, marginTop: 14, marginBottom: 26, maxWidth: 350 },
  primaryButton: { minHeight: 58, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 18 },
  primaryText: { fontSize: 15, fontWeight: '800', color: Love.ink },
  primaryArrow: { fontSize: 20, color: Love.ink, position: 'absolute', right: 18 },
  signInButton: { minHeight: 55, justifyContent: 'center', alignItems: 'center' },
  signInText: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  signInEmphasis: { fontWeight: '800', textDecorationLine: 'underline', color: '#FFFFFF' },
  disclaimer: { fontSize: 11, lineHeight: 16, color: 'rgba(255,255,255,0.78)', textAlign: 'center', paddingBottom: 4 },
  pressed: { opacity: 0.78 },
});
