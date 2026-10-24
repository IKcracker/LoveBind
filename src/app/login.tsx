import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { ActionButton, Brand, ErrorMessage, Field, Heading, Page, Palette } from '@/components/lovebind-ui';
import { useSession } from '@/lib/session';

export default function LoginScreen() {
  const { loading, user, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={Palette.rose} /></View>;
  if (user) return <Redirect href="/" />;

  async function submit() {
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true); setError(null);
    try { await signIn(email.trim(), password); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.'); }
    finally { setBusy(false); }
  }

  return <Page>
    <Brand caption="Your next meaningful connection begins here" />
    <Heading title="Welcome back" subtitle="Sign in to continue building your LoveBind profile." />
    <Field label="Email address" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
    <Field label="Password" placeholder="Enter password" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} />
    <ErrorMessage message={error} />
    <ActionButton title="Sign in" busy={busy} onPress={() => { void submit(); }} />
    <ActionButton title="Create an account" secondary onPress={() => router.push('/register')} />
  </Page>;
}
