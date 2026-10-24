import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError, checkApiHealth, getApiAddress } from '@/lib/api';
import { Love } from '@/components/auth-screens';

type Status = 'checking' | 'ready' | 'error';

export function DevApiStatus() {
  const [status, setStatus] = useState<Status>('checking');
  const [message, setMessage] = useState('');
  const [address, setAddress] = useState('');

  const verify = useCallback(async () => {
    setStatus('checking');
    try {
      const health = await checkApiHealth();
      setAddress(health.url);
      setStatus('ready');
      setMessage('API and registration tables are ready.');
    } catch (error) {
      try { setAddress(getApiAddress()); } catch { setAddress('Not configured'); }
      setStatus('error');
      setMessage(error instanceof ApiError || error instanceof Error ? error.message : 'API check failed.');
    }
  }, []);

  useEffect(() => { void verify(); }, [verify]);

  if (!__DEV__) return null;
  return (
    <View style={styles.wrapper}>
      <View style={styles.top}>
        <Text style={styles.title}>Development API</Text>
        <Text style={[styles.status, status === 'ready' ? styles.good : status === 'error' ? styles.bad : null]}>
          {status === 'checking' ? 'Checking…' : status === 'ready' ? 'Connected' : 'Unavailable'}
        </Text>
      </View>
      <Text selectable style={styles.url}>{address || 'Detecting backend…'}</Text>
      <Text style={styles.detail}>{message || 'Checking the backend and database…'}</Text>
      <Pressable accessibilityRole="button" onPress={() => { void verify(); }} style={styles.retry}>
        <Text style={styles.retryLabel}>Check again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderWidth: 1, borderColor: Love.line, backgroundColor: Love.white, borderRadius: 10, padding: 14, gap: 8 },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  title: { color: Love.ink, fontSize: 12, fontWeight: '700' },
  status: { color: Love.muted, fontSize: 11, fontWeight: '700' },
  good: { color: '#257B58' },
  bad: { color: Love.error },
  url: { color: Love.wine, fontSize: 11 },
  detail: { color: Love.muted, fontSize: 11, lineHeight: 17 },
  retry: { alignSelf: 'flex-start', paddingVertical: 7 },
  retryLabel: { color: Love.wine, fontSize: 12, fontWeight: '700' },
});
