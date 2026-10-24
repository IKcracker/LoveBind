import { useCallback, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  AuthField, AuthLayout, FormButton, FormError, FormLink, PasswordField, authStyles,
} from '@/components/auth-screens';
import { Palette } from '@/components/lovebind-ui';
import { validateLogin, type FormErrors } from '@/lib/auth-validation';
import { useSession } from '@/lib/session';

export default function LoginScreen() {
  const { loading, user, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    if (busy) return;
    const errors = validateLogin(email, password);
    setFieldErrors(errors);
    setApiError(null);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, email, password, signIn]);

  if (loading) return (
    <View style={styles.loading}><ActivityIndicator color={Palette.rose} size="large" /></View>
  );
  if (user) return <Redirect href="/" />;

  return (
    <AuthLayout
      eyebrow="Great to see you again"
      title="Welcome back."
      description="Your next meaningful conversation is one sign-in away."
      footer={<FormLink before="New to LoveBind?" action="Create an account" onPress={() => router.replace('/register')} />}
    >
      <Text style={authStyles.sectionHeading}>Sign in to your account</Text>
      <AuthField
        label="Email address"
        placeholder="you@example.com"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setFieldErrors((previous) => ({ ...previous, email: '' }));
          setApiError(null);
        }}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        maxLength={254}
        error={fieldErrors.email}
      />
      <PasswordField
        label="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setFieldErrors((previous) => ({ ...previous, password: '' }));
          setApiError(null);
        }}
        error={fieldErrors.password}
        onSubmitEditing={() => { void submit(); }}
      />
      <FormError message={apiError} />
      <FormButton text="Sign in" busy={busy} onPress={() => { void submit(); }} />
      <View style={authStyles.reassurance}>
        <Text style={authStyles.reassuranceIcon}>✧</Text>
        <Text style={authStyles.reassuranceText}>
          Your account and conversations are yours. We won't show your profile in discovery until verification is available.
        </Text>
      </View>
      <Text style={styles.support}>
        Password recovery is not available yet. Please keep your credentials safe during development.
      </Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', backgroundColor: Palette.background },
  support: { textAlign: 'center', color: Palette.muted, fontSize: 11, lineHeight: 18 },
});
