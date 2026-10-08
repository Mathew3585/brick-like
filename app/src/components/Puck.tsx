import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { font } from '@/theme';
import { SPRING } from './motion';

/**
 * The Socle object itself: a matte black puck lit from the top left, a recessed inner ring and a
 * status LED. Drawn the same in both tones: it is a physical thing, not UI.
 * `led`: true blinks (waiting), 'on' stays lit (a tag was read), false hides it.
 */
export function Puck({ size, led = true }: { size: number; led?: boolean | 'on' }) {
  const reduced = useReducedMotion();
  const glow = useSharedValue(1);
  useEffect(() => {
    if (led === 'on') {
      glow.set(withTiming(1, { duration: 200 }));
      return;
    }
    if (!led || reduced) return;
    glow.set(withRepeat(withSequence(withTiming(0.25, { duration: 1500, easing: SPRING }), withTiming(1, { duration: 1500, easing: SPRING })), -1));
  }, [glow, led, reduced]);
  const ledStyle = useAnimatedStyle(() => ({ opacity: glow.get() }));

  const r = size / 2;
  const dot = Math.max(3, size * 0.035);
  const mark = size * 0.085;
  return (
    <View style={{ width: size, height: size * 1.12 }}>
      <Svg width={size} height={size * 1.12}>
        <Defs>
          <RadialGradient id="body" cx="35%" cy="30%" r="75%">
            <Stop offset="0" stopColor="#3A3A3D" />
            <Stop offset="0.55" stopColor="#111113" />
            <Stop offset="1" stopColor="#050505" />
          </RadialGradient>
          <RadialGradient id="drop" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#000" stopOpacity="0.38" />
            <Stop offset="1" stopColor="#000" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFF" stopOpacity="0.16" />
            <Stop offset="0.5" stopColor="#FFF" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="well" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <Stop offset="0.6" stopColor="#000" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="base" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.5" />
          </LinearGradient>
        </Defs>
        {/* Soft contact shadow, offset down like the web render. */}
        <Ellipse cx={r} cy={r + size * 0.16} rx={r * 0.9} ry={r * 0.82} fill="url(#drop)" />
        <Circle cx={r} cy={r} r={r - 1} fill="url(#body)" />
        <Circle cx={r} cy={r} r={r - 1} fill="url(#base)" />
        <Circle cx={r} cy={r} r={r - 1.5} fill="none" stroke="url(#rim)" strokeWidth={1.5} />
        {/* Recessed inner ring. */}
        <Circle cx={r} cy={r} r={r * 0.56} fill="url(#well)" />
        <Circle cx={r} cy={r} r={r * 0.56} fill="none" stroke="#FFF" strokeOpacity={0.1} strokeWidth={1} />
        {/* Engraved name: a dark cut with a faint lit lower lip. Too small to read under ~70 px, so left out. */}
        {size >= 70 ? (
          <>
            <SvgText x={r + mark * 0.15} y={r + mark * 0.36 + 0.8} fontFamily={font.monoMedium} fontSize={mark} letterSpacing={mark * 0.3} textAnchor="middle" fill="#FFF" fillOpacity={0.09}>
              SOCLE
            </SvgText>
            <SvgText x={r + mark * 0.15} y={r + mark * 0.36} fontFamily={font.monoMedium} fontSize={mark} letterSpacing={mark * 0.3} textAnchor="middle" fill="#000" fillOpacity={0.75}>
              SOCLE
            </SvgText>
          </>
        ) : null}
      </Svg>
      {led ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: r - dot * 2,
              top: size * 0.11 - dot * 2 + dot / 2,
              width: dot * 4,
              height: dot * 4,
              alignItems: 'center',
              justifyContent: 'center',
            },
            ledStyle,
          ]}>
          <View style={{ position: 'absolute', width: dot * 4, height: dot * 4, borderRadius: dot * 2, backgroundColor: '#FFF', opacity: 0.12 }} />
          <View style={{ position: 'absolute', width: dot * 2.2, height: dot * 2.2, borderRadius: dot * 1.1, backgroundColor: '#FFF', opacity: 0.25 }} />
          <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: '#F4F4F2' }} />
        </Animated.View>
      ) : null}
    </View>
  );
}
