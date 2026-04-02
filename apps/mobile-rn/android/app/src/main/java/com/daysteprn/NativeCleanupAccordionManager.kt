/**
 * NativeCleanupAccordionManager — Android ViewManager
 * RN Bridge: JS props → NativeCleanupAccordionView setters
 *            NativeCleanupAccordionView events → RN JS callbacks
 */
package com.daysteprn

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp

class NativeCleanupAccordionManager : SimpleViewManager<NativeCleanupAccordionView>() {

    override fun getName(): String = "NativeCleanupAccordion"

    override fun createViewInstance(context: ThemedReactContext): NativeCleanupAccordionView {
        val view = NativeCleanupAccordionView(context)

        view.onCategoryPressCallback = { categoryKey ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topCategoryPress",
                    Arguments.createMap().apply { putString("categoryKey", categoryKey) }
                )
            )
        }

        view.onGroupToggleCallback = { groupIndex ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(
                    UIManagerHelper.getSurfaceId(context), view.id, "topGroupToggle",
                    Arguments.createMap().apply { putInt("groupIndex", groupIndex) }
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

    @ReactProp(name = "accordionData")
    fun setAccordionData(view: NativeCleanupAccordionView, data: String?) {
        data?.let { view.setAccordionData(it) }
    }

    @ReactProp(name = "primaryColor")
    fun setPrimaryColor(view: NativeCleanupAccordionView, color: String?) {
        color?.let { view.setPrimaryColor(it) }
    }

    @ReactProp(name = "expandedGroups")
    fun setExpandedGroups(view: NativeCleanupAccordionView, groups: ReadableArray?) {
        if (groups != null) {
            val indices = mutableListOf<Int>()
            for (i in 0 until groups.size()) {
                indices.add(groups.getInt(i))
            }
            view.setExpandedGroups(indices)
        }
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        mutableMapOf(
            "topCategoryPress" to mapOf("registrationName" to "onCategoryPress"),
            "topGroupToggle" to mapOf("registrationName" to "onGroupToggle"),
            "topHeightChange" to mapOf("registrationName" to "onHeightChange"),
        )
}
