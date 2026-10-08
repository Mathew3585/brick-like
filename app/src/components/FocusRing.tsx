import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { usePalette } from '@/lib/tone';
import { settle } from './motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The session's one progress cue, around the puck. `progress` 0→1 fills the ring toward the
 * target; `null` (Libre) turns a short arc forever.
 */
export function FocusRing({ size, progress, children }: { size: number; progress: number | null; children: ReactNode }) {
  const p = usePalette();
  const reduced = useReducedMotion();
  const stroke = 2;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const fill = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (progress != null) fill.set(withTiming(Math.min(1, progress), settle(900)));
  }, [progress, fill]);

  useEffect(() => {
    if (progress != null || reduced) return;
    spin.set(0);
    spin.set(withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1));
  }, [progress, reduced, spin]);

  const arc = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - Math.max(0.004, fill.get())) }));
  const rotate = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360 - 90}deg` }] }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, rotate]}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={p.line} strokeWidth={stroke} fill="none" />
          {progress == null ? (
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={p.fg} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * 0.16} ${c}`} />
          ) : (
            <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={p.fg} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} animatedProps={arc} />
          )}
        </Svg>
      </Animated.View>
      {children}
    </View>
  );
}
