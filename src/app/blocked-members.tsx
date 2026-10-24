import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { FormButton, Love } from '@/components/auth-screens';
import { Card, LoadingScreen, Notice, StackScreen } from '@/components/member-ui';
import { MemberSafetyLink } from '@/components/member-safety-link';
import { useApiQuery } from '@/hooks/use-api-query';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

export default function BlockedMembers() {
  const { user, token, loading } = useSession();
  const query = useApiQuery<{ blocks: { memberId: string; name: string }[] }>('/safety/blocks', token);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function unblock(id: string) {
    if (!token || busy) return;
    setBusy(id); setError(null);
    try {
      await apiRequest('/safety/members/' + encodeURIComponent(id) + '/unblock', 'POST', {}, token);
      query.mutate(data => ({ blocks: data.blocks.filter(row => row.memberId !== id) }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to unblock.'); }
    finally { setBusy(null); }
  }
  if (loading) return <LoadingScreen />;
  if (!user || !token) return <Redirect href="/login" />;
  return <StackScreen title="Blocked members">
    <Text style={{ color: Love.muted, lineHeight: 22 }}>Unblocking allows discovery again if you are both eligible. It does not restore past likes or matches. A block set by the other member stays in place.</Text>
    <Notice tone="error" message={error ?? query.error} />
    {query.loading ? <ActivityIndicator color={Love.wine} /> : null}
    {query.data?.blocks.map(row => <Card key={row.memberId}><Text style={{ color: Love.ink, fontWeight: '700' }}>{row.name}</Text>
      <MemberSafetyLink memberId={row.memberId} name={row.name} />
      <FormButton text="Unblock" disabled={!!busy} busy={busy === row.memberId} onPress={() => { void unblock(row.memberId); }} /></Card>)}
    {query.data && !query.data.blocks.length ? <Text style={{ color: Love.muted }}>You have no blocked members.</Text> : null}
  </StackScreen>;
}
