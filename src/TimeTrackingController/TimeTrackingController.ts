/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import * as uuid from 'uuid';
import TimeTrackingEventBuffer from './TimeTrackingEventBuffer';
import { TimeTrackingOpener, TimeTrackingUploader } from './commands/commands';
import { AUTOSAVE_SECONDS, AUTOUPLOAD_CHECK_SECONDS } from './config';
import Helper from './Helper';

class TimeTrackingController {
  private context: vscode.ExtensionContext;
  private buffer: TimeTrackingEventBuffer;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;

    if (!context.globalState.get('userId')) {
        context.globalState.update('userId', uuid.v4());
    }

    this.buffer = new TimeTrackingEventBuffer(context);
  }

  private saveOnInterval(): vscode.Disposable {
    const saveInterval = setInterval(
      async () => await this.buffer.save(),
      AUTOSAVE_SECONDS * 1000,
    );

    return new vscode.Disposable(() => {
      clearInterval(saveInterval);
    });
  }

  private async autoUploadWithCheck() {
    if (Helper.checkUploadInterval(this.context)) {
      await this.buffer.upload();
    }
  }

  private uploadOnInterval(): vscode.Disposable {
    const uploadInterval = setInterval(
      async () => this.autoUploadWithCheck(),
      AUTOUPLOAD_CHECK_SECONDS * 1000,
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
      await this.buffer.save(false);
    });
    const uploaderDisposable = vscode.commands.registerCommand(TimeTrackingUploader.id, async () => {
      if (Helper.checkUploadInterval(this.context, false)) {
        await this.buffer.upload(false);
      }
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

    await this.autoUploadWithCheck();
  }

  // It does not seem to be working, unfortunately.
  async deactivate() {
    vscode.commands.executeCommand('setContext', 'timeTracking.showCommand', false);
    
    await this.buffer.save();
  }
}

export default TimeTrackingController;
