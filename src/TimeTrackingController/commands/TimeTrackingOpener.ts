/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import { DateTime } from 'luxon';
import * as path from 'path';
import TimeTrackingEventBuffer from '../TimeTrackingEventBuffer';
import TimeTrackingWebview from '../TimeTrackingWebview/TimeTrackingWebview';
import TimeTrackingEventStaticBuffer from '../TimeTrackingEventStaticBuffer';

enum WebviewActionName {
  loadLiveData = 'loadLiveData',
  loadDayData = 'loadDayData',
  saveDayData = 'saveDayData',
  uploadDayData = 'uploadDayData',
  changeTimeSpan = 'changeTimeSpan',
}

class TimeTrackingOpener {
  static readonly id: string = 'timeTracking.open';

  context: vscode.ExtensionContext;
  buffer: TimeTrackingEventBuffer;
  panel: vscode.WebviewPanel | null;

  constructor(context: vscode.ExtensionContext, buffer: TimeTrackingEventBuffer) {
    this.context = context;
    this.buffer = buffer;
    this.panel = null;
  }

  run() {
    if (this.panel) {
      this.panel.reveal();
      
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'timeTracking',
      'Time Tracking',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        enableCommandUris: true,
        retainContextWhenHidden: true,
        localResourceRoots: this.getLocalResourceRoots(),
      },
    );

    const webview = new TimeTrackingWebview(this.context, this.panel);
    this.panel.webview.html = webview.content;
    const refreshWebview = (timeSpanMinutes: number = 10) => () => {
      this.panel!.webview.postMessage({ action: WebviewActionName.loadLiveData, data: this.buffer.getDataForPlot(timeSpanMinutes) });
    };
    refreshWebview()();

    let webviewRefreshInterval = setInterval(refreshWebview(), 30 * 1000);

    this.panel.webview.onDidReceiveMessage(
      async (message: { action: WebviewActionName, data: any }) => {
        switch (message.action) {
          case WebviewActionName.loadDayData:
            const selectedDate = DateTime.fromISO(message.data.date);
            const staticBuffer = new TimeTrackingEventStaticBuffer(this.context);
            try {
              const normalizedBuffer = await staticBuffer.read(selectedDate);
              this.panel!.webview.postMessage({ action: WebviewActionName.loadDayData, data: normalizedBuffer });
            } catch {
              vscode.window.showErrorMessage("Data file not found");
              this.panel!.webview.postMessage({ action: WebviewActionName.loadDayData, error: true }); // todo check
            }
            break;
          case WebviewActionName.changeTimeSpan:
            clearInterval(webviewRefreshInterval);
            refreshWebview(message.data.timeSpanMinutes)();
            webviewRefreshInterval = setInterval(refreshWebview(message.data.timeSpanMinutes), 30 * 1000); // todo dynamic refresh time
            break;
          default:
            console.error("Webview action not recognized");
        }
      },
      undefined,
      this.context.subscriptions
    );

    this.panel.onDidDispose(
      () => {
        clearInterval(webviewRefreshInterval);
        this.panel = null;
      },
      undefined,
      this.context.subscriptions,
    );
  }

  private getLocalResourceRoots(): vscode.Uri[] {
    const localResourcesPath = path.join(this.context.extensionPath, 'src', 'TimeTrackingController', 'TimeTrackingWebview');
    const localResourcesUri = vscode.Uri.file(localResourcesPath);
    const nodeModulesPath = path.join(this.context.extensionPath, 'node_modules');
		const nodeModulesUri = vscode.Uri.file(nodeModulesPath);
  
    return [localResourcesUri, nodeModulesUri];
  }
}

export default TimeTrackingOpener;
