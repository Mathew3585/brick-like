import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { settings } from './data';

// Kenney "Interface Sounds" (CC0): a falling tone to set the phone down, its mirror to pick it up.
const SOURCES = {
  lock: require('@/assets/sounds/lock.ogg'),
  unlock: require('@/assets/sounds/unlock.ogg'),
};

let players: Record<keyof typeof SOURCES, AudioPlayer> | null = null;

/** Loaded once at startup so the first lock plays without a delay. */
export function loadSounds() {
  if (players) return;
  void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
  players = { lock: createAudioPlayer(SOURCES.lock), unlock: createAudioPlayer(SOURCES.unlock) };
}

/** The two sounds of the app: setting the puck down, picking it back up. Follows the media volume. */
export function play(name: keyof typeof SOURCES) {
  if (settings.get().sounds === false) return;
  try {
    loadSounds();
    const player = players![name];
    void player.seekTo(0);
    player.play();
  } catch {
    // A missing sound never blocks a session.
  }
}
