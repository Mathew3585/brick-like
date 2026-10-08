import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { usePalette } from '@/lib/tone';
import { haptic, settle } from './motion';
import { Text } from './ui';

const HOLD_MS = 1700;

/** Press and hold to confirm: the fill sweeps across, the label flips colour as it passes. */
export function HoldButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const p = usePalette();
  const progress = useSharedValue(0);
  const [width, setWidth] = useState(0);

  const confirm = () => {
    haptic.heavy();
    onConfirm();
  };

  const fill = useAnimatedStyle(() => ({ width: progress.get() * width }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Maintiens appuyé"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onPressIn={() => {
        haptic.press();
        progress.set(withTiming(1, { duration: HOLD_MS, easing: Easing.bezier(0.45, 0.05, 0.55, 0.95) }, (ok) => ok && scheduleOnRN(confirm)));
      }}
      onPressOut={() => {
        if (progress.get() < 1) progress.set(withTiming(0, settle(320)));
      }}
      style={{ height: 58, borderRadius: 29, backgroundColor: p.card, overflow: 'hidden', justifyContent: 'center' }}>
      <Text f="medium" size={15} style={{ textAlign: 'center' }}>
        {label}
      </Text>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: p.fg, overflow: 'hidden' }, fill]}>
        <View style={[StyleSheet.absoluteFill, { width, justifyContent: 'center' }]}>
          <Text f="medium" size={15} color={p.bg} style={{ textAlign: 'center' }}>
            {label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
