import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MemberSafetyLink } from '@/components/member-safety-link';
import { Love } from '@/components/auth-screens';
import { Avatar, Card, EmptyState, LockedState, Notice, PageTitle, TabScreen } from '@/components/member-ui';
import { useApiQuery } from '@/hooks/use-api-query';
import { useSession } from '@/lib/session';

type Match = { id: string; name: string; city: string | null; createdAt: string; memberId: string };

export default function Matches() {
  const { user, token } = useSession();
  const active = user?.status === 'ACTIVE';
  const query = useApiQuery<{ matches: Match[] }>(active ? '/discovery/matches' : null, token);

  const header = <PageTitle eyebrow="MATCHES" title="A mutual spark."
    subtitle="When you both say yes, you'll find each other here." />;
  if (!active) return <TabScreen>{header}<LockedState feature="Matches" /></TabScreen>;

  const matches = query.data?.matches ?? [];
  return (
    <TabScreen refreshing={query.refreshing} onRefresh={query.pullToRefresh}>
      {header}
      <Notice tone="error" message={query.error} actionLabel="Try again" onAction={query.reload} />
      {query.loading ? <ActivityIndicator color={Love.wine} style={styles.spinner} /> : null}

      {matches.length ? (
        <>
          <View style={styles.strip}>
            {matches.slice(0, 6).map(m => (
              <View key={m.id} style={styles.stripItem}>
                <View style={styles.ring}><Avatar name={m.name} size={60} /></View>
                <Text style={styles.stripName} numberOfLines={1}>{m.name.split(' ')[0]}</Text>
              </View>
            ))}
          </View>
          <Card style={styles.list}>
            {matches.map((m, i) => (
              <View key={m.id} style={[styles.row, i < matches.length - 1 && styles.divider]}>
                <Avatar name={m.name} size={50} />
                <View style={styles.info}>
                  <Text style={styles.name}>{m.name}</Text>
                  <MemberSafetyLink memberId={m.memberId} name={m.name} matchId={m.id} />
                  <Text style={styles.meta} numberOfLines={1}>{m.city || 'Location undisclosed'} · Matched {new Date(m.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            ))}
          </Card>
          <Notice tone="info" message="Private conversations are coming soon. We're finishing safety checks first, so we won't show placeholder chats." />
        </>
      ) : null}

      {query.data && !matches.length ? (
        <EmptyState icon="chat" title="Great connections take two."
          body="No matches yet. Browse verified members and say you're interested when someone feels right."
          actionLabel="Discover people" onAction={() => router.navigate('/discover')}
          secondaryLabel="See who likes you" onSecondary={() => router.navigate('/likes')} />
      ) : null}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  spinner: { marginVertical: 30 },
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  stripItem: { alignItems: 'center', gap: 6, width: 68 },
  ring: { padding: 2, borderRadius: 34, borderWidth: 2, borderColor: Love.blush },
  stripName: { fontSize: 12, fontWeight: '700', color: Love.ink },
  list: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Love.line },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontWeight: '700', color: Love.ink },
  meta: { fontSize: 12, color: Love.muted },
});
