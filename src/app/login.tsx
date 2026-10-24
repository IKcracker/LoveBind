import { useCallback, useRef, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthField, AuthLayout, FormButton, FormError, FormLink, Love, PasswordField, authStyles } from '@/components/auth-screens';
import { validateLogin, type FormErrors } from '@/lib/auth-validation';
import { useSession } from '@/lib/session';

export default function LoginScreen() {
  const { loading, user, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const submit = useCallback(async () => {
    if (lock.current) return;
    const next = validateLogin(email, password);
    setErrors(next);
    setApiError(null);
    if (Object.keys(next).length) return;
    lock.current = true;
    setBusy(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [email, password, signIn]);

  if (loading) return <View style={styles.loading}><ActivityIndicator color={Love.wine} /></View>;
  if (user) return <Redirect href="/" />;
  return (
    <AuthLayout
      title="Welcome back."
      description="Sign in to continue where you left off."
      footer={<FormLink before="New to LoveBind?" action="Create an account" onPress={() => router.replace('/register')} />}
    >
      <AuthField
        label="Email address"
        placeholder="you@example.com"
        value={email}
        onChangeText={(text) => { setEmail(text); setErrors(p => ({ ...p, email: '' })); setApiError(null); }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        maxLength={254}
        error={errors.email}
      />
      <PasswordField
        label="Password"
        value={password}
        onChangeText={(text) => { setPassword(text); setErrors(p => ({ ...p, password: '' })); setApiError(null); }}
        error={errors.password}
        onSubmitEditing={() => { void submit(); }}
      />
      <FormError message={apiError} />
      <FormButton text="Sign in" busy={busy} onPress={() => { void submit(); }} />
      <Text style={authStyles.note}>Password reset is not yet available in the development build. Your account remains private until verification is ready.</Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Love.paper },
});
