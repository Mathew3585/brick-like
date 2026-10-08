import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Motion vocabulary. Everything settles on one spring-like curve, never linear:
 * - presses squash slightly (tactile);
 * - sections rise in on load (reading order);
 * - the eclipse is the one big moment: it marks entering and leaving a session.
 */
export const SPRING = Easing.bezier(0.32, 0.72, 0, 1);
export const HEAVY = Easing.bezier(0.7, 0, 0.2, 1);
export const settle = (duration = 420) => ({ duration, easing: SPRING });

export const enter = (index: number) => FadeInDown.delay(60 + index * 70).duration(700).easing(SPRING);

export const haptic = {
  tap: () => void Haptics.selectionAsync().catch(() => undefined),
  press: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  heavy: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined),
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  warn: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable that squashes instead of snapping. */
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  hapticOnPress,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hapticOnPress?: keyof typeof haptic;
  children?: ReactNode;
}) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: 1 - (1 - scaleTo) * pressed.get() }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        pressed.set(withTiming(1, settle(140)));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.set(withTiming(0, settle(420)));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (hapticOnPress) haptic[hapticOnPress]();
        onPress?.(e);
      }}
      style={[style, animated]}>
      {children}
    </AnimatedPressable>
  );
}
