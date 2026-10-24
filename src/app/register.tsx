import { useCallback, useRef, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AdultCheckbox, AuthField, AuthLayout, FormButton, FormError, FormLink,
  Love, PasswordField, authStyles,
} from '@/components/auth-screens';
import { validateRegistration, type FormErrors } from '@/lib/auth-validation';
import { useSession } from '@/lib/session';

export default function RegisterScreen() {
  const { loading, user, signUp } = useSession();
  const [step, setStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const clear = useCallback((key: string) => {
    setErrors(old => ({ ...old, [key]: '' }));
    setApiError(null);
  }, []);

  const nextStep = () => {
    const issues = validateRegistration({
      displayName, birthDate, email: 'temp@example.com', password: 'long-enough-password',
      confirmPassword: 'long-enough-password', adultConfirmed,
    });
    const relevant = Object.fromEntries(Object.entries(issues).filter(([key]) => ['displayName', 'birthDate', 'adultConfirmed'].includes(key)));
    setErrors(relevant);
    if (!Object.keys(relevant).length) setStep(2);
  };

  const submit = useCallback(async () => {
    if (lock.current) return;
    const issues = validateRegistration({ displayName, birthDate, email, password, confirmPassword, adultConfirmed });
    setErrors(issues);
    setApiError(null);
    if (Object.keys(issues).length) {
      if (issues.displayName || issues.birthDate || issues.adultConfirmed) setStep(1);
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      await signUp({ displayName: displayName.trim(), birthDate, email: email.trim().toLowerCase(), password });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Unable to create your account.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [displayName, birthDate, email, password, confirmPassword, adultConfirmed, signUp]);

  if (loading) return <View style={styles.loading}><ActivityIndicator color={Love.wine} /></View>;
  if (user) return <Redirect href="/" />;

  return (
    <AuthLayout
      step={step}
      title={step === 1 ? 'First, the basics.' : 'Make it yours.'}
      description={step === 1 ? 'A few details to get started. You can take your time.' : 'Add your email and create a password to keep your account secure.'}
      onBack={step === 2 ? () => setStep(1) : undefined}
      footer={<FormLink before="Already a member?" action="Sign in" onPress={() => router.replace('/login')} />}
    >
      {step === 1 ? (
        <>
          <AuthField
            label="What should we call you?"
            placeholder="Your first name or nickname"
            value={displayName}
            onChangeText={(value) => { setDisplayName(value); clear('displayName'); }}
            autoComplete="name"
            textContentType="nickname"
            maxLength={60}
            error={errors.displayName}
          />
          <AuthField
            label="Your date of birth"
            placeholder="YYYY-MM-DD"
            helper="LoveBind is for adults aged 18 and older. Your date of birth isn't public."
            value={birthDate}
            onChangeText={(value) => { setBirthDate(value); clear('birthDate'); }}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            error={errors.birthDate}
          />
          <AdultCheckbox
            value={adultConfirmed}
            onChange={(value) => { setAdultConfirmed(value); clear('adultConfirmed'); }}
            error={errors.adultConfirmed}
          />
          <FormButton text="Continue" onPress={nextStep} />
        </>
      ) : (
        <>
          <AuthField
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChangeText={(value) => { setEmail(value); clear('email'); }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            maxLength={254}
            error={errors.email}
          />
          <PasswordField
            label="Create password"
            value={password}
            onChangeText={(value) => { setPassword(value); clear('password'); }}
            autoComplete="new-password"
            error={errors.password}
          />
          <Text style={authStyles.note}>Use at least 12 characters. Longer passwords are stronger.</Text>
          <PasswordField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={(value) => { setConfirmPassword(value); clear('confirmPassword'); }}
            autoComplete="new-password"
            error={errors.confirmPassword}
            onSubmitEditing={() => { void submit(); }}
          />
          <FormError message={apiError} />
          <FormButton text="Create account" busy={busy} onPress={() => { void submit(); }} />
          <Text style={authStyles.note}>LoveBind is in development. Accounts remain private while verification, safety tools and legal policies are being completed.</Text>
          <Pressable accessibilityRole="button" onPress={() => setStep(1)} style={styles.back}><Text style={styles.backText}>← Edit personal details</Text></Pressable>
        </>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Love.paper },
  back: { paddingVertical: 7, alignSelf: 'flex-start' },
  backText: { color: Love.wine, fontSize: 13, fontWeight: '700' },
});
