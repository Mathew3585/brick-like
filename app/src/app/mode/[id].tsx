import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftIcon, CheckIcon, MagnifyingGlassIcon, TrashIcon } from 'phosphor-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic, PressableScale } from '@/components/motion';
import { Sheet } from '@/components/Sheet';
import { AppIcon, Cta, Label, Muted, Text } from '@/components/ui';
import { installedApps } from '@/lib/apps';
import type { InstalledApp } from '@/lib/blocker';
import { deleteMode, modes, newModeId, saveMode, settings } from '@/lib/data';
import { plural } from '@/lib/format';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/tone';
import { font, type Palette } from '@/theme';

const AppRow = memo(function AppRow({ app, on, onToggle, p }: { app: InstalledApp; on: boolean; onToggle: (pkg: string) => void; p: Palette }) {
  return (
    <PressableScale
      onPress={() => onToggle(app.packageName)}
      scaleTo={0.985}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}>
      <AppIcon label={app.label} icon={app.icon} size={40} />
      <Text size={15} style={{ flex: 1 }} numberOfLines={1}>
        {app.label}
      </Text>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: on ? p.fg : 'transparent',
          borderWidth: on ? 0 : 1.5,
          borderColor: p.faint,
        }}>
        {on ? <CheckIcon size={14} color={p.bg} weight="bold" /> : null}
      </View>
    </PressableScale>
  );
});

export default function ModeEditor() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const all = useStore(modes);
  const apps = useStore(installedApps);
  const existing = all.find((m) => m.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [picked, setPicked] = useState<Set<string>>(() => new Set(existing?.apps ?? []));
  const [query, setQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggle = useCallback((pkg: string) => {
    haptic.tap();
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(pkg)) next.delete(pkg);
      else next.add(pkg);
      return next;
    });
  }, []);

  // Picked apps first, then alphabetical; the search filters both.
  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (apps ?? []).filter((a) => !q || a.label.toLowerCase().includes(q));
    return [...list.filter((a) => picked.has(a.packageName)), ...list.filter((a) => !picked.has(a.packageName))];
    // Order is computed when the screen opens or the search changes, not on every tap (rows would jump).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps, query]);

  const count = (apps ?? []).filter((a) => picked.has(a.packageName)).length;

  const save = () => {
    const mode = { id: existing?.id ?? newModeId(), name: name.trim() || 'Sans nom', apps: [...picked] };
    saveMode(mode);
    if (!existing) settings.set((s) => ({ ...s, lastModeId: mode.id }));
    haptic.success();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <FlatList
        data={data}
        keyExtractor={(a) => a.packageName}
        renderItem={({ item }) => <AppRow app={item} on={picked.has(item.packageName)} onToggle={toggle} p={p} />}
        extraData={picked}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 22, paddingBottom: insets.bottom + 120 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <PressableScale
                onPress={() => router.back()}
                accessibilityLabel="Retour"
                style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: p.card, alignItems: 'center', justifyContent: 'center' }}>
                <ArrowLeftIcon size={18} color={p.fg} />
              </PressableScale>
              {existing && all.length > 1 ? (
                <PressableScale
                  onPress={() => setConfirmDelete(true)}
                  accessibilityLabel="Supprimer le mode"
                  style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: p.card, alignItems: 'center', justifyContent: 'center' }}>
                  <TrashIcon size={18} color={p.fg} weight="light" />
                </PressableScale>
              ) : null}
            </View>
            <Label style={{ marginTop: 24 }}>{existing ? 'Modifier le mode' : 'Nouveau mode'}</Label>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nom du mode"
              placeholderTextColor={p.faint}
              maxLength={24}
              style={{ fontFamily: font.semibold, fontSize: 34, letterSpacing: -1.5, color: p.fg, paddingVertical: 6, marginTop: 4 }}
            />
            <Muted size={14}>{count ? `${plural(count, 'app sera mise', 'apps seront mises')} en pause.` : 'Choisis les apps à mettre en pause.'}</Muted>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginTop: 18,
                paddingHorizontal: 16,
                height: 48,
                borderRadius: 24,
                backgroundColor: p.card,
              }}>
              <MagnifyingGlassIcon size={17} color={p.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher une app"
                placeholderTextColor={p.muted}
                style={{ flex: 1, fontFamily: font.regular, fontSize: 15, color: p.fg }}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          apps == null ? (
            <ActivityIndicator color={p.fg} style={{ marginTop: 40 }} />
          ) : (
            <Muted style={{ marginTop: 30, textAlign: 'center' }}>Aucune app trouvée.</Muted>
          )
        }
      />
      <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 18 }}>
        <Cta label="Enregistrer" icon={<CheckIcon size={18} color={p.bg} />} onPress={save} haptics="tap" />
      </View>

      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <Label>Supprimer</Label>
        <Text f="semibold" size={22} style={{ marginTop: 10 }}>
          Supprimer « {existing?.name} » ?
        </Text>
        <Muted size={14} style={{ marginTop: 8 }}>
          L’historique des sessions reste intact.
        </Muted>
        <Cta
          style={{ marginTop: 22 }}
          label="Supprimer le mode"
          onPress={() => {
            if (!existing) return;
            setConfirmDelete(false);
            deleteMode(existing.id);
            settings.set((s) => (s.lastModeId === existing.id ? { ...s, lastModeId: modes.get()[0]?.id ?? '' } : s));
            router.back();
          }}
        />
      </Sheet>
    </View>
  );
}
