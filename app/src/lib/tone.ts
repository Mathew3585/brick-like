import { createContext, useContext } from 'react';
import { palette, type Palette, type Tone } from '@/theme';
import { active } from './data';
import { useStore } from './store';

/** Lets a screen (the onboarding story) set its own tone instead of following the session. */
export const ToneOverride = createContext<Tone | null>(null);

/** The whole app is paper while free and ink during a session. */
export function useTone(): Tone {
  const override = useContext(ToneOverride);
  const session = useStore(active);
  return override ?? (session ? 'dark' : 'light');
}

export function usePalette(): Palette {
  return palette(useTone());
}
