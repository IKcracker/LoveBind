import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FormButton, Love, serif } from '@/components/auth-screens';
import { Icon } from '@/components/icon';
import { Card, ListRow, LoadingScreen, Notice, SectionLabel, TabScreen } from '@/components/member-ui';
import { useApiQuery } from '@/hooks/use-api-query';
import { accountProgress } from '@/lib/account';
import { useSession } from '@/lib/session';

type LikesResponse = { likes: unknown[] };
type MatchesResponse = { matches: unknown[] };

function Stat({ value, label, onPress }: { value: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={value + ' ' + label} onPress={onPress}
      style={({ pressed }) => [styles.stat, pressed && styles.pressed]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

export default function Home() {
  const { user, token, refresh } = useSession();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const active = user?.status === 'ACTIVE';
  const likes = useApiQuery<LikesResponse>(active ? '/discovery/likes' : null, token);
  const matches = useApiQuery<MatchesResponse>(active ? '/discovery/matches' : null, token);
  if (!user) return <LoadingScreen />;

  const progress = accountProgress(user);
  const next = progress.next;
  const firstName = user.profile?.displayName?.split(' ')[0] || 'there';

  async function sync() {
    setSyncing(true); setSyncError(null);
    try {
      await refresh();
      likes.reload(); matches.reload();
    } catch (e) { setSyncError(e instanceof Error ? e.message : 'Could not refresh your status.'); }
    finally { setSyncing(false); }
  }

  return (
    <TabScreen refreshing={syncing} onRefresh={() => { void sync(); }}>
      <Text style={styles.greeting}>Welcome back,</Text>
      <Text style={styles.name}>{firstName}<Text style={styles.dot}>.</Text></Text>
      <Notice tone="error" message={syncError} />
      {user.status === 'SUSPENDED' ? <Notice tone="error" message="Your account is suspended. Please contact LoveBind support if you believe this is a mistake." /> : null}

      {active ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>VERIFIED MEMBER</Text>
            <Text style={styles.heroTitle}>Someone worth meeting is out there.</Text>
            <Text style={styles.heroText}>Every profile you see has passed identity, age and photo checks.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.navigate('/discover')} style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}>
              <Text style={styles.heroButtonText}>Start discovering</Text>
              <Icon name="chevron" size={16} color={Love.wine} />
            </Pressable>
          </View>
          <View style={styles.stats}>
            <Stat value={likes.data ? String(likes.data.likes.length) : '–'} label={likes.data?.likes.length === 1 ? 'person likes you' : 'people like you'} onPress={() => router.navigate('/likes')} />
            <Stat value={matches.data ? String(matches.data.matches.length) : '–'} label={matches.data?.matches.length === 1 ? 'match' : 'matches'} onPress={() => router.navigate('/matches')} />
          </View>
          {!user.profile?.isVisible ? (
            <Notice tone="info" message="Your profile is hidden, so new people can't find you yet." actionLabel="Join discovery" onAction={() => router.navigate('/discover')} />
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>GETTING VERIFIED</Text>
            <Text style={styles.heroTitle}>{progress.completed} of {progress.total} steps complete.</Text>
            <Text style={styles.heroText}>Your profile stays private until every safety check is approved. Then Discover, Likes and Matches unlock.</Text>
            <View style={styles.track} accessibilityLabel={progress.completed + ' of ' + progress.total + ' steps complete'}>
              <View style={[styles.fill, { width: (progress.completed / progress.total * 100) + '%' }]} />
            </View>
          </View>
          {next?.href ? <FormButton text={'Continue: ' + next.title} onPress={() => { if (next.href) router.push(next.href); }} />
            : <Notice tone="info" message="You're all set for now. We're reviewing your details and will unlock Discover as soon as you're approved." />}
          <SectionLabel>Your checklist</SectionLabel>
          <Card style={styles.list}>
            {progress.steps.map((step, i) => (
              <ListRow key={step.key} icon={step.done ? 'check' : step.waiting || step.key === 'review' ? 'clock' : 'circle'}
                label={step.title} detail={step.detail} href={step.done ? undefined : step.href} last={i === progress.steps.length - 1}
                right={step.done ? <Text style={styles.done}>Done</Text> : step.waiting ? <Text style={styles.waiting}>In review</Text> : undefined} />
            ))}
          </Card>
          <Pressable accessibilityRole="button" onPress={() => { void sync(); }} style={styles.refresh} disabled={syncing}>
            <Icon name="refresh" size={16} color={Love.wine} />
            <Text style={styles.refreshText}>{syncing ? 'Checking…' : 'Check my status'}</Text>
          </Pressable>
        </>
      )}

      <Card style={styles.safety}>
        <Text style={styles.safetyTitle}>A safer place to connect ♡</Text>
        <Text style={styles.safetyText}>Your interest stays private until it’s mutual, and you control whether you appear in Discover.</Text>
      </Card>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  greeting: { fontFamily: serif, fontSize: 24, lineHeight: 30, color: Love.muted, marginTop: 10 },
  name: { fontFamily: serif, fontSize: 42, lineHeight: 48, color: Love.ink, marginTop: -8 },
  dot: { color: Love.blush },
  hero: { borderRadius: 22, backgroundColor: Love.wine, padding: 22, gap: 12 },
  heroEyebrow: { color: '#F2DCE5', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  heroTitle: { fontFamily: serif, color: Love.white, fontSize: 28, lineHeight: 34 },
  heroText: { color: '#F4E6EC', fontSize: 14, lineHeight: 21 },
  heroButton: { marginTop: 6, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Love.white, borderRadius: 24, paddingVertical: 11, paddingHorizontal: 18 },
  heroButtonText: { color: Love.wine, fontWeight: '800', fontSize: 14 },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden', marginTop: 4 },
  fill: { height: 6, backgroundColor: '#F7DCE4' },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: Love.white, borderWidth: 1, borderColor: Love.line, borderRadius: 18, padding: 18, gap: 4 },
  statValue: { fontFamily: serif, fontSize: 34, color: Love.wine },
  statLabel: { fontSize: 13, color: Love.muted },
  list: { padding: 0, overflow: 'hidden' },
  done: { fontSize: 12, fontWeight: '800', color: Love.success },
  waiting: { fontSize: 12, fontWeight: '800', color: Love.blush },
  refresh: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  refreshText: { color: Love.wine, fontWeight: '700', fontSize: 14 },
  safety: { backgroundColor: Love.sand, borderColor: Love.sand, gap: 6 },
  safetyTitle: { fontSize: 16, fontWeight: '700', color: Love.ink },
  safetyText: { fontSize: 13, lineHeight: 20, color: Love.muted },
});
