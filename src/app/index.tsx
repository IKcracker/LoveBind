import { Redirect, router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { ActionButton, Brand, Heading, InfoCard, Page, Palette } from '@/components/lovebind-ui';
import { useSession } from '@/lib/session';

export default function HomeScreen() {
  const { loading, user, signOut } = useSession();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.background }}><ActivityIndicator color={Palette.rose} /></View>;
  if (!user) return <Redirect href="/login" />;
  const profile = user.profile;
  return <Page>
    <Brand caption="Meaningful connections, at your pace" />
    <Heading title={'Hello, ' + (profile?.displayName || 'there') + ' ♥'} subtitle="Let's build your LoveBind journey thoughtfully." />
    <InfoCard title="Your LoveBind profile">
      {profile?.city ? 'Based in ' + profile.city + '. ' : 'Add your city to complete your profile. '}
      {profile?.relationshipGoal ? 'Relationship goal: ' + profile.relationshipGoal : 'Choose your relationship intention.'}
    </InfoCard>
    <ActionButton title="Edit my profile" onPress={() => router.push('/profile')} />
    <ActionButton title="My ideal partner" onPress={() => router.push('/preferences')} secondary />
    <InfoCard title="Coming in the next release">
      Discover, mutual matching, private conversations, AI-assisted compatibility quizzes and date bookings are in development. No fabricated profiles or paid bookings are shown.
    </InfoCard>
    <InfoCard title="Account verification">
      Your account is {user.status.toLowerCase()}. Date discovery will remain unavailable until verification and trust/safety systems are complete.
    </InfoCard>
    <ActionButton title="Sign out" secondary onPress={() => { void signOut(); }} />
    <Text style={{ textAlign: 'center', color: Palette.muted, fontSize: 12 }}>LoveBind • Adults only • Your choice always matters.</Text>
  </Page>;
}
