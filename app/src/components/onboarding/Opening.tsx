import { ArrowUpRightIcon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { usePalette } from '@/lib/tone';
import { haptic, SPRING } from '../motion';
import { Puck } from '../Puck';
import { Radar } from '../Rings';
import { Cta } from '../ui';
import { Halo, useAfter } from './Halo';
import { Reveal, Rise } from './Reveal';

const PUCK = 150;

/** Cold open in the dark: a lone LED blinks, the puck appears around it, the waves go out, the words rise. */
export function Opening({ onNext }: { onNext: (e: GestureResponderEvent) => void }) {
  const p = usePalette();
  const reduced = useReducedMotion();
  const led = useSharedValue(0);
  const body = useSharedValue(reduced ? 1 : 0);
  const waves = useAfter(reduced ? 0 : 1500);
  const stop = useAfter(4600);

  useEffect(() => {
    if (reduced) return;
    led.set(
      withSequence(
        withDelay(300, withTiming(1, { duration: 250 })),
        withTiming(0.15, { duration: 350 }),
        withTiming(1, { duration: 250 }),
        withTiming(0.15, { duration: 350 }),
        withTiming(1, { duration: 250 }),
      ),
    );
    body.set(withDelay(1400, withTiming(1, { duration: 1400, easing: SPRING })));
    const id = setTimeout(haptic.press, 1450);
    return () => clearTimeout(id);
  }, [led, body, reduced]);

  const ledStyle = useAnimatedStyle(() => ({ opacity: led.get() * (1 - body.get()) }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity: body.get(), transform: [{ scale: 0.86 + body.get() * 0.14 }] }));
  const dot = PUCK * 0.035;

  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Halo size={PUCK * 2.6} strength={0.07} />
        <Radar running={waves && !stop} size={PUCK * 2.2}>
          <View style={{ width: PUCK, height: PUCK * 1.12, marginTop: PUCK * 0.12 }}>
            <Animated.View style={bodyStyle}>
              <Puck size={PUCK} />
            </Animated.View>
            <Animated.View
              style={[
                { position: 'absolute', left: PUCK / 2 - dot * 2, top: PUCK * 0.11 - dot * 1.5, width: dot * 4, height: dot * 4, alignItems: 'center', justifyContent: 'center' },
                ledStyle,
              ]}>
              <View style={{ position: 'absolute', width: dot * 5, height: dot * 5, borderRadius: dot * 3, backgroundColor: '#FFF', opacity: 0.18 }} />
              <View style={{ width: dot, height: dot, borderRadius: dot, backgroundColor: '#FFF' }} />
            </Animated.View>
          </View>
        </Radar>
      </View>
      <View>
        <Reveal delay={reduced ? 0 : 2100} lines={[{ text: 'Pose.' }, { text: 'Travaille.' }, { text: 'Reprends.', muted: true }]} size={56} stagger={220} />
        <Rise delay={reduced ? 0 : 3200} style={{ marginTop: 34 }}>
          <Cta label="Commencer" icon={<ArrowUpRightIcon size={18} color={p.bg} />} onPress={onNext} />
        </Rise>
      </View>
    </View>
  );
}
