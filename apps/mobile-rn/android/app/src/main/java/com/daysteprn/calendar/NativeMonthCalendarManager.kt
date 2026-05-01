/**
 * NativeMonthCalendarManager — ViewManager bridge
 * RN props → NativeMonthCalendarView, events → RN callbacks
 */
package com.daysteprn.calendar

import com.daysteprn.util.SimpleEvent

import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp

class NativeMonthCalendarManager : SimpleViewManager<NativeMonthCalendarView>() {

    override fun getName(): String = "NativeMonthCalendar"

    override fun createViewInstance(context: ThemedReactContext): NativeMonthCalendarView {
        val view = NativeMonthCalendarView(context)

        view.onDateSelectCb = { dateStr ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topDateSelect",
                    Arguments.createMap().apply { putString("date", dateStr) }
                )
            )
        }

        view.onHeightChangeCb = { height ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topHeightChange",
                    Arguments.createMap().apply { putDouble("height", height) }
                )
            )
        }

        view.onMonthChangeCb = { year, month ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topMonthChange",
                    Arguments.createMap().apply {
                        putInt("year", year)
                        putInt("month", month)
                    }
                )
            )
        }

        view.onNavigateToPlannerCb = { dateStr ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topNavigateToPlanner",
                    Arguments.createMap().apply { putString("date", dateStr) }
                )
            )
        }

        return view
    }

    @ReactProp(name = "selectedDate")
    fun setSelectedDate(view: NativeMonthCalendarView, date: String?) {
        date?.let { view.setSelectedDate(it) }
    }

    @ReactProp(name = "primaryColor")
    fun setPrimaryColor(view: NativeMonthCalendarView, color: String?) {
        color?.let { view.setPrimaryColor(it) }
    }

    @ReactProp(name = "monthData")
    fun setMonthData(view: NativeMonthCalendarView, json: String?) {
        json?.let { view.setMonthData(it) }
    }

    @ReactProp(name = "eventData")
    fun setEventData(view: NativeMonthCalendarView, json: String?) {
        json?.let { view.setEventData(it) }
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        mutableMapOf(
            "topDateSelect" to mapOf("registrationName" to "onDateSelect"),
            "topHeightChange" to mapOf("registrationName" to "onHeightChange"),
            "topMonthChange" to mapOf("registrationName" to "onMonthChange"),
            "topNavigateToPlanner" to mapOf("registrationName" to "onNavigateToPlanner"),
        )
}
