import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FormButton, Love, serif } from '@/components/auth-screens';
import { Icon } from '@/components/icon';
import { Card, EmptyState, IconButton, LockedState, Notice, PageTitle, TabScreen, Tag } from '@/components/member-ui';
import { useApiQuery } from '@/hooks/use-api-query';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

type Candidate = {
  id: string; name: string; age: number; city: string | null; bio: string | null;
  occupation: string | null; relationshipGoal: string | null; interests: string[]; coreValues: string[]; photoUrl: string | null;
};
type Result = { needsOptIn: boolean; candidates: Candidate[] };
type Feedback = { tone: 'success' | 'info' | 'error'; message: string; matched?: boolean };

export default function Discover() {
  const { user, token, refresh } = useSession();
  const active = user?.status === 'ACTIVE';
  const query = useApiQuery<Result>(active ? '/discovery' : null, token);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function setVisible(visible: boolean) {
    if (!token || busy) return;
    setBusy(true); setFeedback(null);
    try {
      await apiRequest('/profiles/me/visibility', 'PUT', { visible }, token);
      await refresh();
      query.reload();
      setFeedback({ tone: 'success', message: visible ? 'You are now visible to eligible members.' : 'Your profile is hidden from Discover.' });
    } catch (e) { setFeedback({ tone: 'error', message: e instanceof Error ? e.message : 'Unable to update visibility.' }); }
    finally { setBusy(false); }
  }

  async function like(id: string) {
    if (!token || busy) return;
    setBusy(true); setFeedback(null);
    try {
      const res = await apiRequest<{ matched: boolean }>('/discovery/' + encodeURIComponent(id) + '/like', 'POST', {}, token);
      query.mutate(data => ({ ...data, candidates: data.candidates.filter(c => c.id !== id) }));
      setFeedback(res.matched
        ? { tone: 'success', message: "It's mutual! You have a new match.", matched: true }
        : { tone: 'info', message: 'Interest sent privately. You will match if they like you too.' });
    } catch (e) { setFeedback({ tone: 'error', message: e instanceof Error ? e.message : 'Unable to send interest.' }); }
    finally { setBusy(false); }
  }

  function pass(id: string) {
    setFeedback(null);
    setSkipped(current => [...current, id]);
  }

  const filtersButton = <IconButton icon="tune" label="Partner preferences" onPress={() => router.push('/preferences')} />;
  const header = <PageTitle eyebrow="DISCOVER" title="Find your person." action={filtersButton} />;

  if (!active) return <TabScreen>{header}<LockedState feature="Discover" /></TabScreen>;

  const candidates = query.data?.candidates.filter(c => !skipped.includes(c.id)) ?? [];
  const card = candidates[0];

  return (
    <TabScreen refreshing={query.refreshing} onRefresh={() => { setSkipped([]); query.pullToRefresh(); }}>
      {header}
      {feedback ? <Notice tone={feedback.tone} message={feedback.message}
        actionLabel={feedback.matched ? 'Go to matches' : undefined} onAction={feedback.matched ? () => router.navigate('/matches') : undefined} /> : null}
      <Notice tone="error" message={query.error} actionLabel="Try again" onAction={query.reload} />
      {query.loading ? <ActivityIndicator color={Love.wine} style={styles.spinner} /> : null}

      {query.data?.needsOptIn ? (
        <Card style={styles.optIn}>
          <View style={styles.optInIcon}><Icon name="eye" size={26} color={Love.wine} /></View>
          <Text style={styles.optInTitle}>Ready to be discovered?</Text>
          <Text style={styles.optInText}>Your profile is private by default. Join discovery to be shown only to verified adults who match your preferences. You can hide again any time.</Text>
          <FormButton text="Join discovery" busy={busy} onPress={() => { void setVisible(true); }} />
          <Pressable onPress={() => router.push('/preferences')} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>Set who you’re looking for first</Text>
          </Pressable>
        </Card>
      ) : null}

      {query.data && !query.data.needsOptIn ? (
        <View style={styles.visibility}>
          <View style={styles.visibleDot} />
          <Text style={styles.visibleText}>You’re visible to eligible members</Text>
          <Pressable disabled={busy} onPress={() => { void setVisible(false); }} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>Hide me</Text>
          </Pressable>
        </View>
      ) : null}

      {card ? (
        <View style={styles.profile}>
          <View style={styles.photoWrap}>
            {card.photoUrl
              ? <Image source={{ uri: card.photoUrl }} style={styles.photo} contentFit="cover" transition={200} accessibilityLabel={'Photo of ' + card.name} />
              : <View style={[styles.photo, styles.placeholder]}><Icon name="heart" size={56} color={Love.blush} /></View>}
            {card.photoUrl ? <><View style={[styles.scrim, styles.scrimSoft]} /><View style={[styles.scrim, styles.scrimMid]} /><View style={[styles.scrim, styles.scrimStrong]} /></> : null}
            <View style={styles.photoCaption}>
              <Text style={[styles.person, !card.photoUrl && styles.onLight]}>{card.name}, {card.age}</Text>
              {card.city ? <View style={styles.metaRow}><Icon name="pin" size={14} color={card.photoUrl ? '#F5E8EA' : Love.muted} /><Text style={[styles.photoMeta, !card.photoUrl && styles.onLightMeta]}>{card.city}</Text></View> : null}
              {card.occupation ? <View style={styles.metaRow}><Icon name="work" size={14} color={card.photoUrl ? '#F5E8EA' : Love.muted} /><Text style={[styles.photoMeta, !card.photoUrl && styles.onLightMeta]}>{card.occupation}</Text></View> : null}
            </View>
          </View>
          <View style={styles.details}>
            {card.bio ? <Text style={styles.bio}>{card.bio}</Text> : null}
            <Text style={styles.section}>LOOKING FOR</Text>
            <Text style={styles.detail}>{card.relationshipGoal || 'A genuine connection'}</Text>
            {card.interests.length ? <><Text style={styles.section}>INTERESTS</Text>
              <View style={styles.tags}>{card.interests.map(x => <Tag key={x} label={x} />)}</View></> : null}
            {card.coreValues.length ? <><Text style={styles.section}>VALUES</Text>
              <View style={styles.tags}>{card.coreValues.map(x => <Tag key={x} label={x} />)}</View></> : null}
          </View>
          <View style={styles.actions}>
            <View style={styles.action}>
              <IconButton icon="close" label={'Pass on ' + card.name} tone="outline" size={64} disabled={busy} onPress={() => pass(card.id)} />
              <Text style={styles.actionLabel}>Not now</Text>
            </View>
            <View style={styles.action}>
              <IconButton icon="heartFill" label={'Like ' + card.name} tone="wine" size={72} disabled={busy} onPress={() => { void like(card.id); }} />
              <Text style={styles.actionLabel}>I’m interested</Text>
            </View>
          </View>
        </View>
      ) : null}

      {query.data && !query.data.needsOptIn && !card ? (
        <EmptyState icon="sparkles" title="You're all caught up."
          body="No new people currently match both your preferences and theirs. Check back soon, or widen what you're looking for."
          actionLabel="Edit preferences" onAction={() => router.push('/preferences')}
          secondaryLabel="Refresh" onSecondary={() => { setSkipped([]); query.reload(); }} />
      ) : null}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  spinner: { marginVertical: 30 },
  link: { color: Love.wine, fontWeight: '700', fontSize: 14, textAlign: 'center' },
  optIn: { alignItems: 'stretch', gap: 14, padding: 22 },
  optInIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Love.wineSoft, alignItems: 'center', justifyContent: 'center' },
  optInTitle: { fontFamily: serif, fontSize: 27, color: Love.ink },
  optInText: { fontSize: 14, lineHeight: 22, color: Love.muted },
  visibility: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  visibleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Love.success },
  visibleText: { flex: 1, fontSize: 12, color: Love.muted, fontWeight: '600' },
  profile: { backgroundColor: Love.white, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: Love.line },
  photoWrap: { aspectRatio: 4 / 5, backgroundColor: Love.wineSoft },
  photo: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center', paddingBottom: 90 },
  // Stacked bands approximate a gradient so the caption stays readable on any photo.
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  scrimSoft: { height: '45%', backgroundColor: 'rgba(28,16,24,0.18)' },
  scrimMid: { height: '30%', backgroundColor: 'rgba(28,16,24,0.22)' },
  scrimStrong: { height: '17%', backgroundColor: 'rgba(28,16,24,0.25)' },
  onLight: { color: Love.ink },
  onLightMeta: { color: Love.muted },
  photoCaption: { position: 'absolute', left: 20, right: 20, bottom: 18, gap: 4 },
  person: { fontFamily: serif, color: Love.white, fontSize: 34, lineHeight: 40 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  photoMeta: { color: '#F5E8EA', fontSize: 14, fontWeight: '600' },
  details: { padding: 20, gap: 10 },
  bio: { fontSize: 15, lineHeight: 23, color: Love.ink },
  section: { fontSize: 11, color: Love.wine, fontWeight: '800', letterSpacing: 1.2, marginTop: 8 },
  detail: { color: Love.ink, fontSize: 15 },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 40, paddingTop: 6, paddingBottom: 24 },
  action: { alignItems: 'center', gap: 8 },
  actionLabel: { fontSize: 12, color: Love.muted, fontWeight: '600' },
});
