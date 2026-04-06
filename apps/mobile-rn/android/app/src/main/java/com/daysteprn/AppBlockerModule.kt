/**
 * AppBlockerModule — React Native NativeModule for Android app blocking
 *
 * iOS의 FamilyControls/ManagedSettings 대응
 * Foreground Service + UsageStats + Overlay 방식
 */
package com.daysteprn

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.*

class AppBlockerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AppBlockerModule"

    /**
     * 앱 차단 서비스 시작
     */
    @ReactMethod
    fun startBlocking(promise: Promise) {
        try {
            val intent = Intent(reactContext, AppBlockerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_ERROR", "Failed to start blocking service: ${e.message}")
        }
    }

    /**
     * 앱 차단 서비스 중지
     */
    @ReactMethod
    fun stopBlocking(promise: Promise) {
        try {
            val intent = Intent(reactContext, AppBlockerService::class.java)
            reactContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", "Failed to stop blocking service: ${e.message}")
        }
    }

    /**
     * 차단 서비스 활성화 여부
     */
    @ReactMethod
    fun isBlockingActive(promise: Promise) {
        promise.resolve(AppBlockerService.isRunning)
    }

    /**
     * 필요 권한 모두 있는지 확인
     * - SYSTEM_ALERT_WINDOW (오버레이)
     * - PACKAGE_USAGE_STATS (사용 접근)
     */
    @ReactMethod
    fun hasRequiredPermissions(promise: Promise) {
        val hasOverlay = Settings.canDrawOverlays(reactContext)
        val hasUsageStats = hasUsageStatsPermission()
        promise.resolve(hasOverlay && hasUsageStats)
    }

    /**
     * 권한 상태 반환: "approved" | "denied" | "notDetermined"
     */
    @ReactMethod
    fun getPermissionStatus(promise: Promise) {
        val hasOverlay = Settings.canDrawOverlays(reactContext)
        val hasUsageStats = hasUsageStatsPermission()

        when {
            hasOverlay && hasUsageStats -> promise.resolve("approved")
            else -> promise.resolve("notDetermined")
        }
    }

    /**
     * 오버레이 권한 요청 (설정 화면으로 이동)
     */
    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                android.net.Uri.parse("package:${reactContext.packageName}")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", "Failed to open overlay settings: ${e.message}")
        }
    }

    /**
     * 사용 접근 권한 요청 (설정 화면으로 이동)
     */
    @ReactMethod
    fun requestUsageStatsPermission(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", "Failed to open usage access settings: ${e.message}")
        }
    }

    /**
     * 사용 접근 기능 사용 가능 여부 (항상 true — Android 5.0+)
     */
    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(true)
    }

    // ─── 내부 헬퍼 ───

    private fun hasUsageStatsPermission(): Boolean {
        val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                reactContext.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                reactContext.packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }
}
