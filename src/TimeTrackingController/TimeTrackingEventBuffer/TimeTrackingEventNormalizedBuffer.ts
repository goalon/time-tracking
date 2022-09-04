/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import { DateTime, Interval, Duration } from 'luxon';
import {
  TimeTrackingFundamentalNormalizedData,
  TimeTrackingFundamentalNormalizedLanguagesData,
} from '../types';
import TimeTrackingEvent from '../TimeTrackingEvent';

class TimeTrackingEventNormalizedBuffer {
  totalBuffer: TimeTrackingFundamentalNormalizedData;
  languagesBuffer: TimeTrackingFundamentalNormalizedLanguagesData;
  dateTimeLabels: DateTime[];

  private static getAllLanguages(buffer: TimeTrackingEvent[], interval: Interval): string[] {
    const languages: string[] = [];

    for (const timeTrackingEvent of buffer) {
      if (interval.overlaps(timeTrackingEvent.interval)) {
        for (const language in timeTrackingEvent.languages) {
          if (!languages.includes(language)) {
            languages.push(language);
          }
        }
      }
    }

    return languages;
  }

  private static newArray(samplesNum: number): number[] {
    return new Array(samplesNum).fill(0);
  }

  private static newBuffer(samplesNum: number): TimeTrackingFundamentalNormalizedData {
    return {
      additions: this.newArray(samplesNum),
      deletions: this.newArray(samplesNum),
      actions: this.newArray(samplesNum),
    };
  }

  private updateNormalizedBuffer(
    timeTrackingEvent: TimeTrackingEvent,
    normalizedBufferIndex: number,
    ratio: number = 1,
    language: string | undefined = undefined,
  ): void {
    const buffer = language ? this.languagesBuffer[language] : this.totalBuffer;
    const data = language ? timeTrackingEvent.languages[language] : timeTrackingEvent;
    
    buffer.additions[normalizedBufferIndex] += data.additions * ratio;
    buffer.deletions[normalizedBufferIndex] += data.deletions * ratio;
    buffer.actions[normalizedBufferIndex] += data.actions * ratio;
  }

  private updateNormalizedBuffers(
    timeTrackingEvent: TimeTrackingEvent,
    normalizedBufferIndex: number,
    ratio: number = 1,
  ): void {
    this.updateNormalizedBuffer(timeTrackingEvent, normalizedBufferIndex, ratio);
    for (const language in timeTrackingEvent.languages) {
      this.updateNormalizedBuffer(timeTrackingEvent, normalizedBufferIndex, ratio, language);
    }
  }

  constructor(buffer: TimeTrackingEvent[], interval: Interval, sampleDuration: Duration) {
    const allLanguages = TimeTrackingEventNormalizedBuffer.getAllLanguages(buffer, interval);
    const samplesNum = interval.length('seconds') / sampleDuration.as('seconds');
    const samplingIntervals = interval.divideEqually(samplesNum);
    this.dateTimeLabels = samplingIntervals.map(({ end }) => end);
    this.totalBuffer = TimeTrackingEventNormalizedBuffer.newBuffer(samplesNum);
    this.languagesBuffer = {};
    for (const language of allLanguages) {
      this.languagesBuffer[language] = TimeTrackingEventNormalizedBuffer.newBuffer(samplesNum);
    }

    let bufferIndex = 0;
    let samplingIntervalsIndex = 0;
    while (bufferIndex < buffer.length && samplingIntervalsIndex < samplesNum) {
      const timeTrackingEvent = buffer[bufferIndex];
      const samplingInterval = samplingIntervals[samplingIntervalsIndex];

      if (timeTrackingEvent.interval.end < samplingInterval.start) {
        ++bufferIndex;
        continue;
      }

      if (samplingInterval.end <= timeTrackingEvent.interval.start) {
        ++samplingIntervalsIndex;
        continue;
      }

      if (timeTrackingEvent.interval.isEmpty() || samplingInterval.engulfs(timeTrackingEvent.interval)) {
        this.updateNormalizedBuffers(timeTrackingEvent, samplingIntervalsIndex);
        ++bufferIndex;
      } else {
        const intervalsIntersection = samplingInterval.intersection(timeTrackingEvent.interval);
        if (!intervalsIntersection) {
          ++bufferIndex;
          continue;
        }

        const ratio = intervalsIntersection!.length() / timeTrackingEvent.interval.length();
        this.updateNormalizedBuffers(timeTrackingEvent, samplingIntervalsIndex, ratio);

        if (timeTrackingEvent.interval.end < samplingInterval.end) {
          ++bufferIndex;
        } else {
          ++samplingIntervalsIndex;
        }
      }
    }
  }
}

export default TimeTrackingEventNormalizedBuffer;
