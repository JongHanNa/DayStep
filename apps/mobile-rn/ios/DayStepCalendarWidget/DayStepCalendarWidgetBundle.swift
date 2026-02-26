//
//  DayStepCalendarWidgetBundle.swift
//  DayStepCalendarWidget
//
//  Created by JongHanNa on 2/26/26.
//

import WidgetKit
import SwiftUI

@main
struct DayStepCalendarWidgetBundle: WidgetBundle {
    var body: some Widget {
        DayStepCalendarWidget()
        DayStepCalendarWidgetControl()
        DayStepCalendarWidgetLiveActivity()
    }
}
