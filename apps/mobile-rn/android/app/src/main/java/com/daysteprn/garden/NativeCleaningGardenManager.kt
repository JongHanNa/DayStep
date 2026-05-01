/**
 * NativeCleaningGardenManager — Android ViewManager
 * RN Bridge: JS props → NativeCleaningGardenView setters
 *            NativeCleaningGardenView events → RN JS callbacks
 */
package com.daysteprn.garden

import com.daysteprn.util.SimpleEvent

import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp

class NativeCleaningGardenManager : SimpleViewManager<NativeCleaningGardenView>() {

    override fun getName(): String = "NativeCleaningGarden"

    override fun createViewInstance(context: ThemedReactContext): NativeCleaningGardenView {
        val view = NativeCleaningGardenView(context)

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

        view.onViewModeChangeCallback = { mode ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topViewModeChange",
                    Arguments.createMap().apply { putString("mode", mode) }
                )
            )
        }

        view.onMonthChangeCallback = { year, month ->
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

        return view
    }

    @ReactProp(name = "viewMode")
    fun setViewMode(view: NativeCleaningGardenView, mode: String?) {
        mode?.let { view.setViewMode(it) }
    }

    @ReactProp(name = "selectedDate")
    fun setSelectedDate(view: NativeCleaningGardenView, date: String?) {
        date?.let { view.setSelectedDate(it) }
    }

    @ReactProp(name = "primaryColor")
    fun setPrimaryColor(view: NativeCleaningGardenView, color: String?) {
        color?.let { view.setPrimaryColor(it) }
    }

    @ReactProp(name = "gardenData")
    fun setGardenData(view: NativeCleaningGardenView, json: String?) {
        json?.let { view.setGardenData(it) }
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        mutableMapOf(
            "topDateSelect" to mapOf("registrationName" to "onDateSelect"),
            "topHeightChange" to mapOf("registrationName" to "onHeightChange"),
            "topViewModeChange" to mapOf("registrationName" to "onViewModeChange"),
            "topMonthChange" to mapOf("registrationName" to "onMonthChange"),
        )
}
