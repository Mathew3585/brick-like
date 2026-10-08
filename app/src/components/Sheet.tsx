import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { XIcon } from 'phosphor-react-native';
import { usePalette } from '@/lib/tone';
import { PressableScale, settle } from './motion';

/** Floating bottom sheet, detached from the edges, rising on the house curve. */
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const t = useSharedValue(0);

  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) t.set(withTiming(1, settle(700)));
    else t.set(withTiming(0, settle(380), (ok) => ok && scheduleOnRN(setMounted, false)));
  }, [visible, t]);

  const scrim = useAnimatedStyle(() => ({ opacity: t.get() }));
  const card = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - t.get()) * 520 }] }));

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: p.scrim }, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
      </Animated.View>
      <View style={{ flex: 1, justifyContent: 'flex-end', padding: 8, paddingBottom: insets.bottom + 8 }} pointerEvents="box-none">
        <Animated.View
          style={[
            {
              backgroundColor: p.bg,
              borderRadius: 40,
              paddingHorizontal: 24,
              paddingTop: 26,
              paddingBottom: 22,
              borderWidth: 1,
              borderColor: p.line,
            },
            card,
          ]}>
          <PressableScale
            onPress={onClose}
            accessibilityLabel="Fermer"
            hapticOnPress="tap"
            style={{ position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: 17, backgroundColor: p.card, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <XIcon size={15} color={p.fg} />
          </PressableScale>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
