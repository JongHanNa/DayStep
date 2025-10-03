package com.daystep.widgetbridge;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void syncTodos(PluginCall call) {
        // Android widget implementation will be added later
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("message", "Android widget not implemented yet");
        call.resolve(result);
    }

    @PluginMethod
    public void getTodos(PluginCall call) {
        JSObject result = new JSObject();
        result.put("todos", new JSObject[0]);
        result.put("count", 0);
        call.resolve(result);
    }

    @PluginMethod
    public void clearTodos(PluginCall call) {
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void reloadWidget(PluginCall call) {
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("message", "Android widget reload not implemented yet");
        call.resolve(result);
    }

    @PluginMethod
    public void scheduleUpdate(PluginCall call) {
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void getWidgetStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", false);
        result.put("message", "Android widgets not implemented yet");
        call.resolve(result);
    }

    @PluginMethod
    public void openApp(PluginCall call) {
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
}