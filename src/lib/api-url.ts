import Constants from 'expo-constants';
import { Platform } from 'react-native';

type RuntimePlatform = 'android' | 'ios' | 'web' | 'windows' | 'macos';
export type ApiResolution = { url: string; inferredFrom: 'explicit' | 'expo-dev-server' | 'emulator' | 'browser' };

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function getExpoDevHost(): string | null {
  const value = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (!value) return null;
  try {
    const endpoint = new URL(value.includes('://') ? value.replace(/^exp:\/\//, 'http://') : 'http://' + value);
    const hostname = endpoint.hostname;
    // A tunnel is not a route to a developer's private local API.
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.endsWith('.local')) {
      return hostname;
    }
  } catch {
    return null;
  }
  return null;
}

export function resolveApiBaseUrl(
  configured: string | undefined = process.env.EXPO_PUBLIC_API_URL,
  platform: RuntimePlatform = Platform.OS,
  development: boolean = __DEV__,
  expoDevHost: string | null = getExpoDevHost(),
): ApiResolution {
  const input = (configured ?? '').trim();
  if (!input) {
    throw new Error('Set EXPO_PUBLIC_API_URL=http://localhost:4000 in the root .env.local file.');
  }

  if (input === 'auto') {
    if (!development) throw new Error('EXPO_PUBLIC_API_URL must be a secure HTTPS URL outside development.');
    if (platform === 'web') return { url: 'http://localhost:4000', inferredFrom: 'browser' };
    if (expoDevHost) return { url: 'http://' + expoDevHost + ':4000', inferredFrom: 'expo-dev-server' };
    if (platform === 'android') return { url: 'http://10.0.2.2:4000', inferredFrom: 'emulator' };
    if (platform === 'ios') return { url: 'http://localhost:4000', inferredFrom: 'emulator' };
    throw new Error('Could not identify your Expo LAN address. Set EXPO_PUBLIC_API_URL to http://YOUR_COMPUTER_IP:4000.');
  }

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL must be an absolute http(s) URL or "auto" in development.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_URL must use http(s).');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('EXPO_PUBLIC_API_URL must contain only an origin (without credentials or paths).');
  }
  if (!development && parsed.protocol !== 'https:') {
    throw new Error('Production requires an HTTPS API address.');
  }
  if (development && platform !== 'web' && isLoopback(parsed.hostname)) {
    const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    if (expoDevHost) {
      return { url: parsed.protocol + '//' + expoDevHost + ':' + port, inferredFrom: 'expo-dev-server' };
    }
    if (platform === 'android') return { url: 'http://10.0.2.2:' + port, inferredFrom: 'emulator' };
    // iOS simulator shares the host loopback.
    return { url: parsed.origin, inferredFrom: 'emulator' };
  }
  return { url: parsed.origin, inferredFrom: 'explicit' };
}

export function apiConnectionHelp(error: unknown, url: string): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('Could not identify') || message.includes('EXPO_PUBLIC_API_URL') || message.includes('Set EXPO_PUBLIC')) return message;
  return 'Unable to reach the LoveBind API at ' + url +
    '. Start the NestJS backend on port 4000. For a physical phone, use the same Wi-Fi and allow port 4000 through your firewall. If you use an Expo tunnel, set EXPO_PUBLIC_API_URL to an address reachable by the phone.';
}
