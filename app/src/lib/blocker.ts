import Native, { type InstalledApp, type NativeSession, type NfcStatus } from '@modules/socle-blocker';

export type { InstalledApp, NativeSession, NfcStatus };

/**
 * One door to the native blocker. In Expo Go or on web the module is absent: the app then runs
 * on a simulation so every screen stays testable (nothing is really blocked).
 */
export const isSimulated = Native == null;

const SAMPLE_APPS: InstalledApp[] = [
  ['com.instagram.android', 'Instagram'],
  ['com.zhiliaoapp.musically', 'TikTok'],
  ['com.google.android.youtube', 'YouTube'],
  ['com.twitter.android', 'X'],
  ['com.reddit.frontpage', 'Reddit'],
  ['com.snapchat.android', 'Snapchat'],
  ['com.netflix.mediaclient', 'Netflix'],
  ['tv.twitch.android.app', 'Twitch'],
  ['com.discord', 'Discord'],
  ['com.linkedin.android', 'LinkedIn'],
  ['com.pinterest', 'Pinterest'],
  ['com.google.android.gm', 'Gmail'],
  ['com.spotify.music', 'Spotify'],
  ['com.whatsapp', 'WhatsApp'],
].map(([packageName, label]) => ({ packageName: packageName!, label: label!, icon: null }));

let simulated: NativeSession | null = null;

export const blocker = {
  isEnabled: () => Native?.isBlockerEnabled() ?? true,
  openSettings: () => Native?.openBlockerSettings(),
  openAppDetails: () => Native?.openAppDetails(),
  notifyEnabled: () => Native?.isNotifyEnabled() ?? true,
  openNotifySettings: () => Native?.openNotifySettings(),

  installedApps: async (): Promise<InstalledApp[]> => (Native ? Native.getInstalledApps(96) : SAMPLE_APPS),

  start(mode: string, blocked: string[], startedAt: number) {
    if (Native) Native.startSession(mode, blocked, startedAt);
    else simulated = { mode, blocked, startedAt, attempts: {}, muted: {} };
  },
  stop(): { attempts: Record<string, number>; muted: Record<string, number> } {
    if (Native) return Native.stopSession();
    const result = { attempts: simulated?.attempts ?? {}, muted: simulated?.muted ?? {} };
    simulated = null;
    return result;
  },
  current: (): NativeSession | null => (Native ? Native.getSession() : simulated),
  /** Simulation only: what the accessibility service does when a blocked app is opened. */
  simulateAttempt(pkg: string) {
    if (simulated) simulated.attempts[pkg] = (simulated.attempts[pkg] ?? 0) + 1;
  },

  nfcStatus: (): NfcStatus => Native?.nfcStatus() ?? 'unsupported',
  openNfcSettings: () => Native?.openNfcSettings(),
  scanTag: () => (Native ? Native.scanTag() : Promise.reject(Object.assign(new Error('NFC indisponible'), { code: 'E_NFC_UNSUPPORTED' }))),
  cancelScan: () => Native?.cancelScan().catch(() => undefined),
};
