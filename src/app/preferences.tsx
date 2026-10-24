import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { ActionButton, Brand, ChoiceChip, ErrorMessage, Field, Heading, InfoCard, Page, Palette } from '@/components/lovebind-ui';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

const GOALS = ['Long-term relationship', 'Marriage-minded', 'Getting to know someone', 'Not sure yet'];

export default function PreferencesScreen() {
  const { loading, user, token, refresh } = useSession();
  const preferences = user?.preferences;
  const [minAge, setMinAge] = useState('23');
  const [maxAge, setMaxAge] = useState('35');
  const [cities, setCities] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!preferences) return;
    setMinAge(String(preferences.minAge));
    setMaxAge(String(preferences.maxAge));
    setCities(preferences.preferredCities.join(', '));
    setGoals(preferences.relationshipGoals);
  }, [preferences?.minAge, preferences?.maxAge, preferences?.preferredCities?.join('|'), preferences?.relationshipGoals?.join('|')]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={Palette.rose} /></View>;
  if (!user || !token) return <Redirect href="/login" />;

  async function save() {
    const lower = Number(minAge), upper = Number(maxAge);
    if (!Number.isInteger(lower) || !Number.isInteger(upper) || lower < 18 || upper > 100 || lower > upper) {
      setError('Choose an age range between 18 and 100, with minimum no higher than maximum.');
      return;
    }
    setBusy(true); setSuccess(false); setError(null);
    try {
      await apiRequest('/preferences/me', 'PUT', {
        minAge: lower, maxAge: upper,
        preferredCities: cities.split(',').map((s) => s.trim()).filter(Boolean),
        relationshipGoals: goals,
      }, token!);
      await refresh();
      setSuccess(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save preferences.'); }
    finally { setBusy(false); }
  }

  return <Page>
    <Brand caption="Find alignment, not perfection" />
    <Heading title="Your ideal connection" subtitle="Tell LoveBind what matters to you. Mutual compatibility will later use both people's preferences and quiz answers." />
    <Field label="Minimum age" value={minAge} onChangeText={setMinAge} keyboardType="number-pad" maxLength={3} />
    <Field label="Maximum age" value={maxAge} onChangeText={setMaxAge} keyboardType="number-pad" maxLength={3} />
    <Field label="Preferred cities" value={cities} onChangeText={setCities} placeholder="Johannesburg, Pretoria" hint="Separate several locations with commas. Leave blank if flexible." />
    <Heading title="Relationship goals" subtitle="Choose the goals you would be comfortable exploring." />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
      {GOALS.map((goal) => <ChoiceChip
        key={goal} title={goal} chosen={goals.includes(goal)}
        onPress={() => setGoals((current) => current.includes(goal) ? current.filter((g) => g !== goal) : [...current, goal])}
      />)}
    </View>
    <InfoCard title="Beyond preferences">When both people are ready, our upcoming compatibility quiz will explore values, communication, and relationship expectations with AI-assisted explanations.</InfoCard>
    {success ? <InfoCard title="Saved">Your preferences are up to date.</InfoCard> : null}
    <ErrorMessage message={error} />
    <ActionButton title="Save preferences" busy={busy} onPress={() => { void save(); }} />
  </Page>;
}
