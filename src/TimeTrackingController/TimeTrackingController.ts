/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import * as uuid from 'uuid';
import { DateTime } from 'luxon';
import TimeTrackingEventBuffer from './TimeTrackingEventBuffer';
import { TimeTrackingOpener, TimeTrackingUploader } from './commands/commands';

class TimeTrackingController {
  private context: vscode.ExtensionContext;
  private buffer: TimeTrackingEventBuffer;

  // todo lookup and check private

  constructor(context: vscode.ExtensionContext) {
    this.context = context;

    // TODO Move elsewhere
    if (!context.globalState.get('userId')) {
        context.globalState.update('userId', uuid.v4());
    }

    this.buffer = new TimeTrackingEventBuffer(context);
  }

  private saveOnInterval(): vscode.Disposable {
    const saveInterval = setInterval(
      async () => {
        await this.buffer.save();
      },
      60 * 60 * 1000, // todo unify times with variables
    );

    // todo fix ui

    return new vscode.Disposable(() => {
      clearInterval(saveInterval);
    });
  }

  private uploadOnInterval(): vscode.Disposable {
    const uploadInterval = setInterval(
      async () => {
        await this.buffer.upload();
      },
      2 * 60 * 60 * 1000,
    );

    return new vscode.Disposable(() => {
      clearInterval(uploadInterval);
    });
  }

  async activate() {
    vscode.workspace.onDidChangeTextDocument(
      (event) => {
        this.buffer.push(event);
      },
      undefined,
      this.context.subscriptions,
    );
    
    const timeTrackingOpener = new TimeTrackingOpener(this.context, this.buffer);
    
    const openerDisposable = vscode.commands.registerCommand(TimeTrackingOpener.id, () => timeTrackingOpener.run());
    const dumperDisposable = vscode.commands.registerCommand('timeTracking.dump', async () => {
      await this.buffer.save();
    });
    const uploaderDisposable = vscode.commands.registerCommand(TimeTrackingUploader.id, async () => {
      const lastUploadTimestamp: string = this.context.globalState.get('lastUploadTimestamp') || '';
      if (lastUploadTimestamp) {
        const lastUploadDateTime = DateTime.fromISO(lastUploadTimestamp);
        if (DateTime.now().diff(lastUploadDateTime).hours < 2) {
          vscode.window.showErrorMessage("Upload unavailable", "Last upload took place less than 2 hours ago."); // todo check
          return;
        }
      }

      await this.buffer.upload();
    });
    const saveOnIntervalDisposable = this.saveOnInterval();
    const uploadOnIntervalDisposable = this.uploadOnInterval();

    vscode.commands.executeCommand('setContext', 'timeTracking.showCommand', true);
    
    this.context.subscriptions.push(
      saveOnIntervalDisposable,
      uploadOnIntervalDisposable,
      openerDisposable,
      dumperDisposable,
      uploaderDisposable,
    );

    const lastUploadTimestamp: string = this.context.globalState.get('lastUploadTimestamp') || '';
    if (!lastUploadTimestamp) {
      await this.buffer.upload();
    } else {
      const lastUploadDateTime = DateTime.fromISO(lastUploadTimestamp);
      if (DateTime.now().diff(lastUploadDateTime).hours > 8) {
        await this.buffer.upload(); // todo unify
      }
    }
  }

  async deactivate() {
    vscode.commands.executeCommand('setContext', 'timeTracking.showCommand', false);
    
    await this.buffer.save();
  }
}

export default TimeTrackingController;
