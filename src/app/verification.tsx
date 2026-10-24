import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, FormButton, FormError, Love, serif } from '@/components/auth-screens';
import { apiRequest } from '@/lib/api';
import { useSession } from '@/lib/session';

type State = { status: string };
export default function Verification() {
  const { token, signOut } = useSession();
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('Not Started');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!token || !consent || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await apiRequest<{url: string; status: string}>('/verification/session', 'POST', {consent:true}, token);
      if (!result.url.startsWith('https://')) throw new Error('Verification URL invalid');
      await Linking.openURL(result.url);
      setStatus(result.status);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start verification'); }
    finally { setBusy(false); }
  }

  async function check() {
    if (!token || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await apiRequest<State>('/verification/refresh', 'POST', {}, token);
      setStatus(result.status);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to check verification'); }
    finally { setBusy(false); }
  }

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.body}>
    <BrandLockup/>
    <Text style={s.overline}>02 / 02 · TRUST & SAFETY</Text>
    <Text style={s.head}>The real you, safely.</Text>
    <Text style={s.description}>To help make LoveBind a safer place, verify your identity with our verification partner. Your identification documents and selfie are collected by the provider, not by LoveBind.</Text>
    <View style={s.card}>
      <Text style={s.cardTitle}>Identity verification by Didit</Text>
      <Text style={s.cardText}>You will be taken to the provider's secure verification experience for a document check and selfie/liveness check. You can return here to check progress.</Text>
      <Text style={s.status}>Status: {status}</Text>
      <Pressable onPress={() => setConsent(!consent)} accessibilityRole="checkbox" accessibilityState={{checked:consent}} style={s.consentRow}>
        <View style={[s.checkbox, consent && s.checked]}><Text style={s.tick}>{consent ? '✓' : ''}</Text></View>
        <Text style={s.consentText}>I agree to share my identification information with Didit for identity verification. I understand I can stop before submitting.</Text>
      </Pressable>
      <FormButton text="Start secure verification" disabled={!consent} busy={busy} onPress={() => {void start()}} />
      <FormButton text="Check verification status" secondary busy={busy} onPress={() => {void check()}} />
    </View>
    <View style={s.card}>
      <Text style={s.cardTitle}>Your profile photograph</Text>
      <Text style={s.cardText}>Profile photos will be available after private storage and image moderation are configured. ID documents will not be used as public profile photos.</Text>
    </View>
    <FormError message={error}/>
    <FormButton text="View my profile" secondary onPress={() => router.replace('/profile')}/>
    <Pressable onPress={() => {void signOut()}} style={s.signout}><Text style={s.signoutText}>Sign out</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:Love.paper},
  body:{maxWidth:500,width:'100%',alignSelf:'center',padding:26,gap:20},
  overline:{color:Love.wine,letterSpacing:2,fontSize:11,fontWeight:'700',marginTop:20},
  head:{fontFamily:serif,color:Love.ink,fontSize:42,lineHeight:48},
  description:{color:Love.muted,fontSize:15,lineHeight:23},
  card:{backgroundColor:Love.white,padding:20,borderWidth:1,borderColor:Love.line,borderRadius:12,gap:16},
  cardTitle:{color:Love.ink,fontSize:18,fontWeight:'700'},
  cardText:{color:Love.muted,fontSize:14,lineHeight:21},
  status:{color:Love.wine,fontWeight:'700',fontSize:13},
  consentRow:{flexDirection:'row',gap:12,alignItems:'center'},
  checkbox:{width:22,height:22,borderWidth:1,borderColor:Love.wine,borderRadius:4,justifyContent:'center',alignItems:'center'},
  checked:{backgroundColor:Love.wine},
  tick:{color:Love.white,fontWeight:'700'},
  consentText:{flex:1,color:Love.ink,fontSize:12,lineHeight:19},
  signout:{padding:14,alignItems:'center'},
  signoutText:{color:Love.muted,textDecorationLine:'underline'}
});
