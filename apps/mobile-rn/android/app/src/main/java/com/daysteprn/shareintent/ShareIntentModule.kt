package com.daysteprn.shareintent

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class ShareIntentModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ShareIntentModule"

    @ReactMethod
    fun getPendingSharedText(promise: Promise) {
        val text = pendingSharedText
        pendingSharedText = null
        promise.resolve(text)
    }

    companion object {
        @Volatile
        var pendingSharedText: String? = null
    }
}
