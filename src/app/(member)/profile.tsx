import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Love, serif } from '@/components/auth-screens';
import { Icon } from '@/components/icon';
import { Avatar, Card, ListRow, LoadingScreen, Notice, SectionLabel, StatusPill, TabScreen, Tag } from '@/components/member-ui';
import { useApiQuery } from '@/hooks/use-api-query';
import { accountProgress, ageFrom } from '@/lib/account';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

export default function ProfileTab() {
  const { user, token, refresh, signOut } = useSession();
  const hasPhoto = !!user?.profile?.photoReviewStatus && user.profile.photoReviewStatus !== 'NONE';
  const photo = useApiQuery<{ url: string | null }>(hasPhoto ? '/photos/me' : null, token);
  const moderation = useApiQuery<{ canModerate: boolean }>('/moderation/access', token);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user?.profile) return <LoadingScreen />;

  const profile = user.profile;
  const progress = accountProgress(user);
  const age = ageFrom(profile.birthDate);
  const identityDone = progress.steps.find(step => step.key === 'identity')?.done;

  async function setVisible(visible: boolean) {
    if (!token || busy) return;
    setBusy(true); setError(null);
    try {
      await apiRequest('/profiles/me/visibility', 'PUT', { visible }, token);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update visibility.'); }
    finally { setBusy(false); }
  }

  return (
    <TabScreen refreshing={photo.refreshing} onRefresh={() => { photo.pullToRefresh(); void refresh().catch(() => undefined); }}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={() => router.push('/profile-photo')}>
          <Avatar name={profile.displayName} uri={photo.data?.url} size={104} />
          <View style={styles.cameraBadge}><Icon name="camera" size={15} color={Love.white} /></View>
        </Pressable>
        <Text style={styles.name}>{profile.displayName}{age !== null ? ', ' + age : ''}</Text>
        {profile.city ? <Text style={styles.city}>{profile.city}</Text> : null}
        <StatusPill tone={progress.active ? 'success' : 'pending'} label={progress.active ? 'VERIFIED MEMBER' : 'VERIFICATION IN PROGRESS'} />
        <Pressable accessibilityRole="button" onPress={() => router.push('/edit-profile')} style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
          <Icon name="edit" size={15} color={Love.wine} />
          <Text style={styles.editText}>Edit profile</Text>
        </Pressable>
      </View>

      {profile.photoReviewStatus === 'PENDING' ? <Notice tone="info" message="Your photo is saved privately and awaiting review." /> : null}
      <Notice tone="error" message={error} />

      <Card style={styles.preview}>
        <Text style={styles.previewLabel}>ABOUT ME</Text>
        <Text style={styles.bio}>{profile.bio || 'Add a short introduction so people can get to know you.'}</Text>
        {profile.relationshipGoal ? <><Text style={styles.previewLabel}>LOOKING FOR</Text><Text style={styles.value}>{profile.relationshipGoal}</Text></> : null}
        {profile.interests?.length ? <><Text style={styles.previewLabel}>INTERESTS</Text>
          <View style={styles.tags}>{profile.interests.map(x => <Tag key={x} label={x} />)}</View></> : null}
        {profile.coreValues?.length ? <><Text style={styles.previewLabel}>VALUES</Text>
          <View style={styles.tags}>{profile.coreValues.map(x => <Tag key={x} label={x} />)}</View></> : null}
      </Card>

      <SectionLabel>Dating</SectionLabel>
      <Card style={styles.list}>
        <ListRow icon="tune" label="Partner preferences" detail="Genders, age range, cities and relationship goals" href="/preferences" last={!progress.active} />
        {progress.active ? (
          <ListRow icon="eye" label="Show me in Discover" detail={profile.isVisible ? 'Eligible members can find you' : 'You are hidden from new people'} last
            right={<Switch value={profile.isVisible} disabled={busy} onValueChange={v => { void setVisible(v); }}
              trackColor={{ true: Love.wine, false: Love.line }} thumbColor={Love.white} accessibilityLabel="Show me in Discover"
              {...(Platform.OS === 'web' ? { activeThumbColor: Love.white } : null)} />} />
        ) : null}
      </Card>

      <SectionLabel>Trust & safety</SectionLabel>
      <Card style={styles.list}>
        <ListRow icon="shield" label="Blocked members" detail="Manage who can contact you" href="/blocked-members" />
        <ListRow icon="shield" label="Identity verification" detail={identityDone ? 'Verified' : 'Required before you can be discovered'} href="/verification" />
        <ListRow icon="camera" label="Profile photo" detail={progress.steps.find(step => step.key === 'photo')?.detail} href="/profile-photo" last={!moderation.data?.canModerate} />
        {moderation.data?.canModerate ? <ListRow icon="admin" label="Photo moderation" detail="Review pending member photos" href="/moderation" last /> : null}
      </Card>

      <Card style={styles.list}>
        <ListRow icon="shield" label="Delete account" detail="Permanently leave LoveBind" href="/delete-account" danger />
        <ListRow icon="signOut" label={busy ? 'Signing out…' : 'Sign out'} danger last onPress={() => { setBusy(true); void signOut(); }} />
      </Card>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  header: { alignItems: 'center', gap: 8, paddingTop: 14, paddingBottom: 6 },
  cameraBadge: { position: 'absolute', right: 2, bottom: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: Love.wine, borderWidth: 2, borderColor: Love.paper, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: serif, fontSize: 30, lineHeight: 36, color: Love.ink, marginTop: 8, textAlign: 'center' },
  city: { fontSize: 14, color: Love.muted, marginTop: -4 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Love.line, backgroundColor: Love.white, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 10, marginTop: 6 },
  editText: { color: Love.wine, fontWeight: '700', fontSize: 14 },
  preview: { gap: 8 },
  previewLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: Love.wine, marginTop: 6 },
  bio: { fontSize: 15, lineHeight: 23, color: Love.ink },
  value: { fontSize: 15, color: Love.ink },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { padding: 0, overflow: 'hidden' },
});
