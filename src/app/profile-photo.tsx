import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { BrandLockup, FormButton, FormError, Love, serif } from '@/components/auth-screens';
import { Notice, StackScreen } from '@/components/member-ui';
import { useSession } from '@/lib/session';
import { apiRequest } from '@/lib/api';

type Photo = { uri: string; contentType: string; size: number };
export default function ProfilePhotoScreen() {
  const { loading, user, token, refresh } = useSession();
  const { flow } = useLocalSearchParams<{ flow?: string }>();
  const onboarding = flow === 'onboarding';
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function choose() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [4,5], quality: 0.8,
      exif: false, base64: false,
    });
    if (result.canceled) return;
    const chosen = result.assets[0];
    const kind = chosen.mimeType ?? 'image/jpeg';
    const bytes = chosen.fileSize ?? (Platform.OS !== 'web' ? new File(chosen.uri).size : 0);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(kind) ||
      !bytes || bytes > 5 * 1024 * 1024) {
      setError('Choose a JPG, PNG or WebP photo under 5 MB.'); return;
    }
    setPhoto({ uri: chosen.uri, contentType: kind, size: bytes });
    setError(null);
  }
  async function upload() {
    if (!token || !photo || busy) return;
    setBusy(true); setError(null);
    try {
      const request = await apiRequest<{uploadUrl:string;key:string;contentType:string}>(
        '/photos/upload-request', 'POST', { contentType: photo.contentType, size: photo.size }, token,
      );
      let response: Response;
      if (Platform.OS === 'web') {
        const local = await fetch(photo.uri);
        const blob = await local.blob();
        if (blob.size !== photo.size) throw new Error('Photo size changed. Select it again.');
        response = await fetch(request.uploadUrl, {
          method: 'PUT', headers: { 'Content-Type': request.contentType }, body: blob,
        });
      } else {
        const file = new File(photo.uri);
        if (!file.exists || file.size !== photo.size) throw new Error('Photo file changed. Select it again.');
        response = await expoFetch(request.uploadUrl, {
          method: 'PUT', headers: { 'Content-Type': request.contentType }, body: file,
        }) as Response;
      }
      if (!response.ok) throw new Error('Photo upload failed. Check your connection and try again.');
      await apiRequest('/photos/confirm', 'POST', { key: request.key }, token);
      await refresh();
      if (onboarding) router.replace({ pathname: '/verification', params: { flow: 'onboarding' } });
      else if (router.canGoBack()) router.back();
      else router.replace('/profile');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save photo'); }
    finally { setBusy(false); }
  }
  if (loading) return <View style={s.loading}><ActivityIndicator color={Love.wine}/></View>;
  if (!user || !token) return <Redirect href="/login"/>;
  const status = user.profile?.photoReviewStatus;
  const picker = <>
    <Pressable onPress={() => {void choose()}} style={s.photoFrame} accessibilityRole="button" accessibilityLabel="Choose a profile photograph">
      {photo ? <Image source={{uri:photo.uri}} style={s.photo} resizeMode="cover"/> :
      <View style={s.placeholder}><Text style={s.plus}>+</Text><Text style={s.placeholderText}>Add your photograph</Text><Text style={s.hint}>Tap to browse your photos</Text></View>}
    </Pressable>
    <Text style={s.note}>Your photo will stay private while it is pending moderation. Do not upload an identity document here.</Text>
    <FormError message={error}/>
    {photo ? <FormButton text="Upload photo securely" busy={busy} onPress={() => {void upload()}}/> :
      <FormButton text="Choose photo" onPress={() => {void choose()}}/>}
  </>;

  if (!onboarding) return <StackScreen title="Profile photo">
    <Text style={s.subtitle}>A genuine, recent photograph helps people feel at ease before the first conversation. New photos are reviewed before they are shown.</Text>
    <Notice tone={status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'error' : 'info'}
      message={status === 'APPROVED' ? 'Your current photo is approved.' : status === 'PENDING' ? 'Your current photo is awaiting review.'
        : status === 'REJECTED' ? 'Your last photo was not approved. Please choose a new one.' : null} />
    {picker}
  </StackScreen>;

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.body}>
    <BrandLockup/>
    <View style={s.progress}><View style={s.active}/><View style={s.active}/><View style={s.track}/></View>
    <Text style={s.eyebrow}>02 / 03 · FIRST IMPRESSIONS</Text>
    <Text style={s.title}>Show the real you.</Text>
    <Text style={s.subtitle}>A genuine, recent photograph helps you feel more familiar before the first conversation.</Text>
    {picker}
    <Pressable onPress={() => router.replace({ pathname: '/verification', params: { flow: 'onboarding' } })} style={s.skip}><Text style={s.skipText}>Skip for now →</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:Love.paper}, loading:{flex:1,alignItems:'center',justifyContent:'center'},
  body:{padding:27,gap:20,maxWidth:500,width:'100%',alignSelf:'center'},
  progress:{flexDirection:'row',gap:6,marginTop:16},active:{backgroundColor:Love.wine,height:3,flex:1},track:{backgroundColor:Love.line,height:3,flex:1},
  eyebrow:{color:Love.wine,fontSize:11,letterSpacing:1.5,fontWeight:'700',marginTop:12},
  title:{fontFamily:serif,fontSize:43,lineHeight:48,color:Love.ink},
  subtitle:{fontSize:15,lineHeight:23,color:Love.muted},
  photoFrame:{height:330,backgroundColor:'#EAE2DD',borderRadius:16,overflow:'hidden',marginVertical:8},
  photo:{width:'100%',height:'100%'},placeholder:{flex:1,alignItems:'center',justifyContent:'center',gap:12},
  plus:{fontFamily:serif,fontSize:65,color:Love.wine},placeholderText:{fontWeight:'700',fontSize:16,color:Love.ink},
  hint:{color:Love.muted,fontSize:13},note:{color:Love.muted,fontSize:12,lineHeight:18},
  skip:{padding:16,alignItems:'center'},skipText:{color:Love.wine,fontWeight:'700'}
});
