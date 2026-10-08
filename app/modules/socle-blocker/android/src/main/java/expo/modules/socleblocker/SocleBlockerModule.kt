package expo.modules.socleblocker

import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.nfc.NfcAdapter
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SocleBlockerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var scanPromise: Promise? = null
  private var scanActivity: Activity? = null

  override fun definition() = ModuleDefinition {
    Name("SocleBlocker")

    // --- Accessibility service (the blocking engine) ---

    Function("isBlockerEnabled") {
      val expected = ComponentName(context, SocleAccessibilityService::class.java)
      val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
      enabled.split(':').any { ComponentName.unflattenFromString(it) == expected }
    }

    Function("openBlockerSettings") {
      context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    Function("isNotifyEnabled") {
      val expected = ComponentName(context, SocleNotificationListener::class.java)
      val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners") ?: ""
      enabled.split(':').any { ComponentName.unflattenFromString(it) == expected }
    }

    Function("openNotifySettings") {
      val intent = if (android.os.Build.VERSION.SDK_INT >= 30) {
        Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
          .putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, ComponentName(context, SocleNotificationListener::class.java).flattenToString())
      } else {
        Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
      }
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    Function("openAppDetails") {
      context.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
          .setData(android.net.Uri.parse("package:${context.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
    }

    /** False in silent or vibrate mode: the lock/unlock sounds stay quiet then. */
    Function("isRingerNormal") {
      val audio = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
      audio.ringerMode == android.media.AudioManager.RINGER_MODE_NORMAL
    }

    // --- Installed apps ---

    AsyncFunction("getInstalledApps") { iconSize: Int ->
      val pm = context.packageManager
      val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      pm.queryIntentActivities(launcher, 0)
        .distinctBy { it.activityInfo.packageName }
        .filter { it.activityInfo.packageName != context.packageName }
        .map {
          val icon = try {
            AppIcons.toBase64Png(AppIcons.grayscale(it.loadIcon(pm), iconSize))
          } catch (_: Exception) {
            null
          }
          mapOf(
            "packageName" to it.activityInfo.packageName,
            "label" to it.loadLabel(pm).toString(),
            "icon" to icon,
          )
        }
        .sortedBy { (it["label"] as String).lowercase() }
    }

    // --- Session ---

    Function("startSession") { mode: String, blocked: List<String>, startedAt: Double ->
      SessionStore.start(context, mode, blocked, startedAt.toLong())
      SocleNotificationListener.sweep()
    }

    Function("stopSession") {
      SessionStore.stop(context)
    }

    Function("getSession") {
      val s = SessionStore.read(context)
      if (!s.active) {
        null
      } else {
        mapOf(
          "mode" to s.mode,
          "startedAt" to s.startedAt.toDouble(),
          "blocked" to s.blocked.toList(),
          "attempts" to SessionStore.attempts(context),
          "muted" to SessionStore.muted(context),
        )
      }
    }

    // --- NFC: read the UID of whatever tag touches the phone ---

    Function("nfcStatus") {
      val adapter = NfcAdapter.getDefaultAdapter(context)
      when {
        adapter == null -> "unsupported"
        !adapter.isEnabled -> "disabled"
        else -> "enabled"
      }
    }

    Function("openNfcSettings") {
      context.startActivity(Intent(Settings.ACTION_NFC_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    AsyncFunction("scanTag") { promise: Promise ->
      val activity = appContext.currentActivity
      val adapter = NfcAdapter.getDefaultAdapter(context)
      when {
        activity == null -> promise.reject("E_NO_ACTIVITY", "L'app n'est pas au premier plan.", null)
        adapter == null -> promise.reject("E_NFC_UNSUPPORTED", "Ce téléphone n'a pas de NFC.", null)
        !adapter.isEnabled -> promise.reject("E_NFC_DISABLED", "Le NFC est désactivé.", null)
        else -> {
          scanPromise?.reject("E_CANCELLED", "Scan remplacé.", null)
          scanPromise = promise
          scanActivity = activity
          val flags = NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NFC_B or
            NfcAdapter.FLAG_READER_NFC_F or NfcAdapter.FLAG_READER_NFC_V or
            NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK or NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS
          adapter.enableReaderMode(activity, { tag ->
            val uid = tag.id.joinToString(":") { "%02X".format(it) }
            activity.runOnUiThread { stopReader() }
            scanPromise?.resolve(uid)
            scanPromise = null
          }, flags, null)
        }
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("cancelScan") {
      stopReader()
      scanPromise?.reject("E_CANCELLED", "Scan annulé.", null)
      scanPromise = null
    }.runOnQueue(Queues.MAIN)

    OnActivityEntersBackground {
      stopReader()
      scanPromise?.reject("E_CANCELLED", "L'app est passée en arrière-plan.", null)
      scanPromise = null
    }
  }

  private fun stopReader() {
    val activity = scanActivity ?: return
    scanActivity = null
    try {
      NfcAdapter.getDefaultAdapter(activity)?.disableReaderMode(activity)
    } catch (_: Exception) {
    }
  }
}
