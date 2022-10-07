/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import { DateTime, Interval } from 'luxon';
import TimeTrackingFileSystem from './TimeTrackingFileSystem/TimeTrackingFileSystem';
import TimeTrackingEvent from './TimeTrackingEvent';
import Helper from './Helper';

class TimeTrackingEventStaticBuffer {
  private fileSystem: TimeTrackingFileSystem;
  private date?: DateTime;
  private buffer?: TimeTrackingEvent[];

  constructor(context: vscode.ExtensionContext) {
    this.fileSystem = new TimeTrackingFileSystem(context);
  }

  async read(date: DateTime) {
    this.date = date;
    this.buffer = await this.fileSystem.read(date);
    const interval = Interval.after(date, { days: 1 });
    return Helper.getNormalizedBuffer(interval, this.buffer);
  }

  private timeStrToDateTime(timeStr: string): DateTime {
    const [hour, minute] = timeStr.split(':').map((ts) => parseInt(ts));
    return this.date!.set({ hour, minute });
  }

  changeTimeBoundaries(from: string, to: string) {
    const fromDate = this.timeStrToDateTime(from);
    const toDate = this.timeStrToDateTime(to);
    const interval = Interval.fromDateTimes(fromDate, toDate);
    return Helper.getNormalizedBuffer(interval, this.buffer!);
  }
}

export default TimeTrackingEventStaticBuffer;
