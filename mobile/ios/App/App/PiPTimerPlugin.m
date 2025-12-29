//
//  PiPTimerPlugin.m
//  App
//
//  Capacitor 플러그인 브릿지: PiP Timer
//

#import <Capacitor/Capacitor.h>

CAP_PLUGIN(PiPTimerPlugin, "PiPTimer",
    CAP_PLUGIN_METHOD(isPiPAvailable, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(startPiP, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(updateTimer, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stopPiP, CAPPluginReturnPromise);
)
