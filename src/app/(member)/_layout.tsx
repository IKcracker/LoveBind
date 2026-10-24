import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Love } from '@/components/auth-screens';
import { Icon, type IconName } from '@/components/icon';
import { LoadingScreen } from '@/components/member-ui';
import { profileComplete } from '@/lib/account';
import { useSession } from '@/lib/session';

function tabIcon(outline: IconName, filled: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon name={focused ? filled : outline} size={24} color={color} />;
  }
  return TabIcon;
}
const HomeIcon = tabIcon('home', 'homeFill');
const DiscoverIcon = tabIcon('discover', 'discoverFill');
const LikesIcon = tabIcon('heart', 'heartFill');
const MatchesIcon = tabIcon('chat', 'chatFill');
const ProfileIcon = tabIcon('person', 'personFill');

/**
 * The member app shell. Every signed-in member with a complete profile sees the
 * same tabs; Discover, Likes and Matches show a locked state until the account
 * is approved, so navigation never changes shape after verification.
 */
export default function MemberTabs() {
  const { user, loading } = useSession();
  const insets = useSafeAreaInsets();
  if (loading) return <LoadingScreen />;
  if (!user) return <Redirect href="/" />;
  if (!profileComplete(user.profile)) return <Redirect href="/onboarding" />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: Love.wine,
      tabBarInactiveTintColor: Love.mutedSoft,
      // Height must include the bottom inset; a fixed height pushes items into the home indicator.
      tabBarStyle: { backgroundColor: Love.white, borderTopColor: Love.line, height: 58 + insets.bottom, paddingTop: 6 },
      tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
      sceneStyle: { backgroundColor: Love.paper },
    }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: HomeIcon }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: DiscoverIcon }} />
      <Tabs.Screen name="likes" options={{ title: 'Likes', tabBarIcon: LikesIcon }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches', tabBarIcon: MatchesIcon }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ProfileIcon }} />
    </Tabs>
  );
}
