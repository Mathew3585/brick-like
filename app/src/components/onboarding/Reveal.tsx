import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { usePalette } from '@/lib/tone';
import { font } from '@/theme';
import { SPRING } from '../motion';

function Word({ text, delay, size, color, weight }: { text: string; delay: number; size: number; color: string; weight: string }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) t.set(withDelay(delay, withTiming(1, { duration: 900, easing: SPRING })));
  }, [delay, reduced, t]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - t.get()) * size * 1.15 }], opacity: 0.2 + t.get() * 0.8 }));
  return (
    <View style={{ overflow: 'hidden', paddingBottom: size * 0.08 }}>
      <Animated.Text style={[{ fontFamily: weight, fontSize: size, lineHeight: size * 1.04, letterSpacing: -size * 0.05, color, includeFontPadding: false }, style]}>
        {text}
      </Animated.Text>
    </View>
  );
}

/** Lines rise word by word out of an invisible mask. */
export function Reveal({
  lines,
  size = 52,
  delay = 0,
  stagger = 110,
  center,
}: {
  lines: { text: string; muted?: boolean }[];
  size?: number;
  delay?: number;
  stagger?: number;
  center?: boolean;
}) {
  const p = usePalette();
  let i = 0;
  return (
    <View style={{ alignItems: center ? 'center' : 'flex-start' }}>
      {lines.map((line, li) => (
        <View key={li} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: center ? 'center' : 'flex-start', columnGap: size * 0.24 }}>
          {line.text.split(' ').map((w, wi) => (
            <Word
              key={wi}
              text={w}
              delay={delay + i++ * stagger}
              size={size}
              color={line.muted ? p.muted : p.fg}
              weight={line.muted ? font.light : font.semibold}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/** A view that rises into place after `delay`. */
export function Rise({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: object }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) t.set(withDelay(delay, withTiming(1, { duration: 800, easing: SPRING })));
  }, [delay, reduced, t]);
  const a = useAnimatedStyle(() => ({ opacity: t.get(), transform: [{ translateY: (1 - t.get()) * 18 }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}
