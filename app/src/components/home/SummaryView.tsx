import { ArrowUpRightIcon, CheckIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { appIndex, installedApps } from '@/lib/apps';
import { useNow } from '@/lib/clock';
import { history, lastSummary } from '@/lib/data';
import { duration } from '@/lib/format';
import { goalLabel } from '@/lib/goal';
import { focusBetween, startOfDay } from '@/lib/stats';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/tone';
import { enter } from '../motion';
import { Page } from '../Page';
import { Cta, Label, Text } from '../ui';

export function SummaryView() {
  const p = usePalette();
  const record = useStore(lastSummary);
  const past = useStore(history);
  const index = appIndex(useStore(installedApps));
  const now = useNow(60_000);

  if (!record) return null;
  const seconds = Math.floor((record.endedAt - record.startedAt) / 1000);
  const attempts = Object.entries(record.attempts).sort((a, b) => b[1] - a[1]);
  const total = attempts.reduce((n, [, v]) => n + v, 0);
  const today = focusBetween(past, startOfDay(now), now);
  const top = attempts[0];
  const muted = Object.entries(record.muted ?? {}).sort((a, b) => b[1] - a[1]);
  const mutedTotal = muted.reduce((n, [, v]) => n + v, 0);
  const label = (pkg: string) => index.get(pkg)?.label ?? pkg;

  const rows: [string, string][] = [
    ['Mode', record.modeName],
    ['Objectif', record.goalMin ? `${goalLabel(record.goalMin)} · ${seconds >= record.goalMin * 60 ? 'atteint' : 'pas atteint'}` : 'Libre'],
    ['Ouvertures bloquées', String(total)],
    ...(top ? ([['La plus tentée', `${label(top[0])} · ${top[1]}`]] as [string, string][]) : []),
    ['Notifications coupées', mutedTotal ? `${mutedTotal} · ${muted.slice(0, 2).map(([k, v]) => `${label(k)} ${v}`).join(', ')}` : '0'],
    ['Déverrouillage', record.how === 'socle' ? 'Au Socle' : "Urgence"],
    ["Focus aujourd'hui", duration(today)],
  ];

  return (
    <Page scroll={false} tabBar={false} style={{ justifyContent: 'space-between' }}>
      <View>
        <Animated.View entering={enter(0)} style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: p.fg, alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
          <CheckIcon size={28} color={p.bg} weight="bold" />
        </Animated.View>
        <Animated.View entering={enter(1)}>
          <Label style={{ marginTop: 26 }}>{record.how === 'socle' ? 'Session terminée' : 'Session interrompue'}</Label>
          <Text f="semibold" size={52} style={{ marginTop: 12, fontVariant: ['tabular-nums'] }}>
            {duration(seconds)}
          </Text>
        </Animated.View>
        <Animated.View entering={enter(2)} style={{ marginTop: 28 }}>
          {rows.map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 1, borderTopColor: p.line }}>
              <Text size={14} color={p.muted}>
                {k}
              </Text>
              <Text f="medium" size={14} style={{ fontVariant: ['tabular-nums'] }}>
                {v}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>
      <Animated.View entering={enter(3)}>
        <Cta label="Terminé" icon={<ArrowUpRightIcon size={18} color={p.bg} />} onPress={() => lastSummary.set(null)} />
      </Animated.View>
    </Page>
  );
}
