import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api';

type Snapshot<T> = { key: string; data: T | null; error: string | null };

/**
 * GET a protected endpoint. Keeps the last good data while reloading, refetches
 * when the screen regains focus (e.g. switching tabs), and supports pull-to-refresh.
 * Pass `path = null` to skip fetching (e.g. while the account is not yet eligible).
 */
export function useApiQuery<T>(path: string | null, token: string | null) {
  const [version, setVersion] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot<T> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const key = (token ?? '') + '|' + (path ?? '') + '|' + version;

  useEffect(() => {
    if (!token || !path) return;
    let active = true;
    apiRequest<T>(path, 'GET', undefined, token)
      .then(data => { if (active) setSnapshot({ key, data, error: null }); })
      .catch((e: unknown) => {
        if (active) setSnapshot(prev => ({ key, data: prev?.data ?? null, error: e instanceof Error ? e.message : 'Something went wrong.' }));
      })
      .finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, [key, path, token]);

  const reload = useCallback(() => setVersion(v => v + 1), []);
  const pullToRefresh = useCallback(() => { setRefreshing(true); setVersion(v => v + 1); }, []);
  const mutate = useCallback((update: (data: T) => T) => {
    setSnapshot(prev => prev?.data ? { ...prev, data: update(prev.data) } : prev);
  }, []);

  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    // The mount effect already fetched; only refetch on later focus events.
    if (focused.current) reload();
    focused.current = true;
  }, [reload]));

  return {
    data: snapshot?.data ?? null,
    error: snapshot?.error ?? null,
    loading: !!token && !!path && snapshot === null,
    refreshing,
    reload,
    pullToRefresh,
    mutate,
  };
}
