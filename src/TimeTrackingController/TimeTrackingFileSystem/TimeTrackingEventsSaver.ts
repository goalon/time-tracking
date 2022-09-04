/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import TimeTrackingEvent from '../TimeTrackingEvent';
import TimeTrackingFileSystemHelper from './TimeTrackingFileSystemHelper';

class TimeTrackingEventsSaver {
  private static prepareNewData(events: TimeTrackingEvent[]): Uint8Array {
    const newRawData = events.map((event) => event.serialize()).join('\n');
    return new TextEncoder().encode(newRawData);
  }

  private static mergeData(data1: Uint8Array, data2: Uint8Array): Uint8Array {
    const mergedData = new Uint8Array(data1.length + data2.length);
    mergedData.set(data1);
    mergedData.set(data2, data1.length);
    return mergedData;
  }

  private static async getDataToSave(filePath: vscode.Uri, events: TimeTrackingEvent[]): Promise<Uint8Array> {
    try {
      let rawFileData = await TimeTrackingFileSystemHelper.getRawData(filePath);
      const lastRawFileDataRecord = rawFileData[rawFileData.length - 1];
      const lastSavedEvent = TimeTrackingEvent.deserialize(lastRawFileDataRecord);
      if (lastSavedEvent.interval.start.equals(events[0].interval.start)) {
        rawFileData = rawFileData.slice(1);
        if (rawFileData.length === 0) {
          return this.prepareNewData(events);
        }
      }

      const encodedRawFileData = new TextEncoder().encode(rawFileData.join('\n') + '\n');
      const newData = this.prepareNewData(events);
      return this.mergeData(encodedRawFileData, newData);
    } catch {
      return this.prepareNewData(events);
    }
  }

  static async run(globalStorageUri: vscode.Uri, dayPath: string, events: TimeTrackingEvent[]): Promise<void> {
    const filePath = TimeTrackingFileSystemHelper.dayPathToFilePath(globalStorageUri, dayPath);
    const data = await this.getDataToSave(filePath, events);
    await vscode.workspace.fs.writeFile(filePath, data);
  }
}

export default TimeTrackingEventsSaver;
