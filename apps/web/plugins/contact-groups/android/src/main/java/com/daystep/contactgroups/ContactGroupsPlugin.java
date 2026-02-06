package com.daystep.contactgroups;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ContactGroups")
public class ContactGroupsPlugin extends Plugin {

    @PluginMethod
    public void getGroups(PluginCall call) {
        call.reject("Contact groups are not supported on Android yet");
    }

    @PluginMethod
    public void getGroupById(PluginCall call) {
        call.reject("Contact groups are not supported on Android yet");
    }

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isSupported", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", false);
        ret.put("message", "Contact groups are not supported on Android");
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", false);
        ret.put("message", "Contact groups are not supported on Android");
        call.resolve(ret);
    }
}