import { ArrowUpRightIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { installedApps } from '@/lib/apps';
import { useNow } from '@/lib/clock';
import { clock } from '@/lib/format';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/tone';
import { haptic, PressableScale } from '../motion';
import { Puck } from '../Puck';
import { Radar } from '../Rings';
import { AppIcon, Cta, Label, Text } from '../ui';
import { Halo } from './Halo';
import { storyApps } from './Noise';
import { Reveal, Rise } from './Reveal';
import { play } from '@/lib/sound';

/** Act 3, in ink: the clock runs, the apps are struck through. */
export function Quiet({ startedAt, onNext }: { startedAt: number; onNext: () => void }) {
  const p = usePalette();
  const now = useNow();
  const apps = storyApps(useStore(installedApps), 8);
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <Rise delay={500} style={{ marginTop: 30 }}>
        <Label>Session · démo</Label>
        <Text f="monoLight" size={64} style={{ marginTop: 14, letterSpacing: -3.8, fontVariant: ['tabular-nums'] }}>
          {clock(elapsed)}
        </Text>
      </Rise>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 }}>
        {apps.map((a, i) => (
          <Animated.View key={a.packageName} entering={FadeIn.delay(900 + i * 80).duration(600)} style={{ width: '25%', alignItems: 'center' }}>
            <View style={{ opacity: 0.4 }}>
              <AppIcon label={a.label} icon={a.icon} size={50} />
              <View style={{ position: 'absolute', left: 8, right: 8, top: 24.5, height: 1, backgroundColor: p.fg, transform: [{ rotate: '-35deg' }] }} />
            </View>
          </Animated.View>
        ))}
      </View>
      <View>
        <Reveal delay={1500} lines={[{ text: 'Silence.' }]} size={52} />
        <Rise delay={2300} style={{ marginTop: 30 }}>
          <Cta label="Et pour les récupérer ?" icon={<ArrowUpRightIcon size={18} color={p.bg} />} onPress={onNext} />
        </Rise>
      </View>
    </View>
  );
}

const PUCK = 140;

/** Act 4, in ink: the only way back is the Socle. Touch it. */
export function Return({ onNext }: { onNext: (origin: { x: number; y: number }) => void }) {
  const [touched, setTouched] = useState(false);
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ marginTop: 30 }}>
        <Reveal delay={200} lines={[{ text: 'Reviens' }, { text: 'au Socle.', muted: true }]} size={52} />
      </View>
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Halo size={PUCK * 2.8} strength={touched ? 0.14 : 0.07} />
        <Radar running size={PUCK * 2.1}>
          <PressableScale
            accessibilityLabel="Toucher le Socle"
            scaleTo={0.93}
            disabled={touched}
            onPress={(e) => {
              setTouched(true);
              haptic.success();
              play('unlock');
              const { pageX: x, pageY: y } = e.nativeEvent;
              setTimeout(() => onNext({ x, y }), 520);
            }}
            style={{ width: PUCK, height: PUCK * 1.12, marginTop: PUCK * 0.12 }}>
            <Puck size={PUCK} led={touched ? 'on' : true} />
          </PressableScale>
        </Radar>
      </View>
      <Rise delay={1100} style={{ alignItems: 'center', paddingBottom: 12 }}>
        <Text size={15} f="medium">
          {touched ? 'Tout revient.' : 'Touche-le.'}
        </Text>
      </Rise>
    </View>
  );
}
