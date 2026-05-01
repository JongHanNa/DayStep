package com.daysteprn
import android.content.res.Configuration
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

import android.app.Application
import com.daysteprn.animatedoffset.AnimatedOffsetPackage
import com.daysteprn.appblocker.AppBlockerPackage
import com.daysteprn.calendar.NativeDayTimeGridPackage
import com.daysteprn.calendar.NativeMonthCalendarPackage
import com.daysteprn.calendar.NativeMultiDayTimeGridPackage
import com.daysteprn.calendar.NativeWeekStripCalendarPackage
import com.daysteprn.calldetector.CallDetectorPackage
import com.daysteprn.designsystem.LiquidGlassTabBarPackage
import com.daysteprn.form.NativeTimePickerPackage
import com.daysteprn.form.NativeTodoPickerPackage
import com.daysteprn.garden.NativeCleaningGardenPackage
import com.daysteprn.garden.NativeSleepGardenPackage
import com.daysteprn.navigationbar.NavigationBarPackage
import com.daysteprn.sections.NativeCleanupAccordionPackage
import com.daysteprn.shareintent.ShareIntentPackage
import com.daysteprn.widget.DayStepWidgetPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(LiquidGlassTabBarPackage())
          add(NavigationBarPackage())
          add(NativeWeekStripCalendarPackage())
          add(NativeCleanupAccordionPackage())
          add(NativeSleepGardenPackage())
          add(NativeCleaningGardenPackage())
          add(NativeDayTimeGridPackage())
          add(NativeMultiDayTimeGridPackage())
          add(NativeMonthCalendarPackage())
          add(AppBlockerPackage())
          add(AnimatedOffsetPackage())
          add(NativeTodoPickerPackage())
          add(NativeTimePickerPackage())
          add(ShareIntentPackage())
          add(CallDetectorPackage())
          add(DayStepWidgetPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
