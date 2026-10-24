import { Stack } from 'expo-router';
import { SessionProvider } from '@/lib/session';
import { Palette } from '@/components/lovebind-ui';

export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack screenOptions={{
        headerStyle: { backgroundColor: Palette.background },
        headerTintColor: Palette.plum,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Palette.background },
      }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="profile-photo" options={{ headerShown: false }} />
        <Stack.Screen name="verification" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: 'My profile' }} />
        <Stack.Screen name="preferences" options={{ title: 'Partner preferences' }} />
      </Stack>
    </SessionProvider>
  );
}
