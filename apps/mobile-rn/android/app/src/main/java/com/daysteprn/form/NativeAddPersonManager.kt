/**
 * NativeAddPersonManager — Android ViewManager for person create/edit sheet
 */
package com.daysteprn.form

import com.daysteprn.util.SimpleEvent

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp

class NativeAddPersonManager : SimpleViewManager<NativeAddPersonView>() {

    override fun getName(): String = "NativeAddPerson"

    override fun createViewInstance(context: ThemedReactContext): NativeAddPersonView {
        val view = NativeAddPersonView(context)

        view.onSaveCallback = { name, nickname, rel, role, dept ->
            dispatch(context, view.id, "topSave", Arguments.createMap().apply {
                putString("name", name)
                putString("nickname", nickname)
                putArray("selectedRelationshipIds", toArray(rel))
                putArray("selectedRoleIds", toArray(role))
                putArray("selectedDepartmentIds", toArray(dept))
            })
        }
        view.onDeleteCallback = {
            dispatch(context, view.id, "topDelete", Arguments.createMap())
        }
        view.onCloseCallback = {
            dispatch(context, view.id, "topClose", Arguments.createMap())
        }
        view.onCategoryAddCallback = { kind, name, color ->
            dispatch(context, view.id, "topCategoryAdd", Arguments.createMap().apply {
                putString("kind", kind); putString("name", name); putString("color", color)
            })
        }
        view.onCategoryRenameCallback = { kind, id, name ->
            dispatch(context, view.id, "topCategoryRename", Arguments.createMap().apply {
                putString("kind", kind); putString("id", id); putString("name", name)
            })
        }
        view.onCategoryRecolorCallback = { kind, id, color ->
            dispatch(context, view.id, "topCategoryRecolor", Arguments.createMap().apply {
                putString("kind", kind); putString("id", id); putString("color", color)
            })
        }
        view.onCategoryDeleteCallback = { kind, id ->
            dispatch(context, view.id, "topCategoryDelete", Arguments.createMap().apply {
                putString("kind", kind); putString("id", id)
            })
        }
        return view
    }

    private fun toArray(list: List<String>): WritableArray {
        val arr = Arguments.createArray()
        list.forEach { arr.pushString(it) }
        return arr
    }

    private fun dispatch(context: ThemedReactContext, viewId: Int, name: String, payload: WritableMap) {
        val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, viewId)
        dispatcher?.dispatchEvent(
            SimpleEvent(UIManagerHelper.getSurfaceId(context), viewId, name, payload)
        )
    }

    @ReactProp(name = "mode")
    fun setMode(view: NativeAddPersonView, value: String?) { value?.let { view.setMode(it) } }

    @ReactProp(name = "primaryColor")
    fun setPrimaryColor(view: NativeAddPersonView, value: String?) { value?.let { view.setPrimaryColor(it) } }

    @ReactProp(name = "personData")
    fun setPersonData(view: NativeAddPersonView, value: String?) { value?.let { view.setPersonData(it) } }

    @ReactProp(name = "relationships")
    fun setRelationships(view: NativeAddPersonView, value: String?) { value?.let { view.setRelationships(it) } }

    @ReactProp(name = "roles")
    fun setRoles(view: NativeAddPersonView, value: String?) { value?.let { view.setRoles(it) } }

    @ReactProp(name = "departments")
    fun setDepartments(view: NativeAddPersonView, value: String?) { value?.let { view.setDepartments(it) } }

    @ReactProp(name = "selectedRelationshipIds")
    fun setSelectedRelationshipIds(view: NativeAddPersonView, value: String?) { value?.let { view.setSelectedRelationshipIds(it) } }

    @ReactProp(name = "selectedRoleIds")
    fun setSelectedRoleIds(view: NativeAddPersonView, value: String?) { value?.let { view.setSelectedRoleIds(it) } }

    @ReactProp(name = "selectedDepartmentIds")
    fun setSelectedDepartmentIds(view: NativeAddPersonView, value: String?) { value?.let { view.setSelectedDepartmentIds(it) } }

    @ReactProp(name = "defaultColorByKind")
    fun setDefaultColorByKind(view: NativeAddPersonView, value: String?) { value?.let { view.setDefaultColorByKind(it) } }

    @ReactProp(name = "paletteColors")
    fun setPaletteColors(view: NativeAddPersonView, value: String?) { value?.let { view.setPaletteColors(it) } }

    @ReactProp(name = "isOpen", defaultBoolean = false)
    fun setIsOpen(view: NativeAddPersonView, value: Boolean) { view.setIsOpen(value) }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        mutableMapOf(
            "topSave" to mapOf("registrationName" to "onSave"),
            "topDelete" to mapOf("registrationName" to "onDelete"),
            "topClose" to mapOf("registrationName" to "onClose"),
            "topCategoryAdd" to mapOf("registrationName" to "onCategoryAdd"),
            "topCategoryRename" to mapOf("registrationName" to "onCategoryRename"),
            "topCategoryRecolor" to mapOf("registrationName" to "onCategoryRecolor"),
            "topCategoryDelete" to mapOf("registrationName" to "onCategoryDelete"),
        )
}
