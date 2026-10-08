// Direction "Éclipse": paper while you are free, ink while you work. No other colour.
export type Tone = 'light' | 'dark';

export const ink = '#0A0A0A';
export const paper = '#FAFAF9';
export const graphite = '#8A8A8F';

const palettes = {
  light: {
    bg: paper,
    fg: ink,
    muted: '#86868B',
    faint: '#B4B4B8',
    line: 'rgba(0,0,0,0.08)',
    card: '#F0F0EE',
    raised: '#FFFFFF',
    scrim: 'rgba(0,0,0,0.28)',
  },
  dark: {
    bg: '#050505',
    fg: '#F4F4F2',
    muted: '#77777C',
    faint: '#4A4A4E',
    line: 'rgba(255,255,255,0.09)',
    card: '#121214',
    raised: '#0C0C0D',
    scrim: 'rgba(0,0,0,0.55)',
  },
} as const;

export type Palette = { [K in keyof (typeof palettes)['light']]: string };
export const palette = (tone: Tone): Palette => palettes[tone];

export const font = {
  light: 'Geist_300Light',
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  monoLight: 'GeistMono_300Light',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;

export const radius = { bezel: 28, core: 23, tile: 18, app: 14, pill: 999 } as const;

/** Bottom padding that keeps content clear of the floating tab bar. */
export const TAB_BAR_SPACE = 120;
