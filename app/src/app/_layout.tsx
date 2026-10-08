import { Geist_300Light, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, useFonts } from '@expo-google-fonts/geist';
import { GeistMono_300Light, GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { EclipseHost } from '@/components/Eclipse';
import { loadApps } from '@/lib/apps';
import { loadAll, reconcile, settings } from '@/lib/data';
import { useStore } from '@/lib/store';
import { useTone } from '@/lib/tone';
import { palette } from '@/theme';
import { loadSounds } from '@/lib/sound';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Geist_300Light,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    GeistMono_300Light,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });
  const [ready, setReady] = useState(false);
  const { onboarded } = useStore(settings);
  const tone = useTone();
  const p = palette(tone);

  useEffect(() => {
    void loadAll().finally(() => setReady(true));
    void loadApps();
    loadSounds();
    // The session may have changed natively while we were away (or the app list, after installs).
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      reconcile();
      void loadApps(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded && ready) void SplashScreen.hideAsync();
  }, [fontsLoaded, ready]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(p.bg).catch(() => undefined);
  }, [p.bg]);

  if (!fontsLoaded || !ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: p.bg }}>
      <StatusBar style={tone === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg }, animation: 'fade' }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="mode/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
      </Stack>
      <EclipseHost />
    </GestureHandlerRootView>
  );
}
