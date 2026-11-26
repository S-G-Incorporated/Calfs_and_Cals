import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { SavedFoodsScreen } from '@/components/saved-foods';
import { SwitchButton } from '@/components/section-tabs';
import { useTheme } from '@/lib/theme';

export default function CaloriesFoodsScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const navigation = useNavigation();

  // Forget where we came from once the tab is left, so opening Foods from the tab bar later
  // shows the normal header instead of a back arrow.
  useFocusEffect(
    useCallback(() => () => navigation.setParams({ from: undefined } as never), [navigation]),
  );

  return (
    <>
      {/* Always set, because header options stick around after the screen sets them once. */}
      <Tabs.Screen
        options={{ headerLeft: () => (from === 'today' ? <BackToToday /> : <SwitchButton />) }}
      />
      <SavedFoodsScreen />
    </>
  );
}

/** Shortcut back to the Today tab, shown when Foods was opened from there. */
function BackToToday() {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => router.navigate('/calories')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Back to today"
      style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name="arrow-back" size={24} color={t.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { paddingHorizontal: 16 },
});
