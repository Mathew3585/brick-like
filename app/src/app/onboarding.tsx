import { StatusBar } from 'expo-status-bar';
import { ArrowUpRightIcon, CheckIcon, LockIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { eclipse } from '@/components/Eclipse';
import { haptic, PressableScale, settle } from '@/components/motion';
import { Landing } from '@/components/onboarding/Landing';
import { Noise } from '@/components/onboarding/Noise';
import { Opening } from '@/components/onboarding/Opening';
import { Quiet, Return } from '@/components/onboarding/Quiet';
import { Reveal, Rise } from '@/components/onboarding/Reveal';
import { Page } from '@/components/Page';
import { Orb, Radar } from '@/components/Rings';
import { PairFlow } from '@/components/SocleSetup';
import { Cta, Muted, Text } from '@/components/ui';
import { blocker, isSimulated } from '@/lib/blocker';
import { settings } from '@/lib/data';
import { usePermissions } from '@/lib/permissions';
import { ToneOverride, usePalette } from '@/lib/tone';
import { ink, paper, type Tone } from '@/theme';

type Origin = { x: number; y: number };
// The story (0-4) shows the product by doing it; then the two real settings, then go.
const TONE_OF: Tone[] = ['dark', 'light', 'light', 'dark', 'dark', 'light', 'light', 'light'];

function Segment({ on, color, track }: { on: boolean; color: string; track: string }) {
  const t = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    t.set(withTiming(on ? 1 : 0, settle(700)));
  }, [on, t]);
  const fill = useAnimatedStyle(() => ({ width: `${t.get() * 100}%` }));
  return (
    <View style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: color }, fill]} />
    </View>
  );
}

function Progress({ step }: { step: number }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: 4, flex: 1 }}>
      {TONE_OF.map((_, i) => (
        <Segment key={i} on={i <= step} color={p.fg} track={p.line} />
      ))}
    </View>
  );
}

function PermissionRow({ on, title, detail }: { on: boolean; title: string; detail: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: p.line }}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: on ? p.fg : 'transparent',
          borderWidth: on ? 0 : 1,
          borderColor: p.faint,
        }}>
        {on ? <CheckIcon size={15} color={p.bg} weight="bold" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text f="medium" size={15}>
          {title}
        </Text>
        <Muted size={12.5} style={{ marginTop: 2 }}>
          {detail}
        </Muted>
      </View>
    </View>
  );
}

function Permission({ onNext }: { onNext: () => void }) {
  const p = usePalette();
  const perms = usePermissions();
  const apps = isSimulated || perms.blocker;
  const notify = isSimulated || perms.notify;
  const done = apps && notify;

  // A switch just turned on while we were in Settings: say so.
  const was = useRef(apps && notify);
  useEffect(() => {
    if (done && !was.current) haptic.success();
    was.current = done;
  }, [done]);

  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View>
          <Orb size={200} />
          <View
            style={{
              position: 'absolute',
              right: 34,
              bottom: 34,
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: done ? p.fg : p.bg,
              borderWidth: done ? 3 : 1,
              borderColor: done ? p.bg : p.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {done ? <CheckIcon size={21} color={p.bg} weight="bold" /> : <LockIcon size={19} color={p.fg} weight="light" />}
          </View>
        </View>
      </View>
      <Reveal key={String(done)} delay={150} lines={done ? [{ text: 'Tout est' }, { text: 'prêt.', muted: true }] : [{ text: 'Deux' }, { text: 'autorisations.', muted: true }]} size={44} />
      <Rise delay={600} style={{ marginTop: 18 }}>
        <PermissionRow on={apps} title="Bloquer les apps" detail="Accessibilité · voit quelle app s’ouvre, rien d’autre" />
        <PermissionRow on={notify} title="Couper leurs notifications" detail="Accès aux notifications · seulement pendant une session" />
        {!done && !isSimulated ? (
          <PressableScale onPress={() => blocker.openAppDetails()} style={{ marginTop: 8 }}>
            <Muted size={12}>Interrupteur grisé ? Infos de l’app → ⋮ → Autoriser les paramètres restreints.</Muted>
          </PressableScale>
        ) : null}
        <View style={{ gap: 10, marginTop: 20 }}>
          {done ? (
            <Cta label="Continuer" icon={<ArrowUpRightIcon size={18} color={p.bg} />} onPress={onNext} />
          ) : (
            <>
              <Cta
                label={apps ? 'Activer les notifications' : 'Activer le blocage'}
                icon={<ArrowUpRightIcon size={18} color={p.bg} />}
                onPress={() => (apps ? blocker.openNotifySettings() : blocker.openSettings())}
              />
              <PressableScale onPress={onNext} style={{ alignSelf: 'center', padding: 8 }}>
                <Muted>Plus tard</Muted>
              </PressableScale>
            </>
          )}
        </View>
      </Rise>
    </View>
  );
}

function Pair({ onNext }: { onNext: (demo: boolean) => void }) {
  const p = usePalette();
  const [pairing, setPairing] = useState(false);
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Radar running size={300}>
          <Orb size={220} />
        </Radar>
      </View>
      <Reveal delay={150} lines={[{ text: 'Ton' }, { text: 'Socle.', muted: true }]} size={44} />
      <Rise delay={600}>
        <Muted size={15} style={{ marginTop: 12, lineHeight: 22 }}>
          Une puce NFC : autocollant, carte de transport, badge.
        </Muted>
        <View style={{ gap: 10, marginTop: 26 }}>
          <Cta label="Scanner ma puce" icon={<ArrowUpRightIcon size={18} color={p.bg} />} onPress={() => setPairing(true)} />
          <Cta variant="ghost" label="Pas de puce : Socle virtuel" onPress={() => onNext(true)} haptics="tap" />
        </View>
      </Rise>
      <PairFlow visible={pairing} onClose={() => setPairing(false)} onDone={() => setTimeout(() => onNext(false), 450)} />
    </View>
  );
}

function Ready({ onNext }: { onNext: () => void }) {
  const p = usePalette();
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Radar running size={340}>
          <Orb size={240} />
        </Radar>
      </View>
      <Reveal delay={300} center lines={[{ text: 'C’est prêt.' }]} size={52} />
      <Rise delay={1000} style={{ marginTop: 30 }}>
        <Cta label="Entrer" icon={<ArrowUpRightIcon size={18} color={p.bg} />} onPress={onNext} />
      </Rise>
    </View>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [tone, setTone] = useState<Tone>('dark');
  const [startedAt, setStartedAt] = useState(0);
  const [demo, setDemo] = useState(false);

  /** Same tone: crossfade. Tone flips: the eclipse, from where the user acted. */
  const go = (next: number, origin?: Origin) => {
    const nextTone = TONE_OF[next]!;
    if (nextTone === tone) return setStep(next);
    void eclipse(
      nextTone === 'dark' ? ink : paper,
      () => {
        setTone(nextTone);
        setStep(next);
      },
      origin,
    );
  };

  const finish = () => {
    haptic.success();
    settings.set((s) => ({ ...s, demo: s.demo || demo, onboarded: true }));
  };

  const screens = [
    <Opening key={0} onNext={(e) => go(1, { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })} />,
    <Noise key={1} onNext={() => go(2)} />,
    <Landing
      key={2}
      onNext={(o) => {
        setStartedAt(Date.now());
        go(3, o);
      }}
    />,
    <Quiet key={3} startedAt={startedAt} onNext={() => go(4)} />,
    <Return key={4} onNext={(o) => go(5, o)} />,
    <Permission key={5} onNext={() => go(6)} />,
    <Pair
      key={6}
      onNext={(d) => {
        setDemo(d);
        go(7);
      }}
    />,
    <Ready key={7} onNext={finish} />,
  ];

  return (
    <ToneOverride.Provider value={tone}>
      <StatusBar style={tone === 'dark' ? 'light' : 'dark'} />
      <Page scroll={false} tabBar={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, height: 28 }}>
          <Progress step={step} />
          {step >= 1 && step <= 4 ? (
            <PressableScale onPress={() => go(5)} style={{ paddingVertical: 4 }} accessibilityLabel="Passer l’introduction">
              <Muted size={13}>Passer</Muted>
            </PressableScale>
          ) : null}
        </View>
        <Animated.View key={step} entering={FadeIn.duration(450)} exiting={FadeOut.duration(180)} style={{ flex: 1, marginTop: 18 }}>
          {screens[step]}
        </Animated.View>
      </Page>
    </ToneOverride.Provider>
  );
}
