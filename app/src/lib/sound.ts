import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { blocker } from './blocker';
import { settings } from './data';

const SOURCES = {
  lock: require('@/assets/sounds/lock.wav'),
  unlock: require('@/assets/sounds/unlock.wav'),
};

let players: Record<keyof typeof SOURCES, AudioPlayer> | null = null;

/** Loaded once at startup so the first lock plays without a delay. */
export function loadSounds() {
  if (players) return;
  void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
  players = { lock: createAudioPlayer(SOURCES.lock), unlock: createAudioPlayer(SOURCES.unlock) };
  players.lock.volume = 0.7;
  players.unlock.volume = 0.6;
}

/** The two sounds of the app: setting the puck down, picking it back up. Never in silent mode. */
export function play(name: keyof typeof SOURCES) {
  if (settings.get().sounds === false || !blocker.ringerNormal()) return;
  try {
    loadSounds();
    const player = players![name];
    void player.seekTo(0);
    player.play();
  } catch {
    // A missing sound never blocks a session.
  }
}
