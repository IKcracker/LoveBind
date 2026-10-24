import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, FormButton, FormError, Love, serif } from '@/components/auth-screens';
import { ApiError, apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

type VerificationState = { status: string };
type VerificationConfig = { provider: string; available: boolean };

function friendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503) return 'Identity verification has not been enabled on the API yet. Please try again once the service is configured.';
    if (error.status === 502) return 'Our identity-verification provider could not complete the request. Please try again later.';
    if (error.status === 404) return 'The app and API are on different versions. Please update the LoveBind backend.';
    if (error.status === 500) return 'Identity verification encountered a server issue. Please contact LoveBind support.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Unable to complete verification. Please try again.';
}

export default function Verification() {
  const { loading, user, token, signOut } = useSession();
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('Not Started');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    apiRequest<VerificationConfig>('/verification/config', 'GET', undefined, token)
      .then(result => { if (active) setConfigured(result.available); })
      .catch(() => { if (active) setConfigured(false); });
    apiRequest<VerificationState>('/verification/me', 'GET', undefined, token)
      .then(result => { if (active) setStatus(result.status); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [token]);

  async function start() {
    if (!token || !consent || busy || configured !== true) return;
    setBusy(true); setError(null);
    try {
      const result = await apiRequest<{url: string; status: string}>('/verification/session', 'POST', { consent: true }, token);
      if (!result.url.startsWith('https://')) throw new Error('Invalid verification link');
      await Linking.openURL(result.url);
      setStatus(result.status);
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  async function check() {
    if (!token || busy || configured !== true) return;
    setBusy(true); setError(null);
    try {
      const result = await apiRequest<VerificationState>('/verification/refresh', 'POST', {}, token);
      setStatus(result.status);
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  if (loading) return <View style={s.loading}><ActivityIndicator color={Love.wine}/></View>;
  if (!token || !user) return <Redirect href="/login"/>;
  const photoStatus = user.profile?.photoReviewStatus;
  const hasPhoto = photoStatus && photoStatus !== 'NONE';

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.body}>
    <BrandLockup/>
    <View style={s.progress}><View style={s.active}/><View style={s.active}/><View style={s.active}/></View>
    <Text style={s.overline}>03 / 03 · TRUST & SAFETY</Text>
    <Text style={s.head}>The real you, safely.</Text>
    <Text style={s.description}>Verify your identity with our partner Didit. Your ID document and selfie are submitted directly to the verification provider, not to LoveBind.</Text>
    <View style={s.card}>
      <Text style={s.cardTitle}>Identity verification</Text>
      <Text style={s.cardText}>Didit will guide you through an ID document check and a selfie/liveness check. Return here afterward to check your status.</Text>
      <Text style={s.status}>Status: {status}</Text>
      {configured === false ? <Text style={s.notice}>Verification is not available in this environment yet. Your account remains private.</Text> : null}
      {configured === null ? <ActivityIndicator color={Love.wine}/> : null}
      <Pressable onPress={() => setConsent(!consent)} accessibilityRole="checkbox" accessibilityState={{checked:consent}} style={s.consentRow}>
        <View style={[s.checkbox, consent && s.checked]}><Text style={s.tick}>{consent ? '✓' : ''}</Text></View>
        <Text style={s.consentText}>I consent to Didit processing my identity document and selfie for verification. I can stop before submitting.</Text>
      </Pressable>
      <FormButton text="Start secure verification" disabled={!consent || configured !== true} busy={busy} onPress={() => { void start(); }} />
      <FormButton text="Check verification status" secondary disabled={configured !== true} busy={busy} onPress={() => { void check(); }} />
    </View>
    <View style={s.card}>
      <Text style={s.cardTitle}>Your profile photo</Text>
      <Text style={s.cardText}>{hasPhoto
        ? photoStatus === 'APPROVED'
          ? 'Your profile photo has passed review. Your profile remains private until account verification is complete.'
          : 'Your profile photo was saved privately. Review status: ' + photoStatus + '.'
        : 'Add a clear, recent photo of yourself. Your photo will remain private until safety review is complete.'}</Text>
      <FormButton text={hasPhoto ? 'View or change photo' : 'Add profile photo'} secondary onPress={() => router.push('/profile-photo')}/>
    </View>
    <FormError message={error}/>
    <FormButton text="View my profile" secondary onPress={() => router.replace('/profile')}/>
    <Pressable onPress={() => { void signOut(); }} style={s.signout}><Text style={s.signoutText}>Sign out</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:Love.paper},
  loading:{flex:1,backgroundColor:Love.paper,justifyContent:'center',alignItems:'center'},
  body:{maxWidth:500,width:'100%',alignSelf:'center',padding:26,gap:20},
  overline:{color:Love.wine,letterSpacing:2,fontSize:11,fontWeight:'700',marginTop:20},
  head:{fontFamily:serif,color:Love.ink,fontSize:42,lineHeight:48},
  description:{color:Love.muted,fontSize:15,lineHeight:23},
  card:{backgroundColor:Love.white,padding:20,borderWidth:1,borderColor:Love.line,borderRadius:12,gap:16},
  cardTitle:{color:Love.ink,fontSize:18,fontWeight:'700'},
  cardText:{color:Love.muted,fontSize:14,lineHeight:21},
  status:{color:Love.wine,fontWeight:'700',fontSize:13},
  notice:{backgroundColor:Love.errorBg,color:Love.wine,borderRadius:8,padding:12,lineHeight:20,fontSize:13},
  consentRow:{flexDirection:'row',gap:12,alignItems:'center'},
  checkbox:{width:22,height:22,borderWidth:1,borderColor:Love.wine,borderRadius:4,justifyContent:'center',alignItems:'center'},
  checked:{backgroundColor:Love.wine},
  tick:{color:Love.white,fontWeight:'700'},
  consentText:{flex:1,color:Love.ink,fontSize:12,lineHeight:19},
  progress:{flexDirection:'row',gap:6,marginTop:12},
  active:{backgroundColor:Love.wine,height:3,flex:1},
  signout:{padding:14,alignItems:'center'},
  signoutText:{color:Love.muted,textDecorationLine:'underline'}
});
