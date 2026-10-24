import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Love } from '@/components/auth-screens';
import { Avatar, Card, EmptyState, LockedState, Notice, PageTitle, TabScreen } from '@/components/member-ui';
import { useApiQuery } from '@/hooks/use-api-query';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

type Like = { id: string; name: string; city: string | null; age: number; relationshipGoal: string | null; receivedAt: string };

export default function Likes() {
  const { user, token } = useSession();
  const active = user?.status === 'ACTIVE';
  const query = useApiQuery<{ likes: Like[] }>(active ? '/discovery/likes' : null, token);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'info' | 'error'; message: string; matched?: boolean } | null>(null);

  async function likeBack(person: Like) {
    if (!token || busyId) return;
    setBusyId(person.id); setFeedback(null);
    try {
      const result = await apiRequest<{ matched: boolean }>('/discovery/' + encodeURIComponent(person.id) + '/like', 'POST', {}, token);
      query.mutate(data => ({ likes: data.likes.filter(x => x.id !== person.id) }));
      setFeedback(result.matched
        ? { tone: 'success', message: "It's a match! You and " + person.name + ' like each other.', matched: true }
        : { tone: 'info', message: 'Interest sent to ' + person.name + '.' });
    } catch (e) { setFeedback({ tone: 'error', message: e instanceof Error ? e.message : 'Could not respond.' }); }
    finally { setBusyId(null); }
  }

  const header = <PageTitle eyebrow="LIKES YOU" title="Someone noticed you."
    subtitle="Real interest from verified members. Like them back and it's a match." />;
  if (!active) return <TabScreen>{header}<LockedState feature="Likes" /></TabScreen>;

  const likes = query.data?.likes ?? [];
  return (
    <TabScreen refreshing={query.refreshing} onRefresh={query.pullToRefresh}>
      {header}
      {feedback ? <Notice tone={feedback.tone} message={feedback.message}
        actionLabel={feedback.matched ? 'Go to matches' : undefined} onAction={feedback.matched ? () => router.navigate('/matches') : undefined} /> : null}
      <Notice tone="error" message={query.error} actionLabel="Try again" onAction={query.reload} />
      {query.loading ? <ActivityIndicator color={Love.wine} style={styles.spinner} /> : null}

      {likes.length ? <Text style={styles.count}>{likes.length} {likes.length === 1 ? 'person likes' : 'people like'} you</Text> : null}
      {likes.map(person => (
        <Card key={person.id} style={styles.card}>
          <Avatar name={person.name} size={58} />
          <View style={styles.info}>
            <Text style={styles.name}>{person.name}, {person.age}</Text>
            <Text style={styles.meta} numberOfLines={1}>{person.city || 'Location undisclosed'}</Text>
            <Text style={styles.meta} numberOfLines={1}>{person.relationshipGoal || 'Looking for a connection'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={'Like ' + person.name + ' back'} disabled={!!busyId}
            onPress={() => { void likeBack(person); }} style={({ pressed }) => [styles.action, (pressed || !!busyId) && styles.dim]}>
            {busyId === person.id ? <ActivityIndicator color={Love.white} size="small" /> : <Text style={styles.actionText}>Like back</Text>}
          </Pressable>
        </Card>
      ))}

      {query.data && !likes.length ? (
        <EmptyState icon="heart" title="Good things take time."
          body="When someone likes you, they'll appear here. Make sure you've joined discovery so new people can find you."
          actionLabel="Explore people" onAction={() => router.navigate('/discover')} />
      ) : null}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  spinner: { marginVertical: 30 },
  count: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: Love.muted },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  info: { flex: 1, gap: 3 },
  name: { fontWeight: '800', fontSize: 16, color: Love.ink },
  meta: { fontSize: 12, color: Love.muted },
  action: { backgroundColor: Love.wine, paddingHorizontal: 14, minHeight: 40, minWidth: 92, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: Love.white, fontSize: 13, fontWeight: '800' },
  dim: { opacity: 0.7 },
});
