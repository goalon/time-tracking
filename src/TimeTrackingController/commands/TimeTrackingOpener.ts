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
  save = 'save',
  upload = 'upload',
  refreshMetadata = 'refreshMetadata',
  changeTimeSpan = 'changeTimeSpan',
  changeTimeBoundaries = 'changeTimeBoundaries',
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
    const staticBuffer = new TimeTrackingEventStaticBuffer(this.context);

    this.panel.webview.onDidReceiveMessage(
      async (message: { action: WebviewActionName, data: any }) => {
        switch (message.action) {
          case WebviewActionName.loadDayData:
            const selectedDate = DateTime.fromISO(message.data.date);
            try {
              const normalizedBuffer = await staticBuffer.read(selectedDate);
              this.panel!.webview.postMessage({ action: WebviewActionName.loadDayData, data: normalizedBuffer });
            } catch (error) {
              if (error instanceof vscode.FileSystemError) {
                vscode.window.showErrorMessage("Data file not found");
              } else {
                console.error(error);
                vscode.window.showErrorMessage("Unknown error");
              }
              this.panel!.webview.postMessage({ action: WebviewActionName.loadDayData, error: true }); // todo check
            }
            break;
          case WebviewActionName.changeTimeSpan:
            clearInterval(webviewRefreshInterval);
            refreshWebview(message.data.timeSpanMinutes)();
            webviewRefreshInterval = setInterval(refreshWebview(message.data.timeSpanMinutes), 30 * 1000); // todo dynamic refresh time
            break;
          case WebviewActionName.save:
            await this.buffer.save();
            this.panel!.webview.postMessage({
              action: WebviewActionName.refreshMetadata,
              data: this.getMetadata(),
            }); // todo unify
            break;
          case WebviewActionName.upload:
            await this.buffer.upload();
            this.panel!.webview.postMessage({
              action: WebviewActionName.refreshMetadata,
              data: this.getMetadata(),
            }); // todo unify
            break;
          case WebviewActionName.refreshMetadata:
            this.panel!.webview.postMessage({
              action: WebviewActionName.refreshMetadata,
              data: this.getMetadata(),
            });
            break;
          case WebviewActionName.changeTimeBoundaries:
            const { fromTime, toTime } = message.data;
            const normalizedBuffer = staticBuffer.changeTimeBoundaries(fromTime, toTime);
            this.panel!.webview.postMessage({ action: WebviewActionName.changeTimeBoundaries, data: normalizedBuffer });
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

  private getMetadata() {
    // todo move elsewhere and unify two
    // todo njk when dates empty
    const lastSaveTimestampRaw: string = this.context.globalState.get('lastSaveTimestamp') || '';
		const lastSaveTimestamp = lastSaveTimestampRaw ?
			DateTime.fromISO(lastSaveTimestampRaw).toISO({ includeOffset: false }) :
			'';
		const lastUploadTimestampRaw: string = this.context.globalState.get('lastUploadTimestamp') || '';
		const lastUploadTimestamp = lastUploadTimestampRaw ?
			DateTime.fromISO(lastUploadTimestampRaw).toISO({ includeOffset: false }) :
			'';

    return { lastSaveTimestamp, lastUploadTimestamp };
  }
}

export default TimeTrackingOpener;
