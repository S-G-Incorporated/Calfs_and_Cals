import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { StoreProvider } from '@/lib/store';
import { useTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

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
        <Stack screenOptions={{ headerBackTitle: 'Back' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="day/[date]" />
          <Stack.Screen name="scan" options={{ title: 'Scan food', presentation: 'modal' }} />
        </Stack>
      </StoreProvider>
    </ThemeProvider>
  );
}
