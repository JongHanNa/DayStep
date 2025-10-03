#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Capacitor 플러그인 등록
CAP_PLUGIN(DayStepWidgetPlugin, "DayStepWidget",
    CAP_PLUGIN_METHOD(updateTodoData, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(refreshWidget, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(updateAllWidgetData, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(scheduleNotification, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestNotificationPermission, CAPPluginReturnPromise);
)