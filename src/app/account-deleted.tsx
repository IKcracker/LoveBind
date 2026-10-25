import { router } from 'expo-router';
import { Text } from 'react-native';
import { FormButton, Love } from '@/components/auth-screens';
import { StackScreen } from '@/components/member-ui';

export default function AccountDeletedScreen() {
  return <StackScreen title="Account deleted">
    <Text style={{ color: Love.ink, fontSize: 20, lineHeight: 28 }}>You have left LoveBind and all sessions have been revoked.</Text>
    <Text style={{ color: Love.muted, fontSize: 15, lineHeight: 23 }}>Your matches have ended and your profile is no longer discoverable. Provider cleanup continues in the background. Limited records remain only under the retention policy or a documented hold.</Text>
    <FormButton text="Back to welcome" onPress={() => router.replace('/')} />
  </StackScreen>;
}
