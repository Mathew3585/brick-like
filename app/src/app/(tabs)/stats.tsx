import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { enter, settle } from '@/components/motion';
import { Page } from '@/components/Page';
import { AppIcon, Label, Muted, Text, Title } from '@/components/ui';
import { appIndex, installedApps } from '@/lib/apps';
import { useNow } from '@/lib/clock';
import { history } from '@/lib/data';
import { ago, duration, plural } from '@/lib/format';
import { focusBetween, startOfDay, startOfWeek, streak, topAttempts, weekBars, type DayBar } from '@/lib/stats';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/tone';

const CHART = 132;

function Bar({ bar, max, i }: { bar: DayBar; max: number; i: number }) {
  const p = usePalette();
  const h = useSharedValue(0);
  const target = bar.state === 'future' ? 18 : max > 0 ? Math.max(bar.seconds > 0 ? 8 : 4, (bar.seconds / max) * CHART) : 4;
  useEffect(() => {
    h.set(withDelay(120 + i * 60, withTiming(target, settle(900))));
  }, [target, i, h]);
  const style = useAnimatedStyle(() => ({ height: h.get() }));
  const future = bar.state === 'future';
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
      <View style={{ height: CHART, width: '100%', justifyContent: 'flex-end' }}>
        <Animated.View
          style={[
            {
              width: '100%',
              borderRadius: 9,
              backgroundColor: future ? 'transparent' : bar.seconds > 0 ? p.fg : p.card,
              borderWidth: future ? 1 : 0,
              borderStyle: 'dashed',
              borderColor: p.faint,
            },
            style,
          ]}
        />
      </View>
      <Text f={bar.state === 'today' ? 'monoMedium' : 'mono'} size={10.5} color={bar.state === 'today' ? p.fg : p.muted}>
        {bar.label}
      </Text>
    </View>
  );
}

export default function Stats() {
  const p = usePalette();
  const past = useStore(history);
  const index = appIndex(useStore(installedApps));
  const now = useNow(60_000);
  const monday = startOfWeek(now);
  const bars = weekBars(past, now);
  const week = bars.reduce((n, b) => n + b.seconds, 0);
  const max = Math.max(...bars.map((b) => b.seconds));
  const sessions = past.filter((s) => s.endedAt >= monday);
  const tried = topAttempts(past, monday).slice(0, 4);
  const triedMax = tried[0]?.[1] ?? 1;
  const today = focusBetween(past, startOfDay(now), now);
  const avg = sessions.length ? Math.floor(sessions.reduce((n, s) => n + (s.endedAt - s.startedAt) / 1000, 0) / sessions.length) : 0;
  const recent = [...past].reverse().slice(0, 5);

  return (
    <Page>
      <Animated.View entering={enter(0)}>
        <Muted f="medium">Cette semaine</Muted>
        <Title style={{ marginTop: 6, fontVariant: ['tabular-nums'] }}>{duration(week)}</Title>
        <Muted size={14} style={{ marginTop: 4 }}>
          de focus · {plural(sessions.length, 'session', 'sessions')}
        </Muted>
      </Animated.View>

      <Animated.View entering={enter(1)} style={{ flexDirection: 'row', gap: 8, marginTop: 26 }}>
        {bars.map((b, i) => (
          <Bar key={i} bar={b} max={max} i={i} />
        ))}
      </Animated.View>

      <Animated.View entering={enter(2)} style={{ flexDirection: 'row', gap: 8, marginTop: 26 }}>
        {[
          [duration(today), "Aujourd'hui"],
          [plural(streak(past), 'jour', 'jours'), 'Série'],
          [duration(avg), 'Par session'],
        ].map(([v, l]) => (
          <View key={l} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 13, borderRadius: 20, backgroundColor: p.card }}>
            <Text f="semibold" size={16} style={{ fontVariant: ['tabular-nums'] }}>
              {v}
            </Text>
            <Muted size={11} style={{ marginTop: 2 }}>
              {l}
            </Muted>
          </View>
        ))}
      </Animated.View>

      <Animated.View entering={enter(3)} style={{ marginTop: 30 }}>
        <Label>Les plus tentées</Label>
        {tried.length === 0 ? (
          <Muted style={{ marginTop: 12 }}>Aucune tentative cette semaine. Propre.</Muted>
        ) : (
          tried.map(([pkg, n]) => {
            const app = index.get(pkg);
            return (
              <View key={pkg} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
                <AppIcon label={app?.label ?? pkg} icon={app?.icon} size={30} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text size={13}>{app?.label ?? pkg}</Text>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: p.card, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${(n / triedMax) * 100}%`, backgroundColor: p.fg }} />
                  </View>
                </View>
                <Text f="mono" size={12} style={{ minWidth: 24, textAlign: 'right' }}>
                  {n}
                </Text>
              </View>
            );
          })
        )}
      </Animated.View>

      <Animated.View entering={enter(4)} style={{ marginTop: 30 }}>
        <Label>Dernières sessions</Label>
        {recent.length === 0 ? (
          <Muted style={{ marginTop: 12 }}>Ta première session apparaîtra ici.</Muted>
        ) : (
          recent.map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: p.line }}>
              <View style={{ flex: 1 }}>
                <Text f="medium" size={14}>
                  {s.modeName}
                </Text>
                <Muted size={12}>
                  {ago(s.endedAt)}
                  {s.how === 'sos' ? ' · urgence' : ''}
                </Muted>
              </View>
              <Text f="mono" size={13}>
                {duration(Math.floor((s.endedAt - s.startedAt) / 1000))}
              </Text>
            </View>
          ))
        )}
      </Animated.View>
    </Page>
  );
}
