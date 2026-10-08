import { ArrowDownIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { installedApps } from '@/lib/apps';
import type { InstalledApp } from '@/lib/blocker';
import { DEFAULT_MODES } from '@/lib/data';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/tone';
import { haptic, HEAVY } from '../motion';
import { AppIcon, Cta } from '../ui';
import { Reveal, Rise } from './Reveal';

// Hand-placed so the cloud looks loose but never stacks two icons.
const SLOTS: [number, number, number][] = [
  [0.1, 0.06, 58], [0.52, 0.0, 46], [0.84, 0.1, 54], [0.3, 0.2, 48], [0.68, 0.27, 62], [0.04, 0.38, 50], [0.44, 0.44, 56],
  [0.88, 0.47, 46], [0.2, 0.6, 60], [0.62, 0.62, 48], [0.02, 0.8, 46], [0.38, 0.82, 54], [0.8, 0.78, 58], [0.58, 0.97, 44],
];

/** The distracting apps first (from the default modes), then anything else installed. */
export function storyApps(list: InstalledApp[] | null, max: number): InstalledApp[] {
  const known = [...new Set(DEFAULT_MODES.flatMap((m) => m.apps))];
  const index = new Map((list ?? []).map((a) => [a.packageName, a]));
  const first = known.map((k) => index.get(k)).filter((a): a is InstalledApp => a != null);
  const rest = (list ?? []).filter((a) => !known.includes(a.packageName));
  const picked = [...first, ...rest].slice(0, max);
  if (picked.length) return picked;
  return ['Instagram', 'TikTok', 'YouTube', 'X', 'Reddit', 'Snapchat', 'Netflix', 'Twitch', 'Discord', 'Facebook', 'Pinterest', 'Gmail', 'Spotify', 'LinkedIn']
    .slice(0, max)
    .map((label) => ({ packageName: label, label, icon: null }));
}

function FloatIcon({
  app,
  slot,
  i,
  area,
  collapse,
}: {
  app: InstalledApp;
  slot: [number, number, number];
  i: number;
  area: { w: number; h: number };
  collapse: SharedValue<number>;
}) {
  const p = usePalette();
  const reduced = useReducedMotion();
  const born = useSharedValue(reduced ? 1 : 0);
  const drift = useSharedValue(0.5);
  const [fx, fy, size] = slot;
  const x = fx * (area.w - size);
  const y = fy * (area.h - size);
  const dx = area.w / 2 - size / 2 - x;
  const dy = area.h / 2 - size / 2 - y;
  const amp = 6 + (i % 4) * 3;
  const dir = i % 2 ? 1 : -1;

  useEffect(() => {
    if (reduced) return;
    born.set(withDelay(i * 70, withSpring(1, { damping: 11, stiffness: 140 })));
    drift.set(withDelay(i * 90, withRepeat(withTiming(1, { duration: 2400 + i * 170 }), -1, true)));
  }, [born, drift, i, reduced]);

  const style = useAnimatedStyle(() => {
    const c = collapse.get();
    const wob = drift.get() * 2 - 1;
    return {
      opacity: interpolate(c, [0, 0.8, 1], [1, 0.6, 0]),
      transform: [
        { translateX: wob * amp * dir + dx * c },
        { translateY: -wob * amp * 0.8 + dy * c },
        { scale: born.get() * (1 - c * 0.75) },
        { rotate: `${wob * 4 * dir}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, style]}>
      <AppIcon label={app.label} icon={app.icon} size={size} />
      {i % 3 === 0 ? (
        <View style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: p.fg, borderWidth: 2.5, borderColor: p.bg }} />
      ) : null}
    </Animated.View>
  );
}

/** Act 1, on paper: the apps you know, buzzing everywhere. */
export function Noise({ onNext }: { onNext: () => void }) {
  const p = usePalette();
  const apps = storyApps(useStore(installedApps), SLOTS.length);
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const collapse = useSharedValue(0);

  const quiet = () => {
    haptic.heavy();
    collapse.set(withTiming(1, { duration: 650, easing: HEAVY }, (ok) => ok && scheduleOnRN(onNext)));
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, marginHorizontal: -6, marginVertical: 10 }} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {area
          ? apps.map((a, i) => <FloatIcon key={a.packageName} app={a} slot={SLOTS[i]!} i={i} area={area} collapse={collapse} />)
          : null}
      </View>
      <Reveal delay={500} lines={[{ text: 'Elles veulent' }, { text: 'ton attention.', muted: true }]} size={44} />
      <Rise delay={1300} style={{ marginTop: 30 }}>
        <Cta label="Les faire taire" icon={<ArrowDownIcon size={18} color={p.bg} />} onPress={quiet} />
      </Rise>
    </View>
  );
}
