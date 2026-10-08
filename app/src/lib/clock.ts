import { useSyncExternalStore } from 'react';
import { createStore } from './store';

/** App-wide clock, ticking every second only while someone listens. */
const clock = createStore(Date.now());
let listeners = 0;
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  const unsubscribe = clock.subscribe(listener);
  if (listeners++ === 0) {
    clock.set(Date.now());
    timer = setInterval(() => clock.set(Date.now()), 1000);
  }
  return () => {
    unsubscribe();
    if (--listeners === 0) clearInterval(timer);
  };
}

/** Current time, rounded down to `resolution` ms so coarse readers don't re-render every second. */
export function useNow(resolution = 1000) {
  return useSyncExternalStore(subscribe, () => Math.floor(clock.get() / resolution) * resolution);
}
