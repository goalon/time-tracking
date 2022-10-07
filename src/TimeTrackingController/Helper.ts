/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import { Interval, Duration, DateTime } from 'luxon';
import TimeTrackingEvent from './TimeTrackingEvent';
import {
  SAMPLING_INTERVAL_SECONDS,
  DEFAULT_TIME_SPAN_MINUTES,
  AUTOUPLOAD_INTERVAL_HOURS,
  MANUAL_UPLOAD_INTERVAL_HOURS,
  ID_LABEL,
} from './config';
import TimeTrackingEventNormalizedBuffer from './TimeTrackingEventBuffer/TimeTrackingEventNormalizedBuffer';

class Helper {
  static getSamplingIntervalSeconds(timeSpanMinutes: number) {
    return SAMPLING_INTERVAL_SECONDS * timeSpanMinutes / DEFAULT_TIME_SPAN_MINUTES;
  }

  static getNormalizedBuffer(interval: Interval, buffer: TimeTrackingEvent[]) {
    const samplingIntervalSeconds = this.getSamplingIntervalSeconds(interval.length('minutes'));
    const samplingIntervalDuration = Duration.fromObject({ seconds: samplingIntervalSeconds });
    return new TimeTrackingEventNormalizedBuffer(buffer, interval, samplingIntervalDuration);
  }

  static checkUploadInterval(context: vscode.ExtensionContext, auto: boolean = true): boolean {
    const lastUploadTimestamp: string | undefined = context.globalState.get('lastUploadTimestamp');
    if (!lastUploadTimestamp) {
      return true;
    }

    const lastUploadDateTime = DateTime.fromISO(lastUploadTimestamp);
    const hoursInterval = auto ? AUTOUPLOAD_INTERVAL_HOURS : MANUAL_UPLOAD_INTERVAL_HOURS;
    if (DateTime.now().diff(lastUploadDateTime).hours < hoursInterval) {
      if (!auto) {
        this.showNotification(`Upload unavailable. Last upload took place less than ${MANUAL_UPLOAD_INTERVAL_HOURS} hours ago.`);
      }
      return false;
    }
    
    return true;
  }

  private static getTimestampWithoutOffset(context: vscode.ExtensionContext, label: string): string {
    const timestampWithOffset: string | undefined = context.globalState.get(label);
    if (!timestampWithOffset) {
      return '';
    }

    return DateTime.fromISO(timestampWithOffset).toISO({ includeOffset: false });
  }

  static getTimestampMetadata(context: vscode.ExtensionContext) {
		const lastSaveTimestamp = this.getTimestampWithoutOffset(context, 'lastSaveTimestamp');
    const lastUploadTimestamp = this.getTimestampWithoutOffset(context, 'lastUploadTimestamp');

    return { lastSaveTimestamp, lastUploadTimestamp };
  }

  static showNotification(message: string, isError: boolean = false) {
    const messageExt = `${ID_LABEL} ${message}`;

    if (isError) {
      vscode.window.showErrorMessage(messageExt);
    } else {
      vscode.window.showInformationMessage(messageExt);
    }
  }
}

export default Helper;
