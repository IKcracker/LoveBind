import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, ApiError } from './api';

export type Profile = {
  displayName: string; birthDate: string; city: string | null; cityPlaceId?: string | null;
  bio: string | null; relationshipGoal: string | null; isVisible: boolean;
  occupation?: string | null; interests?: string[]; coreValues?: string[]; photoReviewStatus?: string;
};
export type Preferences = {
  minAge: number; maxAge: number; preferredCities: string[]; relationshipGoals: string[];
};
export type CurrentUser = {
  id: string; status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  credential: { email: string } | null;
  profile: Profile | null; preferences: Preferences | null;
};
type AuthResponse = {
  accessToken: string; expiresAt: string; user: { id: string; status: CurrentUser['status'] };
};
type RegisterRequest = { displayName: string; email: string; password: string; birthDate: string };
type SessionContextValue = {
  loading: boolean; user: CurrentUser | null; token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (body: RegisterRequest) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const KEY = 'lovebind.session.token.v1';
const SessionContext = createContext<SessionContextValue | null>(null);

// Web does not have OS-backed SecureStore. Keep web tokens memory-only;
 // never persist a bearer token into localStorage or sessionStorage.
async function readToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(KEY);
}
async function saveToken(value: string): Promise<void> {
  if (Platform.OS !== 'web') await SecureStore.setItemAsync(KEY, value);
}
async function clearToken(): Promise<void> {
  if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(KEY);
}
async function fetchCurrentUser(token: string): Promise<CurrentUser> {
  return apiRequest<CurrentUser>('/auth/me', 'GET', undefined, token);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let current = true;
    (async () => {
      try {
        const saved = await readToken();
        if (saved) {
          const me = await fetchCurrentUser(saved);
          if (current) { setToken(saved); setUser(me); }
        }
      } catch (error) {
        // Expired or inaccessible sessions should not open protected screens.
        if (current) { setToken(null); setUser(null); }
        if (error instanceof ApiError && error.status === 401) {
          await clearToken().catch(() => undefined);
        }
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => { current = false; };
  }, []);

  const establish = useCallback(async (response: AuthResponse) => {
    const me = await fetchCurrentUser(response.accessToken);
    await saveToken(response.accessToken);
    setToken(response.accessToken);
    setUser(me);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<AuthResponse>('/auth/login', 'POST', { email, password });
    await establish(response);
  }, [establish]);

  const signUp = useCallback(async (body: RegisterRequest) => {
    const response = await apiRequest<AuthResponse>('/auth/register', 'POST', body);
    await establish(response);
  }, [establish]);

  const signOut = useCallback(async () => {
    try {
      if (token) await apiRequest('/auth/logout', 'POST', {}, token);
    } catch {
      // Revocation can fail if offline; local session is cleared regardless.
    } finally {
      await clearToken().catch(() => undefined);
      setUser(null);
      setToken(null);
    }
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) throw new ApiError('Please sign in again.', 401);
    try {
      setUser(await fetchCurrentUser(token));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearToken().catch(() => undefined);
        setToken(null);
        setUser(null);
      }
      throw error;
    }
  }, [token]);

  const value = useMemo(() => ({
    loading, token, user, signIn, signUp, signOut, refresh,
  }), [loading, token, user, signIn, signUp, signOut, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession requires SessionProvider');
  return value;
}
