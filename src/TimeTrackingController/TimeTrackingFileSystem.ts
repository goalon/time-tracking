import * as vscode from 'vscode';
import * as path from 'path';
import { DateTime } from 'luxon';
import TimeTrackingEvent from './TimeTrackingEvent';

// TODO: Add events counter in an interval

class TimeTrackingFileSystem {
  globalStorageUri: vscode.Uri;

  constructor(globalStorageUri: vscode.Uri) {
    this.globalStorageUri = globalStorageUri;
  }

  async save(buffer: any[]) {
    const dt = DateTime.now();
    const filePath = [dt.year.toString(), dt.month.toString(), `${dt.day.toString()}.jsonl`];
    const f = vscode.Uri.file(path.join(this.globalStorageUri.fsPath, 'data', ...filePath));
    try {
      const data = await vscode.workspace.fs.readFile(f);
      const newRawData = buffer.reduce((acc, b) => acc + JSON.stringify(b) + '\n');
      const newData = new TextEncoder().encode(newRawData);
      const mergedData = new Uint8Array(data.length + newData.length);
      mergedData.set(data);
      mergedData.set(newData, data.length);
      await vscode.workspace.fs.writeFile(f, mergedData);
    } catch {
      const newRawData = buffer.reduce((acc, b) => acc + JSON.stringify(b) + '\n');
      const newData = new TextEncoder().encode(newRawData);
      await vscode.workspace.fs.writeFile(f, newData);
    }
  }

  async read(date: DateTime): Promise<TimeTrackingEvent[]> {
    const { year, month, day } = date;
    const filePath = [year, month, day].map(d => d.toString());
    filePath[filePath.length - 1] = `${filePath[filePath.length - 1]}.jsonl`;
    const f = vscode.Uri.file(path.join(this.globalStorageUri.fsPath, 'data', ...filePath));
    // try {
    const rawData = await vscode.workspace.fs.readFile(f);
    const rawData2 = new TextDecoder().decode(rawData);
    const rawData3 = rawData2.split('\n');
    rawData3.pop();
    const data = rawData3.map(d => TimeTrackingEvent.deserialize(d));
    return data;
  }
}

export default TimeTrackingFileSystem;
