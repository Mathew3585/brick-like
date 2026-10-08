import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { usePalette } from '@/lib/tone';
import { SPRING } from './motion';
import { Puck } from './Puck';

/** The Socle on its stage: the puck inside two hairline rings, the outer one breathing. */
export function Orb({ size = 168 }: { size?: number }) {
  const p = usePalette();
  const reduced = useReducedMotion();
  const breath = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    breath.set(withRepeat(withSequence(withTiming(1, { duration: 2400, easing: SPRING }), withTiming(0, { duration: 2400, easing: SPRING })), -1));
  }, [breath, reduced]);
  const outer = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.get() * 0.04 }], opacity: 1 - breath.get() * 0.45 }));
  const ring = (inset: number) => ({
    position: 'absolute' as const,
    top: inset,
    left: inset,
    right: inset,
    bottom: inset,
    borderRadius: size,
    borderWidth: 1,
    borderColor: p.line,
  });
  const puck = size * 0.58;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[ring(0), outer]} />
      <View style={ring(size * 0.14)} />
      {/* The puck's svg is taller than wide (room for its shadow): nudge it so the disc stays centred. */}
      <View style={{ marginTop: puck * 0.12 }}>
        <Puck size={puck} />
      </View>
    </View>
  );
}

function Wave({ delay, size, color, running }: { delay: number; size: number; color: string; running: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!running) {
      t.set(withTiming(0, { duration: 200 }));
      return;
    }
    t.set(0);
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 2100, easing: SPRING }), -1)));
  }, [running, delay, t]);
  const style = useAnimatedStyle(() => ({ opacity: running ? 0.9 * (1 - t.get()) : 0, transform: [{ scale: 0.35 + 0.65 * t.get() }] }));
  return (
    <Animated.View
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size, borderWidth: 1, borderColor: color }, style]}
    />
  );
}

/** NFC radar: waves leave the core while the phone listens. */
export function Radar({ running, children, size = 150 }: { running: boolean; children: ReactNode; size?: number }) {
  const p = usePalette();
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 700, 1400].map((d) => (
        <Wave key={d} delay={d} size={size} color={p.fg} running={running} />
      ))}
      {children}
    </View>
  );
}
