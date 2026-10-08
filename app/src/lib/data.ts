import { blocker } from './blocker';
import { cancelGoal, scheduleGoal } from './goal';
import { createPersistedStore } from './persist';
import { createStore } from './store';

export type Mode = { id: string; name: string; apps: string[] };
export type Socle = { uid: string; name: string; addedAt: number; lastUsedAt?: number };
export type SessionRecord = {
  id: string;
  modeId: string;
  modeName: string;
  startedAt: number;
  endedAt: number;
  attempts: Record<string, number>;
  how: 'socle' | 'sos';
  /** Notifications from paused apps removed during the session, per app. */
  muted?: Record<string, number>;
  /** Target in minutes, 0 for Libre. Missing on sessions saved before targets existed. */
  goalMin?: number;
};
export type ActiveSession = { modeId: string; modeName: string; startedAt: number; blocked: string[]; goalMin?: number };
export type Settings = {
  onboarded: boolean;
  /** Lets the "Socle virtuel" unlock, for testing without an NFC tag. */
  demo: boolean;
  /** Length of the next session in minutes, 0 for Libre. */
  goalMin: number;
  sosMonth: string;
  sosUsed: number;
  lastModeId: string;
  /** Lock and unlock sounds, on the media volume. */
  sounds?: boolean;
};

export const SOS_PER_MONTH = 3;
export const VIRTUAL_UID = 'VIRTUEL';

const SOCIAL = ['com.instagram.android', 'com.zhiliaoapp.musically', 'com.twitter.android', 'com.reddit.frontpage', 'com.snapchat.android', 'com.facebook.katana'];
const VIDEO = ['com.google.android.youtube', 'com.netflix.mediaclient', 'tv.twitch.android.app'];

export const DEFAULT_MODES: Mode[] = [
  { id: 'travail', name: 'Travail', apps: [...SOCIAL, ...VIDEO, 'com.discord'] },
  { id: 'lecture', name: 'Lecture', apps: [...SOCIAL, ...VIDEO, 'com.discord', 'com.linkedin.android', 'com.pinterest', 'com.google.android.gm'] },
  { id: 'soir', name: 'Soir', apps: [...SOCIAL, 'com.google.android.youtube', 'com.netflix.mediaclient'] },
];

export const modes = createPersistedStore<Mode[]>('socle.modes', DEFAULT_MODES);
export const socles = createPersistedStore<Socle[]>('socle.socles', []);
export const history = createPersistedStore<SessionRecord[]>('socle.history', []);
export const active = createPersistedStore<ActiveSession | null>('socle.active', null);
export const settings = createPersistedStore<Settings>('socle.settings', {
  onboarded: false,
  demo: false,
  goalMin: 50,
  sosMonth: '',
  sosUsed: 0,
  lastModeId: 'travail',
});
/** The session that just ended, shown until the user taps "Terminé". */
export const lastSummary = createStore<SessionRecord | null>(null);

const monthKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}`;
export const sosLeft = (s: Settings) => SOS_PER_MONTH - (s.sosMonth === monthKey() ? s.sosUsed : 0);
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function loadAll() {
  await Promise.all([modes.load(), socles.load(), history.load(), active.load(), settings.load()]);
  reconcile();
}

/** The native side is the truth: it keeps blocking even when the JS side was killed. */
export function reconcile() {
  const native = blocker.current();
  const mine = active.get();
  if (native && !mine) {
    active.set({ modeId: settings.get().lastModeId, modeName: native.mode, startedAt: native.startedAt, blocked: native.blocked, goalMin: settings.get().goalMin });
  } else if (!native && mine) {
    active.set(null);
  }
}

export function isKnownSocle(tag: string) {
  if (tag === VIRTUAL_UID) return settings.get().demo;
  return socles.get().some((s) => s.uid === tag);
}

export function socleName(tag: string) {
  if (tag === VIRTUAL_UID) return 'Socle virtuel';
  return socles.get().find((s) => s.uid === tag)?.name ?? 'Socle';
}

export function addSocle(tag: string, name: string) {
  socles.set((list) => [...list.filter((s) => s.uid !== tag), { uid: tag, name: name.trim() || 'Socle', addedAt: Date.now() }]);
}

export function removeSocle(tag: string) {
  socles.set((list) => list.filter((s) => s.uid !== tag));
}

function touchSocle(tag: string) {
  socles.set((list) => list.map((s) => (s.uid === tag ? { ...s, lastUsedAt: Date.now() } : s)));
}

export function startSession(mode: Mode, tag: string) {
  const startedAt = Date.now();
  const goalMin = settings.get().goalMin;
  blocker.start(mode.name, mode.apps, startedAt);
  active.set({ modeId: mode.id, modeName: mode.name, startedAt, blocked: mode.apps, goalMin });
  void scheduleGoal(goalMin, mode.name);
  settings.set((s) => ({ ...s, lastModeId: mode.id }));
  touchSocle(tag);
}

export function endSession(how: SessionRecord['how'], tag?: string) {
  const current = active.get();
  const { attempts, muted } = blocker.stop();
  cancelGoal();
  active.set(null);
  if (!current) return;
  const record: SessionRecord = {
    id: uid(),
    modeId: current.modeId,
    modeName: current.modeName,
    startedAt: current.startedAt,
    endedAt: Date.now(),
    attempts,
    muted,
    how,
    goalMin: current.goalMin ?? 0,
  };
  history.set((list) => [...list, record]);
  if (how === 'sos') {
    settings.set((s) => {
      const month = monthKey();
      return { ...s, sosMonth: month, sosUsed: (s.sosMonth === month ? s.sosUsed : 0) + 1 };
    });
  }
  if (tag) touchSocle(tag);
  lastSummary.set(record);
}

export function saveMode(mode: Mode) {
  modes.set((list) => (list.some((m) => m.id === mode.id) ? list.map((m) => (m.id === mode.id ? mode : m)) : [...list, mode]));
}

export function deleteMode(id: string) {
  modes.set((list) => list.filter((m) => m.id !== id));
}

export const newModeId = uid;
