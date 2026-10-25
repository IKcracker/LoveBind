import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthField, FormButton, FormError, Love } from '@/components/auth-screens';
import { LoadingScreen, StackScreen } from '@/components/member-ui';
import { useSession } from '@/lib/session';

export default function DeleteAccountScreen() {
  const { loading, user, token, deleteAccount } = useSession();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  if (loading) return <LoadingScreen />;
  if (!user || !token) return <Redirect href="/login" />;

  async function remove() {
    if (submitting.current || !password || confirmation !== 'DELETE') return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      await deleteAccount(password);
      router.replace('/account-deleted');
    } catch {
      setError('Deletion was not confirmed. Check your connection and current password, then retry. After five attempts, wait 15 minutes. If your session expired, sign in again; a completed deletion cannot be undone.');
    } finally {
      setPassword(''); submitting.current = false; setBusy(false);
    }
  }

  return <StackScreen title="Delete account">
    <Text style={s.title}>Leave LoveBind permanently</Text>
    <Text style={s.text}>Your profile will leave discovery and every device will be signed out. All matches will end. Conversations and shared quiz answers and results will be removed for both people.</Text>
    <Text style={s.text}>Your login, profile and preferences will be deleted. Private photos and identity-verification data are queued for removal from our providers. Limited safety, moderation and transaction records may be retained under our retention policy or a documented legal hold. Deletion does not automatically issue a refund.</Text>
    <Text style={s.text}>This cannot be undone. To pause discovery instead, use “Show me in Discover” on your profile.</Text>
    <AuthField label="Current password" value={password} onChangeText={setPassword} secureTextEntry
      autoCapitalize="none" autoCorrect={false} maxLength={128} editable={!busy} />
    <AuthField label="Type DELETE to confirm" value={confirmation} onChangeText={setConfirmation}
      autoCapitalize="characters" autoCorrect={false} maxLength={6} editable={!busy} />
    <FormError message={error} />
    <View style={s.actions}>
      <FormButton text="Permanently delete my account" busy={busy} disabled={!password || confirmation !== 'DELETE'} onPress={() => { void remove(); }} />
      <FormButton text="Keep my account" disabled={busy} onPress={() => router.back()} />
    </View>
  </StackScreen>;
}
const s = StyleSheet.create({
  title: { color: Love.ink, fontSize: 24, fontWeight: '700' },
  text: { color: Love.muted, fontSize: 15, lineHeight: 23 },
  actions: { gap: 12 },
});
