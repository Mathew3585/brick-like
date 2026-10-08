package expo.modules.socleblocker

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject

/**
 * The running session, kept in SharedPreferences so the accessibility service keeps blocking
 * even when the JS side is not running (app swiped away, phone rebooted).
 */
object SessionStore {
  private const val PREFS = "socle.session"

  data class Session(
    val active: Boolean,
    val startedAt: Long,
    val mode: String,
    val blocked: Set<String>,
  )

  private fun prefs(context: Context): SharedPreferences =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun read(context: Context): Session {
    val p = prefs(context)
    return Session(
      active = p.getBoolean("active", false),
      startedAt = p.getLong("startedAt", 0L),
      mode = p.getString("mode", "") ?: "",
      blocked = p.getStringSet("blocked", emptySet()) ?: emptySet(),
    )
  }

  fun start(context: Context, mode: String, blocked: List<String>, startedAt: Long) {
    prefs(context).edit()
      .putBoolean("active", true)
      .putLong("startedAt", startedAt)
      .putString("mode", mode)
      .putStringSet("blocked", HashSet(blocked))
      .putString("attempts", "{}")
      .commit()
  }

  /** Ends the session and returns how many times each blocked app was opened. */
  fun stop(context: Context): Map<String, Int> {
    val attempts = attempts(context)
    prefs(context).edit()
      .putBoolean("active", false)
      .putStringSet("blocked", emptySet())
      .putString("attempts", "{}")
      .commit()
    return attempts
  }

  fun attempts(context: Context): Map<String, Int> {
    val json = JSONObject(prefs(context).getString("attempts", "{}") ?: "{}")
    return json.keys().asSequence().associateWith { json.optInt(it) }
  }

  fun recordAttempt(context: Context, pkg: String) {
    val p = prefs(context)
    val json = JSONObject(p.getString("attempts", "{}") ?: "{}")
    json.put(pkg, json.optInt(pkg) + 1)
    p.edit().putString("attempts", json.toString()).apply()
  }
}
