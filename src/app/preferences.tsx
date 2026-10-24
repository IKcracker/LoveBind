import { useState } from 'react';
import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AuthField, FormButton, FormError, Love } from '@/components/auth-screens';
import { GoalChip } from '@/components/goal-picker';
import { LoadingScreen, Notice, SectionLabel, StackScreen } from '@/components/member-ui';
import { RELATIONSHIP_GOALS } from '@/lib/account';
import { apiRequest } from '@/lib/api';
import { GENDERS, type Gender } from '@/lib/genders';
import { useSession, type Preferences } from '@/lib/session';

function PreferencesEditor({ preferences, token, refresh }: {
  preferences: Preferences | null;
  token: string;
  refresh: () => Promise<void>;
}) {
  const [minAge, setMinAge] = useState(String(preferences?.minAge ?? 23));
  const [maxAge, setMaxAge] = useState(String(preferences?.maxAge ?? 35));
  const [cities, setCities] = useState(preferences?.preferredCities.join(', ') ?? '');
  const [goals, setGoals] = useState<string[]>(preferences?.relationshipGoals ?? []);
  const [partnerGenders, setPartnerGenders] = useState<Gender[]>(preferences?.partnerGenders ?? []);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    const lower = Number(minAge);
    const upper = Number(maxAge);
    if (!Number.isInteger(lower) || !Number.isInteger(upper) || lower < 18 || upper > 100 || lower > upper) {
      setError('Choose an age range between 18 and 100, with minimum no higher than maximum.');
      return;
    }
    setBusy(true);
    setSuccess(false);
    setError(null);
    try {
      await apiRequest('/preferences/me', 'PUT', {
        minAge: lower, maxAge: upper,
        preferredCities: cities.split(',').map((s) => s.trim()).filter(Boolean),
        relationshipGoals: goals,
        partnerGenders,
      }, token);
      await refresh();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save preferences.');
    } finally {
      setBusy(false);
    }
  }
  const options = [...RELATIONSHIP_GOALS, ...goals.filter(goal => !RELATIONSHIP_GOALS.includes(goal))];
  return <StackScreen title="Partner preferences">
    <Text style={styles.intro}>Discover only shows people who fit your preferences, and whose preferences you fit too.</Text>
    <SectionLabel>Who I want to meet</SectionLabel>
    <Text style={styles.help}>Choose genders you are open to. Leave all unselected for everyone.</Text>
    <View style={styles.chips}>{GENDERS.map(option => <GoalChip key={option.value} label={option.label} selected={partnerGenders.includes(option.value)}
      onPress={() => setPartnerGenders(current => current.includes(option.value) ? current.filter(value => value !== option.value) : [...current, option.value])} />)}</View>
    <SectionLabel>Age range</SectionLabel>
    <View style={styles.row}>
      <View style={styles.half}><AuthField label="From" value={minAge} onChangeText={setMinAge} keyboardType="number-pad" maxLength={3} /></View>
      <View style={styles.half}><AuthField label="To" value={maxAge} onChangeText={setMaxAge} keyboardType="number-pad" maxLength={3} /></View>
    </View>
    <SectionLabel>Location</SectionLabel>
    <AuthField label="Preferred cities" value={cities} onChangeText={setCities} placeholder="Johannesburg, Pretoria" helper="Separate several cities with commas. Leave blank if you're flexible." />
    <SectionLabel>Relationship goals</SectionLabel>
    <Text style={styles.help}>Choose any you’d be open to. Leave all unselected to see every goal.</Text>
    <View style={styles.chips}>
      {options.map((goal) => <GoalChip
        key={goal} label={goal} selected={goals.includes(goal)}
        onPress={() => setGoals((current) => current.includes(goal) ? current.filter((g) => g !== goal) : [...current, goal])}
      />)}
    </View>
    <Notice tone="success" message={success ? 'Your preferences are up to date.' : null} />
    <FormError message={error} />
    <FormButton text="Save preferences" busy={busy} onPress={() => { void save(); }} />
  </StackScreen>;
}

export default function PreferencesScreen() {
  const { loading, user, token, refresh } = useSession();
  if (loading) return <LoadingScreen />;
  if (!user || !token) return <Redirect href="/login" />;
  return <PreferencesEditor key={user.id} preferences={user.preferences} token={token} refresh={refresh} />;
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 22, color: Love.muted },
  help: { fontSize: 13, lineHeight: 20, color: Love.muted, marginTop: -8 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
});
