/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import { DateTime, Duration, Interval } from 'luxon';
import TimeTrackingEvent from './TimeTrackingEvent';
import TimeTrackingFileSystem from './TimeTrackingFileSystem/TimeTrackingFileSystem';
import TimeTrackingEventNormalizedBuffer from './TimeTrackingEventBuffer/TimeTrackingEventNormalizedBuffer';

const SAMPLING_INTERVAL_LENGTH = 30;
const DEFAULT_TIME_SPAN_MINUTES = 10;

class TimeTrackingEventBuffer {
  liveBuffer: TimeTrackingEvent[];
  fileSystem: TimeTrackingFileSystem;

  constructor(context: vscode.ExtensionContext) {
    this.liveBuffer = [new TimeTrackingEvent()];
    this.fileSystem = new TimeTrackingFileSystem(context);
  }

  get lastEvent(): TimeTrackingEvent {
    return this.liveBuffer[this.liveBuffer.length - 1];
  }

  push(event: vscode.TextDocumentChangeEvent) {
    const now = DateTime.now();
    const samplingIntervalDuration = Duration.fromObject({ seconds: SAMPLING_INTERVAL_LENGTH });
    if (now.diff(this.lastEvent.interval.start) > samplingIntervalDuration) {
      this.liveBuffer.push(new TimeTrackingEvent(now));
    } else {
      this.lastEvent.interval = this.lastEvent.interval.set({ end: now });
    }

    this.lastEvent.update(event);
  }

  getDataForPlot(timeSpanMinutes: number = DEFAULT_TIME_SPAN_MINUTES) {
    const interval = Interval.before(DateTime.now(), Duration.fromObject({ minutes: timeSpanMinutes }));
    const samplingIntervalSeconds = SAMPLING_INTERVAL_LENGTH * timeSpanMinutes / DEFAULT_TIME_SPAN_MINUTES;
    const samplingIntervalDuration = Duration.fromObject({ seconds: samplingIntervalSeconds });
    const normalizedBuffer = new TimeTrackingEventNormalizedBuffer(this.liveBuffer, interval, samplingIntervalDuration);
    return normalizedBuffer;
  }

  async save() {
    await this.fileSystem.save(this.liveBuffer);
    this.filterLastHour();
  }

  async upload() {
    await this.fileSystem.upload();
  }

  filterLastHour() {
    const hourAgoDateTime = DateTime.now().minus({ hours: 1 });
    this.liveBuffer = this.liveBuffer.filter((event) => !event.interval.isBefore(hourAgoDateTime));
  }
}

export default TimeTrackingEventBuffer;
