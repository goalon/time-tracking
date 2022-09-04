/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import { DateTime, Interval, Duration } from 'luxon';
import TimeTrackingFileSystem from './TimeTrackingFileSystem/TimeTrackingFileSystem';
import TimeTrackingEventNormalizedBuffer from './TimeTrackingEventBuffer/TimeTrackingEventNormalizedBuffer';

class TimeTrackingEventStaticBuffer {
  fileSystem: TimeTrackingFileSystem;

  constructor(context: vscode.ExtensionContext) {
    this.fileSystem = new TimeTrackingFileSystem(context);
  }

  async read(date: DateTime) {
    const buffer = await this.fileSystem.read(date);
    const interval = Interval.after(date, { days: 1 });
    return new TimeTrackingEventNormalizedBuffer(buffer, interval, Duration.fromObject({ seconds: 30 })); // TODO autoscale
  }
}

export default TimeTrackingEventStaticBuffer;
