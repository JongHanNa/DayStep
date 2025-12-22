#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// ThemeBridgePlugin.swift에서 정의한 메소드들을 Capacitor에 등록
CAP_PLUGIN(ThemeBridgePlugin, "ThemeBridge",
    CAP_PLUGIN_METHOD(setScrollViewBackgroundColor, CAPPluginReturnPromise);
)
