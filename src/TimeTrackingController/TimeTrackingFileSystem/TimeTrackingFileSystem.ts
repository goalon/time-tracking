/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import { DateTime } from 'luxon';
import TimeTrackingEvent from '../TimeTrackingEvent';
import TimeTrackingEventsGrouper from './TimeTrackingEventsGrouper';
import TimeTrackingEventsSaver from './TimeTrackingEventsSaver';
import TimeTrackingFileSystemHelper from './TimeTrackingFileSystemHelper';
import TimeTrackingUploader from '../commands/TimeTrackingUploader';
import Helper from '../Helper';

class TimeTrackingFileSystem {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async save(buffer: TimeTrackingEvent[], auto: boolean = true): Promise<void> {
    const newSaveDateTime = DateTime.now();
    const grouper = new TimeTrackingEventsGrouper(this.context);
    const groupedEvents = grouper.run(buffer);
    const savePromises = Object.keys(groupedEvents).reduce((acc: Promise<void>[], dayPath: string) => {
      const savePromise = TimeTrackingEventsSaver.run(this.context.globalStorageUri, dayPath, groupedEvents[dayPath]);
      acc.push(savePromise);
      return acc;
    }, []);
    await Promise.all(savePromises);

    if (!auto) {
      Helper.showNotification("Save successful");
    }
    this.context.globalState.update('lastSaveTimestamp', newSaveDateTime.toISO());
  }

  async read(dateTime: DateTime): Promise<TimeTrackingEvent[]> {
    const dayPath = TimeTrackingFileSystemHelper.dateTimeToDayPath(dateTime);
    const filePath = TimeTrackingFileSystemHelper.dayPathToFilePath(this.context.globalStorageUri, dayPath);
    const rawData = await TimeTrackingFileSystemHelper.getRawData(filePath);
    const data = rawData.map(d => TimeTrackingEvent.deserialize(d));
    return data;
  }

  async upload(auto: boolean = true): Promise<void> {
    const uploader = new TimeTrackingUploader(this.context);
    await uploader.run(auto);
  }
}

export default TimeTrackingFileSystem;
