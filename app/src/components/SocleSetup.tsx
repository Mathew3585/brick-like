import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { addSocle, socles } from '@/lib/data';
import { usePalette } from '@/lib/tone';
import { font } from '@/theme';
import { haptic, PressableScale, settle } from './motion';
import { ScanSheet } from './ScanSheet';
import { Sheet } from './Sheet';
import { Cta, Label, Muted, Text } from './ui';

const SUGGESTIONS = ['Bureau', 'Table de nuit', 'Entrée', 'Salon'];

/** Scan a tag, then name it. Calls `onDone` once the Socle is saved. */
export function PairFlow({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone?: () => void }) {
  const p = usePalette();
  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState('');

  const close = () => {
    setUid(null);
    onClose();
  };

  return (
    <>
      <ScanSheet
        visible={visible && uid == null}
        purpose="pair"
        onClose={close}
        onTag={(tag) => {
          setName(socles.get().length ? '' : 'Bureau');
          setUid(tag);
        }}
      />
      <Sheet visible={visible && uid != null} onClose={close}>
        <Label>Puce {uid}</Label>
        <Text f="semibold" size={22} style={{ marginTop: 10 }}>
          Où vas-tu la poser ?
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Bureau"
          placeholderTextColor={p.faint}
          maxLength={24}
          autoFocus
          style={{ fontFamily: font.medium, fontSize: 20, color: p.fg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: p.line, marginTop: 12 }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
          {SUGGESTIONS.map((s) => (
            <PressableScale key={s} onPress={() => setName(s)} hapticOnPress="tap" style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: p.line }}>
              <Text size={13}>{s}</Text>
            </PressableScale>
          ))}
        </View>
        <Cta
          style={{ marginTop: 22 }}
          label="Associer ce Socle"
          haptics="tap"
          onPress={() => {
            if (!uid) return;
            addSocle(uid, name);
            haptic.success();
            setUid(null);
            onClose();
            onDone?.();
          }}
        />
      </Sheet>
    </>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const p = usePalette();
  const t = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    t.set(withTiming(value ? 1 : 0, settle(380)));
  }, [value, t]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: t.get() * 20 }] }));
  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hapticOnPress="tap"
      onPress={() => onChange(!value)}
      style={{ width: 50, height: 30, borderRadius: 15, padding: 3, backgroundColor: value ? p.fg : p.card, borderWidth: 1, borderColor: p.line }}>
      <Animated.View style={[{ width: 22, height: 22, borderRadius: 11, backgroundColor: value ? p.bg : p.fg }, knob]} />
    </PressableScale>
  );
}

export function SettingRow({ title, detail, right }: { title: string; detail?: string; right?: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderTopWidth: 1, borderTopColor: p.line }}>
      <View style={{ flex: 1 }}>
        <Text f="medium" size={15}>
          {title}
        </Text>
        {detail ? (
          <Muted size={12.5} style={{ marginTop: 3, lineHeight: 17 }}>
            {detail}
          </Muted>
        ) : null}
      </View>
      {right}
    </View>
  );
}
