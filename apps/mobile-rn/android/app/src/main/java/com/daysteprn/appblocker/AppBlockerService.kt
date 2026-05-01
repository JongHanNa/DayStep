/**
 * AppBlockerService — 수면 중 앱 차단 Foreground Service
 *
 * UsageStatsManager로 포그라운드 앱 감시 (1초 폴링)
 * 비허용 앱 감지 시 전체화면 차단 오버레이 표시
 */
package com.daysteprn

import android.app.*
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Park
import androidx.compose.material.icons.filled.Nightlight
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.NotificationCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner

class AppBlockerService : Service(), LifecycleOwner, SavedStateRegistryOwner {

    private val lifecycleRegistry = LifecycleRegistry(this)
    private val savedStateRegistryController = SavedStateRegistryController.create(this)

    override val lifecycle: Lifecycle get() = lifecycleRegistry
    override val savedStateRegistry: SavedStateRegistry
        get() = savedStateRegistryController.savedStateRegistry

    companion object {
        const val CHANNEL_ID = "app_blocker_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_STOP = "com.daysteprn.STOP_BLOCKING"
        const val ACTION_RELOAD_WHITELIST = "com.daysteprn.RELOAD_WHITELIST"
        const val EXTRA_MODE = "mode"
        const val MODE_SLEEP = "sleep"
        const val MODE_FOCUS = "focus"

        const val PREFS_NAME = "app_blocker_prefs"
        const val KEY_ALLOWED_SLEEP = "allowed_sleep_packages"
        const val KEY_ALLOWED_FOCUS = "allowed_focus_packages"

        fun prefsKeyForMode(mode: String): String =
            if (mode == MODE_FOCUS) KEY_ALLOWED_FOCUS else KEY_ALLOWED_SLEEP

        // 시스템 필수 앱 — 사용자 선택과 무관하게 항상 허용
        private val SYSTEM_ESSENTIALS = setOf(
            "com.daysteprn",                         // DayStep 자체
            "com.android.systemui",                  // 시스템 UI
            "com.android.launcher",                  // 기본 런처
            "com.android.launcher3",                 // AOSP 런처
            "com.google.android.apps.nexuslauncher", // Pixel 런처
            "com.sec.android.app.launcher",          // Samsung 런처
            "com.android.settings",                  // 설정
            "com.android.dialer",                    // 전화
            "com.google.android.dialer",             // Google 전화
            "com.android.incallui",                  // 통화 UI
            "com.android.phone",                     // 전화 서비스
            "com.android.server.telecom",            // 통신
            "com.android.emergency",                 // 긴급
        )

        @Volatile
        var isRunning = false
            private set
    }

    private var windowManager: WindowManager? = null
    private var overlayView: ComposeView? = null
    private val handler = Handler(Looper.getMainLooper())
    private var isOverlayShowing = false

    // 현재 세션 모드 (sleep 기본). onStartCommand에서 intent extra로 갱신
    private var currentMode: String = MODE_SLEEP

    // 병합 화이트리스트 (SYSTEM_ESSENTIALS + 사용자 선택)
    @Volatile
    private var allowedPackages: Set<String> = SYSTEM_ESSENTIALS

    private val reloadReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == ACTION_RELOAD_WHITELIST) {
                reloadAllowedPackages()
            }
        }
    }
    private var reloadReceiverRegistered = false

    private val pollRunnable = object : Runnable {
        override fun run() {
            checkForegroundApp()
            handler.postDelayed(this, 1000) // 1초마다 체크
        }
    }

    override fun onCreate() {
        super.onCreate()
        savedStateRegistryController.performRestore(null)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotificationChannel()

        val filter = IntentFilter(ACTION_RELOAD_WHITELIST)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(reloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(reloadReceiver, filter)
        }
        reloadReceiverRegistered = true
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }

        // 세션 모드 수신 (기본 sleep)
        val mode = intent?.getStringExtra(EXTRA_MODE)
        if (mode == MODE_SLEEP || mode == MODE_FOCUS) {
            currentMode = mode
        }
        reloadAllowedPackages()

        val notification = buildNotification()
        startForeground(NOTIFICATION_ID, notification)
        isRunning = true

        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)

        // 포그라운드 앱 감시 시작
        handler.post(pollRunnable)

        return START_STICKY
    }

    override fun onDestroy() {
        isRunning = false
        handler.removeCallbacks(pollRunnable)
        removeOverlay()
        if (reloadReceiverRegistered) {
            try {
                unregisterReceiver(reloadReceiver)
            } catch (_: Exception) {}
            reloadReceiverRegistered = false
        }
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_PAUSE)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_STOP)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
        super.onDestroy()
    }

    /**
     * SharedPreferences에서 현재 모드의 사용자 화이트리스트를 읽어
     * SYSTEM_ESSENTIALS와 병합한다.
     */
    private fun reloadAllowedPackages() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val stored = prefs.getStringSet(prefsKeyForMode(currentMode), emptySet()) ?: emptySet()
        allowedPackages = SYSTEM_ESSENTIALS + stored
        android.util.Log.d(
            "AppBlocker",
            "reloadAllowedPackages mode=$currentMode user=${stored.size} total=${allowedPackages.size}"
        )
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ─── 포그라운드 앱 감지 ───

    private fun checkForegroundApp() {
        val hasOverlay = Settings.canDrawOverlays(this)
        val usm = getSystemService(USAGE_STATS_SERVICE) as? UsageStatsManager
        if (usm == null) {
            android.util.Log.e("AppBlocker", "UsageStatsManager is null")
            return
        }

        val now = System.currentTimeMillis()

        // UsageStats 대신 UsageEvents로 최신 포그라운드 앱 감지 (더 정확함)
        val foregroundPackage = getForegroundPackageViaEvents(usm, now)

        if (foregroundPackage == null) {
            android.util.Log.w("AppBlocker", "Could not detect foreground app. overlay=$hasOverlay")
            return
        }

        android.util.Log.d("AppBlocker", "foreground=$foregroundPackage allowed=${isAllowed(foregroundPackage)} overlay=$hasOverlay")

        if (foregroundPackage != null && !isAllowed(foregroundPackage)) {
            showOverlay()
        } else {
            removeOverlay()
        }
    }

    private fun isAllowed(packageName: String): Boolean {
        // 사용자 선택 + 시스템 필수 앱
        if (allowedPackages.contains(packageName)) return true
        // 시스템 UI/런처 관련 패키지는 항상 허용
        if (packageName.startsWith("com.android.") && (
                packageName.contains("launcher") ||
                packageName.contains("home") ||
                packageName.contains("systemui")
            )) return true
        return false
    }

    /**
     * UsageEvents를 사용하여 현재 포그라운드 앱 패키지명 감지
     * queryUsageStats보다 정확하고 즉시 반영됨
     */
    private fun getForegroundPackageViaEvents(usm: UsageStatsManager, now: Long): String? {
        val events = usm.queryEvents(now - 10_000, now) ?: return null
        val event = UsageEvents.Event()
        var lastForegroundPackage: String? = null
        var lastForegroundTime = 0L

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            // ACTIVITY_RESUMED = 앱이 포그라운드로 전환됨 (API 29+는 ACTIVITY_RESUMED, 그 전은 MOVE_TO_FOREGROUND)
            if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED ||
                event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                if (event.timeStamp > lastForegroundTime) {
                    lastForegroundTime = event.timeStamp
                    lastForegroundPackage = event.packageName
                }
            }
        }
        return lastForegroundPackage
    }

    // ─── 오버레이 UI ───

    private fun showOverlay() {
        if (isOverlayShowing) return
        if (!Settings.canDrawOverlays(this)) return

        isOverlayShowing = true

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
        }

        val isFocusMode = currentMode == MODE_FOCUS
        val composeView = ComposeView(this).apply {
            setViewTreeLifecycleOwner(this@AppBlockerService)
            setViewTreeSavedStateRegistryOwner(this@AppBlockerService)
            setContent {
                BlockerOverlayContent(
                    isFocusMode = isFocusMode,
                    onReturnToDayStep = {
                        // DayStep 앱으로 전환
                        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                        launchIntent?.let {
                            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                            startActivity(it)
                        }
                        removeOverlay()
                    }
                )
            }
        }

        overlayView = composeView
        windowManager?.addView(composeView, params)
    }

    private fun removeOverlay() {
        if (!isOverlayShowing) return
        isOverlayShowing = false
        overlayView?.let {
            try {
                windowManager?.removeView(it)
            } catch (_: Exception) {}
        }
        overlayView = null
    }

    // ─── 알림 ───

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "앱 차단 모드",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "수면/집중 세션 중 앱 사용 제한 알림"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val stopIntent = Intent(this, AppBlockerService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val launchPendingIntent = PendingIntent.getActivity(
            this, 1, launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val isFocusMode = currentMode == MODE_FOCUS
        val title = if (isFocusMode) "집중 모드 활성화" else "수면 보호 모드 활성화"
        val text = if (isFocusMode) "집중 중 앱 사용이 제한됩니다" else "수면 중 앱 사용이 제한됩니다"

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setOngoing(true)
            .setContentIntent(launchPendingIntent)
            .addAction(android.R.drawable.ic_delete, "중지", stopPendingIntent)
            .build()
    }
}

// ─── 차단 오버레이 Compose UI ───

@Composable
private fun BlockerOverlayContent(
    isFocusMode: Boolean,
    onReturnToDayStep: () -> Unit,
) {
    val gradientColors = if (isFocusMode) {
        listOf(Color(0xFF1E3A8A), Color(0xFF0F172A)) // 집중: 블루 그라데이션
    } else {
        listOf(Color(0xFF065F46), Color(0xFF0F172A)) // 수면: 그린→블루
    }
    val title = if (isFocusMode) "집중 중입니다" else "수면 중입니다"
    val subtitle = if (isFocusMode)
        "몰입을 위해\n앱 사용이 제한되어 있어요"
    else
        "좋은 수면을 위해\n앱 사용이 제한되어 있어요"

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(colors = gradientColors)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            // 나무 아이콘 (공용)
            Icon(
                imageVector = Icons.Default.Park,
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.6f),
                modifier = Modifier.size(80.dp)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // 보조 아이콘 — 수면: 달, 집중: 달 대신 동일 아이콘 사용(간결)
            Icon(
                imageVector = Icons.Default.Nightlight,
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.4f),
                modifier = Modifier.size(32.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = title,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = subtitle,
                fontSize = 15.sp,
                color = Color.White.copy(alpha = 0.5f),
                textAlign = TextAlign.Center,
                lineHeight = 22.sp,
            )

            Spacer(modifier = Modifier.height(40.dp))

            // DayStep으로 돌아가기 버튼
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White.copy(alpha = 0.15f))
                    .clickable { onReturnToDayStep() }
                    .padding(horizontal = 24.dp, vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "DayStep으로 돌아가기",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White.copy(alpha = 0.7f),
                )
            }
        }
    }
}
