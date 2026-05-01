/**
 * NativeTodoPickerManager — Android ViewManager
 * RN Bridge: JS props → NativeTodoPickerView setters
 *            NativeTodoPickerView events → RN JS callbacks
 */
package com.daysteprn.form

import com.daysteprn.util.SimpleEvent

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp

class NativeTodoPickerManager : SimpleViewManager<NativeTodoPickerView>() {

    override fun getName(): String = "NativeTodoPicker"

    override fun createViewInstance(context: ThemedReactContext): NativeTodoPickerView {
        val view = NativeTodoPickerView(context)

        view.onTodoToggleCallback = { todoId, todoTitle, isLinked ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topTodoToggle",
                    Arguments.createMap().apply {
                        putString("todoId", todoId)
                        putString("todoTitle", todoTitle)
                        putBoolean("isLinked", isLinked)
                    }
                )
            )
        }

        view.onCloseCallback = {
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topClose",
                    Arguments.createMap()
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

        return view
    }

    @ReactProp(name = "todosData")
    fun setTodosData(view: NativeTodoPickerView, data: String?) {
        data?.let { view.setTodosData(it) }
    }

    @ReactProp(name = "linkedTodoIds")
    fun setLinkedTodoIds(view: NativeTodoPickerView, ids: ReadableArray?) {
        if (ids != null) {
            val idList = mutableListOf<String>()
            for (i in 0 until ids.size()) {
                ids.getString(i)?.let { idList.add(it) }
            }
            view.setLinkedTodoIds(idList)
        }
    }

    @ReactProp(name = "primaryColor")
    fun setPrimaryColor(view: NativeTodoPickerView, color: String?) {
        color?.let { view.setPrimaryColor(it) }
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        mutableMapOf(
            "topTodoToggle" to mapOf("registrationName" to "onTodoToggle"),
            "topClose" to mapOf("registrationName" to "onClose"),
            "topHeightChange" to mapOf("registrationName" to "onHeightChange"),
        )
}
