package com.daysteprn.calendar

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class NativeMultiDayTimeGridPackage : ReactPackage {
    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> = emptyList()
    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> =
        listOf(NativeMultiDayTimeGridManager())
}
