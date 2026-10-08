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
      .putString("muted", "{}")
      .commit()
  }

  /** Ends the session; returns per app how many times it was opened and how many notifications were cut. */
  fun stop(context: Context): Map<String, Map<String, Int>> {
    val result = mapOf("attempts" to counts(context, "attempts"), "muted" to counts(context, "muted"))
    prefs(context).edit()
      .putBoolean("active", false)
      .putStringSet("blocked", emptySet())
      .putString("attempts", "{}")
      .putString("muted", "{}")
      .commit()
    return result
  }

  fun attempts(context: Context) = counts(context, "attempts")

  fun muted(context: Context) = counts(context, "muted")

  private fun counts(context: Context, key: String): Map<String, Int> {
    val json = JSONObject(prefs(context).getString(key, "{}") ?: "{}")
    return json.keys().asSequence().associateWith { json.optInt(it) }
  }

  fun recordAttempt(context: Context, pkg: String) = increment(context, "attempts", pkg)

  fun recordMuted(context: Context, pkg: String) = increment(context, "muted", pkg)

  @Synchronized
  private fun increment(context: Context, key: String, pkg: String) {
    val p = prefs(context)
    val json = JSONObject(p.getString(key, "{}") ?: "{}")
    json.put(pkg, json.optInt(pkg) + 1)
    p.edit().putString(key, json.toString()).commit()
  }
}
