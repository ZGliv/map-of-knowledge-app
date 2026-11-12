import UIKit
import WebKit
import Capacitor

/// The app's web view, set up so Explore's media plays with sound on its own: the Watch feed's
/// YouTube player and the reels' narration start without a tap, inline, never full screen.
///
/// Capacitor has no config option for this; its own setup (8.4.1) already makes both choices, and
/// this subclass pins them, so a Capacitor update or a plugin cannot quietly bring back the
/// "tap before sound" rule and leave Explore muted. Main.storyboard uses it as the bridge.
class BridgeViewController: CAPBridgeViewController {
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let configuration = super.webViewConfiguration(for: instanceConfiguration)
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        return configuration
    }
}
