import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore, type Store } from './store';

export type PersistedStore<T> = Store<T> & { load: () => Promise<void> };

/** A store saved to AsyncStorage on every change. `load()` once at startup, before reading. */
export function createPersistedStore<T>(key: string, initial: T): PersistedStore<T> {
  const store = createStore<T>(initial);
  let loaded = false;
  store.subscribe(() => {
    if (loaded) void AsyncStorage.setItem(key, JSON.stringify(store.get())).catch(() => undefined);
  });
  return {
    ...store,
    async load() {
      const raw = await AsyncStorage.getItem(key).catch(() => null);
      if (raw != null) {
        try {
          store.set(JSON.parse(raw) as T);
        } catch {
          // Corrupt value: keep the default.
        }
      }
      loaded = true;
    },
  };
}
