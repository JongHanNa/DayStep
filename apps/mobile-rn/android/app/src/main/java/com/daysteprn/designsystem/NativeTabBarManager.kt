/**
 * NativeTabBarManager — Android ViewManager
 * RN Bridge: JS props → NativeTabBarView setters
 *            NativeTabBarView events → RN JS callbacks
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

class NativeTabBarManager : SimpleViewManager<NativeTabBarView>() {

    override fun getName(): String = "NativeTabBar"

    override fun createViewInstance(context: ThemedReactContext): NativeTabBarView {
        val view = NativeTabBarView(context)

        view.onTabPressCallback = { index ->
            Log.d("NativeTabBar", "onTabPress callback: index=$index, viewId=${view.id}")
            val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
            Log.d("NativeTabBar", "dispatcher=$dispatcher")
            if (dispatcher != null) {
                val event = SimpleEvent(UIManagerHelper.getSurfaceId(context), view.id, "topTabPress",
                    Arguments.createMap().apply { putInt("index", index) })
                Log.d("NativeTabBar", "dispatching event: ${event.eventName}")
                dispatcher.dispatchEvent(event)
            } else {
                Log.e("NativeTabBar", "EventDispatcher is NULL for viewId=${view.id}")
            }
        }

        view.onMenuItemPressCallback = { screenName ->
            Log.d("NativeTabBar", "onMenuItemPress callback: screenName=$screenName")
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
    fun setTabs(view: NativeTabBarView, tabs: ReadableArray?) {
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
    fun setSelectedIndex(view: NativeTabBarView, index: Int) {
        view.setSelectedIndex(index)
    }

    @ReactProp(name = "primaryColor")
    fun setPrimaryColor(view: NativeTabBarView, color: String?) {
        color?.let { view.setPrimaryColorHex(it) }
    }

    @ReactProp(name = "timerProgress", defaultFloat = -1f)
    fun setTimerProgress(view: NativeTabBarView, progress: Float) {
        view.setTimerProgress(progress)
    }

    @ReactProp(name = "isExpanded", defaultBoolean = false)
    fun setIsExpanded(view: NativeTabBarView, expanded: Boolean) {
        view.setIsExpanded(expanded)
    }

    @ReactProp(name = "menuItems")
    fun setMenuItems(view: NativeTabBarView, items: ReadableArray?) {
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
    fun setShowLabels(view: NativeTabBarView, show: Boolean) {
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
