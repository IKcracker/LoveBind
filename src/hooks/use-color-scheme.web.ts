import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// Keep server-rendered web markup stable and read the theme after hydration.
function subscribe(): () => void { return () => undefined; }
function getClientSnapshot(): boolean { return true; }
function getServerSnapshot(): boolean { return false; }

export function useColorScheme() {
  const hydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const colorScheme = useRNColorScheme();
  return hydrated ? colorScheme : 'light';
}
