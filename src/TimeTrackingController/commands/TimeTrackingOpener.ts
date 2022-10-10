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
import TimeTrackingWebview from '../TimeTrackingWebview';
import TimeTrackingEventStaticBuffer from '../TimeTrackingEventStaticBuffer';
import Helper from '../Helper';
import { SAMPLING_INTERVAL_SECONDS, DEFAULT_TIME_SPAN_MINUTES } from '../config';

enum WebviewActionName {
  loadLiveData = 'loadLiveData',
  loadDayData = 'loadDayData',
  save = 'save',
  upload = 'upload',
  saveEnd = 'saveEnd',
  uploadEnd = 'uploadEnd',
  refreshMetadata = 'refreshMetadata',
  changeTimeSpan = 'changeTimeSpan',
  changeTimeBoundaries = 'changeTimeBoundaries',
}

class TimeTrackingOpener {
  static readonly id: string = 'timeTracking.open';

  private context: vscode.ExtensionContext;
  private buffer: TimeTrackingEventBuffer;
  private panel: vscode.WebviewPanel | null;

  constructor(context: vscode.ExtensionContext, buffer: TimeTrackingEventBuffer) {
    this.context = context;
    this.buffer = buffer;
    this.panel = null;
  }

  private refreshMetadata() {
    this.panel!.webview.postMessage({
      action: WebviewActionName.refreshMetadata,
      data: Helper.getTimestampMetadata(this.context),
    });
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
        retainContextWhenHidden: true,
        localResourceRoots: this.getLocalResourceRoots(),
      },
    );

    const webview = new TimeTrackingWebview(this.context, this.panel);
    this.panel.webview.html = webview.content;
    const refreshWebview = (timeSpanMinutes: number = DEFAULT_TIME_SPAN_MINUTES) => () => {
      this.panel!.webview.postMessage({ action: WebviewActionName.loadLiveData, data: this.buffer.getDataForPlot(timeSpanMinutes) });
    };
    refreshWebview()();

    let webviewRefreshInterval = setInterval(refreshWebview(), SAMPLING_INTERVAL_SECONDS * 1000);
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
                Helper.showNotification("Data file not found", true);
              } else {
                console.error(error);
                Helper.showNotification("Unknown error", true);
              }
              this.panel!.webview.postMessage({ action: WebviewActionName.loadDayData, error: true });
            }
            break;
          case WebviewActionName.changeTimeSpan:
            const { timeSpanMinutes } = message.data;
            clearInterval(webviewRefreshInterval);
            refreshWebview(timeSpanMinutes)();
            webviewRefreshInterval = setInterval(
              refreshWebview(timeSpanMinutes),
              Helper.getSamplingIntervalSeconds(timeSpanMinutes) * 1000,
            );
            break;
          case WebviewActionName.save:
            await this.buffer.save(false);
            this.refreshMetadata();
            this.panel!.webview.postMessage({ action: WebviewActionName.saveEnd });
            break;
          case WebviewActionName.upload:
            if (Helper.checkUploadInterval(this.context, false)) {
              await this.buffer.upload(false);
              this.refreshMetadata();
            }
            this.panel!.webview.postMessage({ action: WebviewActionName.uploadEnd });
            break;
          case WebviewActionName.refreshMetadata:
            this.refreshMetadata();
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
    const staticResourcesPath = path.join(this.context.extensionPath, 'static');
    const staticResourcesUri = vscode.Uri.file(staticResourcesPath);
    const nodeModulesPath = path.join(this.context.extensionPath, 'node_modules');
		const nodeModulesUri = vscode.Uri.file(nodeModulesPath);
  
    return [staticResourcesUri, nodeModulesUri];
  }
}

export default TimeTrackingOpener;
