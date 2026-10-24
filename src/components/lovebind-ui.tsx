import type { ReactNode } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps,
} from 'react-native';

export const Palette = {
  background: '#FFF8F7', ink: '#3E2336', muted: '#786A76',
  rose: '#D83E78', roseLight: '#FCE3EA', plum: '#512D45',
  white: '#FFFFFF', border: '#EAD9DF', success: '#2D785D',
};

export function Brand({ caption }: { caption?: string }) {
  return (
    <View style={styles.brandRow}>
      <View style={styles.mark}><Text style={styles.markText}>♥</Text></View>
      <View>
        <Text style={styles.brand}>LoveBind</Text>
        {caption ? <Text style={styles.brandCaption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.headingWrap}>
      <Text style={styles.heading}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#9C9099"
        selectionColor={Palette.rose}
        style={[styles.input, props.multiline && styles.textArea, props.style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function ActionButton({
  title, onPress, busy = false, disabled = false, secondary = false,
}: {
  title: string; onPress: () => void; busy?: boolean; disabled?: boolean; secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        (busy || disabled) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {busy ? <ActivityIndicator color={secondary ? Palette.rose : '#FFFFFF'} /> : null}
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>
        {busy ? 'Please wait…' : title}
      </Text>
    </Pressable>
  );
}

export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return <View style={styles.error}><Text style={styles.errorText}>{message}</Text></View>;
}

export function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardBody}>{children}</Text>
  </View>;
}

export function ChoiceChip({ title, chosen, onPress }: {
  title: string; chosen: boolean; onPress: () => void;
}) {
  return <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: chosen }}
    onPress={onPress}
    style={[styles.chip, chosen && styles.chipChosen]}
  >
    <Text style={[styles.chipText, chosen && styles.chipTextChosen]}>{title}</Text>
  </Pressable>;
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.background },
  content: { flexGrow: 1, width: '100%', maxWidth: 540, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 28, gap: 21 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: { width: 48, height: 48, backgroundColor: Palette.rose, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  markText: { fontSize: 26, color: Palette.white, fontWeight: '800' },
  brand: { color: Palette.plum, fontSize: 23, fontWeight: '800', letterSpacing: -0.7 },
  brandCaption: { color: Palette.muted, fontSize: 12, marginTop: 3 },
  headingWrap: { gap: 9, marginTop: 15 },
  heading: { fontSize: 32, lineHeight: 37, letterSpacing: -1.2, fontWeight: '800', color: Palette.ink },
  subtitle: { fontSize: 15, lineHeight: 23, color: Palette.muted },
  fieldWrap: { gap: 8 },
  fieldLabel: { color: Palette.plum, fontSize: 13, fontWeight: '700' },
  input: { minHeight: 53, backgroundColor: Palette.white, borderColor: Palette.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, color: Palette.ink, fontSize: 15 },
  textArea: { minHeight: 114, paddingVertical: 14, textAlignVertical: 'top' },
  hint: { color: Palette.muted, fontSize: 12, lineHeight: 18 },
  button: { minHeight: 54, borderRadius: 15, backgroundColor: Palette.rose, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18 },
  buttonSecondary: { backgroundColor: Palette.white, borderWidth: 1, borderColor: Palette.border },
  buttonText: { color: Palette.white, fontWeight: '800', fontSize: 15 },
  buttonSecondaryText: { color: Palette.rose },
  error: { backgroundColor: '#FDE8EA', borderColor: '#E99AA3', borderWidth: 1, borderRadius: 12, padding: 12 },
  errorText: { color: '#8A2836', fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: Palette.white, borderWidth: 1, borderColor: Palette.border, borderRadius: 20, padding: 19, gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: Palette.ink },
  cardBody: { fontSize: 14, lineHeight: 22, color: Palette.muted },
  chip: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 18, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.white },
  chipChosen: { borderColor: Palette.rose, backgroundColor: Palette.roseLight },
  chipText: { fontSize: 13, color: Palette.muted, fontWeight: '600' },
  chipTextChosen: { color: Palette.plum },
});
