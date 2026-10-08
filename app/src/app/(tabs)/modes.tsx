import { router } from 'expo-router';
import { CaretRightIcon, PlusIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { enter, PressableScale } from '@/components/motion';
import { Page } from '@/components/Page';
import { Bezel, Muted, Pill, Stack, Text, Title } from '@/components/ui';
import { installedApps, installedOnly } from '@/lib/apps';
import { modes, settings } from '@/lib/data';
import { plural } from '@/lib/format';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/tone';

export default function Modes() {
  const p = usePalette();
  const list = useStore(modes);
  const apps = useStore(installedApps);
  const { lastModeId } = useStore(settings);

  return (
    <Page>
      <Animated.View entering={enter(0)}>
        <Muted f="medium">{plural(list.length, 'mode', 'modes')}</Muted>
        <Title style={{ marginTop: 6 }}>Modes</Title>
        <Muted size={14} style={{ marginTop: 8, lineHeight: 20 }}>
          Chaque mode a sa liste d’apps à mettre en pause. Tu choisis le mode avant de toucher le Socle.
        </Muted>
      </Animated.View>

      <View style={{ gap: 12, marginTop: 22 }}>
        {list.map((m, i) => {
          const installed = installedOnly(m.apps, apps);
          return (
            <Animated.View key={m.id} entering={enter(i + 1)}>
              <PressableScale onPress={() => router.push(`/mode/${m.id}`)} scaleTo={0.985} accessibilityLabel={`Modifier ${m.name}`}>
                <Bezel>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text f="semibold" size={20}>
                        {m.name}
                      </Text>
                      <Muted style={{ marginTop: 2 }}>{installed.length ? plural(installed.length, 'app en pause', 'apps en pause') : 'Aucune app choisie'}</Muted>
                    </View>
                    {m.id === lastModeId ? <Pill solid>Choisi</Pill> : <CaretRightIcon size={16} color={p.muted} />}
                  </View>
                  {installed.length ? (
                    <View style={{ marginTop: 14 }}>
                      <Stack apps={installed} max={7} />
                    </View>
                  ) : null}
                </Bezel>
              </PressableScale>
            </Animated.View>
          );
        })}

        <Animated.View entering={enter(list.length + 1)}>
          <PressableScale
            onPress={() => router.push('/mode/new')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 18,
              borderRadius: 28,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: p.faint,
            }}>
            <PlusIcon size={16} color={p.muted} />
            <Muted size={14}>Nouveau mode</Muted>
          </PressableScale>
        </Animated.View>
      </View>
    </Page>
  );
}
