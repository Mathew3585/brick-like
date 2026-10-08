package expo.modules.socleblocker

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent

/**
 * Watches which app comes to the foreground. During a session, a blocked app is covered by the
 * shield right away, every time: no grace window, or tapping fast would slip through. The service
 * reads nothing on screen: only the package name of the window.
 */
class SocleAccessibilityService : AccessibilityService() {
  private var lastPkg: String? = null
  private var lastCountedAt = 0L

  override fun onAccessibilityEvent(event: AccessibilityEvent) {
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    if (pkg == packageName) return

    val session = SessionStore.read(this)
    if (!session.active || pkg !in session.blocked) return

    // Shield first and always: launching it straight over the app avoids a flash of its content.
    startActivity(
      Intent(this, ShieldActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        .putExtra(ShieldActivity.EXTRA_PACKAGE, pkg),
    )

    // An app fires several window events while opening: count one attempt, not five.
    val now = SystemClock.elapsedRealtime()
    if (pkg != lastPkg || now - lastCountedAt > 1500) {
      SessionStore.recordAttempt(this, pkg)
      lastCountedAt = now
    }
    lastPkg = pkg
  }

  override fun onInterrupt() = Unit
}
