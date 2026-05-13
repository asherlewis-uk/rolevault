//
//  live_activitesLiveActivity.swift
//  live-activites
//
//  Created by asher lewis on 5/13/26.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct live_activitesAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct live_activitesLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: live_activitesAttributes.self) { context in
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

extension live_activitesAttributes {
    fileprivate static var preview: live_activitesAttributes {
        live_activitesAttributes(name: "World")
    }
}

extension live_activitesAttributes.ContentState {
    fileprivate static var smiley: live_activitesAttributes.ContentState {
        live_activitesAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: live_activitesAttributes.ContentState {
         live_activitesAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: live_activitesAttributes.preview) {
   live_activitesLiveActivity()
} contentStates: {
    live_activitesAttributes.ContentState.smiley
    live_activitesAttributes.ContentState.starEyes
}
