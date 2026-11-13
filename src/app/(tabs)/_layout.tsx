import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import { formatLong, useToday } from '@/lib/dates';
import { useTheme } from '@/lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={typeof color === 'string' ? color : undefined} size={size} />;
  };

export default function TabsLayout() {
  const t = useTheme();
  const today = useToday();

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: t.calories }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          headerTitle: `Today · ${formatLong(today)}`,
          tabBarIcon: icon('today'),
        }}
      />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('stats-chart') }} />
      <Tabs.Screen name="goals" options={{ title: 'Goals', tabBarIcon: icon('flag') }} />
    </Tabs>
  );
}
