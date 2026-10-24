import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { ActionButton, Brand, ErrorMessage, Field, Heading, Page, Palette } from '@/components/lovebind-ui';
import { useSession } from '@/lib/session';

export default function RegisterScreen() {
  const { loading, user, signUp } = useSession();
  const [displayName, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adultAcknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={Palette.rose} /></View>;
  if (user) return <Redirect href="/" />;

  async function submit() {
    if (!adultAcknowledged) { setError('Please confirm that you are at least 18 years old.'); return; }
    if (password.length < 12) { setError('Use a password of at least 12 characters.'); return; }
    setBusy(true); setError(null);
    try { await signUp({ displayName, birthDate, email, password }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not create account.'); }
    finally { setBusy(false); }
  }
  return <Page>
    <Brand caption="Where connection starts with understanding" />
    <Heading title="Join LoveBind" subtitle="Create your account. Your profile remains hidden until verification and safety checks are available." />
    <Field label="What should we call you?" value={displayName} onChangeText={setName} placeholder="Display name" maxLength={60} autoComplete="name" />
    <Field label="Date of birth" value={birthDate} onChangeText={setBirthDate} placeholder="YYYY-MM-DD" maxLength={10} hint="LoveBind is for adults aged 18+. Your birth date is not shown publicly." />
    <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@example.com" maxLength={254} />
    <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="At least 12 characters" />
    <ActionButton
      title={adultAcknowledged ? '✓ I confirm I am 18 or older' : 'Confirm that I am 18 or older'}
      secondary onPress={() => setAcknowledged((v) => !v)}
    />
    <ErrorMessage message={error} />
    <ActionButton title="Create account" busy={busy} onPress={() => { void submit(); }} />
    <ActionButton title="I already have an account" secondary onPress={() => router.replace('/login')} />
  </Page>;
}
