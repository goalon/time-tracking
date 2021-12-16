import * as vscode from 'vscode';
import * as path from 'path';
import { DateTime } from 'luxon';

class FileSystem {
  globalStorageUri: vscode.Uri;

  constructor(globalStorageUri: vscode.Uri) {
    this.globalStorageUri = globalStorageUri;
  }

  async init() {
    const dirName = path.basename(this.globalStorageUri.fsPath);
    const dir = vscode.Uri.file(path.dirname(this.globalStorageUri.fsPath));
	  const dirs = await vscode.workspace.fs.readDirectory(dir);
    if (!dirs.some(([name, ft]) => name === dirName && ft === vscode.FileType.Directory)) {
      const dataDir = vscode.Uri.file(path.join(this.globalStorageUri.fsPath, 'data'));
      await vscode.workspace.fs.createDirectory(dataDir);
    }
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

  async read(filePath: string[]) {
    const f = vscode.Uri.file(path.join(this.globalStorageUri.fsPath, 'data', ...filePath));
    // try {
    const rawData = await vscode.workspace.fs.readFile(f);
    const rawData2 = new TextDecoder().decode(rawData);
    const rawData3 = rawData2.split('\n');
    rawData3.pop();
    const data = rawData3.map(d => JSON.parse(d));
    return data;
  }
}

export default FileSystem;
