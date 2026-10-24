import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, FormButton, Love, serif } from '@/components/auth-screens';
import { useSession } from '@/lib/session';

export default function Verification() {
  const { signOut } = useSession();
  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.body}>
      <BrandLockup />
      <Text style={s.overline}>02 / 02 · TRUST & SAFETY</Text>
      <Text style={s.head}>Your safety comes first.</Text>
      <Text style={s.description}>Your story has been saved. Before your profile can appear in discovery, LoveBind will require identity and age verification.</Text>
      <View style={s.card}>
        <Text style={s.cardTitle}>Identity check</Text>
        <Text style={s.cardText}>A secure verification provider will ask for your identity document and confirm that you are an adult. We will not request or store an identity number in this development screen.</Text>
        <Text style={s.tag}>NOT CONFIGURED YET</Text>
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>Profile photo</Text>
        <Text style={s.cardText}>A clear, recent photograph will be requested once private photo storage and moderation are available.</Text>
      </View>
      <FormButton text="View my profile" onPress={() => router.replace('/profile')}/>
      <Pressable onPress={() => { void signOut(); }} style={s.signout} accessibilityRole="button"><Text style={s.signoutText}>Sign out</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex:1, backgroundColor: Love.paper },
  body: { width:'100%', maxWidth:500, alignSelf:'center', padding:26, gap:21 },
  overline: { marginTop:24, color:Love.wine, fontWeight:'700', fontSize:11, letterSpacing:1.5 },
  head: { fontFamily:serif, color:Love.ink, fontSize:42, lineHeight:48 },
  description: { fontSize:15, lineHeight:23, color:Love.muted },
  card: { padding:22, backgroundColor:Love.white, borderWidth:1, borderColor:Love.line, borderRadius:12, gap:12 },
  cardTitle: { fontSize:18, fontWeight:'700', color:Love.ink },
  cardText: { fontSize:14, lineHeight:22, color:Love.muted },
  tag: { color:Love.wine, fontSize:11, letterSpacing:1.2, fontWeight:'700' },
  signout: { padding:15, alignItems:'center' },
  signoutText: { color:Love.muted, textDecorationLine:'underline' },
});
