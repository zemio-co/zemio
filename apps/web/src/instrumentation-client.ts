import { plugin as windowEventsPlugin } from "@appsignal/plugin-window-events";
import { getErrorTracker } from "@/lib/error-tracking/client";

// AppSignal's browser SDK does not capture uncaught exceptions or unhandled
// promise rejections on its own — that is what the window-events plugin adds.
// Without it only the explicit captureError() calls would report anything.
const tracker = getErrorTracker();
if (tracker) {
	tracker.use(windowEventsPlugin());
}
