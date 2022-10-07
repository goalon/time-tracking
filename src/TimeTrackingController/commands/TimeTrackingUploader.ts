/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as tar from 'tar';
import { Dropbox, Error, files } from 'dropbox';
import { DateTime } from 'luxon';

// Dropbox access token is not provided in git.
import { accessToken } from './secret';

class TimeTrackingUploader {
  private dirPath: string;
  private userId: string;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.dirPath = context.globalStorageUri.fsPath;
    this.userId = context.globalState.get('userId') || '';
    this.context = context;
  }

  static readonly id: string = 'timeTracking.upload';

  async run(auto: boolean = true) {
    const inFilePath = path.join(this.dirPath, `${this.userId}.tgz`);
    const outFilePath = `/${this.userId}.tgz`;
    const dropbox = new Dropbox({ accessToken });

    await tar.create(
      {
        cwd: this.dirPath,
        gzip: true,
        file: inFilePath,
      },
      ['data'],
    );

    // todo check notifications texts

    const contents = await fs.readFile(inFilePath, null);

    await dropbox.filesUpload({ path: outFilePath, contents, mode: { '.tag': 'overwrite' } })
      .then((response: any) => {
        this.context.globalState.update('lastUploadTimestamp', DateTime.now());
        if (!auto) {
          vscode.window.showInformationMessage("Upload successful");
        }
      })
      .catch((uploadErr: Error<files.UploadError>) => {
        console.error(uploadErr);
        if (!auto) {
          vscode.window.showErrorMessage("Upload failed");
        }
      });
  }
}

export default TimeTrackingUploader;
