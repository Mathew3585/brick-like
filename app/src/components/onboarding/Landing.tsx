import { CaretDownIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { installedApps } from '@/lib/apps';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/tone';
import { ink, paper } from '@/theme';
import { haptic, HEAVY, PressableScale, SPRING } from '../motion';
import { Orb, Radar } from '../Rings';
import { AppIcon, Muted } from '../ui';
import { storyApps } from './Noise';
import { Reveal, Rise } from './Reveal';

const PHONE_W = 118;
const PHONE_H = 232;
const ORB = 210;

/** Act 2: the user drags the phone onto the Socle. Contact → waves, the screen goes dark, eclipse. */
export function Landing({ onNext }: { onNext: (origin: { x: number; y: number }) => void }) {
  const p = usePalette();
  const apps = storyApps(useStore(installedApps), 9);
  const areaRef = useRef<View>(null);
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [win, setWin] = useState({ x: 0, y: 0 });
  const [landed, setLanded] = useState(false);
  const y = useSharedValue(0);
  const start = useSharedValue(0);
  const dark = useSharedValue(0);
  const hint = useSharedValue(0);
  const done = useSharedValue(0);

  const orbCY = area ? area.h - ORB / 2 : 0;
  const max = area ? Math.max(0, orbCY - ORB * 0.12 - PHONE_H - 6) : 0;

  useEffect(() => {
    hint.set(withDelay(1200, withRepeat(withSequence(withTiming(1, { duration: 700, easing: SPRING }), withTiming(0, { duration: 700, easing: SPRING })), -1)));
  }, [hint]);

  const land = () => {
    if (landed) return;
    setLanded(true);
    haptic.heavy();
    dark.set(withTiming(1, { duration: 520, easing: HEAVY }));
    setTimeout(haptic.success, 380);
    setTimeout(() => onNext({ x: win.x + (area?.w ?? 0) / 2, y: win.y + orbCY }), 1100);
  };

  const drop = () => {
    done.set(1);
    y.set(withTiming(max, { duration: 700, easing: HEAVY }, (ok) => ok && scheduleOnRN(land)));
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      start.set(y.get());
    })
    .onUpdate((e) => {
      if (done.get()) return;
      y.set(Math.min(max, Math.max(0, start.get() + e.translationY)));
    })
    .onEnd((e) => {
      if (done.get()) return;
      if (y.get() > max * 0.55 || e.velocityY > 900) {
        done.set(1);
        y.set(withTiming(max, { duration: 240, easing: HEAVY }, (ok) => ok && scheduleOnRN(land)));
      } else {
        y.set(withSpring(0, { damping: 13, stiffness: 160 }));
      }
    });

  const phone = useAnimatedStyle(() => {
    const t = max ? y.get() / max : 0;
    return { transform: [{ translateY: y.get() }, { scale: 1 - t * 0.04 }] };
  });
  const screen = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(dark.get(), [0, 1], [paper, '#050505']) }));
  const iconsStyle = useAnimatedStyle(() => ({ opacity: 1 - dark.get(), transform: [{ scale: 1 - dark.get() * 0.1 }] }));
  const hintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), [0, 30], [1, 0], 'clamp') * (1 - dark.get()),
    transform: [{ translateY: hint.get() * 8 }],
  }));

  return (
    <View style={{ flex: 1 }}>
      <Reveal delay={200} lines={[{ text: 'Pose ton' }, { text: 'téléphone.', muted: true }]} size={44} />
      <View ref={areaRef} style={{ flex: 1, marginTop: 10 }} onLayout={(e) => {
          setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
          areaRef.current?.measureInWindow((x, y) => setWin({ x, y }));
        }}>
        {area ? (
          <>
            <View style={{ position: 'absolute', left: area.w / 2 - ORB / 2, top: area.h - ORB, width: ORB, height: ORB, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ position: 'absolute' }}>
                <Radar running={landed} size={ORB * 1.5}>
                  <View />
                </Radar>
              </View>
              <Orb size={ORB} />
            </View>

            <Animated.View style={[{ position: 'absolute', left: area.w / 2 - 70, top: PHONE_H + (area.h - ORB - PHONE_H) / 2 - 14, width: 140, alignItems: 'center', gap: 6 }, hintStyle]} pointerEvents="none">
              <CaretDownIcon size={18} color={p.muted} />
              <CaretDownIcon size={18} color={p.faint} style={{ marginTop: -14 }} />
            </Animated.View>

            <GestureDetector gesture={pan}>
              <Animated.View
                style={[
                  { position: 'absolute', left: area.w / 2 - PHONE_W / 2, top: 0, width: PHONE_W, height: PHONE_H, borderRadius: 30, backgroundColor: ink, padding: 4 },
                  { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 18 }, elevation: 14 },
                  phone,
                ]}>
                <Animated.View style={[{ flex: 1, borderRadius: 26, overflow: 'hidden', paddingTop: 30, paddingHorizontal: 12 }, screen]}>
                  <View style={{ position: 'absolute', top: 8, alignSelf: 'center', width: 34, height: 10, borderRadius: 5, backgroundColor: ink }} />
                  <Animated.View style={[{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }, iconsStyle]}>
                    {apps.map((a) => (
                      <AppIcon key={a.packageName} label={a.label} icon={a.icon} size={26} />
                    ))}
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            </GestureDetector>
          </>
        ) : null}
      </View>
      <Rise delay={900} style={{ alignItems: 'center', marginTop: 14 }}>
        {landed ? (
          <Muted size={14}>Contact.</Muted>
        ) : (
          <PressableScale onPress={drop} style={{ padding: 8 }} accessibilityLabel="Poser le téléphone pour moi">
            <Muted size={14}>Glisse-le sur le Socle, ou touche ici</Muted>
          </PressableScale>
        )}
      </Rise>
    </View>
  );
}
