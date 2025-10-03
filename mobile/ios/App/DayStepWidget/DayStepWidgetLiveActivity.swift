//
//  DayStepWidgetLiveActivity.swift
//  DayStepWidget
//
//  Created by JongHanNa on 8/26/25.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct DayStepWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct DayStepWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DayStepWidgetAttributes.self) { context in
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

extension DayStepWidgetAttributes {
    fileprivate static var preview: DayStepWidgetAttributes {
        DayStepWidgetAttributes(name: "World")
    }
}

extension DayStepWidgetAttributes.ContentState {
    fileprivate static var smiley: DayStepWidgetAttributes.ContentState {
        DayStepWidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: DayStepWidgetAttributes.ContentState {
         DayStepWidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: DayStepWidgetAttributes.preview) {
   DayStepWidgetLiveActivity()
} contentStates: {
    DayStepWidgetAttributes.ContentState.smiley
    DayStepWidgetAttributes.ContentState.starEyes
}
