import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthField, BrandLockup, FormButton, FormError, Love, serif } from '@/components/auth-screens';
import { useSession } from '@/lib/session';
import { apiRequest } from '@/lib/api';

function split(value: string): string[] {
  return [...new Set(value.split(',').map(v => v.trim()).filter(Boolean))];
}

export default function Onboarding() {
  const { user, token, refresh, loading } = useSession();
  const [city, setCity] = useState(user?.profile?.city ?? '');
  const [bio, setBio] = useState(user?.profile?.bio ?? '');
  const [goal, setGoal] = useState(user?.profile?.relationshipGoal ?? '');
  const [occupation, setOccupation] = useState(user?.profile?.occupation ?? '');
  const [interests, setInterests] = useState((user?.profile?.interests ?? []).join(', '));
  const [values, setValues] = useState((user?.profile?.coreValues ?? []).join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!token || busy) return;
    if (city.trim().length < 2 || bio.trim().length < 30 || goal.trim().length < 3) {
      setError('Enter your city, relationship intention and at least 30 characters about yourself.');
      return;
    }
    const interestList = split(interests), valueList = split(values);
    if (!interestList.length || !valueList.length || interestList.length > 8 || valueList.length > 8 ||
        [...interestList, ...valueList].some(x => x.length < 2 || x.length > 36)) {
      setError('Add 1–8 interests and 1–8 values separated by commas. Keep each item 2–36 characters.');
      return;
    }
    setBusy(true); setError(null);
    try {
      await apiRequest('/profiles/me', 'PUT', {
        city, bio, relationshipGoal: goal, occupation, interests: interestList, coreValues: valueList,
      }, token);
      await refresh();
      router.replace('/profile-photo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile');
    } finally { setBusy(false); }
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator color={Love.wine}/></View>;
  if (!user || !token) return <Redirect href="/login" />;
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <BrandLockup />
      <View style={styles.progressBar}><View style={styles.active}/><View style={styles.track}/><View style={styles.track}/></View>
      <Text style={styles.progress}>01 / 03 · YOUR STORY</Text>
      <Text style={styles.head}>A little about you.</Text>
      <Text style={styles.description}>Real connections start with knowing who you are. Your profile stays private while verification is pending.</Text>
      <AuthField label="Your city" value={city} onChangeText={setCity} placeholder="Pretoria" maxLength={100} />
      <AuthField label="Relationship intention" value={goal} onChangeText={setGoal} placeholder="Something long term" maxLength={80} />
      <AuthField label="Occupation (optional)" value={occupation} onChangeText={setOccupation} placeholder="What keeps you busy?" maxLength={100} />
      <AuthField label="Interests" value={interests} onChangeText={setInterests} placeholder="Art, hiking, cooking" helper="Separate each interest with a comma." maxLength={295} />
      <AuthField label="What matters to you?" value={values} onChangeText={setValues} placeholder="Kindness, family, honesty" helper="Add a few personal values, separated by commas." maxLength={295} />
      <AuthField label="Introduce yourself" value={bio} onChangeText={setBio} placeholder="Your passions, personality and values…" multiline maxLength={1000} style={styles.bio} />
      <FormError message={error} />
      <FormButton text="Save and add photo" busy={busy} onPress={() => { void submit(); }} />
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Love.paper },
  loading: { flex: 1, backgroundColor: Love.paper, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 26, gap: 20, maxWidth: 500, width: '100%', alignSelf: 'center' },
  progress: { color: Love.wine, fontSize: 11, letterSpacing: 1.5, marginTop: 8, fontWeight: '700' },
  progressBar: { flexDirection: 'row', gap: 6, marginTop: 18 },
  active: { flex: 1, backgroundColor: Love.wine, height: 3, borderRadius: 3 },
  track: { flex: 1, backgroundColor: Love.line, height: 3, borderRadius: 3 },
  head: { fontFamily: serif, fontSize: 42, color: Love.ink },
  description: { fontSize: 15, lineHeight: 23, color: Love.muted, marginBottom: 10 },
  bio: { minHeight: 140, textAlignVertical: 'top' },
});
