package com.daysteprn.navigationbar

import android.app.Activity
import android.graphics.Color
import android.os.Build
import android.view.View
import android.view.WindowInsetsController
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

class NavigationBarModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NavigationBarColor"

    @ReactMethod
    fun setColor(color: String, lightIcons: Boolean) {
        UiThreadUtil.runOnUiThread {
            val activity: Activity = reactApplicationContext.currentActivity ?: return@runOnUiThread
            try {
                val parsedColor = Color.parseColor(color)
                activity.window.navigationBarColor = parsedColor

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val controller = activity.window.insetsController
                    if (lightIcons) {
                        controller?.setSystemBarsAppearance(
                            0,
                            WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                        )
                    } else {
                        controller?.setSystemBarsAppearance(
                            WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                            WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                        )
                    }
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    @Suppress("DEPRECATION")
                    val flags = activity.window.decorView.systemUiVisibility
                    activity.window.decorView.systemUiVisibility = if (lightIcons) {
                        flags and View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR.inv()
                    } else {
                        flags or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
                    }
                }
            } catch (_: Exception) {}
        }
    }
}
