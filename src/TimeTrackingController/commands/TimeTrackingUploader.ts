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

  async run() {
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
    
    // TODO Unify the code. Provide the notifications for successes and errors.
    // TODO block uploading more than once per 2 hours
    const contents = await fs.readFile(inFilePath, null);
    
    await dropbox.filesUpload({ path: outFilePath, contents, mode: { '.tag': 'overwrite' } })
      .then((response: any) => {
        console.log(response);

        this.context.globalState.update('lastUploadTimestamp', DateTime.now());
      })
      .catch((uploadErr: Error<files.UploadError>) => {
        console.log(uploadErr.user_message);
      });
  }
}

export default TimeTrackingUploader;
