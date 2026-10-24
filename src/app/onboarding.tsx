import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthField, BrandLockup, FormButton, FormError, Love, serif } from '@/components/auth-screens';
import { useSession } from '@/lib/session';
import { apiRequest } from '@/lib/api';

export default function Onboarding() {
  const { user, token, refresh } = useSession();
  const [city, setCity] = useState(user?.profile?.city ?? '');
  const [bio, setBio] = useState(user?.profile?.bio ?? '');
  const [goal, setGoal] = useState(user?.profile?.relationshipGoal ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!token || busy) return;
    if (city.trim().length < 2 || bio.trim().length < 30 || goal.trim().length < 3) {
      setError('Enter your city, relationship intention and at least 30 characters about yourself.');
      return;
    }
    setBusy(true); setError(null);
    try {
      await apiRequest('/profiles/me', 'PUT', { city, bio, relationshipGoal: goal }, token);
      await refresh();
      router.replace('/verification');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile');
    } finally { setBusy(false); }
  }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <BrandLockup />
    <Text style={styles.progress}>01 / 02 · YOUR STORY</Text>
    <Text style={styles.head}>A little about you.</Text>
    <Text style={styles.description}>Real connections start with knowing who you are. Your profile stays private while verification is pending.</Text>
    <AuthField label="Your city" value={city} onChangeText={setCity} placeholder="Pretoria" maxLength={100} />
    <AuthField label="Relationship intention" value={goal} onChangeText={setGoal} placeholder="Something long term" maxLength={80} />
    <AuthField label="Introduce yourself" value={bio} onChangeText={setBio} placeholder="Your passions, personality and values…" multiline maxLength={1000} style={styles.bio} />
    <FormError message={error} />
    <FormButton text="Continue" busy={busy} onPress={() => { void submit(); }} />
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Love.paper },
  content: { padding: 26, gap: 20, maxWidth: 500, width: '100%', alignSelf: 'center' },
  progress: { color: Love.wine, fontSize: 11, letterSpacing: 1.5, marginTop: 26, fontWeight: '700' },
  head: { fontFamily: serif, fontSize: 42, color: Love.ink },
  description: { fontSize: 15, lineHeight: 23, color: Love.muted, marginBottom: 10 },
  bio: { minHeight: 140, textAlignVertical: 'top' },
});
