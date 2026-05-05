/**
 * AppBlockerModule — React Native NativeModule for Android app blocking
 *
 * iOS의 FamilyControls/ManagedSettings 대응
 * Foreground Service + UsageStats + Overlay 방식
 */
package com.daysteprn.appblocker

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream

class AppBlockerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AppBlockerModule"

    /**
     * 앱 차단 서비스 시작
     * @param mode "sleep" | "focus" — 해당 모드의 화이트리스트를 로드한다
     */
    @ReactMethod
    fun startBlocking(mode: String?, promise: Promise) {
        try {
            val intent = Intent(reactContext, AppBlockerService::class.java).apply {
                val resolvedMode = when (mode) {
                    AppBlockerService.MODE_FOCUS -> AppBlockerService.MODE_FOCUS
                    else -> AppBlockerService.MODE_SLEEP
                }
                putExtra(AppBlockerService.EXTRA_MODE, resolvedMode)
            }
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

    // ─── 허용 앱 관리 ───

    /**
     * 런처에 노출되는 설치 앱 목록 + 아이콘 file:// URI 반환
     * 자기 자신(com.daysteprn)은 제외
     */
    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val intent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val resolveInfos = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.queryIntentActivities(
                    intent,
                    PackageManager.ResolveInfoFlags.of(0L)
                )
            } else {
                @Suppress("DEPRECATION")
                pm.queryIntentActivities(intent, 0)
            }

            val iconDir = File(reactContext.cacheDir, "app_icons").apply {
                if (!exists()) mkdirs()
            }

            val seen = mutableSetOf<String>()
            val result = Arguments.createArray()

            resolveInfos
                .mapNotNull { it.activityInfo?.applicationInfo }
                .filter { appInfo ->
                    appInfo.packageName != null &&
                        appInfo.packageName != reactContext.packageName &&
                        seen.add(appInfo.packageName)
                }
                .sortedBy { pm.getApplicationLabel(it).toString().lowercase() }
                .forEach { appInfo ->
                    val map = Arguments.createMap()
                    map.putString("packageName", appInfo.packageName)
                    map.putString("appName", pm.getApplicationLabel(appInfo).toString())

                    val iconPath = try {
                        saveIconToCache(pm.getApplicationIcon(appInfo), iconDir, appInfo.packageName)
                    } catch (_: Exception) {
                        null
                    }
                    if (iconPath != null) {
                        map.putString("iconPath", "file://$iconPath")
                    } else {
                        map.putNull("iconPath")
                    }
                    result.pushMap(map)
                }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("LIST_ERROR", "Failed to list installed apps: ${e.message}")
        }
    }

    /**
     * 현재 모드의 허용 앱 목록을 저장하고, 서비스에 reload 브로드캐스트
     */
    @ReactMethod
    fun setAllowedPackages(mode: String, packages: ReadableArray, promise: Promise) {
        try {
            val key = AppBlockerService.prefsKeyForMode(mode)
            val set = mutableSetOf<String>()
            for (i in 0 until packages.size()) {
                val pkg = packages.getString(i)
                if (!pkg.isNullOrBlank()) set.add(pkg)
            }

            val prefs = reactContext.getSharedPreferences(
                AppBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            prefs.edit().putStringSet(key, set).apply()

            if (AppBlockerService.isRunning) {
                val intent = Intent(AppBlockerService.ACTION_RELOAD_WHITELIST).apply {
                    setPackage(reactContext.packageName)
                }
                reactContext.sendBroadcast(intent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SAVE_ERROR", "Failed to save allowed packages: ${e.message}")
        }
    }

    /**
     * 저장된 허용 앱 패키지명 배열 반환
     */
    @ReactMethod
    fun getAllowedPackages(mode: String, promise: Promise) {
        try {
            val key = AppBlockerService.prefsKeyForMode(mode)
            val prefs = reactContext.getSharedPreferences(
                AppBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            val stored = prefs.getStringSet(key, emptySet()) ?: emptySet()
            val result = Arguments.createArray()
            stored.forEach { result.pushString(it) }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("LOAD_ERROR", "Failed to load allowed packages: ${e.message}")
        }
    }

    // ─── 내부 헬퍼 ───

    /**
     * Drawable 아이콘을 cacheDir에 PNG로 저장하고 절대경로 반환
     */
    private fun saveIconToCache(drawable: Drawable, dir: File, packageName: String): String {
        val file = File(dir, "${packageName}.png")
        // 재사용: 동일 패키지의 기존 파일 덮어쓰기
        val size = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) 96 else 72
        val bitmap = if (drawable is BitmapDrawable && drawable.bitmap != null) {
            Bitmap.createScaledBitmap(drawable.bitmap, size, size, true)
        } else {
            val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bmp)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)
            bmp
        }
        FileOutputStream(file).use { fos ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, fos)
        }
        return file.absolutePath
    }

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
