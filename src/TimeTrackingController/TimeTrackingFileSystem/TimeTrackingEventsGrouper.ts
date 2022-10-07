/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */
 
import * as vscode from 'vscode';
import { DateTime } from 'luxon';
import TimeTrackingEvent from '../TimeTrackingEvent';
import TimeTrackingFileSystemHelper from './TimeTrackingFileSystemHelper';

type TimeTrackingEventsGrouped = { [dayPath: string]: TimeTrackingEvent[] };

// An interval spanning 2 days is placed in the file associated with the starting day.
class TimeTrackingEventsGrouper {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private filterNew(events: TimeTrackingEvent[]): TimeTrackingEvent[] {
    const lastSaveTimestamp: string = this.context.globalState.get('lastSaveTimestamp') || '';
    if (!lastSaveTimestamp) {
      return events;
    }

    const lastSaveDateTime = DateTime.fromISO(lastSaveTimestamp);
    return events.filter((event) => !event.interval.isBefore(lastSaveDateTime));
  }

  run(events: TimeTrackingEvent[]): TimeTrackingEventsGrouped {
    const newEvents = this.filterNew(events);
    return newEvents.reduce((acc: TimeTrackingEventsGrouped, event) => {
      if (event.isEmpty()) { return acc; }

      const dayPath = TimeTrackingFileSystemHelper.dateTimeToDayPath(event.interval.start);
      if (acc[dayPath]) {
        acc[dayPath].push(event);
      } else {
        acc[dayPath] = [event];
      }
      return acc;
    }, {});
  }
}

export default TimeTrackingEventsGrouper;
