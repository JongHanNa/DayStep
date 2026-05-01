/**
 * NativeProjectFormManager — Android ViewManager for project create/edit sheet
 */
package com.daysteprn.form

import com.daysteprn.util.SimpleEvent

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp

class NativeProjectFormManager : SimpleViewManager<NativeProjectFormView>() {

    override fun getName(): String = "NativeProjectForm"

    override fun createViewInstance(context: ThemedReactContext): NativeProjectFormView {
        val view = NativeProjectFormView(context)

        view.onSaveCallback = { title, description, color, icon ->
            dispatch(context, view.id, "topSave", Arguments.createMap().apply {
                putString("title", title)
                putString("description", description)
                putString("color", color)
                putString("icon", icon)
            })
        }
        view.onStatusChangeCallback = { status ->
            dispatch(context, view.id, "topStatusChange", Arguments.createMap().apply {
                putString("status", status)
            })
        }
        view.onUnlinkTodoCallback = { todoId ->
            dispatch(context, view.id, "topUnlinkTodo", Arguments.createMap().apply {
                putString("todoId", todoId)
            })
        }
        view.onCloseCallback = {
            dispatch(context, view.id, "topClose", Arguments.createMap())
        }
        return view
    }

    private fun dispatch(context: ThemedReactContext, viewId: Int, name: String, payload: WritableMap) {
        val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, viewId)
        dispatcher?.dispatchEvent(
            SimpleEvent(UIManagerHelper.getSurfaceId(context), viewId, name, payload)
        )
    }

    @ReactProp(name = "mode")
    fun setMode(view: NativeProjectFormView, value: String?) { value?.let { view.setMode(it) } }

    @ReactProp(name = "primaryColor")
    fun setPrimaryColor(view: NativeProjectFormView, value: String?) { value?.let { view.setPrimaryColor(it) } }

    @ReactProp(name = "projectData")
    fun setProjectData(view: NativeProjectFormView, value: String?) { value?.let { view.setProjectData(it) } }

    @ReactProp(name = "linkedTodosData")
    fun setLinkedTodosData(view: NativeProjectFormView, value: String?) { value?.let { view.setLinkedTodosData(it) } }

    @ReactProp(name = "paletteColors")
    fun setPaletteColors(view: NativeProjectFormView, value: String?) { value?.let { view.setPaletteColors(it) } }

    @ReactProp(name = "paletteIcons")
    fun setPaletteIcons(view: NativeProjectFormView, value: String?) { value?.let { view.setPaletteIcons(it) } }

    @ReactProp(name = "statusMenuItemsData")
    fun setStatusMenuItemsData(view: NativeProjectFormView, value: String?) { value?.let { view.setStatusMenuItemsData(it) } }

    @ReactProp(name = "statusLabel")
    fun setStatusLabel(view: NativeProjectFormView, value: String?) { value?.let { view.setStatusLabel(it) } }

    @ReactProp(name = "statusBadgeColor")
    fun setStatusBadgeColor(view: NativeProjectFormView, value: String?) { value?.let { view.setStatusBadgeColor(it) } }

    @ReactProp(name = "statusBadgeBg")
    fun setStatusBadgeBg(view: NativeProjectFormView, value: String?) { value?.let { view.setStatusBadgeBg(it) } }

    @ReactProp(name = "loadingTodos", defaultBoolean = false)
    fun setLoadingTodos(view: NativeProjectFormView, value: Boolean) { view.setLoadingTodos(value) }

    @ReactProp(name = "isOpen", defaultBoolean = false)
    fun setIsOpen(view: NativeProjectFormView, value: Boolean) { view.setIsOpen(value) }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        mutableMapOf(
            "topSave" to mapOf("registrationName" to "onSave"),
            "topStatusChange" to mapOf("registrationName" to "onStatusChange"),
            "topUnlinkTodo" to mapOf("registrationName" to "onUnlinkTodo"),
            "topClose" to mapOf("registrationName" to "onClose"),
        )
}
