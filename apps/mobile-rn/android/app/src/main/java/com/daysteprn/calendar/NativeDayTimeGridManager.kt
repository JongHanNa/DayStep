/**
 * NativeDayTimeGridManager — ViewManager bridge
 * RN props → NativeDayTimeGridView, events → RN callbacks
 */
package com.daysteprn

import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp

class NativeDayTimeGridManager : SimpleViewManager<NativeDayTimeGridView>() {

    override fun getName(): String = "NativeDayTimeGrid"

    override fun createViewInstance(context: ThemedReactContext): NativeDayTimeGridView {
        val view = NativeDayTimeGridView(context)

        view.onDateSelectCb = { dateStr ->
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

    @ReactProp(name = "selectedDate")
    fun setSelectedDate(view: NativeDayTimeGridView, date: String?) {
        date?.let { view.setSelectedDate(it) }
    }

    @ReactProp(name = "primaryColor")
    fun setPrimaryColor(view: NativeDayTimeGridView, color: String?) {
        color?.let { view.setPrimaryColor(it) }
    }

    @ReactProp(name = "todoData")
    fun setTodoData(view: NativeDayTimeGridView, json: String?) {
        json?.let { view.setTodoData(it) }
    }

    @ReactProp(name = "eventData")
    fun setEventData(view: NativeDayTimeGridView, json: String?) {
        json?.let { view.setEventData(it) }
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        mutableMapOf(
            "topDateSelect" to mapOf("registrationName" to "onDateSelect"),
            "topTodoPress" to mapOf("registrationName" to "onTodoPress"),
            "topHeightChange" to mapOf("registrationName" to "onHeightChange"),
        )
}
