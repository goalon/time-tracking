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
import TimeTrackingEvent from './TimeTrackingEvent';

class TimeTrackingEventStaticBuffer {
  fileSystem: TimeTrackingFileSystem;
  date?: DateTime;
  buffer?: TimeTrackingEvent[];

  constructor(context: vscode.ExtensionContext) {
    this.fileSystem = new TimeTrackingFileSystem(context);
  }

  async read(date: DateTime) {
    this.date = date;
    this.buffer = await this.fileSystem.read(date);
    const interval = Interval.after(date, { days: 1 });
    const samplingIntervalSeconds = 30 * interval.length('minutes') / 10; // todo unify constants (config)
    const samplingIntervalDuration = Duration.fromObject({ seconds: samplingIntervalSeconds });

    return new TimeTrackingEventNormalizedBuffer(this.buffer, interval, samplingIntervalDuration);
  }

  changeTimeBoundaries(from: string, to: string) {
    const [fromHour, fromMinute] = from.split(':').map((s) => parseInt(s));
    const [toHour, toMinute] = to.split(':').map((s) => parseInt(s));
    const fromDate = this.date!.set({ hour: fromHour, minute: fromMinute });
    const toDate = this.date!.set({ hour: toHour, minute: toMinute });
    const interval = Interval.fromDateTimes(fromDate, toDate);
    const samplingIntervalSeconds = 30 * interval.length('minutes') / 10; // todo unify within methods (make an aux method)
    const samplingIntervalDuration = Duration.fromObject({ seconds: samplingIntervalSeconds });

    return new TimeTrackingEventNormalizedBuffer(this.buffer!, interval, samplingIntervalDuration);
  }
}

export default TimeTrackingEventStaticBuffer;
