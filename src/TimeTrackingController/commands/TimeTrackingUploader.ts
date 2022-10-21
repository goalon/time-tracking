/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import * as path from 'path';
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import { constants } from 'fs';
import * as tar from 'tar';
import { Dropbox, Error, files } from 'dropbox';
import { DateTime } from 'luxon';
import Helper from '../Helper';
import { TOKEN_SERVER_HOST } from '../config';

// The server token is not provided in git.
import { SERVER_TOKEN } from '../../secret';

class TimeTrackingUploader {
  private dirPath: string;
  private inFilePath: string;
  private outFilePath: string;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    const userId = context.globalState.get('userId') || '';
    
    this.dirPath = context.globalStorageUri.fsPath;
    this.inFilePath = path.join(this.dirPath, `${userId}.tgz`);
    this.outFilePath = `/${userId}.tgz`;
    this.context = context;
  }

  static readonly id: string = 'timeTracking.upload';

  async run(auto: boolean = true) {
    try {
      await fs.access(this.dirPath, constants.R_OK | constants.W_OK);
    } catch {
      if (!auto) {
        Helper.showNotification("No data to upload", true);
      }
      return;
    }

    // This tokenization schema is subject to hypothetical future changes.
    const accessTokenPromise = this.getAccessToken();
    const compressedArchivePromise = this.createCompressedArchive();
    const [accessToken] = await Promise.all([accessTokenPromise, compressedArchivePromise]);
    const contents = await fs.readFile(this.inFilePath, null);
    await this.uploadDataToDropbox(accessToken, contents, auto);
  }

  private async getAccessToken() {
    const response = await fetch(`${TOKEN_SERVER_HOST}?token=${SERVER_TOKEN}`);
    return response.text();
  }

  private async createCompressedArchive() {
    await tar.create(
      {
        cwd: this.dirPath,
        gzip: true,
        file: this.inFilePath,
      },
      ['data'],
    );
  }

  private async uploadDataToDropbox(accessToken: string, contents: Buffer, auto: boolean = true) {
    const dropbox = new Dropbox({ accessToken });

    await dropbox.filesUpload({ path: this.outFilePath, contents, mode: { '.tag': 'overwrite' } })
      .then((response: any) => {
        this.context.globalState.update('lastUploadTimestamp', DateTime.now());
        if (!auto) {
          Helper.showNotification("Upload successful");
        }
      })
      .catch((uploadErr: Error<files.UploadError>) => {
        console.error(uploadErr);
        if (!auto) {
          Helper.showNotification("Upload failed", true);
        }
      });
  }
}

export default TimeTrackingUploader;
