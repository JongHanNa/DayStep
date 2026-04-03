/**
 * NativeMultiDayTimeGridManager — ViewManager bridge
 * RN props → NativeMultiDayTimeGridView, events → RN callbacks
 */
package com.daysteprn

import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp

class NativeMultiDayTimeGridManager : SimpleViewManager<NativeMultiDayTimeGridView>() {

    override fun getName(): String = "NativeMultiDayTimeGrid"

    override fun createViewInstance(context: ThemedReactContext): NativeMultiDayTimeGridView {
        val view = NativeMultiDayTimeGridView(context)

        view.onDateSelectCallback = { dateStr ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topDateSelect",
                    Arguments.createMap().apply { putString("date", dateStr) }
                )
            )
        }

        view.onTodoPressCb = { todoId ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topTodoPress",
                    Arguments.createMap().apply { putString("todoId", todoId) }
                )
            )
        }

        view.onDateRangeChangeCb = { startDate, endDate ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topDateRangeChange",
                    Arguments.createMap().apply {
                        putString("startDate", startDate)
                        putString("endDate", endDate)
                    }
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

        return view
    }

    @ReactProp(name = "dayCount")
    fun setDayCount(view: NativeMultiDayTimeGridView, count: Int) {
        view.setDayCount(count)
    }

    @ReactProp(name = "centerDate")
    fun setCenterDate(view: NativeMultiDayTimeGridView, date: String?) {
        date?.let { view.setCenterDate(it) }
    }

    @ReactProp(name = "primaryColor")
    fun setPrimaryColor(view: NativeMultiDayTimeGridView, color: String?) {
        color?.let { view.setPrimaryColor(it) }
    }

    @ReactProp(name = "todoData")
    fun setTodoData(view: NativeMultiDayTimeGridView, json: String?) {
        json?.let { view.setTodoData(it) }
    }

    @ReactProp(name = "eventData")
    fun setEventData(view: NativeMultiDayTimeGridView, json: String?) {
        json?.let { view.setEventData(it) }
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        mutableMapOf(
            "topDateSelect" to mapOf("registrationName" to "onDateSelect"),
            "topTodoPress" to mapOf("registrationName" to "onTodoPress"),
            "topDateRangeChange" to mapOf("registrationName" to "onDateRangeChange"),
            "topHeightChange" to mapOf("registrationName" to "onHeightChange"),
        )
}
