import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { ActionButton, Brand, ErrorMessage, Field, Heading, InfoCard, Page, Palette } from '@/components/lovebind-ui';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

export default function ProfileScreen() {
  const { loading, user, token, refresh } = useSession();
  const profile = user?.profile;
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setName(profile?.displayName ?? '');
    setCity(profile?.city ?? '');
    setBio(profile?.bio ?? '');
    setGoal(profile?.relationshipGoal ?? '');
  }, [profile?.displayName, profile?.city, profile?.bio, profile?.relationshipGoal]);
  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={Palette.rose} /></View>;
  if (!user || !token) return <Redirect href="/login" />;

  async function save() {
    setBusy(true); setSuccess(false); setError(null);
    try {
      await apiRequest('/profiles/me', 'PUT', { displayName: name, city, bio, relationshipGoal: goal }, token!);
      await refresh();
      setSuccess(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save profile.'); }
    finally { setBusy(false); }
  }
  return <Page>
    <Brand caption="Your story, told your way" />
    <Heading title="About you" subtitle="Share what matters to you. Your information stays private while account verification is pending." />
    <Field label="Display name" value={name} onChangeText={setName} maxLength={60} />
    <Field label="City" value={city} onChangeText={setCity} placeholder="e.g. Johannesburg" maxLength={100} />
    <Field label="Relationship intention" value={goal} onChangeText={setGoal} placeholder="e.g. Long-term relationship" maxLength={80} />
    <Field label="Your story" multiline value={bio} onChangeText={setBio} placeholder="Your interests, values, and what makes you, you..." maxLength={1000} />
    <InfoCard title="Privacy first">Your profile will not enter discovery until proper verification, consent and moderation controls are implemented.</InfoCard>
    {success ? <InfoCard title="Profile saved">Your changes have been securely sent to the backend.</InfoCard> : null}
    <ErrorMessage message={error} />
    <ActionButton title="Save profile" busy={busy} onPress={() => { void save(); }} />
  </Page>;
}
