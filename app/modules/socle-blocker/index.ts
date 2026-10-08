import { requireOptionalNativeModule } from 'expo';

export type InstalledApp = { packageName: string; label: string; icon: string | null };
export type Counts = Record<string, number>;
export type NativeSession = { mode: string; startedAt: number; blocked: string[]; attempts: Counts; muted: Counts };
export type NfcStatus = 'unsupported' | 'disabled' | 'enabled';

type SocleBlockerNative = {
  isBlockerEnabled(): boolean;
  openBlockerSettings(): void;
  isNotifyEnabled(): boolean;
  openNotifySettings(): void;
  openAppDetails(): void;
  isRingerNormal(): boolean;
  getInstalledApps(iconSize: number): Promise<InstalledApp[]>;
  startSession(mode: string, blocked: string[], startedAt: number): void;
  stopSession(): { attempts: Counts; muted: Counts };
  getSession(): NativeSession | null;
  nfcStatus(): NfcStatus;
  openNfcSettings(): void;
  scanTag(): Promise<string>;
  cancelScan(): Promise<void>;
};

/** `null` in Expo Go and on web: the app then runs on a simulated blocker (see src/lib/blocker.ts). */
export default requireOptionalNativeModule<SocleBlockerNative>('SocleBlocker');
