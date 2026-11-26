import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BottomTabBar, Tabs } from 'expo-router/js-tabs';
import { type ColorValue, Pressable, StyleSheet } from 'react-native';

import { formatLong, useToday } from '@/lib/dates';
import { MODE_LABEL, type Mode, modeColor } from '@/lib/mode';
import { useTheme } from '@/lib/theme';

import { MiniWorkoutBar } from './mini-workout-bar';
import { ProfileButton } from './profile-button';

type IconName = keyof typeof Ionicons.glyphMap;

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={typeof color === 'string' ? color : undefined} size={size} />;
  };

/** Returns to the launch screen so the other section can be opened. Also used by screens that set their own header. */
export function SwitchButton() {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => router.dismissTo('/')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Back to start"
      style={({ pressed }) => [styles.switch, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name="apps" size={24} color={t.text} />
    </Pressable>
  );
}

/** The tabs for one section: Today/Routines, Foods (calories only), Progress and Goals. */
export function SectionTabs({ mode }: { mode: Mode }) {
  const t = useTheme();
  const today = useToday();
  const label = MODE_LABEL[mode];

  return (
    <Tabs
      tabBar={(props) => (
        <>
          <MiniWorkoutBar />
          <BottomTabBar {...props} />
        </>
      )}
      screenOptions={{
        tabBarActiveTintColor: modeColor(mode, t),
        headerLeft: () => <SwitchButton />,
        headerRight: () => <ProfileButton />,
      }}>
      <Tabs.Screen
        name="index"
        options={
          mode === 'train'
            ? { title: 'Routines', headerTitle: 'Routines', tabBarIcon: icon('list') }
            : { title: 'Today', headerTitle: `${label} · ${formatLong(today)}`, tabBarIcon: icon('today') }
        }
      />
      {mode === 'calories' ? (
        <Tabs.Screen
          name="foods"
          options={{ title: 'Foods', headerTitle: 'Saved foods', tabBarIcon: icon('bookmark') }}
        />
      ) : null}
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', headerTitle: `${label} progress`, tabBarIcon: icon('stats-chart') }}
      />
      <Tabs.Screen
        name="goals"
        options={{ title: 'Goals', headerTitle: `${label} goals`, tabBarIcon: icon('flag') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  switch: { paddingHorizontal: 16 },
});
