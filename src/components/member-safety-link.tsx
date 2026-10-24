import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { Love } from './auth-screens';

export function MemberSafetyLink({ memberId, name, matchId }: { memberId: string; name: string; matchId?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={'Safety options for ' + name}
    hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}
    onPress={() => router.push({ pathname: '/member-safety', params: { memberId, name, ...(matchId ? { matchId } : {}) } })}>
    <Text style={{ color: Love.wine, fontSize: 13, fontWeight: '700' }}>Safety options</Text>
  </Pressable>;
}
