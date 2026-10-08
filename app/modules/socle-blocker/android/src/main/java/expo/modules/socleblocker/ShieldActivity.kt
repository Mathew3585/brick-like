package expo.modules.socleblocker

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.window.OnBackInvokedDispatcher
import android.os.Build

/**
 * What the user sees when opening a paused app: black screen, the app's icon, how long they have
 * been focused, one way out (home). Native on purpose: it must appear instantly, even with the JS
 * runtime asleep.
 */
class ShieldActivity : Activity() {
  companion object {
    const val EXTRA_PACKAGE = "package"
  }

  private val handler = Handler(Looper.getMainLooper())
  private lateinit var timerText: TextView
  private lateinit var titleText: TextView
  private lateinit var iconView: ImageView
  private lateinit var footText: TextView

  private val ticker = object : Runnable {
    override fun run() {
      val session = SessionStore.read(this@ShieldActivity)
      if (!session.active) {
        finishAndRemoveTask()
        return
      }
      val s = ((System.currentTimeMillis() - session.startedAt) / 1000).coerceAtLeast(0)
      timerText.text = "%02d:%02d:%02d".format(s / 3600, (s % 3600) / 60, s % 60)
      handler.postDelayed(this, 1000)
    }
  }

  private fun dp(v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, resources.displayMetrics)

  private fun font(name: String, fallback: String): Typeface =
    try {
      Typeface.createFromAsset(assets, "fonts/$name.ttf")
    } catch (_: Exception) {
      Typeface.create(fallback, Typeface.NORMAL)
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val sans = font("Geist_600SemiBold", "sans-serif-medium")
    val body = font("Geist_400Regular", "sans-serif")
    val mono = font("GeistMono_400Regular", "monospace")
    val paper = Color.parseColor("#F4F4F2")
    val graphite = Color.parseColor("#8A8A8F")

    val column = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(32f).toInt(), 0, dp(32f).toInt(), 0)
    }

    iconView = ImageView(this).apply {
      val frame = GradientDrawable().apply {
        cornerRadius = dp(26f)
        setColor(Color.parseColor("#121214"))
        setStroke(dp(1f).toInt(), Color.parseColor("#26FFFFFF"))
      }
      background = frame
      val pad = dp(18f).toInt()
      setPadding(pad, pad, pad, pad)
      clipToOutline = true
    }
    column.addView(iconView, LinearLayout.LayoutParams(dp(88f).toInt(), dp(88f).toInt()))

    titleText = TextView(this).apply {
      typeface = sans
      setTextColor(paper)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 26f)
      letterSpacing = -0.04f
      gravity = Gravity.CENTER
    }
    column.addView(titleText, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(30f).toInt() })

    column.addView(TextView(this).apply {
      typeface = body
      setTextColor(graphite)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
      gravity = Gravity.CENTER
      text = "Tu es concentré depuis"
    }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(10f).toInt() })

    timerText = TextView(this).apply {
      typeface = mono
      setTextColor(paper)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 34f)
      letterSpacing = -0.04f
      gravity = Gravity.CENTER
      fontFeatureSettings = "tnum"
    }
    column.addView(timerText, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(4f).toInt() })

    column.addView(TextView(this).apply {
      typeface = body
      setTextColor(graphite)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
      gravity = Gravity.CENTER
      text = "Le Socle t'attend. Pour récupérer tes apps,\nrepose ton téléphone dessus."
    }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(18f).toInt() })

    val button = TextView(this).apply {
      typeface = sans
      text = "Revenir au calme"
      setTextColor(Color.parseColor("#0A0A0A"))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
      gravity = Gravity.CENTER
      background = GradientDrawable().apply {
        cornerRadius = dp(999f)
        setColor(paper)
      }
      isClickable = true
      isFocusable = true
      setOnClickListener { goHome() }
    }
    column.addView(button, LinearLayout.LayoutParams(-1, dp(58f).toInt()).apply { topMargin = dp(44f).toInt() })

    footText = TextView(this).apply {
      typeface = mono
      setTextColor(Color.parseColor("#55555A"))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
      letterSpacing = 0.14f
      gravity = Gravity.CENTER
    }

    val root = FrameLayout(this).apply {
      setBackgroundColor(Color.BLACK)
      addView(column, FrameLayout.LayoutParams(-1, -2, Gravity.CENTER))
      addView(footText, FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM).apply { bottomMargin = dp(40f).toInt() })
    }
    root.alpha = 0f
    root.scaleX = 1.04f
    root.scaleY = 1.04f
    setContentView(root)
    root.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(420)
      .setInterpolator(android.view.animation.PathInterpolator(0.32f, 0.72f, 0f, 1f)).start()

    if (Build.VERSION.SDK_INT >= 33) {
      onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT) { goHome() }
    }
    bind(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    bind(intent)
  }

  private fun bind(intent: Intent) {
    val pkg = intent.getStringExtra(EXTRA_PACKAGE) ?: ""
    val pm = packageManager
    val label = try {
      pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
    } catch (_: Exception) {
      "Cette app"
    }
    titleText.text = "$label est en pause"
    try {
      iconView.setImageBitmap(AppIcons.grayscale(pm.getApplicationIcon(pkg), dp(52f).toInt()))
      iconView.visibility = View.VISIBLE
    } catch (_: Exception) {
      iconView.visibility = View.GONE
    }
    val mode = SessionStore.read(this).mode
    footText.text = "SOCLE · MODE ${mode.uppercase()}"
  }

  override fun onResume() {
    super.onResume()
    handler.post(ticker)
  }

  override fun onPause() {
    super.onPause()
    handler.removeCallbacks(ticker)
  }

  @Deprecated("Kept for Android < 13")
  override fun onBackPressed() = goHome()

  private fun goHome() {
    startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    finishAndRemoveTask()
  }
}
