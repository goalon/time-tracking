import * as vscode from 'vscode';
import TimeTrackingWebview from './TimeTrackingWebview/TimeTrackingWebview';
import TimeTrackingEventBuffer from './TimeTrackingEventBuffer';
import { DateTime, Interval, Duration } from 'luxon';

type WebviewViewName = 'live' | 'calendar' | 'day' | 'weird';

class TimeTrackingController {
  context: vscode.ExtensionContext;
  buffer: TimeTrackingEventBuffer;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.buffer = new TimeTrackingEventBuffer(context.globalStorageUri);
  }

  activate() {
    // TODO: Save to file in an hour
    // TODO: Queue buffer for limiting entries (last 10 minutes)

    // TODO: It's also a disposable
    vscode.workspace.onDidChangeTextDocument((event) => {
      this.buffer.push(event);
    });

    const disposable = vscode.commands.registerCommand('timeTracking.open', () => {
      const panel = vscode.window.createWebviewPanel(
        'timeTracking',
        'Time Tracking',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          enableCommandUris: true,
        },
      );
      const webview = new TimeTrackingWebview(this.context.extensionPath, panel);
      panel.webview.html = webview.getContent();
      panel.webview.postMessage({ data: this.buffer.getDataForPlot() }); // TODO: Move to content
      const refreshWebview = () => {
        panel.webview.postMessage({ data: this.buffer.getDataForPlot() });
      };
      const refreshWebview2 = () => {
        panel.webview.postMessage({ data: this.buffer.getDataForPlot2() });
      };
      let webviewRefreshInterval = setInterval(refreshWebview, 5000); // TODO: DISPOSABLE

      panel.webview.onDidReceiveMessage(
        async (message: { view: WebviewViewName, date?: string, fromTime?: string, toTime?: string, annotations?: boolean }) => {
          switch (message.view) {
            case 'live':
              panel.webview.postMessage({ data: this.buffer.getDataForPlot() });
              webviewRefreshInterval = setInterval(refreshWebview, 5000);
              break;
            case 'calendar':
              clearInterval(webviewRefreshInterval);
              break;
            case 'weird':
              clearInterval(webviewRefreshInterval);
              webviewRefreshInterval = setInterval(refreshWebview2, 5000);
              break;
            case 'day':
              const selectedDate = DateTime.fromISO(message.date!);
              await this.buffer.read(selectedDate);
              clearInterval(webviewRefreshInterval);

              if (message.fromTime && message.toTime) {
                const [fromHours, fromMinutes] = message.fromTime.split(':');
                const [toHours, toMinutes] = message.toTime.split(':');
                const fromDateTime = selectedDate.set({ hour: parseInt(fromHours, 10), minute: parseInt(fromMinutes, 10) });
                const toDateTime = selectedDate.set({ hour: parseInt(toHours, 10), minute: parseInt(toMinutes, 10) });
                const interval = Interval.fromDateTimes(fromDateTime, toDateTime);
                panel.webview.postMessage({ data: this.buffer.getDataForPlot('static', interval, message.annotations) });
              } else {
                const interval = Interval.after(selectedDate, Duration.fromObject({ hours: 24 }));
                panel.webview.postMessage({ data: this.buffer.getDataForPlot('static', interval, message.annotations) });
              }
              break;
            // TODO: default
          }
        },
        undefined,
        this.context.subscriptions
      );
    });

    const disposable2 = vscode.commands.registerCommand('timeTracking.dump', () => {
      this.buffer.save();
    });

    this.context.subscriptions.push(disposable);
    this.context.subscriptions.push(disposable2);
  }
}

export default TimeTrackingController;
