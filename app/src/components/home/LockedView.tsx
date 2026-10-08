import { WaveformIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { installedApps, installedOnly } from '@/lib/apps';
import { blocker, isSimulated, type InstalledApp } from '@/lib/blocker';
import { useNow } from '@/lib/clock';
import { active, endSession, settings, sosLeft } from '@/lib/data';
import { clock, plural } from '@/lib/format';
import { goalLabel } from '@/lib/goal';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/tone';
import { paper } from '@/theme';
import { eclipse } from '../Eclipse';
import { FocusRing } from '../FocusRing';
import { HoldButton } from '../HoldButton';
import { enter, haptic, PressableScale } from '../motion';
import { Halo } from '../onboarding/Halo';
import { Page } from '../Page';
import { Puck } from '../Puck';
import { ScanSheet } from '../ScanSheet';
import { Sheet } from '../Sheet';
import { AppIcon, Cta, Label, Muted, Text } from '../ui';
import { play } from '@/lib/sound';

type Origin = { x: number; y: number };
const RING = 290;
const PUCK = 158;

/** Monolithe in ink: the puck inside the ring that fills toward the target, the clock under it. */
export function LockedView() {
  const p = usePalette();
  const session = useStore(active);
  const s = useStore(settings);
  const apps = useStore(installedApps);
  const now = useNow();
  const [scanning, setScanning] = useState(false);
  const [sos, setSos] = useState(false);
  const [shield, setShield] = useState<InstalledApp | null>(null);
  const [origin, setOrigin] = useState<Origin | undefined>();

  const elapsed = session ? Math.max(0, Math.floor((now - session.startedAt) / 1000)) : 0;
  const goalMin = session?.goalMin ?? 0;
  const progress = goalMin ? elapsed / (goalMin * 60) : null;
  const reached = progress != null && progress >= 1;
  const paused = session ? installedOnly(session.blocked, apps) : [];
  const left = sosLeft(s);

  // One buzz when the ring closes while the app is open (the notification covers the rest).
  const wasReached = useRef(reached);
  useEffect(() => {
    if (reached && !wasReached.current) haptic.success();
    wasReached.current = reached;
  }, [reached]);

  const unlock = (how: 'socle' | 'sos', uid?: string) => {
    setScanning(false);
    setSos(false);
    setTimeout(() => {
      haptic.heavy();
      play('unlock');
      void eclipse(paper, () => endSession(how, uid), origin);
    }, 280);
  };

  return (
    <Page scroll={false} tabBar={false} style={{ alignItems: 'center' }}>
      <Animated.View entering={enter(0)} style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Label>Session · {session?.modeName}</Label>
        <PressableScale
          disabled={!isSimulated || paused.length === 0}
          onPress={() => {
            const a = paused[0];
            if (!a) return;
            blocker.simulateAttempt(a.packageName);
            haptic.warn();
            setShield(a);
          }}>
          <Label>{plural(paused.length, 'app en pause', 'apps en pause')}</Label>
        </PressableScale>
      </Animated.View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View entering={enter(1)} style={{ alignItems: 'center' }}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Halo size={RING * 1.4} strength={reached ? 0.14 : 0.08} />
            <FocusRing size={RING} progress={progress}>
              <View style={{ marginTop: PUCK * 0.12 }}>
                <Puck size={PUCK} led={reached ? true : 'on'} />
              </View>
            </FocusRing>
          </View>
          <Text f="monoLight" size={48} style={{ marginTop: 26, letterSpacing: -2.8, fontVariant: ['tabular-nums'] }}>
            {clock(elapsed)}
          </Text>
          <Muted size={14} style={{ marginTop: 6 }}>
            {progress == null ? 'Session libre' : reached ? 'Objectif atteint · repose ton téléphone' : `sur ${goalLabel(goalMin)}`}
          </Muted>
        </Animated.View>
      </View>

      <Animated.View entering={enter(2)} style={{ alignSelf: 'stretch' }}>
        <Cta
          label="Débloquer au Socle"
          icon={<WaveformIcon size={19} color={p.bg} weight="light" />}
          onPress={(e) => {
            setOrigin({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
            setScanning(true);
          }}
        />
        <PressableScale onPress={() => (left > 0 ? setSos(true) : undefined)} disabled={left <= 0} style={{ alignSelf: 'center', marginTop: 14, padding: 6 }}>
          <Muted size={12.5} style={{ textDecorationLine: left > 0 ? 'underline' : 'none' }}>
            {left > 0 ? `Déblocage d’urgence · ${left} restant${left > 1 ? 's' : ''}` : 'Plus de déblocage d’urgence ce mois-ci'}
          </Muted>
        </PressableScale>
      </Animated.View>

      <ScanSheet visible={scanning} purpose="unlock" onClose={() => setScanning(false)} onTag={(uid) => unlock('socle', uid)} />

      <Sheet visible={sos} onClose={() => setSos(false)}>
        <Label>Urgence</Label>
        <Text f="semibold" size={22} style={{ marginTop: 10 }}>
          Débloquer sans le Socle ?
        </Text>
        <Muted size={14} style={{ marginTop: 8, lineHeight: 20 }}>
          {`Il t’en restera ${left - 1} ce mois-ci. La session ne comptera pas dans ta série.`}
        </Muted>
        <View style={{ marginTop: 22, gap: 6 }}>
          <HoldButton label="Maintiens pour débloquer" onConfirm={() => unlock('sos')} />
          <PressableScale onPress={() => setSos(false)} style={{ alignSelf: 'center', padding: 10 }}>
            <Muted size={14}>Je reste concentré</Muted>
          </PressableScale>
        </View>
      </Sheet>

      {shield ? <SimulatedShield app={shield} elapsed={elapsed} mode={session?.modeName ?? ''} onClose={() => setShield(null)} /> : null}
    </Page>
  );
}

/** Expo Go only: shows what the native shield looks like when a paused app is opened. */
function SimulatedShield({ app, elapsed, mode, onClose }: { app: InstalledApp; elapsed: number; mode: string; onClose: () => void }) {
  return (
    <Animated.View
      entering={enter(0)}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <AppIcon label={app.label} icon={app.icon} size={80} />
      <Text f="semibold" size={26} color="#F4F4F2" style={{ marginTop: 28, textAlign: 'center' }}>
        {app.label} est en pause
      </Text>
      <Muted size={15} style={{ marginTop: 10 }}>
        Tu es concentré depuis
      </Muted>
      <Text f="mono" size={32} color="#F4F4F2" style={{ marginTop: 4, letterSpacing: -1.3 }}>
        {clock(elapsed)}
      </Text>
      <Cta style={{ marginTop: 40, alignSelf: 'stretch' }} label="Revenir au calme" onPress={onClose} />
      <Label style={{ position: 'absolute', bottom: 40 }} color="#55555A">
        Socle · mode {mode} · simulation
      </Label>
    </Animated.View>
  );
}
