#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the CAP_PLUGIN Macro, and
// each method the plugin supports using the CAP_PLUGIN_METHOD macro.
CAP_PLUGIN(WidgetBridgePlugin, "WidgetBridge",
           CAP_PLUGIN_METHOD(syncTodos, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getTodos, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(clearTodos, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(reloadWidget, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(scheduleUpdate, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getWidgetStatus, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(openApp, CAPPluginReturnPromise);
)