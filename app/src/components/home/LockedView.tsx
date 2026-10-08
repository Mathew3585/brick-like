import { WaveformIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { installedApps, installedOnly } from '@/lib/apps';
import { useNow } from '@/lib/clock';
import { blocker, isSimulated, type InstalledApp } from '@/lib/blocker';
import { active, endSession, settings, sosLeft } from '@/lib/data';
import { clock, duration, plural } from '@/lib/format';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/tone';
import { paper } from '@/theme';
import { eclipse } from '../Eclipse';
import { HoldButton } from '../HoldButton';
import { enter, haptic, PressableScale, settle } from '../motion';
import { Page } from '../Page';
import { ScanSheet } from '../ScanSheet';
import { Sheet } from '../Sheet';
import { AppIcon, Cta, Label, Muted, Text } from '../ui';

type Origin = { x: number; y: number };

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
  const progress = useSharedValue(0);

  const elapsed = session ? Math.max(0, Math.floor((now - session.startedAt) / 1000)) : 0;
  const goal = s.goalMin * 60;
  const pct = Math.min(1, elapsed / goal);
  useEffect(() => {
    progress.set(withTiming(pct, settle(900)));
  }, [pct, progress]);
  const bar = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  const paused = session ? installedOnly(session.blocked, apps) : [];
  const left = sosLeft(s);

  const unlock = (how: 'socle' | 'sos', uid?: string) => {
    setScanning(false);
    setSos(false);
    setTimeout(() => {
      haptic.heavy();
      void eclipse(paper, () => endSession(how, uid), origin);
    }, 280);
  };

  return (
    <Page scroll={false} tabBar={false} style={{ justifyContent: 'space-between' }}>
      <Animated.View entering={enter(0)} style={{ marginTop: 26 }}>
        <Label>Verrouillé · {session?.modeName}</Label>
        <Text f="monoLight" size={60} style={{ marginTop: 14, letterSpacing: -3.6, fontVariant: ['tabular-nums'] }}>
          {clock(elapsed)}
        </Text>
        <View style={{ marginTop: 18, height: 2, borderRadius: 2, backgroundColor: p.line, overflow: 'hidden' }}>
          <Animated.View style={[{ height: '100%', backgroundColor: p.fg }, bar]} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }}>
          <Label>Objectif {duration(goal)}</Label>
          <Label>{Math.floor(pct * 100)} %</Label>
        </View>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <Label style={{ marginBottom: 14 }}>{paused.length ? `${plural(paused.length, 'app', 'apps')} en pause` : 'Aucune app en pause'}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
          {paused.slice(0, 8).map((a) => (
            <PressableScale
              key={a.packageName}
              disabled={!isSimulated}
              onPress={() => {
                blocker.simulateAttempt(a.packageName);
                haptic.warn();
                setShield(a);
              }}
              style={{ width: '25%', alignItems: 'center', gap: 7 }}>
              <View style={{ opacity: 0.45 }}>
                <AppIcon label={a.label} icon={a.icon} size={48} />
                <View style={{ position: 'absolute', left: 8, right: 8, top: 23.5, height: 1, backgroundColor: p.fg, transform: [{ rotate: '-35deg' }] }} />
              </View>
              <Muted size={10.5} numberOfLines={1}>
                {a.label}
              </Muted>
            </PressableScale>
          ))}
        </View>
        {paused.length > 8 ? <Muted style={{ marginTop: 12 }}>et {paused.length - 8} autres</Muted> : null}
      </Animated.View>

      <Animated.View entering={enter(2)}>
        <Muted size={14} style={{ textAlign: 'center', marginBottom: 16, lineHeight: 20 }}>
          Pour tout récupérer, repose ton téléphone sur le Socle.
        </Muted>
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
            {left > 0 ? `Déblocage d'urgence · ${left} restant${left > 1 ? 's' : ''}` : "Plus de déblocage d'urgence ce mois-ci"}
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
          {`Il t'en restera ${left - 1} ce mois-ci. La session ne comptera pas dans ta série.`}
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
