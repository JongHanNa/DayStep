package com.daysteprn.widget

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DayStepWidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DayStepWidgetModule"

    /** RN → 월간 데이터 JSON을 SharedPreferences에 저장 후 위젯 갱신 */
    @ReactMethod
    fun updateWidgetData(jsonString: String, promise: Promise) {
        try {
            val ctx = reactApplicationContext
            WidgetDataStore.saveCalendarJson(ctx, jsonString)
            DayStepCalendarWidgetProvider.reloadAll(ctx)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_WIDGET_UPDATE", e.message, e)
        }
    }

    /** 앱 포그라운드 복귀 시 위젯 강제 갱신 */
    @ReactMethod
    fun reloadWidgetTimelines(promise: Promise) {
        try {
            DayStepCalendarWidgetProvider.reloadAll(reactApplicationContext)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_WIDGET_RELOAD", e.message, e)
        }
    }
}
