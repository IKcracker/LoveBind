import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Love } from '@/components/auth-screens';

type Tab = 'home' | 'discover' | 'connections' | 'profile';
const tabs: { key: Tab; label: string; glyph: string; path: '/' | '/discover' | '/connections' | '/profile' }[] = [
  { key: 'home', label: 'Home', glyph: '⌂', path: '/' },
  { key: 'discover', label: 'Discover', glyph: '✦', path: '/discover' },
  { key: 'connections', label: 'Connections', glyph: '♡', path: '/connections' },
  { key: 'profile', label: 'Profile', glyph: '◯', path: '/profile' },
];

/**
 * Persistent member navigation lives outside the screen's ScrollView.
 * Onboarding/verification screens deliberately do not display these tabs.
 */
export function MemberTabBar({ active, approved }: { active: Tab; approved: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(10, insets.bottom) }]}>
      <View style={styles.inner} accessibilityRole="tablist">
        {tabs.map(tab => {
          const selected = active === tab.key;
          const locked = !approved && (tab.key === 'discover' || tab.key === 'connections');
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected, disabled: locked }}
              accessibilityHint={locked ? 'Available after account approval' : undefined}
              disabled={locked}
              onPress={() => { if (!selected) router.replace(tab.path); }}
              style={({ pressed }) => [styles.tab, selected && styles.selected, locked && styles.locked, pressed && styles.pressed]}
            >
              <Text style={[styles.icon, selected && styles.selectedText]}>{tab.glyph}</Text>
              <Text style={[styles.label, selected && styles.selectedText]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Love.white,
    borderTopColor: Love.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 9,
    paddingHorizontal: 12,
  },
  inner: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 12,
  },
  selected: { backgroundColor: '#F7EEF1' },
  icon: { fontSize: 24, color: Love.muted, height: 26, lineHeight: 27 },
  label: { fontSize: 10, fontWeight: '700', color: Love.muted },
  selectedText: { color: Love.wine },
  locked: { opacity: 0.35 },
  pressed: { opacity: 0.65 },
});
