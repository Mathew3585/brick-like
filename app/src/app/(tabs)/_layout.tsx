import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { ChartBarIcon, DiscIcon, HouseIcon, StackIcon, type Icon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PressableScale, settle } from '@/components/motion';
import { active, lastSummary } from '@/lib/data';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/tone';

const ICONS: Record<string, { icon: Icon; label: string }> = {
  index: { icon: HouseIcon, label: 'Accueil' },
  modes: { icon: StackIcon, label: 'Modes' },
  stats: { icon: ChartBarIcon, label: 'Stats' },
  socles: { icon: DiscIcon, label: 'Socles' },
};
const DOT = 46;

/** Floating ink island; vanishes during a session and on the summary. */
function IslandTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const p = usePalette();
  const session = useStore(active);
  const summary = useStore(lastSummary);
  const [width, setWidth] = useState(0);
  const slot = width / state.routes.length;
  const x = useSharedValue(0);
  const shown = useSharedValue(1);
  const hidden = session != null || summary != null;

  useEffect(() => {
    if (slot > 0) x.set(withTiming(state.index * slot + (slot - DOT) / 2, settle(520)));
  }, [state.index, slot, x]);
  useEffect(() => {
    shown.set(withTiming(hidden ? 0 : 1, settle(hidden ? 200 : 600)));
    // A session found on return (started natively, or before a restart) always shows on Accueil.
    if (hidden && state.index !== 0) navigation.navigate('index');
  }, [hidden, shown, state.index, navigation]);

  const dot = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }], opacity: slot > 0 ? 1 : 0 }));
  const bar = useAnimatedStyle(() => ({ opacity: shown.get(), transform: [{ translateY: (1 - shown.get()) * 40 }] }));

  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'auto'}
      style={[{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 14, alignItems: 'center' }, bar]}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width - 12)}
        style={{ flexDirection: 'row', backgroundColor: p.fg, borderRadius: 999, padding: 6, width: 268 }}>
        <Animated.View style={[{ position: 'absolute', top: 6, left: 6, width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: p.bg }, dot]} />
        {state.routes.map((route, index) => {
          const meta = ICONS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const Glyph = meta.icon;
          return (
            <PressableScale
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              hapticOnPress="tap"
              scaleTo={0.88}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{ flex: 1, height: DOT, alignItems: 'center', justifyContent: 'center' }}>
              <Glyph size={21} color={focused ? p.fg : p.bg} weight={focused ? 'regular' : 'light'} style={{ opacity: focused ? 1 : 0.7 }} />
            </PressableScale>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function TabsLayout() {
  const p = usePalette();
  return (
    <Tabs tabBar={(props) => <IslandTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: p.bg }, animation: 'fade' }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="modes" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="socles" />
    </Tabs>
  );
}
