import { blocker, type InstalledApp } from './blocker';
import { createStore } from './store';

/** Launchable apps on the phone, with grayscale icons. Loaded once, refreshed on demand. */
export const installedApps = createStore<InstalledApp[] | null>(null);

let pending: Promise<void> | null = null;

export function loadApps(force = false) {
  if (pending && !force) return pending;
  pending = blocker
    .installedApps()
    .then((list) => installedApps.set(list))
    .catch(() => installedApps.set([]));
  return pending;
}

export function appIndex(list: InstalledApp[] | null) {
  return new Map((list ?? []).map((a) => [a.packageName, a]));
}

/** Keeps only the packages actually installed, in the order given. */
export function installedOnly(packages: string[], list: InstalledApp[] | null) {
  if (!list) return [];
  const index = appIndex(list);
  return packages.map((p) => index.get(p)).filter((a): a is InstalledApp => a != null);
}
