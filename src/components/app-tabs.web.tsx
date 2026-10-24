// Legacy Expo starter tabs retained for compatibility.
// The actual LoveBind application uses the Stack layout in src/app/_layout.tsx.
import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { Text } from 'react-native';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot />
      <TabList>
        <TabTrigger name="home" href="/">
          <Text>Home</Text>
        </TabTrigger>
        <TabTrigger name="explore" href="/explore">
          <Text>Explore</Text>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}
