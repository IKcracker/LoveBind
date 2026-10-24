import { type ReactNode, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette } from './lovebind-ui';

const P = { ...Palette, soft: '#FAE7EB', field: '#FCFAFC', mutedDark: '#675668', accent: '#E2A1B8' };

export function AuthLayout({
  eyebrow, title, description, children, footer,
}: {
  eyebrow: string; title: string; description: string; children: ReactNode; footer: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.authColumn}>
            <View style={styles.topNav}>
              <Pressable
                onPress={() => router.replace('/')}
                accessibilityRole="button"
                accessibilityLabel="Back to LoveBind welcome"
                hitSlop={12}
                style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.backArrow}>‹</Text>
              </Pressable>
              <Text style={styles.wordmark}>lovebind<Text style={{ color: P.rose }}>.</Text></Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.intro}>
              <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>

            <View style={styles.formCard}>{children}</View>
            <View style={styles.footer}>{footer}</View>
            <Text style={styles.safeFooter}>18+ only  ·  Made for meaningful connections</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthField({
  label, error, helper, right, ...props
}: TextInputProps & {
  label: string; error?: string; helper?: string; right?: ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputFrame, error ? styles.inputError : null]}>
        <TextInput
          {...props}
          style={[styles.input, props.style]}
          placeholderTextColor="#AB9DA8"
          selectionColor={P.rose}
          accessibilityLabel={label}
          accessibilityHint={helper}
          accessibilityState={{ disabled: Boolean(props.editable === false) }}
        />
        {right}
      </View>
      {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
      {!error && helper ? <Text style={styles.helpText}>{helper}</Text> : null}
    </View>
  );
}

export function PasswordField({
  label, value, onChangeText, error, autoComplete = 'current-password',
  returnKeyType = 'done', onSubmitEditing,
}: {
  label: string; value: string; onChangeText: (value: string) => void;
  error?: string; autoComplete?: TextInputProps['autoComplete'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
}) {
  const [visible, setVisible] = useState(false);
  return (
    <AuthField
      label={label} value={value} onChangeText={onChangeText}
      placeholder="Enter your password"
      error={error} secureTextEntry={!visible}
      autoComplete={autoComplete} textContentType={autoComplete === 'new-password' ? 'newPassword' : 'password'}
      autoCapitalize="none" autoCorrect={false} returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide ' + label.toLowerCase() : 'Show ' + label.toLowerCase()}
          onPress={() => setVisible((current) => !current)}
          style={styles.reveal}
          hitSlop={5}
        >
          <Text style={styles.revealText}>{visible ? 'Hide' : 'Show'}</Text>
        </Pressable>
      }
    />
  );
}

export function FormButton({
  text, onPress, busy = false, disabled = false, secondary = false,
}: {
  text: string; onPress: () => void; busy?: boolean; disabled?: boolean; secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy || disabled, busy }}
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.submit,
        secondary ? styles.secondaryButton : null,
        (busy || disabled) ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {busy ? <ActivityIndicator color={secondary ? P.plum : '#FFF'} /> : null}
      <Text style={[styles.submitText, secondary && styles.secondaryText]}>
        {busy ? 'Please wait…' : text}
      </Text>
      {!busy && !secondary ? <Text style={styles.buttonArrow}>→</Text> : null}
    </Pressable>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <View style={styles.errorCard} accessibilityRole="alert"><Text style={styles.errorCardText}>{message}</Text></View>;
}

export function FormLink({
  before, action, onPress,
}: { before: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.linkRow}>
      <Text style={styles.footerText}>{before} </Text>
      <Pressable hitSlop={8} accessibilityRole="link" onPress={onPress}>
        <Text style={styles.footerAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

export function AdultCheckbox({
  value, onChange, error,
}: {
  value: boolean; onChange: (value: boolean) => void; error?: string;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel="I confirm that I am 18 or older"
        accessibilityState={{ checked: value }}
        onPress={() => onChange(!value)}
        style={styles.consent}
      >
        <View style={[styles.checkbox, value && styles.checkedBox]}>
          {value ? <Text style={styles.checkText}>✓</Text> : null}
        </View>
        <Text style={styles.consentText}>I confirm that I am <Text style={{ fontWeight: '800' }}>18 years or older</Text>.</Text>
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function StrengthMeter({ level, label }: { level: number; label: string }) {
  return (
    <View style={styles.strengthWrap} accessibilityLabel={'Password strength: ' + label}>
      <View style={styles.strengthBars}>
        {[1, 2, 3, 4].map((segment) => (
          <View key={segment} style={[
            styles.strengthBar,
            segment <= level && { backgroundColor: level <= 1 ? '#D75A68' : level <= 2 ? '#E7A24A' : '#4A9D78' },
          ]} />
        ))}
      </View>
      <Text style={styles.helpText}>{label}</Text>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  section: { gap: 17 },
  reassurance: { backgroundColor: '#FDF4F6', borderRadius: 14, padding: 13, flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  reassuranceIcon: { color: P.rose, fontSize: 16, marginTop: 1 },
  reassuranceText: { flex: 1, color: P.mutedDark, fontSize: 12, lineHeight: 19 },
  sectionHeading: { color: P.plum, fontWeight: '800', fontSize: 13 },
  inlineRow: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: P.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 24 },
  authColumn: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13, marginBottom: 22 },
  backButton: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: P.border, borderWidth: 1 },
  backArrow: { fontSize: 32, lineHeight: 35, fontWeight: '300', color: P.plum, marginTop: -3 },
  wordmark: { color: P.plum, fontSize: 25, fontWeight: '800', letterSpacing: -1.5 },
  intro: { gap: 11, marginBottom: 25 },
  eyebrow: { color: P.rose, letterSpacing: 2.2, fontSize: 11, fontWeight: '800' },
  title: { color: P.ink, fontSize: 36, lineHeight: 41, letterSpacing: -1.4, fontWeight: '800' },
  description: { color: P.mutedDark, fontSize: 15, lineHeight: 23, maxWidth: 420 },
  formCard: { backgroundColor: P.white, borderColor: P.border, borderWidth: 1, borderRadius: 25, padding: 22, gap: 19 },
  fieldGroup: { gap: 8 },
  label: { color: P.ink, fontSize: 13, fontWeight: '800' },
  inputFrame: { backgroundColor: P.field, borderRadius: 14, borderWidth: 1, borderColor: '#EAE0E7', flexDirection: 'row', alignItems: 'center', minHeight: 54 },
  inputError: { borderColor: '#C64164', backgroundColor: '#FFF8F9' },
  input: { minHeight: 52, flex: 1, fontSize: 15, color: P.ink, paddingHorizontal: 15, paddingVertical: 12, minWidth: 0 },
  helpText: { color: P.muted, fontSize: 12, lineHeight: 17 },
  errorText: { color: '#B12B4F', fontSize: 12, lineHeight: 18 },
  reveal: { paddingHorizontal: 17, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', minHeight: 48 },
  revealText: { color: P.plum, fontWeight: '800', fontSize: 12 },
  submit: { minHeight: 56, borderRadius: 15, paddingHorizontal: 19, backgroundColor: P.rose, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  buttonArrow: { color: '#FFFFFF', fontSize: 19, fontWeight: '700', position: 'absolute', right: 19, top: 17 },
  secondaryButton: { backgroundColor: '#FFF', borderColor: P.border, borderWidth: 1 },
  secondaryText: { color: P.plum },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.8 },
  errorCard: { padding: 13, backgroundColor: '#FFF0F3', borderWidth: 1, borderColor: '#F3C1CD', borderRadius: 13 },
  errorCardText: { color: '#A92A4D', fontSize: 13, lineHeight: 19 },
  footer: { marginTop: 26, gap: 12 },
  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 1 },
  footerText: { color: P.muted, fontSize: 14 },
  footerAction: { color: P.rose, fontSize: 14, fontWeight: '800' },
  safeFooter: { color: '#968895', textAlign: 'center', marginTop: 22, fontSize: 11 },
  consent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 36 },
  consentText: { flex: 1, color: P.mutedDark, fontSize: 13, lineHeight: 20, paddingTop: 3 },
  checkbox: { width: 23, height: 23, borderRadius: 7, borderWidth: 1.5, borderColor: '#C7B6C2', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkedBox: { backgroundColor: P.rose, borderColor: P.rose },
  checkText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  strengthWrap: { gap: 7 },
  strengthBars: { flexDirection: 'row', gap: 5 },
  strengthBar: { flex: 1, height: 4, borderRadius: 4, backgroundColor: '#EDE5EA' },
});
