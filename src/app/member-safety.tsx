import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { AuthField, FormButton, FormError, Love } from '@/components/auth-screens';
import { GoalChip } from '@/components/goal-picker';
import { LoadingScreen, Notice, SectionLabel, StackScreen } from '@/components/member-ui';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

const CATEGORIES = [
  ['HARASSMENT', 'Harassment'], ['HATE', 'Hate or discrimination'], ['SCAM', 'Scam or fraud'],
  ['IMPERSONATION', 'Impersonation'], ['UNDERAGE', 'Under 18'], ['INAPPROPRIATE_CONTENT', 'Inappropriate content'], ['OTHER', 'Other'],
];

export default function MemberSafety() {
  const { memberId, name, matchId } = useLocalSearchParams<{ memberId?: string; name?: string; matchId?: string }>();
  const { user, token, loading } = useSession();
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState('');
  const [blockWithReport, setBlockWithReport] = useState(true);
  const [confirm, setConfirm] = useState<'block' | 'unmatch' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'report' | 'block' | 'unmatch' | null>(null);

  async function submit(action: 'report' | 'block' | 'unmatch') {
    if (!token || !memberId || busy) return;
    setBusy(true); setError(null);
    try {
      const path = action === 'unmatch' ? '/safety/matches/' + encodeURIComponent(matchId ?? '') + '/unmatch'
        : '/safety/members/' + encodeURIComponent(memberId) + '/' + action;
      await apiRequest(path, 'POST', action === 'report' ? { category, details, block: blockWithReport } : {}, token);
      setLastAction(action);
      setSuccess(action === 'report' ? 'Your report was sent privately to our moderators.' + (blockWithReport ? ' This member is also blocked.' : '')
        : action === 'block' ? 'Member blocked. You will no longer appear to each other, and any match has ended.' : 'Match ended. You will no longer appear to each other.');
      setConfirm(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to complete this action.'); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingScreen />;
  if (!user || !token) return <Redirect href="/login" />;
  if (typeof memberId !== 'string' || !/^[a-zA-Z0-9_-]{10,100}$/.test(memberId) || memberId === user.id) {
    return <StackScreen title="Safety options"><FormError message="Select a member from Discover, Likes or Matches." /></StackScreen>;
  }
  return <StackScreen title="Safety options">
    <Text style={s.title}>{typeof name === 'string' ? name : 'Member'}</Text>
    <Text style={s.copy}>Reports are confidential. Blocking removes this member from Discover, Likes and Matches for both of you. You can unblock in your profile; previous matches will stay closed.</Text>
    {success ? <><Notice tone="success" message={success} />
      {lastAction !== 'report' ? <FormButton text="Report a concern" secondary onPress={() => setSuccess(null)} /> : null}
      <FormButton text="Back to Discover" onPress={() => router.replace('/discover')} /></> : <>
      <SectionLabel>Report a concern</SectionLabel>
      <View style={s.chips}>{CATEGORIES.map(([value, label]) => <GoalChip key={value} label={label} selected={category === value} onPress={() => setCategory(value)} />)}</View>
      <AuthField label="What happened?" value={details} onChangeText={setDetails} multiline maxLength={2000} helper="Optional. Include details that will help our moderators." />
      <View style={s.row}><Text style={s.copy}>Also block this member</Text><Switch value={blockWithReport} onValueChange={setBlockWithReport} disabled={busy} accessibilityLabel="Also block this member" /></View>
      <FormButton text="Send report" disabled={!category || busy} busy={busy} onPress={() => { void submit('report'); }} />
      <SectionLabel>End contact</SectionLabel>
      <FormButton text="Block member" disabled={busy} onPress={() => setConfirm('block')} />
      {typeof matchId === 'string' ? <FormButton text="Unmatch" disabled={busy} onPress={() => setConfirm('unmatch')} /> : null}
      {confirm ? <><Text style={s.copy}>{confirm === 'block' ? 'Block this member and end any match?' : 'End this match permanently?'} This will remove existing likes. You can still report a concern.</Text>
        <FormButton text={confirm === 'block' ? 'Confirm block' : 'Confirm unmatch'} busy={busy} onPress={() => { void submit(confirm); }} />
        <FormButton text="Cancel" secondary disabled={busy} onPress={() => setConfirm(null)} /></> : null}
    </>}
    <FormError message={error} />
  </StackScreen>;
}

const s = StyleSheet.create({
  title: { color: Love.ink, fontSize: 24, fontWeight: '700' },
  copy: { color: Love.muted, fontSize: 14, lineHeight: 22, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
});
