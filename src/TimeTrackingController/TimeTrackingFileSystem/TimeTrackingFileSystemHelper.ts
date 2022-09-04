/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import { DateTime } from 'luxon';
import * as vscode from 'vscode';
import * as path from 'path';

const FILE_EXTENSION = 'jsonl';
const DATA_DIR = 'data';

class TimeTrackingFileSystemHelper {
  static dateTimeToDayPath(dt: DateTime): string {
    const dayList = [dt.year, dt.month, dt.day].map(d => d.toString());
    return path.join(...dayList);
  }

  static dayPathToFilePath(globalStorageUri: vscode.Uri, dayPath: string): vscode.Uri {
    const dayPathStr = path.join(globalStorageUri.fsPath, DATA_DIR, `${dayPath}.${FILE_EXTENSION}`);
    return vscode.Uri.file(dayPathStr);
  }

  static async getRawData(filePath: vscode.Uri) {
    const fileData = await vscode.workspace.fs.readFile(filePath);
    const decodedData = new TextDecoder().decode(fileData);
    const splitData = decodedData.split('\n').filter(d => !!d);
    return splitData;
  }
}

export default TimeTrackingFileSystemHelper;
