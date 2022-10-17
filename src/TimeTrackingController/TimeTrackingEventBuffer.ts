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
import { DEFAULT_TIME_SPAN_MINUTES, SAMPLING_INTERVAL_SECONDS } from './config';
import Helper from './Helper';

class TimeTrackingEventBuffer {
  private liveBuffer: TimeTrackingEvent[];
  private fileSystem: TimeTrackingFileSystem;

  constructor(context: vscode.ExtensionContext) {
    this.liveBuffer = [new TimeTrackingEvent()];
    this.fileSystem = new TimeTrackingFileSystem(context);
  }

  private get lastEvent(): TimeTrackingEvent {
    return this.liveBuffer[this.liveBuffer.length - 1];
  }

  push(event: vscode.TextDocumentChangeEvent) {
    const now = DateTime.now();
    const samplingIntervalDuration = Duration.fromObject({ seconds: SAMPLING_INTERVAL_SECONDS });
    if (now.diff(this.lastEvent.interval.start) > samplingIntervalDuration) {
      this.liveBuffer.push(new TimeTrackingEvent(now));
    } else {
      this.lastEvent.interval = this.lastEvent.interval.set({ end: now });
    }

    this.lastEvent.update(event);
  }

  getDataForPlot(timeSpanMinutes: number = DEFAULT_TIME_SPAN_MINUTES) {
    const interval = Interval.before(DateTime.now(), { minutes: timeSpanMinutes });
    return Helper.getNormalizedBuffer(interval, this.liveBuffer);
  }

  async save(auto: boolean = true) {
    await this.fileSystem.save(this.liveBuffer, auto);
    this.filterLastHour();
  }

  // The convention of uploading is made similar to saving,
  // nevertheless it's questionable in the current state.
  // It would probably make more sense if the app was further extended.
  async upload(auto: boolean = true) {
    await this.fileSystem.upload(auto);
  }

  private filterLastHour() {
    const hourAgoDateTime = DateTime.now().minus({ hours: 1 });
    const lastHourLiveBuffer = this.liveBuffer.filter(
      (event) => !event.interval.isBefore(hourAgoDateTime)
    );
    
    // Prevent the live buffer from being empty at any time.
    this.liveBuffer = lastHourLiveBuffer.length ?
      lastHourLiveBuffer :
      this.liveBuffer.slice(-1);
  }
}

export default TimeTrackingEventBuffer;
