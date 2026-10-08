package expo.modules.socleblocker

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * During a session, notifications from paused apps are removed as they arrive (no sound, no
 * banner) and counted for the summary. Other apps notify as usual.
 */
class SocleNotificationListener : NotificationListenerService() {
  companion object {
    @Volatile
    private var instance: SocleNotificationListener? = null

    /** Clears what paused apps had already posted, right when a session starts. */
    fun sweep() {
      instance?.sweepNow()
    }
  }

  override fun onListenerConnected() {
    instance = this
    sweepNow()
  }

  override fun onListenerDisconnected() {
    if (instance === this) instance = null
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    mute(sbn, count = true)
  }

  private fun sweepNow() {
    try {
      activeNotifications?.forEach { mute(it, count = false) }
    } catch (_: Exception) {
    }
  }

  private fun mute(sbn: StatusBarNotification, count: Boolean) {
    val session = SessionStore.read(this)
    if (!session.active || sbn.packageName !in session.blocked) return
    // Ongoing ones (music, calls in progress) can't be cleared by a listener anyway.
    if (sbn.isOngoing) return
    cancelNotification(sbn.key)
    // Group summaries arrive alongside each message: count the messages only.
    val summary = sbn.notification.flags and android.app.Notification.FLAG_GROUP_SUMMARY != 0
    if (count && !summary) SessionStore.recordMuted(this, sbn.packageName)
  }
}
