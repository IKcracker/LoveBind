import { Stack } from 'expo-router';
import { Love } from '@/components/auth-screens';
import { SessionProvider, useSession } from '@/lib/session';

/**
 * Signed-out visitors can reach the welcome, login and register screens.
 * Signed-in members get the tab shell `(member)` plus screens pushed over it.
 * When the session changes, guarded screens are dropped and the router falls
 * back to `index`, which decides where the member belongs.
 */
function RootNavigator() {
  const { user } = useSession();
  const signedIn = !!user;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Love.paper } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="account-deleted" />
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(member)" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="profile-photo" />
        <Stack.Screen name="verification" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="delete-account" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="moderation" />
        <Stack.Screen name="member-safety" />
        <Stack.Screen name="blocked-members" />
        <Stack.Screen name="chat/[matchId]" />
        <Stack.Screen name="quiz/[matchId]" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}
