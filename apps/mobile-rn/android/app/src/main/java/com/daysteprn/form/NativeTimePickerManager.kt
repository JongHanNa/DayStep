/**
 * NativeTimePickerManager — Android ViewManager
 * RN Bridge: JS props → NativeTimePickerView setters
 *            NativeTimePickerView events → RN JS callbacks
 */
package com.daysteprn.form

import com.daysteprn.util.SimpleEvent

import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp

class NativeTimePickerManager : SimpleViewManager<NativeTimePickerView>() {

    override fun getName(): String = "NativeTimePicker"

    override fun createViewInstance(context: ThemedReactContext): NativeTimePickerView {
        val view = NativeTimePickerView(context)

        view.onTimeChangeCallback = { hour, minute ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topTimeChange",
                    Arguments.createMap().apply {
                        putInt("hour", hour)
                        putInt("minute", minute)
                    }
                )
            )
        }

        return view
    }

    @ReactProp(name = "hour")
    fun setHour(view: NativeTimePickerView, hour: Int) {
        view.setHour(hour)
    }

    @ReactProp(name = "minute")
    fun setMinute(view: NativeTimePickerView, minute: Int) {
        view.setMinute(minute)
    }

    @ReactProp(name = "heightDp")
    fun setHeightDp(view: NativeTimePickerView, height: Int) {
        view.setHeightDp(height)
    }

    @ReactProp(name = "minuteInterval")
    fun setMinuteInterval(view: NativeTimePickerView, interval: Int) {
        view.setMinuteInterval(interval)
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        mutableMapOf(
            "topTimeChange" to mapOf("registrationName" to "onTimeChange")
        )
}
