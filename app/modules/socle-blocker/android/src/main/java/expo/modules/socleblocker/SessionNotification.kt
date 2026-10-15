package expo.modules.socleblocker

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * The ongoing notification of a running session. The timer is the system chronometer: it ticks on
 * its own, with nothing to update while the JS side sleeps. Counts down to the goal, then (or in a
 * Libre session) counts up since the start.
 */
object SessionNotification {
  private const val CHANNEL = "session"
  private const val ID = 4207
  private const val ACTION_GOAL = "expo.modules.socleblocker.GOAL"
  private const val ACTION_DISMISSED = "expo.modules.socleblocker.DISMISSED"

  fun show(context: Context) {
    val s = SessionStore.read(context)
    if (!s.active) return cancel(context)
    val nm = context.getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= 33 && !nm.areNotificationsEnabled()) return

    nm.createNotificationChannel(
      NotificationChannel(CHANNEL, "Session en cours", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Le temps restant pendant que tes apps sont en pause."
        setShowBadge(false)
      },
    )

    val now = System.currentTimeMillis()
    val counting = s.goalAt > now
    val apps = s.blocked.size
    val paused = if (apps == 1) "1 app en pause" else "$apps apps en pause"
    val (title, text, sub) = when {
      counting -> Triple("Mode ${s.mode}", "$paused · objectif ${minutesLabel(s.goalAt - s.startedAt)}", "reste")
      s.goalAt > 0 -> Triple("Objectif atteint", "Repose ton téléphone sur le Socle pour tout récupérer.", "en session")
      else -> Triple("Mode ${s.mode} · libre", "$paused · repose ton téléphone sur le Socle pour finir", "en session")
    }

    val builder = Notification.Builder(context, CHANNEL)
      .setSmallIcon(smallIcon(context))
      .setContentTitle(title)
      .setContentText(text)
      .setSubText(sub)
      .setStyle(Notification.BigTextStyle().bigText(text))
      .setColor(0xFF0A0A0A.toInt())
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setCategory(Notification.CATEGORY_STATUS)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setChronometerCountDown(counting)
      .setWhen(if (counting) s.goalAt else s.startedAt)
      .setContentIntent(openApp(context))
      .setDeleteIntent(broadcast(context, ACTION_DISMISSED))
    // Android 16 Live Update: the timer also sits as a chip in the status bar.
    if (Build.VERSION.SDK_INT >= 36) builder.extras.putBoolean("android.requestPromotedOngoing", true)

    nm.notify(ID, builder.build())
    if (counting) scheduleGoal(context, s.goalAt)
  }

  fun cancel(context: Context) {
    context.getSystemService(NotificationManager::class.java).cancel(ID)
    context.getSystemService(AlarmManager::class.java).cancel(broadcast(context, ACTION_GOAL))
  }

  /** Inexact on purpose (no alarm permission): until it fires, the countdown just reads past zero. */
  private fun scheduleGoal(context: Context, at: Long) {
    context.getSystemService(AlarmManager::class.java)
      .setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, broadcast(context, ACTION_GOAL))
  }

  private fun minutesLabel(ms: Long): String {
    val min = Math.round(ms / 60_000.0).toInt()
    if (min < 60) return "$min min"
    val h = min / 60
    val m = min % 60
    return if (m == 0) "$h h" else "$h h ${m.toString().padStart(2, '0')}"
  }

  private fun smallIcon(context: Context): Int {
    val id = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (id != 0) id else context.applicationInfo.icon
  }

  private fun openApp(context: Context): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    return PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  private fun broadcast(context: Context, action: String): PendingIntent =
    PendingIntent.getBroadcast(
      context,
      action.hashCode(),
      Intent(context, Receiver::class.java).setAction(action),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

  /** Goal reached, or the user swiped the notification away (Android 14+ allows it): post it again. */
  class Receiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = show(context)
  }
}
