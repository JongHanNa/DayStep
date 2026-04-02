/**
 * NativeWeekStripCalendarManager — Android ViewManager
 * RN Bridge: JS props → NativeWeekStripCalendarView setters
 *            NativeWeekStripCalendarView events → RN JS callbacks
 */
package com.daysteprn

import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp

class NativeWeekStripCalendarManager : SimpleViewManager<NativeWeekStripCalendarView>() {

    override fun getName(): String = "NativeWeekStripCalendar"

    override fun createViewInstance(context: ThemedReactContext): NativeWeekStripCalendarView {
        val view = NativeWeekStripCalendarView(context)

        view.onDateSelectCallback = { dateStr ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topDateSelect",
                    Arguments.createMap().apply { putString("date", dateStr) }
                )
            )
        }

        view.onHeightChangeCallback = { height ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topHeightChange",
                    Arguments.createMap().apply { putDouble("height", height) }
                )
            )
        }

        view.onExpandChangeCallback = { expanded ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topExpandChange",
                    Arguments.createMap().apply { putBoolean("expanded", expanded) }
                )
            )
        }

        return view
    }

    @ReactProp(name = "selectedDate")
    fun setSelectedDate(view: NativeWeekStripCalendarView, date: String?) {
        date?.let { view.setSelectedDate(it) }
    }

    @ReactProp(name = "primaryColor")
    fun setPrimaryColor(view: NativeWeekStripCalendarView, color: String?) {
        color?.let { view.setPrimaryColor(it) }
    }

    // gradientColors, gradientStart/End — Android에서는 투명 배경으로 처리 (RN 배경 그라디언트 사용)
    @ReactProp(name = "gradientColors")
    fun setGradientColors(view: NativeWeekStripCalendarView, colors: com.facebook.react.bridge.ReadableArray?) {
        // Android: 배경 투명 → RN gradient가 비침
    }

    @ReactProp(name = "gradientStartX")
    fun setGradientStartX(view: NativeWeekStripCalendarView, value: Float) {}

    @ReactProp(name = "gradientStartY")
    fun setGradientStartY(view: NativeWeekStripCalendarView, value: Float) {}

    @ReactProp(name = "gradientEndX")
    fun setGradientEndX(view: NativeWeekStripCalendarView, value: Float) {}

    @ReactProp(name = "gradientEndY")
    fun setGradientEndY(view: NativeWeekStripCalendarView, value: Float) {}

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        mutableMapOf(
            "topDateSelect"   to mapOf("registrationName" to "onDateSelect"),
            "topHeightChange"  to mapOf("registrationName" to "onHeightChange"),
            "topExpandChange"  to mapOf("registrationName" to "onExpandChange"),
        )
}
