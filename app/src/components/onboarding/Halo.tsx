import { useEffect, useState } from 'react';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

/** Soft light pool behind the puck so black-on-black still reads. */
export function Halo({ size, color = '#FFFFFF', strength = 0.09 }: { size: number; color?: string; strength?: number }) {
  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }} pointerEvents="none">
      <Defs>
        <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={strength} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#halo)" />
    </Svg>
  );
}

/** `true` once `ms` have passed since mount. */
export function useAfter(ms: number) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDone(true), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return done;
}
