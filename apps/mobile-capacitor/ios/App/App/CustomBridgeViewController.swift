//
//  CustomBridgeViewController.swift
//  App
//
//  커스텀 Capacitor Bridge: 로컬 플러그인 수동 등록
//

import UIKit
import Capacitor

class CustomBridgeViewController: CAPBridgeViewController {

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()

        // PiPTimer 플러그인 수동 등록
        bridge?.registerPluginInstance(PiPTimerPlugin())
        print("[CustomBridge] ✅ PiPTimerPlugin registered manually")
    }
}
