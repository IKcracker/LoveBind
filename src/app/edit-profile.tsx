import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthField, FormButton, FormError, Love } from '@/components/auth-screens';
import { CityPicker } from '@/components/city-picker';
import { GoalChip, GoalPicker } from '@/components/goal-picker';
import { LoadingScreen, Notice, SectionLabel, StackScreen } from '@/components/member-ui';
import { apiRequest } from '@/lib/api';
import { GENDERS, type Gender } from '@/lib/genders';
import { useSession, type Profile } from '@/lib/session';

type EditorProps = { profile: Profile; token: string; refresh: () => Promise<void> };
function csv(value: string): string[] { return [...new Set(value.split(',').map(v => v.trim()).filter(Boolean))]; }

function ProfileEditor({ profile, token, refresh }: EditorProps) {
  const [gender, setGender] = useState<Gender | null>(profile.gender ?? null);
  const [name, setName] = useState(profile.displayName);
  const [city, setCity] = useState(profile.city ?? '');
  const [cityPlaceId, setCityPlaceId] = useState(profile.cityPlaceId ?? null);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [goal, setGoal] = useState(profile.relationshipGoal ?? '');
  const [occupation, setOccupation] = useState(profile.occupation ?? '');
  const [interests, setInterests] = useState((profile.interests ?? []).join(', '));
  const [values, setValues] = useState((profile.coreValues ?? []).join(', '));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    if (!cityPlaceId && city !== profile.city) { setError('Select a valid city from suggestions.'); return; }
    if (!goal) { setError('Choose what you are looking for.'); return; }
    setBusy(true); setSaved(false); setError(null);
    try {
      await apiRequest('/profiles/me', 'PUT', {
        displayName: name, gender, city, cityPlaceId, bio, relationshipGoal: goal, occupation,
        interests: csv(interests), coreValues: csv(values),
      }, token);
      await refresh(); setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your profile.'); }
    finally { setBusy(false); }
  }

  return <StackScreen title="Edit profile">
    <Text style={s.intro}>Make it sound like you. Changes to your display name or introduction need review and hide your profile until approved. Other edits keep your approval.</Text>
    <SectionLabel>The basics</SectionLabel>
    <AuthField label="Display name" value={name} onChangeText={setName} maxLength={60} />
    <SectionLabel>My gender</SectionLabel>
    <View style={s.chips}>{GENDERS.map(option => <GoalChip key={option.value} label={option.label} selected={gender === option.value} onPress={() => setGender(option.value)} />)}
      <GoalChip label="Prefer not to say" selected={gender === null} onPress={() => setGender(null)} /></View>
    <Text style={s.intro}>If you leave gender unspecified, you appear only to people open to all genders.</Text>
    <CityPicker token={token} city={city} placeId={cityPlaceId} onSelect={(name,id)=>{setCity(name);setCityPlaceId(id);}} />
    <AuthField label="Occupation" value={occupation} onChangeText={setOccupation} placeholder="Optional" maxLength={100}/>
    <SectionLabel>Looking for</SectionLabel>
    <GoalPicker value={goal} onChange={setGoal} />
    <SectionLabel>What makes you, you</SectionLabel>
    <AuthField label="Your introduction" value={bio} onChangeText={setBio} multiline maxLength={1000} style={s.bio}
      helper={bio.trim().length + ' / 1000'} />
    <AuthField label="Your interests" value={interests} onChangeText={setInterests} helper="Separate with commas" maxLength={295}/>
    <AuthField label="Values that matter" value={values} onChangeText={setValues} helper="Separate with commas" maxLength={295}/>
    <Notice tone="success" message={saved ? 'Your changes have been saved.' : null} actionLabel="Back to profile" onAction={() => router.back()} />
    <FormError message={error}/>
    <View style={s.actions}><FormButton text="Save changes" busy={busy} onPress={() => { void save(); }} /></View>
  </StackScreen>;
}

export default function EditProfileScreen() {
  const { loading, user, token, refresh } = useSession();
  if (loading) return <LoadingScreen />;
  if (!user || !token) return <Redirect href="/login"/>;
  if (!user.profile) return <Redirect href="/onboarding"/>;
  return <ProfileEditor key={user.id} profile={user.profile} token={token} refresh={refresh} />;
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  intro: { fontSize: 14, lineHeight: 22, color: Love.muted },
  bio: { height: 145, textAlignVertical: 'top' },
  actions: { marginTop: 4 },
});
