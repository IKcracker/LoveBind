import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthField, BrandLockup, FormButton, FormError, Love, serif } from '@/components/auth-screens';
import { CityPicker } from '@/components/city-picker';
import { apiRequest } from '@/lib/api';
import { useSession, type Profile } from '@/lib/session';

type EditorProps = { profile: Profile; token: string; refresh: () => Promise<void> };
function csv(value: string): string[] { return [...new Set(value.split(',').map(v => v.trim()).filter(Boolean))]; }

function ProfileEditor({ profile, token, refresh }: EditorProps) {
  const [name, setName] = useState(profile.displayName);
  const [city, setCity] = useState(profile.city ?? '');
  const [cityPlaceId, setCityPlaceId] = useState(profile.cityPlaceId ?? null);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [goal, setGoal] = useState(profile.relationshipGoal ?? '');
  const [occupation, setOccupation] = useState(profile.occupation ?? '');
  const [interests, setInterests] = useState((profile.interests ?? []).join(', '));
  const [values, setValues] = useState((profile.coreValues ?? []).join(', '));
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.photoReviewStatus || profile.photoReviewStatus === 'NONE') return;
    let active = true;
    apiRequest<{url:string | null; status:string}>('/photos/me', 'GET', undefined, token)
      .then(result => { if (active) setPhotoUrl(result.url); })
      .catch(() => { if (active) setPhotoError(true); });
    return () => { active = false; };
  }, [token, profile.photoReviewStatus]);

  async function save() {
    if (busy) return;
    if (!cityPlaceId && city !== profile.city) { setError('Select a valid city from suggestions.'); return; }
    setBusy(true); setSaved(false); setError(null);
    try {
      await apiRequest('/profiles/me', 'PUT', {
        displayName: name, city, cityPlaceId, bio, relationshipGoal: goal, occupation,
        interests: csv(interests), coreValues: csv(values),
      }, token);
      await refresh(); setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your profile.'); }
    finally { setBusy(false); }
  }

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.header}>
      <BrandLockup/>
      <Pressable onPress={() => router.replace('/')} accessibilityRole="button" hitSlop={10}>
        <Text style={s.done}>Done</Text>
      </Pressable>
    </View>
    <Text style={s.eyebrow}>YOUR SPACE</Text>
    <Text style={s.title}>Your story.</Text>
    <Text style={s.subtitle}>Make it sound like you. Everything remains private while your account is being verified.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={() => router.push('/profile-photo')} style={s.photoBox}>
      {photoUrl ? <Image source={{ uri: photoUrl }} style={s.photo} resizeMode="cover" /> :
        <View style={s.photoPlaceholder}><Text style={s.photoMark}>+</Text><Text style={s.photoText}>Add your profile photo</Text></View>}
      <View style={s.photoFooter}><Text style={s.photoFooterText}>{photoUrl ? 'Change photo' : 'Choose a photo'} →</Text></View>
    </Pressable>
    {profile.photoReviewStatus === 'PENDING' ?
      <Text style={s.note}>Your photo is saved privately and awaiting moderation.</Text> : null}
    {photoError ? <Text style={s.note}>Your photo preview could not be loaded. Try again later.</Text> : null}
    <Text style={s.section}>The basics</Text>
    <AuthField label="Display name" value={name} onChangeText={setName} maxLength={60} />
    <CityPicker token={token} city={city} placeId={cityPlaceId} onSelect={(name,id)=>{setCity(name);setCityPlaceId(id);}} />
    <AuthField label="Relationship intention" value={goal} onChangeText={setGoal} placeholder="What are you hoping to find?" maxLength={80}/>
    <AuthField label="Occupation" value={occupation} onChangeText={setOccupation} placeholder="Optional" maxLength={100}/>
    <Text style={s.section}>What makes you, you</Text>
    <AuthField label="Your interests" value={interests} onChangeText={setInterests} helper="Separate with commas" maxLength={295}/>
    <AuthField label="Values that matter" value={values} onChangeText={setValues} helper="Separate with commas" maxLength={295}/>
    <AuthField label="Your introduction" value={bio} onChangeText={setBio} multiline maxLength={1000} style={s.bio}/>
    {saved ? <Text style={s.saved}>Your changes have been saved.</Text> : null}
    <FormError message={error}/>
    <FormButton text="Save changes" busy={busy} onPress={() => { void save(); }} />
    <Pressable style={s.verifyLink} onPress={() => router.push('/verification')} accessibilityRole="button">
      <Text style={s.verifyText}>Continue identity verification →</Text>
    </Pressable>
  </ScrollView></SafeAreaView>;
}
export default function ProfileScreen() {
  const { loading, user, token, refresh } = useSession();
  if (loading) return <View style={s.loading}><ActivityIndicator color={Love.wine}/></View>;
  if (!user || !token) return <Redirect href="/login"/>;
  if (!user.profile) return <Redirect href="/onboarding"/>;
  return <ProfileEditor key={user.id} profile={user.profile} token={token} refresh={refresh}/>;
}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:Love.paper},
  loading:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:Love.paper},
  content:{paddingHorizontal:26,paddingTop:24,paddingBottom:48,maxWidth:500,width:'100%',alignSelf:'center',gap:18},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:22},
  done:{fontSize:14,fontWeight:'700',color:Love.wine},
  eyebrow:{fontSize:11,fontWeight:'700',color:Love.wine,letterSpacing:1.7},
  title:{fontFamily:serif,fontSize:44,lineHeight:49,color:Love.ink},
  subtitle:{fontSize:15,color:Love.muted,lineHeight:23,marginBottom:8},
  photoBox:{height:265,backgroundColor:'#E8DBD6',borderRadius:14,overflow:'hidden',marginTop:8},
  photo:{width:'100%',height:'100%'},
  photoPlaceholder:{flex:1,alignItems:'center',justifyContent:'center',gap:9},
  photoMark:{fontSize:56,color:Love.wine,fontFamily:serif},
  photoText:{color:Love.wine,fontWeight:'700',fontSize:15},
  photoFooter:{position:'absolute',bottom:0,left:0,right:0,padding:13,backgroundColor:'rgba(35,32,37,0.70)'},
  photoFooterText:{color:'#FFFFFF',fontWeight:'700',textAlign:'center',fontSize:13},
  note:{fontSize:12,lineHeight:19,color:Love.wine},
  section:{fontFamily:serif,fontSize:26,color:Love.ink,marginTop:15},
  bio:{height:145,textAlignVertical:'top'},
  saved:{fontSize:13,color:'#297556',fontWeight:'700'},
  verifyLink:{alignItems:'center',paddingVertical:18},verifyText:{color:Love.wine,fontSize:14,fontWeight:'700'},
});
