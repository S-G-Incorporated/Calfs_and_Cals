import { DarkTheme, DefaultTheme, ThemeProvider, usePathname } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniWorkoutBar } from '@/components/mini-workout-bar';
import { ActiveWorkoutProvider } from '@/lib/active-workout';
import { StoreProvider } from '@/lib/store';
import { useTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

/**
 * The minimized workout on screens outside the tabs. The tab screens show it above their tab
 * bar instead, and the workout screen and camera don't need it.
 */
function StackWorkoutBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const hidden =
    pathname.startsWith('/train') ||
    pathname.startsWith('/calories') ||
    pathname.startsWith('/workout') ||
    pathname.startsWith('/scan');
  return hidden ? null : <MiniWorkoutBar bottomInset={insets.bottom} />;
}

export default function RootLayout() {
  const t = useTheme();
  const base = useColorScheme() === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: t.background, card: t.card, text: t.text, border: t.border },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="auto" />
      <StoreProvider onReady={() => SplashScreen.hideAsync()}>
        <ActiveWorkoutProvider>
          <View style={[styles.flex, { backgroundColor: t.background }]}>
            <Stack screenOptions={{ headerBackTitle: 'Back' }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="train" options={{ headerShown: false }} />
              <Stack.Screen name="calories" options={{ headerShown: false }} />
              <Stack.Screen name="profile" options={{ title: 'Profile' }} />
              <Stack.Screen name="target" options={{ title: 'Target weight' }} />
              <Stack.Screen name="day/[date]" />
              <Stack.Screen name="routine/[id]" options={{ title: 'Routine' }} />
              <Stack.Screen name="workout/[id]" options={{ title: 'Workout' }} />
              <Stack.Screen name="session/[id]" options={{ title: 'Edit workout' }} />
              <Stack.Screen name="scan" options={{ title: 'Scan food', presentation: 'modal' }} />
            </Stack>
            <StackWorkoutBar />
          </View>
        </ActiveWorkoutProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
