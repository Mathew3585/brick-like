import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Session lengths offered on Accueil. 0 = Libre: no target, the ring just turns. */
export const DURATIONS = [25, 50, 90, 120, 0] as const;

export function goalLabel(min: number) {
  if (!min) return 'Libre';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

const ID = 'socle-goal';
const CHANNEL = 'goal';

/**
 * When the target is reached the apps stay blocked: only the Socle ends a session.
 * This notification just tells the user it is time to go back to it.
 */
export async function scheduleGoal(minutes: number, mode: string) {
  if (!minutes) return;
  try {
    const { granted } = await Notifications.requestPermissionsAsync();
    if (!granted) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Objectif de session', importance: Notifications.AndroidImportance.HIGH });
    }
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: { title: 'Objectif atteint', body: `${goalLabel(minutes)} en mode ${mode}. Repose ton téléphone sur le Socle pour tout récupérer.` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60, channelId: CHANNEL },
    });
  } catch {
    // No notification is not worth failing a session over.
  }
}

export function cancelGoal() {
  void Notifications.cancelScheduledNotificationAsync(ID).catch(() => undefined);
}
