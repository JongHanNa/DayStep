/**
 * LiquidGlassTabBarManager — Android ViewManager
 * RN Bridge: JS props → LiquidGlassTabBarView setters
 *            LiquidGlassTabBarView events → RN JS callbacks
 */
package com.daysteprn.designsystem

import com.daysteprn.util.SimpleEvent

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp

class LiquidGlassTabBarManager : SimpleViewManager<LiquidGlassTabBarView>() {

    override fun getName(): String = "LiquidGlassTabBar"

    override fun createViewInstance(context: ThemedReactContext): LiquidGlassTabBarView {
        val view = LiquidGlassTabBarView(context)

        view.onTabPressCallback = { index ->
            Log.d("LiquidGlassTabBar", "onTabPress callback: index=$index, viewId=${view.id}")
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            Log.d("LiquidGlassTabBar", "dispatcher=$dispatcher")
            if (dispatcher != null) {
                val event = SimpleEvent(UIManagerHelper.getSurfaceId(context), view.id, "topTabPress",
                    Arguments.createMap().apply { putInt("index", index) })
                Log.d("LiquidGlassTabBar", "dispatching event: ${event.eventName}")
                dispatcher.dispatchEvent(event)
            } else {
                Log.e("LiquidGlassTabBar", "EventDispatcher is NULL for viewId=${view.id}")
            }
        }

        view.onMenuItemPressCallback = { screenName ->
            Log.d("LiquidGlassTabBar", "onMenuItemPress callback: screenName=$screenName")
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(UIManagerHelper.getSurfaceId(context), view.id, "topMenuItemPress",
                    Arguments.createMap().apply { putString("screenName", screenName) })
            )
        }

        view.onHeightChangeCallback = { height ->
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            dispatcher?.dispatchEvent(
                SimpleEvent(UIManagerHelper.getSurfaceId(context), view.id, "topHeightChange",
                    Arguments.createMap().apply { putDouble("height", height.toDouble()) })
            )
        }

        return view
    }

    @ReactProp(name = "tabs")
    fun setTabs(view: LiquidGlassTabBarView, tabs: ReadableArray?) {
        tabs ?: return
        val list = (0 until tabs.size()).mapNotNull { i ->
            val item = tabs.getMap(i) ?: return@mapNotNull null
            TabItemData(
                name      = item.getString("name") ?: "",
                sfSymbol  = item.getString("sfSymbol") ?: "",
            )
        }
        view.setTabs(list)
    }

    @ReactProp(name = "selectedIndex", defaultInt = 0)
    fun setSelectedIndex(view: LiquidGlassTabBarView, index: Int) {
        view.setSelectedIndex(index)
    }

    @ReactProp(name = "primaryColor")
    fun setPrimaryColor(view: LiquidGlassTabBarView, color: String?) {
        color?.let { view.setPrimaryColorHex(it) }
    }

    @ReactProp(name = "timerProgress", defaultFloat = -1f)
    fun setTimerProgress(view: LiquidGlassTabBarView, progress: Float) {
        view.setTimerProgress(progress)
    }

    @ReactProp(name = "isExpanded", defaultBoolean = false)
    fun setIsExpanded(view: LiquidGlassTabBarView, expanded: Boolean) {
        view.setIsExpanded(expanded)
    }

    @ReactProp(name = "menuItems")
    fun setMenuItems(view: LiquidGlassTabBarView, items: ReadableArray?) {
        items ?: return
        val list = (0 until items.size()).mapNotNull { i ->
            val item = items.getMap(i) ?: return@mapNotNull null
            MenuItemData(
                label      = item.getString("label") ?: "",
                sfSymbol   = item.getString("sfSymbol") ?: "",
                screenName = item.getString("screenName") ?: "",
                isActive   = item.getBoolean("isActive"),
            )
        }
        view.setMenuItems(list)
    }

    @ReactProp(name = "showLabels", defaultBoolean = true)
    fun setShowLabels(view: LiquidGlassTabBarView, show: Boolean) {
        view.setShowLabels(show)
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        mutableMapOf(
            "topTabPress"      to mapOf("registrationName" to "onTabPress"),
            "topMenuItemPress" to mapOf("registrationName" to "onMenuItemPress"),
            "topToggleLabels"  to mapOf("registrationName" to "onToggleLabels"),
            "topHeightChange"  to mapOf("registrationName" to "onHeightChange"),
        )
}
