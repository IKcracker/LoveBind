import { type ReactNode, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const Love = {
  paper: '#F8F6F2',
  white: '#FFFFFF',
  ink: '#232025',
  muted: '#69636A',
  mutedSoft: '#89828A',
  wine: '#5A3346',
  blush: '#B86A76',
  line: '#DED9D5',
  error: '#A63747',
  errorBg: '#FBF0F0',
};
export const serif = Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia', default: 'serif' });

export function BrandLockup({ inverse = false }: { inverse?: boolean }) {
  return (
    <View style={styles.brandLockup} accessible accessibilityLabel="LoveBind">
      <View style={styles.monogram} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.ring, styles.ringLeft, inverse && styles.ringInverse]} />
        <View style={[styles.ring, styles.ringRight, inverse && styles.ringInverse]} />
      </View>
      <Text style={[styles.brandText, inverse && { color: Love.white }]}>lovebind</Text>
    </View>
  );
}

export function AuthLayout({
  title, description, children, footer, step, onBack,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  step?: 1 | 2;
  onBack?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'left', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.inner}>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={12}
                onPress={onBack ?? (() => router.replace('/'))}
                style={({ pressed }) => [styles.back, pressed && styles.pressed]}
              >
                <Text style={styles.backArrow}>‹</Text>
              </Pressable>
              <BrandLockup />
              <View style={styles.headerSpacer} />
            </View>
            {step ? (
              <View style={styles.progress} accessibilityLabel={'Step ' + step + ' of 2'}>
                <View style={styles.progressActive} />
                <View style={[styles.progressTrack, step === 2 && styles.progressActive]} />
              </View>
            ) : null}
            <View style={styles.intro}>
              {step ? <Text style={styles.kicker}>STEP 0{step} / 02</Text> : null}
              <Text style={styles.title} accessibilityRole="header">{title}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
            <View style={styles.fields}>{children}</View>
            <View style={styles.footer}>{footer}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthField({
  label, error, helper, right, ...props
}: TextInputProps & {
  label: string;
  error?: string;
  helper?: string;
  right?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldBorder, focused && styles.fieldFocused, !!error && styles.fieldInvalid]}>
        <TextInput
          {...props}
          onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
          placeholderTextColor={Love.mutedSoft}
          selectionColor={Love.wine}
          accessibilityLabel={label}
          accessibilityHint={helper}
          style={[styles.textInput, props.multiline && styles.multiline, props.style]}
        />
        {right}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
        : helper ? <Text style={styles.helpText}>{helper}</Text> : null}
    </View>
  );
}

export function PasswordField({
  label, value, onChangeText, error, autoComplete = 'current-password',
  onSubmitEditing, returnKeyType = 'done',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  autoComplete?: TextInputProps['autoComplete'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  returnKeyType?: TextInputProps['returnKeyType'];
}) {
  const [visible, setVisible] = useState(false);
  return (
    <AuthField
      label={label}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!visible}
      autoComplete={autoComplete}
      textContentType={autoComplete === 'new-password' ? 'newPassword' : 'password'}
      autoCapitalize="none"
      autoCorrect={false}
      placeholder="Enter your password"
      error={error}
      onSubmitEditing={onSubmitEditing}
      returnKeyType={returnKeyType}
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={6}
          style={styles.reveal}
          onPress={() => setVisible((current) => !current)}
        >
          <Text style={styles.revealLabel}>{visible ? 'Hide' : 'Show'}</Text>
        </Pressable>
      }
    />
  );
}

export function FormButton({
  text, onPress, busy = false, disabled = false, secondary = false,
}: {
  text: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ disabled: busy || disabled, busy }}
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button, secondary && styles.buttonLight,
        (busy || disabled) && styles.buttonDisabled, pressed && styles.pressed,
      ]}
    >
      {busy ? <ActivityIndicator color={secondary ? Love.ink : Love.white} /> : null}
      <Text style={[styles.buttonLabel, secondary && styles.buttonLabelLight]}>
        {busy ? 'Working…' : text}
      </Text>
      {!busy && !secondary ? <Text style={styles.buttonArrow}>→</Text> : null}
    </Pressable>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={styles.errorBox}>
      <Text style={styles.errorBoxText}>{message}</Text>
    </View>
  );
}

export function FormLink({
  before, action, onPress,
}: { before: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.linkRow}>
      <Text style={styles.linkBefore}>{before} </Text>
      <Pressable onPress={onPress} accessibilityRole="link" hitSlop={10}>
        <Text style={styles.linkAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

export function AdultCheckbox({
  value, onChange, error,
}: { value: boolean; onChange: (value: boolean) => void; error?: string }) {
  return (
    <View style={styles.field}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel="I confirm that I am at least 18 years old"
        accessibilityState={{ checked: value }}
        style={styles.checkboxRow}
        onPress={() => onChange(!value)}
      >
        <View style={[styles.checkbox, value && styles.checkboxSelected]}>
          {value ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
        <Text style={styles.checkboxLabel}>I confirm that I am at least 18 years old.</Text>
      </Pressable>
      {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export const authStyles = StyleSheet.create({
  note: { color: Love.muted, fontSize: 12, lineHeight: 19 },
  section: { gap: 22 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: Love.paper },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 34 },
  inner: { maxWidth: 460, width: '100%', alignSelf: 'center', flexGrow: 1 },
  header: { paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  backArrow: { color: Love.ink, fontSize: 38, lineHeight: 42, fontWeight: '300' },
  headerSpacer: { width: 44 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandText: { color: Love.ink, fontSize: 22, fontWeight: '700', letterSpacing: -1 },
  monogram: { width: 28, height: 26 },
  ring: { borderColor: Love.wine, borderWidth: 2.2, width: 18, height: 22, borderRadius: 11, position: 'absolute', top: 2 },
  ringLeft: { left: 1, transform: [{ rotate: '-30deg' }] },
  ringRight: { right: 1, transform: [{ rotate: '30deg' }] },
  ringInverse: { borderColor: Love.white },
  progress: { flexDirection: 'row', gap: 8, marginTop: 48 },
  progressActive: { height: 3, flex: 1, backgroundColor: Love.wine, borderRadius: 3 },
  progressTrack: { height: 3, flex: 1, backgroundColor: Love.line, borderRadius: 3 },
  kicker: { fontSize: 11, color: Love.wine, letterSpacing: 1.2, fontWeight: '700', marginBottom: 12 },
  intro: { marginTop: 46, marginBottom: 36 },
  title: { fontFamily: serif, fontSize: 43, lineHeight: 48, color: Love.ink, letterSpacing: -1.3 },
  description: { color: Love.muted, marginTop: 16, fontSize: 15, lineHeight: 24, maxWidth: 410 },
  fields: { gap: 24 },
  footer: { marginTop: 'auto', paddingTop: 32 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Love.ink },
  fieldBorder: { minHeight: 58, borderColor: Love.line, borderWidth: 1, borderRadius: 10, backgroundColor: Love.white, flexDirection: 'row', alignItems: 'center' },
  fieldFocused: { borderColor: Love.wine, borderWidth: 1.5 },
  fieldInvalid: { borderColor: Love.error },
  textInput: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 12, flex: 1, fontSize: 16, color: Love.ink, minWidth: 0 },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  reveal: { minHeight: 48, paddingHorizontal: 16, justifyContent: 'center' },
  revealLabel: { color: Love.wine, fontSize: 13, fontWeight: '700' },
  helpText: { color: Love.muted, fontSize: 12, lineHeight: 19 },
  errorText: { color: Love.error, fontSize: 12, lineHeight: 18 },
  button: { minHeight: 58, backgroundColor: Love.wine, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonLight: { borderWidth: 1, borderColor: Love.line, backgroundColor: Love.white },
  buttonDisabled: { opacity: 0.6 },
  buttonLabel: { color: Love.white, fontSize: 15, fontWeight: '700' },
  buttonLabelLight: { color: Love.ink },
  buttonArrow: { color: Love.white, position: 'absolute', right: 20, fontSize: 20 },
  pressed: { opacity: 0.75 },
  errorBox: { backgroundColor: Love.errorBg, borderLeftWidth: 3, borderLeftColor: Love.error, paddingHorizontal: 14, paddingVertical: 12 },
  errorBoxText: { fontSize: 13, color: Love.error, lineHeight: 20 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 },
  linkBefore: { color: Love.muted, fontSize: 14 },
  linkAction: { color: Love.wine, fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' },
  checkboxRow: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44 },
  checkbox: { width: 22, height: 22, backgroundColor: Love.white, borderWidth: 1.5, borderColor: Love.line, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: Love.wine, borderColor: Love.wine },
  checkMark: { color: Love.white, fontWeight: '800', fontSize: 14 },
  checkboxLabel: { color: Love.ink, flex: 1, fontSize: 14, lineHeight: 20 },
});
