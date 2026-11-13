import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/lib/theme';

/** Opens the profile screen. Used in headers and on the launch screen. */
export function ProfileButton({ size = 26, color }: { size?: number; color?: string }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => router.push('/profile')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Profile"
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name="person-circle-outline" size={size} color={color ?? t.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: 16 },
});
