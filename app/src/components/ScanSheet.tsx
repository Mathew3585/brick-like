import { CheckIcon, WarningIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { blocker } from '@/lib/blocker';
import { isKnownSocle, settings, socleName, VIRTUAL_UID } from '@/lib/data';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/tone';
import { haptic, settle } from './motion';
import { Puck } from './Puck';
import { Radar } from './Rings';
import { Sheet } from './Sheet';
import { Cta, Label, Muted, Text } from './ui';

const PUCK = 104;

export type ScanPurpose = 'lock' | 'unlock' | 'pair';
type Status = 'listening' | 'done' | 'unknown' | 'nfc-off' | 'no-nfc';

const COPY: Record<ScanPurpose, { label: string; title: string }> = {
  lock: { label: 'Début de session', title: 'Approche le Socle' },
  unlock: { label: 'Fin de session', title: 'Repose sur le Socle' },
  pair: { label: 'Nouveau Socle', title: 'Touche la puce' },
};

/**
 * Listens for a tag. For lock/unlock only a paired Socle (or the virtual one, if enabled) counts;
 * for pairing any tag is accepted and handed back.
 */
export function ScanSheet({
  visible,
  purpose,
  onClose,
  onTag,
}: {
  visible: boolean;
  purpose: ScanPurpose;
  onClose: () => void;
  onTag: (uid: string) => void;
}) {
  const p = usePalette();
  const { demo } = useStore(settings);
  const [status, setStatus] = useState<Status>('listening');
  const [detail, setDetail] = useState('');
  const [attempt, setAttempt] = useState(0);
  const shake = useSharedValue(0);
  const pop = useSharedValue(1);
  const doneRef = useRef(false);

  const accept = (uid: string) => {
    doneRef.current = true;
    setStatus('done');
    setDetail(purpose === 'pair' ? uid : socleName(uid));
    haptic.success();
    pop.set(withSequence(withTiming(1.08, settle(220)), withTiming(1, settle(500))));
    setTimeout(() => onTag(uid), 750);
  };

  // Each open (or retry) starts a fresh read.
  useEffect(() => {
    if (!visible) return;
    doneRef.current = false;
    pop.set(1);
    const nfc = blocker.nfcStatus();
    // Reset for this open: the sheet is reused between scans.
    if (nfc !== 'enabled') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus(nfc === 'disabled' ? 'nfc-off' : 'no-nfc');
      return;
    }
    setStatus('listening');
    let alive = true;
    blocker
      .scanTag()
      .then((uid) => {
        if (!alive || doneRef.current) return;
        if (purpose === 'pair' || isKnownSocle(uid)) {
          accept(uid);
        } else {
          setStatus('unknown');
          setDetail(uid);
          haptic.warn();
          shake.set(withSequence(...[-8, 8, -6, 6, 0].map((x) => withTiming(x, { duration: 60 }))));
          setTimeout(() => alive && setAttempt((n) => n + 1), 1600);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      void blocker.cancelScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, attempt]);

  // Coming back from the NFC settings: try again.
  useEffect(() => {
    if (!visible || status !== 'nfc-off') return;
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setAttempt((n) => n + 1));
    return () => sub.remove();
  }, [visible, status]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const coreStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  const copy = COPY[purpose];
  const title = {
    listening: copy.title,
    done: purpose === 'pair' ? 'Puce lue' : 'Socle détecté',
    unknown: "Ce n'est pas ton Socle",
    'nfc-off': 'Le NFC est coupé',
    'no-nfc': 'Pas de NFC ici',
  }[status];
  const sub = {
    listening: 'Le haut du téléphone contre la puce, une seconde.',
    done: detail,
    unknown: `Badge ${detail}. Seuls tes Socles associés comptent.`,
    'nfc-off': 'Active-le dans les réglages, puis reviens ici.',
    'no-nfc': demo || purpose === 'pair' ? 'Ce téléphone ne lit pas les puces. Utilise le Socle virtuel pour tester.' : 'Ce téléphone ne lit pas les puces. Active le Socle virtuel dans l’onglet Socles.',
  }[status];
  const showVirtual = purpose !== 'pair' && demo && status !== 'done';

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ alignItems: 'center' }}>
        <Label>{copy.label}</Label>
        <Animated.View style={[{ marginTop: 10 }, shakeStyle]}>
          <Radar running={status === 'listening'} size={190}>
            <Animated.View style={[{ width: PUCK, height: PUCK * 1.12, marginTop: PUCK * 0.12 }, coreStyle]}>
              <Puck size={PUCK} led={status === 'done' ? 'on' : status === 'listening'} />
              {status !== 'listening' ? (
                <View
                  style={{
                    position: 'absolute',
                    right: -6,
                    top: PUCK - 30,
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: p.fg,
                    borderWidth: 3,
                    borderColor: p.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {status === 'done' ? <CheckIcon size={16} color={p.bg} weight="bold" /> : <WarningIcon size={15} color={p.bg} weight="bold" />}
                </View>
              ) : null}
            </Animated.View>
          </Radar>
        </Animated.View>
        <Text f="semibold" size={22} style={{ marginTop: 14, textAlign: 'center' }}>
          {title}
        </Text>
        <Muted size={14} style={{ textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: 8 }}>
          {sub}
        </Muted>
      </View>
      <View style={{ gap: 10, marginTop: 22 }}>
        {status === 'nfc-off' ? <Cta label="Ouvrir les réglages NFC" onPress={() => blocker.openNfcSettings()} /> : null}
        {showVirtual ? <Cta variant="ghost" label="Toucher le Socle virtuel" onPress={() => accept(VIRTUAL_UID)} haptics="tap" /> : null}
      </View>
    </Sheet>
  );
}
