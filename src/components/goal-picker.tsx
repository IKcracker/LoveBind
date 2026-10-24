import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Love } from '@/components/auth-screens';
import { RELATIONSHIP_GOALS } from '@/lib/account';

export function GoalChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
      style={({ pressed }) => [s.chip, selected && s.chipSelected, pressed && s.pressed]}>
      <Text style={[s.chipText, selected && s.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

/** Single choice from the shared goal list. A legacy free-text goal stays visible and selected until changed. */
export function GoalPicker({ value, onChange }: { value: string; onChange: (goal: string) => void }) {
  const options = value && !RELATIONSHIP_GOALS.includes(value) ? [...RELATIONSHIP_GOALS, value] : RELATIONSHIP_GOALS;
  return (
    <View style={s.wrap} accessibilityRole="radiogroup" accessibilityLabel="Relationship intention">
      {options.map(goal => <GoalChip key={goal} label={goal} selected={goal === value} onPress={() => onChange(goal)} />)}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 20, borderWidth: 1, borderColor: Love.line, backgroundColor: Love.white },
  chipSelected: { borderColor: Love.wine, backgroundColor: Love.wineSoft },
  chipText: { fontSize: 13, color: Love.muted, fontWeight: '600' },
  chipTextSelected: { color: Love.wine, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
