//
//  DayStepWidgetBundle.swift
//  DayStepWidget
//
//  Created by JongHanNa on 8/26/25.
//

import WidgetKit
import SwiftUI

@main
struct DayStepWidgetBundle: WidgetBundle {
    var body: some Widget {
        DayStepWidget()
        // Pomodoro Timer Live Activity (Dynamic Island + Lock Screen)
        if #available(iOS 16.2, *) {
            PomodoroLiveActivity()
        }
    }
}
