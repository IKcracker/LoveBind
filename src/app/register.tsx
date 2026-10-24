import { useCallback, useMemo, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  AdultCheckbox, AuthField, AuthLayout, FormButton, FormError, FormLink,
  PasswordField, StrengthMeter, authStyles,
} from '@/components/auth-screens';
import { Palette } from '@/components/lovebind-ui';
import { passwordStrength, validateRegistration, type FormErrors } from '@/lib/auth-validation';
import { useSession } from '@/lib/session';

export default function RegisterScreen() {
  const { loading, user, signUp } = useSession();
  const [displayName, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const strength = useMemo(() => passwordStrength(password), [password]);

  const clearError = useCallback((field: string) => {
    setErrors((previous) => ({ ...previous, [field]: '' }));
    setApiError(null);
  }, []);

  const submit = useCallback(async () => {
    if (busy) return;
    const data = { displayName, birthDate, email, password, confirmPassword, adultConfirmed };
    const next = validateRegistration(data);
    setErrors(next);
    setApiError(null);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await signUp({
        displayName: displayName.trim(),
        birthDate,
        email: email.trim().toLowerCase(),
        password,
      });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Could not create your account. Try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, displayName, birthDate, email, password, confirmPassword, adultConfirmed, signUp]);

  if (loading) return <View style={styles.loading}><ActivityIndicator color={Palette.rose} size="large" /></View>;
  if (user) return <Redirect href="/" />;

  return (
    <AuthLayout
      eyebrow="Your story starts here"
      title="Let’s find something real."
      description="Create your profile, tell us what matters to you, and meet people with intention."
      footer={<FormLink before="Already have an account?" action="Sign in" onPress={() => router.replace('/login')} />}
    >
      <Text style={authStyles.sectionHeading}>Create your account</Text>
      <AuthField
        label="What should we call you?"
        placeholder="Your first name or nickname"
        value={displayName}
        onChangeText={(value) => { setName(value); clearError('displayName'); }}
        autoComplete="name"
        textContentType="nickname"
        maxLength={60}
        returnKeyType="next"
        error={errors.displayName}
      />
      <AuthField
        label="Date of birth"
        placeholder="YYYY-MM-DD"
        value={birthDate}
        onChangeText={(value) => { setBirthDate(value); clearError('birthDate'); }}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        returnKeyType="next"
        helper="We use your date of birth to check that you're 18 or older. It is not shown on your profile."
        error={errors.birthDate}
      />
      <AuthField
        label="Email address"
        placeholder="you@example.com"
        value={email}
        onChangeText={(value) => { setEmail(value); clearError('email'); }}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={254}
        returnKeyType="next"
        error={errors.email}
      />
      <PasswordField
        label="Choose a password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          clearError('password');
          clearError('confirmPassword');
        }}
        autoComplete="new-password"
        returnKeyType="next"
        error={errors.password}
      />
      <StrengthMeter level={strength.level} label={strength.label} />
      <PasswordField
        label="Confirm your password"
        value={confirmPassword}
        onChangeText={(value) => { setConfirmPassword(value); clearError('confirmPassword'); }}
        autoComplete="new-password"
        error={errors.confirmPassword}
        onSubmitEditing={() => { void submit(); }}
      />
      <View style={styles.divider} />
      <AdultCheckbox
        value={adultConfirmed}
        onChange={(value) => { setAdultConfirmed(value); clearError('adultConfirmed'); }}
        error={errors.adultConfirmed}
      />
      <View style={authStyles.reassurance}>
        <Text style={authStyles.reassuranceIcon}>♥</Text>
        <Text style={authStyles.reassuranceText}>
          Your profile stays private until account verification and safety checks are implemented.
        </Text>
      </View>
      <FormError message={apiError} />
      <FormButton text="Create account" busy={busy} onPress={() => { void submit(); }} />
      <Text style={styles.legalNotice}>
        LoveBind is currently in development. Public registration requires published terms, a privacy notice, and verified age and safety controls.
      </Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', backgroundColor: Palette.background },
  divider: { height: 1, backgroundColor: '#F0E8ED', marginVertical: 1 },
  legalNotice: { color: Palette.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' },
});
