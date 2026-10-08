import type { ReactNode } from 'react';
import { Image, Text as RNText, View, type GestureResponderEvent, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import { usePalette } from '@/lib/tone';
import { font, radius, type Palette } from '@/theme';
import { PressableScale, type haptic } from './motion';

type Font = keyof typeof font;

export function Text({ f = 'regular', size = 15, color, style, ...rest }: TextProps & { f?: Font; size?: number; color?: string }) {
  const p = usePalette();
  const tracking = size >= 26 ? -size * 0.045 : size >= 18 ? -size * 0.025 : 0;
  return (
    <RNText
      {...rest}
      style={[{ fontFamily: font[f], fontSize: size, color: color ?? p.fg, letterSpacing: tracking, includeFontPadding: false }, style]}
    />
  );
}

export function Muted(props: TextProps & { size?: number; f?: Font }) {
  const p = usePalette();
  return <Text size={13} color={p.muted} {...props} />;
}

/** Microscopic mono eyebrow: "VERROUILLÉ · TRAVAIL". */
export function Label({ children, style, color }: { children: ReactNode; style?: TextProps['style']; color?: string }) {
  const p = usePalette();
  return (
    <RNText style={[{ fontFamily: font.mono, fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase', color: color ?? p.muted }, style]}>
      {children}
    </RNText>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: TextProps['style'] }) {
  return (
    <Text f="semibold" size={34} style={[{ lineHeight: 36 }, style]}>
      {children}
    </Text>
  );
}

/** Double bezel: a tray with a hairline, holding a plate with its own concentric radius. */
export function Bezel({ children, style, coreStyle }: { children: ReactNode; style?: StyleProp<ViewStyle>; coreStyle?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return (
    <View style={[{ padding: 5, borderRadius: radius.bezel, backgroundColor: p.card, borderWidth: 1, borderColor: p.line }, style]}>
      <View style={[{ borderRadius: radius.core, backgroundColor: p.raised, padding: 16 }, coreStyle]}>{children}</View>
    </View>
  );
}

/** Pill button with its icon nested in its own circle, flush right. */
export function Cta({
  label,
  icon,
  onPress,
  variant = 'solid',
  disabled,
  style,
  haptics = 'press',
}: {
  label: string;
  icon?: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: 'solid' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  haptics?: keyof typeof haptic;
}) {
  const p = usePalette();
  const solid = variant === 'solid';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hapticOnPress={haptics}
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 58,
          paddingLeft: 24,
          paddingRight: 8,
          borderRadius: radius.pill,
          backgroundColor: solid ? p.fg : 'transparent',
          borderWidth: solid ? 0 : 1,
          borderColor: p.line,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}>
      <Text f="medium" size={16} color={solid ? p.bg : p.fg}>
        {label}
      </Text>
      {icon ? (
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: solid ? 'rgba(128,128,128,0.18)' : p.card,
          }}>
          {icon}
        </View>
      ) : (
        <View style={{ width: 16 }} />
      )}
    </PressableScale>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hapticOnPress="tap"
      onPress={onPress}
      scaleTo={0.94}
      style={{
        paddingHorizontal: 15,
        paddingVertical: 9,
        borderRadius: radius.pill,
        backgroundColor: selected ? p.fg : 'transparent',
        borderWidth: 1,
        borderColor: selected ? p.fg : p.line,
      }}>
      <Text f="medium" size={13.5} color={selected ? p.bg : p.fg}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Grayscale app icon, or a monogram tile when the icon is not available (simulation). */
export function AppIcon({ label, icon, size = 30, ring }: { label: string; icon?: string | null; size?: number; ring?: string }) {
  const p = usePalette();
  const r = size * 0.3;
  const frame: ViewStyle = { width: size, height: size, borderRadius: r, overflow: 'hidden', borderWidth: ring ? 2.5 : 0, borderColor: ring };
  if (icon) {
    return (
      <View style={frame}>
        <Image source={{ uri: `data:image/png;base64,${icon}` }} style={{ width: '100%', height: '100%' }} />
      </View>
    );
  }
  const initials = label.replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || '?';
  return (
    <View style={[frame, { backgroundColor: p.fg, alignItems: 'center', justifyContent: 'center' }]}>
      <Text f="semibold" size={size * 0.36} color={p.bg}>
        {initials.charAt(0).toUpperCase() + initials.slice(1).toLowerCase()}
      </Text>
    </View>
  );
}

export function Stack({ apps, max = 6 }: { apps: { packageName: string; label: string; icon: string | null }[]; max?: number }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {apps.slice(0, max).map((a, i) => (
        <View key={a.packageName} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <AppIcon label={a.label} icon={a.icon} size={32} ring={p.raised} />
        </View>
      ))}
      {apps.length > max ? (
        <Text f="mono" size={12} color={p.muted} style={{ marginLeft: 8 }}>
          +{apps.length - max}
        </Text>
      ) : null}
    </View>
  );
}

export function Pill({ children, solid }: { children: ReactNode; solid?: boolean }) {
  const p = usePalette();
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: solid ? p.fg : p.card }}>
      <RNText style={{ fontFamily: font.mono, fontSize: 10.5, letterSpacing: solid ? 1.2 : 0, color: solid ? p.bg : p.fg, textTransform: solid ? 'uppercase' : 'none' }}>
        {children}
      </RNText>
    </View>
  );
}

export function Divider({ p }: { p: Palette }) {
  return <View style={{ height: 1, backgroundColor: p.line }} />;
}
