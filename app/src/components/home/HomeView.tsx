import { router } from 'expo-router';
import { CaretDownIcon, CheckIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { installedApps, installedOnly } from '@/lib/apps';
import { blocker } from '@/lib/blocker';
import { modes, settings, socles, startSession } from '@/lib/data';
import { longDate, plural } from '@/lib/format';
import { DURATIONS, goalLabel } from '@/lib/goal';
import { usePermissions } from '@/lib/permissions';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/tone';
import { ink } from '@/theme';
import { eclipse } from '../Eclipse';
import { enter, haptic, PressableScale } from '../motion';
import { Page } from '../Page';
import { Orb } from '../Rings';
import { ScanSheet } from '../ScanSheet';
import { Sheet } from '../Sheet';
import { Cta, Label, Muted, Text } from '../ui';
import { play } from '@/lib/sound';

type Origin = { x: number; y: number };

/** Monolithe: the date, the Socle, the mode. The puck itself starts the session. */
export function HomeView() {
  const p = usePalette();
  const allModes = useStore(modes);
  const s = useStore(settings);
  const paired = useStore(socles);
  const apps = useStore(installedApps);
  const [scanning, setScanning] = useState(false);
  const [picking, setPicking] = useState(false);
  const [timing, setTiming] = useState(false);
  const [missing, setMissing] = useState<'blocker' | 'socle' | null>(null);
  const [origin, setOrigin] = useState<Origin | undefined>();

  const mode = allModes.find((m) => m.id === s.lastModeId) ?? allModes[0];
  const { blocker: blockerOn } = usePermissions();
  const hasSocle = paired.length > 0 || s.demo;

  const lock = (at: Origin) => {
    setOrigin(at);
    if (!blocker.isEnabled()) return setMissing('blocker');
    if (!hasSocle) return setMissing('socle');
    setScanning(true);
  };

  const onTag = (uid: string) => {
    setScanning(false);
    if (!mode) return;
    setTimeout(() => {
      haptic.heavy();
      play('lock');
      void eclipse(ink, () => startSession(mode, uid), origin);
    }, 260);
  };

  return (
    <Page scroll={false} style={{ alignItems: 'center' }}>
      <Animated.View entering={enter(0)} style={{ alignSelf: 'stretch' }}>
        <Label>{longDate()}</Label>
      </Animated.View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View entering={enter(1)}>
          <Orb size={290} label="Toucher le Socle pour verrouiller" onPress={(e) => lock({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })} />
        </Animated.View>
      </View>

      <Animated.View entering={enter(2)} style={{ alignItems: 'center', gap: 10, paddingBottom: 18 }}>
        {mode ? (
          <PressableScale
            onPress={() => setPicking(true)}
            hapticOnPress="tap"
            accessibilityLabel={`Mode ${mode.name}, changer`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text f="semibold" size={28}>
              {mode.name}
            </Text>
            <CaretDownIcon size={16} color={p.muted} />
          </PressableScale>
        ) : null}
        <PressableScale
          onPress={() => setTiming(true)}
          hapticOnPress="tap"
          accessibilityLabel={`Durée ${goalLabel(s.goalMin)}, changer`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: p.line, marginTop: -4 }}>
          <Text f="mono" size={13}>
            {goalLabel(s.goalMin)}
          </Text>
          <CaretDownIcon size={12} color={p.muted} />
        </PressableScale>
        {blockerOn ? (
          <Muted size={14}>Touche le Socle</Muted>
        ) : (
          <PressableScale onPress={() => setMissing('blocker')} style={{ padding: 4 }}>
            <Muted size={14} style={{ textDecorationLine: 'underline' }}>
              Active le blocage d’abord
            </Muted>
          </PressableScale>
        )}
      </Animated.View>

      <ScanSheet visible={scanning} purpose="lock" onClose={() => setScanning(false)} onTag={onTag} />

      <Sheet visible={picking} onClose={() => setPicking(false)}>
        <Label>Mode de la session</Label>
        <View style={{ marginTop: 14 }}>
          {allModes.map((m) => {
            const count = installedOnly(m.apps, apps).length;
            const on = m.id === mode?.id;
            return (
              <PressableScale
                key={m.id}
                hapticOnPress="tap"
                scaleTo={0.98}
                onPress={() => {
                  settings.set((v) => ({ ...v, lastModeId: m.id }));
                  setPicking(false);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: p.line }}>
                <View style={{ flex: 1 }}>
                  <Text f="semibold" size={20}>
                    {m.name}
                  </Text>
                  <Muted size={12.5} style={{ marginTop: 2 }}>
                    {count ? plural(count, 'app en pause', 'apps en pause') : 'Aucune app choisie'}
                  </Muted>
                </View>
                {on ? (
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: p.fg, alignItems: 'center', justifyContent: 'center' }}>
                    <CheckIcon size={14} color={p.bg} weight="bold" />
                  </View>
                ) : null}
              </PressableScale>
            );
          })}
        </View>
        <Cta
          variant="ghost"
          style={{ marginTop: 14 }}
          label="Gérer les modes"
          haptics="tap"
          onPress={() => {
            setPicking(false);
            router.navigate('/modes');
          }}
        />
      </Sheet>

      <Sheet visible={timing} onClose={() => setTiming(false)}>
        <Label>Durée de la session</Label>
        <Text f="semibold" size={22} style={{ marginTop: 10 }}>
          Combien de temps ?
        </Text>
        <Muted size={14} style={{ marginTop: 8, lineHeight: 20 }}>
          À la fin, tes apps restent en pause. Une notification te dit de revenir au Socle.
        </Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
          {DURATIONS.map((m) => {
            const on = s.goalMin === m;
            return (
              <PressableScale
                key={m}
                hapticOnPress="tap"
                scaleTo={0.94}
                onPress={() => {
                  settings.set((v) => ({ ...v, goalMin: m }));
                  setTiming(false);
                }}
                style={{
                  flexGrow: 1,
                  minWidth: '30%',
                  alignItems: 'center',
                  paddingVertical: 16,
                  borderRadius: 20,
                  backgroundColor: on ? p.fg : p.card,
                }}>
                <Text f="mono" size={15} color={on ? p.bg : p.fg}>
                  {goalLabel(m)}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </Sheet>

      <Sheet visible={missing === 'blocker'} onClose={() => setMissing(null)}>
        <Label>Une seule fois</Label>
        <Text f="semibold" size={22} style={{ marginTop: 10 }}>
          Active le blocage
        </Text>
        <Muted size={14} style={{ marginTop: 8, lineHeight: 20 }}>
          Dans Accessibilité, ouvre « Socle » et active-le. Socle voit seulement quelle app s’ouvre, rien d’autre.
        </Muted>
        <Cta
          style={{ marginTop: 22 }}
          label="Ouvrir les réglages"
          onPress={() => {
            setMissing(null);
            blocker.openSettings();
          }}
        />
      </Sheet>

      <Sheet visible={missing === 'socle'} onClose={() => setMissing(null)}>
        <Label>Pas encore de Socle</Label>
        <Text f="semibold" size={22} style={{ marginTop: 10 }}>
          Associe une puce d’abord
        </Text>
        <Muted size={14} style={{ marginTop: 8, lineHeight: 20 }}>
          N’importe quel badge NFC marche : autocollant, carte de transport, badge d’immeuble. Pas de puce sous la main ? Le Socle virtuel permet de tester.
        </Muted>
        <View style={{ gap: 10, marginTop: 22 }}>
          <Cta
            label="Associer une puce"
            onPress={() => {
              setMissing(null);
              router.navigate('/socles');
            }}
          />
          <Cta
            variant="ghost"
            label="Utiliser le Socle virtuel"
            onPress={() => {
              settings.set((v) => ({ ...v, demo: true }));
              setMissing(null);
              setTimeout(() => setScanning(true), 420);
            }}
          />
        </View>
      </Sheet>
    </Page>
  );
}
