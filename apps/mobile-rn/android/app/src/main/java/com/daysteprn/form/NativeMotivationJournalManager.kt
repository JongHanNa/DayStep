/**
 * NativeMotivationJournalManager — Android ViewManager
 * RN Bridge: JS props → NativeMotivationJournalView setters
 *            View 이벤트 → SimpleEvent dispatch → JS callbacks
 */
package com.daysteprn.form

import com.daysteprn.util.SimpleEvent

import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp

class NativeMotivationJournalManager : SimpleViewManager<NativeMotivationJournalView>() {

    override fun getName(): String = "NativeMotivationJournal"

    override fun createViewInstance(context: ThemedReactContext): NativeMotivationJournalView {
        val view = NativeMotivationJournalView(context)

        view.onSaveCallback = { title, content, isPinned ->
            dispatch(context, view.id, "topSave", Arguments.createMap().apply {
                putString("title", title)
                putString("content", content)
                putBoolean("isPinned", isPinned)
            })
        }
        view.onPinToggleCallback = { pinned ->
            dispatch(context, view.id, "topPinToggle", Arguments.createMap().apply {
                putBoolean("isPinned", pinned)
            })
        }
        view.onDeleteCallback = {
            dispatch(context, view.id, "topDelete", Arguments.createMap())
        }
        view.onUnlinkTodoCallback = { todoId ->
            dispatch(context, view.id, "topUnlinkTodo", Arguments.createMap().apply {
                putString("todoId", todoId)
            })
        }
        view.onLinkTodoRequestCallback = {
            dispatch(context, view.id, "topLinkTodoRequest", Arguments.createMap())
        }
        view.onCloseCallback = {
            dispatch(context, view.id, "topClose", Arguments.createMap())
        }

        return view
    }

    private fun dispatch(
        context: ThemedReactContext,
        viewId: Int,
        name: String,
        payload: com.facebook.react.bridge.WritableMap,
    ) {
        val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, viewId)
        dispatcher?.dispatchEvent(
            SimpleEvent(UIManagerHelper.getSurfaceId(context), viewId, name, payload)
        )
    }

    @ReactProp(name = "mode")
    fun setMode(view: NativeMotivationJournalView, value: String?) {
        value?.let { view.setMode(it) }
    }

    @ReactProp(name = "primaryColor")
    fun setPrimaryColor(view: NativeMotivationJournalView, value: String?) {
        value?.let { view.setPrimaryColor(it) }
    }

    @ReactProp(name = "prompt")
    fun setPrompt(view: NativeMotivationJournalView, value: String?) {
        value?.let { view.setPrompt(it) }
    }

    @ReactProp(name = "noteData")
    fun setNoteData(view: NativeMotivationJournalView, value: String?) {
        value?.let { view.setNoteData(it) }
    }

    @ReactProp(name = "linkedTodosData")
    fun setLinkedTodosData(view: NativeMotivationJournalView, value: String?) {
        value?.let { view.setLinkedTodosData(it) }
    }

    @ReactProp(name = "isOpen", defaultBoolean = false)
    fun setIsOpen(view: NativeMotivationJournalView, value: Boolean) {
        view.setIsOpen(value)
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        mutableMapOf(
            "topSave" to mapOf("registrationName" to "onSave"),
            "topPinToggle" to mapOf("registrationName" to "onPinToggle"),
            "topDelete" to mapOf("registrationName" to "onDelete"),
            "topUnlinkTodo" to mapOf("registrationName" to "onUnlinkTodo"),
            "topLinkTodoRequest" to mapOf("registrationName" to "onLinkTodoRequest"),
            "topClose" to mapOf("registrationName" to "onClose"),
        )
}
