import { PlusIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { enter, PressableScale } from '@/components/motion';
import { Page } from '@/components/Page';
import { Puck } from '@/components/Puck';
import { Orb } from '@/components/Rings';
import { Sheet } from '@/components/Sheet';
import { PairFlow, SettingRow, Toggle } from '@/components/SocleSetup';
import { Cta, Label, Muted, Pill, Text, Title } from '@/components/ui';
import { blocker, isSimulated } from '@/lib/blocker';
import { removeSocle, settings, socles, sosLeft, SOS_PER_MONTH, type Socle } from '@/lib/data';
import { ago, plural } from '@/lib/format';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/tone';

export default function Socles() {
  const p = usePalette();
  const list = useStore(socles);
  const s = useStore(settings);
  const [pairing, setPairing] = useState(false);
  const [removing, setRemoving] = useState<Socle | null>(null);
  const blockerOn = blocker.isEnabled();
  const nfc = blocker.nfcStatus();

  return (
    <Page>
      <Animated.View entering={enter(0)}>
        <Muted f="medium">{list.length ? plural(list.length, 'associé', 'associés') : 'Aucun associé'}</Muted>
        <Title style={{ marginTop: 6 }}>Socles</Title>
      </Animated.View>

      <Animated.View entering={enter(1)} style={{ alignItems: 'center', marginVertical: 26 }}>
        <Orb size={150} />
      </Animated.View>

      <Animated.View entering={enter(2)}>
        {list.map((socle) => (
          <PressableScale
            key={socle.uid}
            onLongPress={() => setRemoving(socle)}
            onPress={() => setRemoving(socle)}
            scaleTo={0.985}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: p.line }}>
            <View style={{ width: 40, height: 40 }}>
              <Puck size={40} led={false} />
            </View>
            <View style={{ flex: 1 }}>
              <Text f="medium" size={15}>
                {socle.name}
              </Text>
              <Text f="mono" size={10.5} color={p.muted} style={{ marginTop: 2 }}>
                {socle.uid}
              </Text>
            </View>
            <Muted size={12}>{socle.lastUsedAt ? ago(socle.lastUsedAt) : 'jamais utilisé'}</Muted>
          </PressableScale>
        ))}
        <Cta
          variant="ghost"
          style={{ marginTop: list.length ? 12 : 0 }}
          label="Associer un Socle"
          icon={<PlusIcon size={18} color={p.fg} />}
          onPress={() => setPairing(true)}
          haptics="tap"
        />
        <Muted size={12.5} style={{ marginTop: 10, textAlign: 'center', lineHeight: 18 }}>
          {nfc === 'enabled'
            ? 'Autocollant NFC, carte de transport, badge : toute puce avec un identifiant fixe marche.'
            : nfc === 'disabled'
              ? 'Le NFC est coupé sur ce téléphone.'
              : "Ce téléphone (ou Expo Go) ne lit pas le NFC. Utilise le Socle virtuel."}
        </Muted>
      </Animated.View>

      <Animated.View entering={enter(3)} style={{ marginTop: 34 }}>
        <Label style={{ marginBottom: 6 }}>Réglages</Label>
        <SettingRow
          title="Socle virtuel"
          detail="Un bouton dans la feuille de scan remplace la puce. Pour tester sans matériel."
          right={<Toggle label="Socle virtuel" value={s.demo} onChange={(demo) => settings.set((v) => ({ ...v, demo }))} />}
        />
        <SettingRow
          title="Service de blocage"
          detail={isSimulated ? 'Simulation (Expo Go) : rien n’est vraiment bloqué.' : blockerOn ? 'Actif. Les apps de ton mode sont coupées pendant une session.' : 'Inactif. Active « Socle » dans Accessibilité.'}
          right={
            isSimulated ? null : blockerOn ? (
              <Pill solid>Actif</Pill>
            ) : (
              <PressableScale onPress={() => blocker.openSettings()} hapticOnPress="tap" style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: p.fg }}>
                <Text f="medium" size={13} color={p.bg}>
                  Activer
                </Text>
              </PressableScale>
            )
          }
        />
        <SettingRow
          title="Déblocages d'urgence"
          detail="Remis à zéro chaque mois."
          right={
            <Text f="mono" size={14}>
              {sosLeft(s)}/{SOS_PER_MONTH}
            </Text>
          }
        />
        <SettingRow
          title="Revoir l’introduction"
          detail="Rejoue l’histoire du premier lancement. Tes Socles et tes modes restent."
          right={
            <PressableScale
              onPress={() => settings.set((v) => ({ ...v, onboarded: false }))}
              hapticOnPress="tap"
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: p.card }}>
              <Text f="medium" size={13}>
                Revoir
              </Text>
            </PressableScale>
          }
        />
        <SettingRow
          title="Objectif de session"
          detail="La barre de progression pendant le verrouillage."
          right={
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[45, 90, 120].map((m) => (
                <PressableScale
                  key={m}
                  hapticOnPress="tap"
                  onPress={() => settings.set((v) => ({ ...v, goalMin: m }))}
                  style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99, backgroundColor: s.goalMin === m ? p.fg : p.card }}>
                  <Text f="mono" size={11.5} color={s.goalMin === m ? p.bg : p.fg}>
                    {m < 60 ? `${m}m` : `${m / 60}h${m % 60 ? m % 60 : ''}`}
                  </Text>
                </PressableScale>
              ))}
            </View>
          }
        />
      </Animated.View>

      <PairFlow visible={pairing} onClose={() => setPairing(false)} />

      <Sheet visible={removing != null} onClose={() => setRemoving(null)}>
        <Label>{removing?.uid}</Label>
        <Text f="semibold" size={22} style={{ marginTop: 10 }}>
          Retirer « {removing?.name} » ?
        </Text>
        <Muted size={14} style={{ marginTop: 8, lineHeight: 20 }}>
          Cette puce ne pourra plus verrouiller ni débloquer. Tu pourras l’associer à nouveau.
        </Muted>
        <Cta
          style={{ marginTop: 22 }}
          label="Retirer ce Socle"
          onPress={() => {
            if (removing) removeSocle(removing.uid);
            setRemoving(null);
          }}
        />
      </Sheet>
    </Page>
  );
}
