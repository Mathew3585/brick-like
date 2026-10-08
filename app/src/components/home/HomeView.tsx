import { router } from 'expo-router';
import { CaretRightIcon, LockIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { installedApps, installedOnly } from '@/lib/apps';
import { useNow } from '@/lib/clock';
import { blocker } from '@/lib/blocker';
import { history, modes, settings, socles, startSession } from '@/lib/data';
import { duration, longDate, plural } from '@/lib/format';
import { focusBetween, startOfDay, streak } from '@/lib/stats';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/tone';
import { ink } from '@/theme';
import { eclipse } from '../Eclipse';
import { enter, haptic, PressableScale } from '../motion';
import { Page } from '../Page';
import { Orb } from '../Rings';
import { ScanSheet } from '../ScanSheet';
import { Sheet } from '../Sheet';
import { Bezel, Chip, Cta, Label, Muted, Pill, Stack, Text, Title } from '../ui';

type Origin = { x: number; y: number };

export function HomeView() {
  const p = usePalette();
  const allModes = useStore(modes);
  const s = useStore(settings);
  const paired = useStore(socles);
  const apps = useStore(installedApps);
  const past = useStore(history);
  const [scanning, setScanning] = useState(false);
  const [missing, setMissing] = useState<'blocker' | 'socle' | null>(null);
  const [origin, setOrigin] = useState<Origin | undefined>();

  const mode = allModes.find((m) => m.id === s.lastModeId) ?? allModes[0];
  const modeApps = mode ? installedOnly(mode.apps, apps) : [];
  const now = useNow(60_000);
  const today = focusBetween(past, startOfDay(now), now);
  const days = streak(past);
  const blockerOn = blocker.isEnabled();
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
      void eclipse(ink, () => startSession(mode, uid), origin);
    }, 260);
  };

  return (
    <Page scroll={false}>
      <Animated.View entering={enter(0)}>
        <Muted f="medium" size={13}>
          {longDate()}
        </Muted>
        <Title style={{ marginTop: 6 }}>{'Prêt à te\nconcentrer ?'}</Title>
      </Animated.View>

      <Animated.View entering={enter(1)} style={{ marginTop: 22, marginHorizontal: -22 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingHorizontal: 22 }}>
          {allModes.map((m) => (
            <Chip key={m.id} label={m.name} selected={m.id === mode?.id} onPress={() => settings.set((v) => ({ ...v, lastModeId: m.id }))} />
          ))}
        </ScrollView>
      </Animated.View>

      {mode ? (
        <Animated.View entering={enter(2)}>
          <PressableScale onPress={() => router.push(`/mode/${mode.id}`)} scaleTo={0.985} accessibilityLabel={`Modifier le mode ${mode.name}`}>
            <Bezel style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text f="semibold" size={20}>
                    {mode.name}
                  </Text>
                  <Muted style={{ marginTop: 2 }}>{modeApps.length ? `${plural(modeApps.length, 'app', 'apps')} en pause pendant la session` : 'Aucune app choisie'}</Muted>
                </View>
                <CaretRightIcon size={16} color={p.muted} />
              </View>
              {modeApps.length ? (
                <View style={{ marginTop: 14 }}>
                  <Stack apps={modeApps} />
                </View>
              ) : null}
            </Bezel>
          </PressableScale>
        </Animated.View>
      ) : null}

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 150 }}>
        <Orb />
      </View>

      <Animated.View entering={enter(3)} style={{ gap: 10 }}>
        {!blockerOn ? (
          <PressableScale onPress={() => setMissing('blocker')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Pill solid>À faire</Pill>
            <Muted>Active le blocage pour que ça marche</Muted>
          </PressableScale>
        ) : null}
        <Cta
          label="Verrouiller sur le Socle"
          icon={<LockIcon size={19} color={p.bg} />}
          disabled={!mode}
          onPress={(e) => lock({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Tile value={duration(today)} label="Focus aujourd'hui" />
          <Tile value={plural(days, 'jour', 'jours')} label="Série en cours" />
        </View>
      </Animated.View>

      <ScanSheet visible={scanning} purpose="lock" onClose={() => setScanning(false)} onTag={onTag} />

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

function Tile({ value, label }: { value: string; label: string }) {
  const p = usePalette();
  return (
    <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 20, backgroundColor: p.card }}>
      <Text f="semibold" size={18} style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Muted size={11.5} style={{ marginTop: 2 }}>
        {label}
      </Muted>
    </View>
  );
}
