import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { createStore, useStore } from '@/lib/store';
import { HEAVY, settle } from './motion';

type Request = { id: number; color: string; x?: number; y?: number; swap: () => void; done: () => void };

const request = createStore<Request | null>(null);
let seq = 0;

/**
 * The signature transition: a disc of the next tone grows from where the user acted until it
 * covers the screen, the state swaps underneath, then the disc fades away.
 */
export function eclipse(color: string, swap: () => void, origin?: { x: number; y: number }) {
  return new Promise<void>((resolve) => {
    request.set({ id: ++seq, color, x: origin?.x, y: origin?.y, swap, done: resolve });
  });
}

export function EclipseHost() {
  const req = useStore(request);
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const x = req?.x ?? width / 2;
  const y = req?.y ?? height * 0.82;
  const radius = Math.max(Math.hypot(x, y), Math.hypot(width - x, y), Math.hypot(x, height - y), Math.hypot(width - x, height - y)) + 4;

  useEffect(() => {
    if (!req) return;
    const finish = () => {
      request.set(null);
      req.done();
    };
    const covered = () => {
      req.swap();
      opacity.set(withTiming(0, settle(520), (ok) => ok && scheduleOnRN(finish)));
    };
    if (reduced) {
      req.swap();
      finish();
      return;
    }
    opacity.set(1);
    scale.set(0.001);
    scale.set(withTiming(1, { duration: 950, easing: HEAVY }, (ok) => ok && scheduleOnRN(covered)));
  }, [req, reduced, scale, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ scale: scale.get() }] }));

  if (!req) return null;
  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        { position: 'absolute', zIndex: 1000, elevation: 1000, left: x - radius, top: y - radius, width: radius * 2, height: radius * 2, borderRadius: radius, backgroundColor: req.color },
        style,
      ]}
    />
  );
}
