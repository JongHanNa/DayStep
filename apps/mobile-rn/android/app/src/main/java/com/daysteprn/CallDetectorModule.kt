package com.daysteprn

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule

class CallDetectorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CallDetectorModule"

    private var isListening = false
    private var wasInCall = false

    // Legacy API (< Android 12)
    @Suppress("DEPRECATION")
    private val phoneStateListener = object : PhoneStateListener() {
        @Deprecated("Deprecated in Java")
        override fun onCallStateChanged(state: Int, phoneNumber: String?) {
            handleCallState(state)
        }
    }

    // Modern API (Android 12+)
    private val telephonyCallback: Any? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        object : TelephonyCallback(), TelephonyCallback.CallStateListener {
            override fun onCallStateChanged(state: Int) {
                handleCallState(state)
            }
        }
    } else null

    private fun handleCallState(state: Int) {
        if (!isListening) return

        when (state) {
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                // 통화 중
                wasInCall = true
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                if (wasInCall) {
                    // 통화 종료
                    wasInCall = false
                    sendEvent()
                }
            }
        }
    }

    private fun sendEvent() {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onCallEnded", null)
    }

    @ReactMethod
    fun startListening(promise: Promise) {
        if (isListening) {
            promise.resolve(null)
            return
        }

        // READ_PHONE_STATE 권한 확인
        val hasPermission = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasPermission) {
            promise.reject("PERMISSION_DENIED", "READ_PHONE_STATE 권한이 필요합니다")
            return
        }

        val telephonyManager = reactContext.getSystemService(TelephonyManager::class.java)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && telephonyCallback != null) {
            telephonyManager.registerTelephonyCallback(
                reactContext.mainExecutor,
                telephonyCallback as TelephonyCallback
            )
        } else {
            @Suppress("DEPRECATION")
            telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE)
        }

        isListening = true
        promise.resolve(null)
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        if (!isListening) {
            promise.resolve(null)
            return
        }

        val telephonyManager = reactContext.getSystemService(TelephonyManager::class.java)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && telephonyCallback != null) {
            telephonyManager.unregisterTelephonyCallback(telephonyCallback as TelephonyCallback)
        } else {
            @Suppress("DEPRECATION")
            telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE)
        }

        isListening = false
        promise.resolve(null)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN event emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN event emitter
    }
}
