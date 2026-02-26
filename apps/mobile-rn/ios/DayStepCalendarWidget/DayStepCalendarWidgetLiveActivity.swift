//
//  DayStepCalendarWidgetLiveActivity.swift
//  DayStepCalendarWidget
//
//  Created by JongHanNa on 2/26/26.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct DayStepCalendarWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct DayStepCalendarWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DayStepCalendarWidgetAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension DayStepCalendarWidgetAttributes {
    fileprivate static var preview: DayStepCalendarWidgetAttributes {
        DayStepCalendarWidgetAttributes(name: "World")
    }
}

extension DayStepCalendarWidgetAttributes.ContentState {
    fileprivate static var smiley: DayStepCalendarWidgetAttributes.ContentState {
        DayStepCalendarWidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: DayStepCalendarWidgetAttributes.ContentState {
         DayStepCalendarWidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: DayStepCalendarWidgetAttributes.preview) {
   DayStepCalendarWidgetLiveActivity()
} contentStates: {
    DayStepCalendarWidgetAttributes.ContentState.smiley
    DayStepCalendarWidgetAttributes.ContentState.starEyes
}
