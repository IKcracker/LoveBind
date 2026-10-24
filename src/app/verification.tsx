import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, FormButton, FormError, Love, serif } from '@/components/auth-screens';
import { StackScreen, StatusPill } from '@/components/member-ui';
import { ApiError, apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

type VerificationState = { status: string; ageEvidenceStatus?: string; accountActive?: boolean; record?: {ageEvidenceStatus?: string} };

function friendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (!__DEV__ && (error.status === 503 || error.status === 404)) return 'Identity verification is temporarily unavailable. Please try again a little later.';
    if (error.status === 503) return 'Didit has not been configured on the server handling this request. Check DIDIT_API_KEY and DIDIT_WORKFLOW_ID in the active Render service, then redeploy.';
    if (error.status === 502) return 'Our identity-verification provider could not complete the request. Please try again later.';
    if (error.status === 404) return 'This backend does not have the verification endpoint yet. Please deploy the updated LoveBind API.';
    if (error.status === 500) return 'Identity verification encountered a server issue. Please contact LoveBind support.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Unable to complete verification. Please try again.';
}

export default function Verification() {
  const { loading, user, token, signOut, refresh } = useSession();
  const { flow } = useLocalSearchParams<{ flow?: string }>();
  const onboarding = flow === 'onboarding';
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('Not Started');
  const [ageStatus, setAgeStatus] = useState('PENDING');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    apiRequest<VerificationState>('/verification/me', 'GET', undefined, token)
      .then(result => { if (active) { setStatus(result.status); setAgeStatus(result.record?.ageEvidenceStatus ?? 'PENDING'); } })
      .catch(() => undefined);
    return () => { active = false; };
  }, [token]);

  async function start() {
    if (!token || !consent || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await apiRequest<{url: string; status: string}>('/verification/session', 'POST', { consent: true }, token);
      if (!result.url.startsWith('https://')) throw new Error('Invalid verification link');
      await Linking.openURL(result.url);
      setStatus(result.status);
      setAgeStatus('PENDING');
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  async function check() {
    if (!token || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await apiRequest<VerificationState>('/verification/refresh', 'POST', {}, token);
      setStatus(result.status);
      setAgeStatus(result.ageEvidenceStatus ?? 'PENDING');
      await refresh();
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  if (loading) return <View style={s.loading}><ActivityIndicator color={Love.wine}/></View>;
  if (!token || !user) return <Redirect href="/login"/>;
  const photoStatus = user.profile?.photoReviewStatus;
  const hasPhoto = photoStatus && photoStatus !== 'NONE';

  const approved = status === 'Approved' && ageStatus === 'VERIFIED';
  const cards = <>
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.cardTitle}>Identity verification</Text>
        <StatusPill tone={approved ? 'success' : status === 'Not Started' ? 'muted' : 'pending'} label={approved ? 'VERIFIED' : status.toUpperCase()} />
      </View>
      <Text style={s.cardText}>Didit will guide you through an ID document check and a selfie/liveness check. Return here afterward to check your status.</Text>
      {status === 'Approved' && ageStatus !== 'VERIFIED' ? <Text style={s.info}>Your age evidence still needs confirmation before account activation. Use Check verification status to synchronize your ID details.</Text> : null}
      {approved ? <Text style={s.success}>Identity approved and adult age confirmed from your document.</Text> : null}
      {status !== 'Approved' ? <Pressable onPress={() => setConsent(!consent)} accessibilityRole="checkbox" accessibilityState={{checked:consent}} style={s.consentRow}>
        <View style={[s.checkbox, consent && s.checked]}><Text style={s.tick}>{consent ? '✓' : ''}</Text></View>
        <Text style={s.consentText}>I consent to Didit processing my identity document and selfie for verification. I can stop before submitting.</Text>
      </Pressable> : null}
      {status === 'Not Started' || status === 'Declined' || status === 'Expired' || status === 'Abandoned' ?
        <FormButton text="Start secure verification" disabled={!consent} busy={busy} onPress={() => { void start(); }} /> : null}
      {!approved ? <FormButton text="Check verification status" secondary busy={busy} onPress={() => { void check(); }} /> : null}
    </View>
    {onboarding ? <View style={s.card}>
      <Text style={s.cardTitle}>Your profile photo</Text>
      <Text style={s.cardText}>{hasPhoto
        ? photoStatus === 'APPROVED'
          ? 'Your profile photo has passed review.'
          : 'Your profile photo was saved privately and is awaiting review.'
        : 'Add a clear, recent photo of yourself. It stays private until safety review is complete.'}</Text>
      <FormButton text={hasPhoto ? 'View or change photo' : 'Add profile photo'} secondary onPress={() => router.push('/profile-photo')}/>
    </View> : null}
    <FormError message={error}/>
  </>;

  if (!onboarding) return <StackScreen title="Verification">
    <Text style={s.description}>Your ID document and selfie go directly to our verification partner Didit, never to LoveBind.</Text>
    {cards}
  </StackScreen>;

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.body}>
    <BrandLockup/>
    <View style={s.progress}><View style={s.active}/><View style={s.active}/><View style={s.active}/></View>
    <Text style={s.overline}>03 / 03 · TRUST & SAFETY</Text>
    <Text style={s.head}>{approved ? 'Identity confirmed.' : 'The real you, safely.'}</Text>
    <Text style={s.description}>Verify your identity with our partner Didit. Your ID document and selfie are submitted directly to the verification provider, not to LoveBind.</Text>
    {cards}
    <FormButton text="Continue to LoveBind" secondary={!approved} onPress={() => router.replace('/home')}/>
    {!approved ? <Text style={s.later}>You can finish verifying later from your Home checklist.</Text> : null}
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
  cardHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'},
  cardTitle:{color:Love.ink,fontSize:18,fontWeight:'700'},
  later:{color:Love.muted,fontSize:12,textAlign:'center',marginTop:-8},
  cardText:{color:Love.muted,fontSize:14,lineHeight:21},
  success:{backgroundColor:'#E7F2EA',color:'#256544',fontSize:13,lineHeight:21,padding:12,borderRadius:9},
  info:{backgroundColor:'#FAF0E7',color:Love.wine,fontSize:13,lineHeight:21,padding:12,borderRadius:9},
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
