package expo.modules.socleblocker

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent

/**
 * Watches which app comes to the foreground. During a session, a blocked app is sent home and
 * covered by the shield. The service reads nothing on screen: only the package name of the window.
 */
class SocleAccessibilityService : AccessibilityService() {
  private var lastPkg: String? = null
  private var lastShieldAt = 0L

  override fun onAccessibilityEvent(event: AccessibilityEvent) {
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    if (pkg == packageName) return

    val session = SessionStore.read(this)
    if (!session.active || pkg !in session.blocked) return

    // An app fires several window events while opening: count and shield it once.
    val now = SystemClock.elapsedRealtime()
    if (pkg == lastPkg && now - lastShieldAt < 1500) return
    lastPkg = pkg
    lastShieldAt = now

    SessionStore.recordAttempt(this, pkg)
    performGlobalAction(GLOBAL_ACTION_HOME)
    startActivity(
      Intent(this, ShieldActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)
        .putExtra(ShieldActivity.EXTRA_PACKAGE, pkg),
    )
  }

  override fun onInterrupt() = Unit
}
