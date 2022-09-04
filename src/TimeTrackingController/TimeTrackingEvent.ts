/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import { DateTime, Interval } from 'luxon';
import * as sha256 from 'crypto-js/sha256';

type TimeTrackingEventLanguages = {
  [languageId: string]: {
    additions: number;
    deletions: number;
    actions: number;
  }
};

class TimeTrackingEvent {
  additions: number;
  deletions: number;
  actions: number;
  interval: Interval;
  workspaceNameHash: string | null;
  languages: TimeTrackingEventLanguages;

  constructor(date?: DateTime) {
    this.additions = 0;
    this.deletions = 0;
    this.actions = 0;
    const currentDate = date || DateTime.now();
    this.interval = Interval.fromDateTimes(currentDate, currentDate);
    if (vscode.workspace.name) {
      this.workspaceNameHash = sha256(vscode.workspace.name).toString();
    } else {
      this.workspaceNameHash = null;
    }
    this.languages = {};
  }

  serialize(): string {
    const data = {
      ...this,
      interval: undefined,
      start: this.interval.start,
      end: this.interval.end,
    };
    return JSON.stringify(data);
  }

  static deserialize(eventString: string): TimeTrackingEvent {
    const eventObject = JSON.parse(eventString);
    const event = new TimeTrackingEvent();
    event.additions = eventObject.additions;
    event.deletions = eventObject.deletions;
    const { start, end } = eventObject;
    event.interval = Interval.fromISO(`${start}/${end}`);
    event.workspaceNameHash = eventObject.workspaceNameHash;
    event.languages = eventObject.languages;
    
    return event;
  }

  update(event: vscode.TextDocumentChangeEvent): void {
    const { languageId } = event.document;
		
		const [additions, deletions] = event.contentChanges.reduce(
      ([additions, deletions], contentChange) => [
        additions + contentChange.text.length,
        deletions + contentChange.rangeLength,
      ],
      [0, 0],
    );

    this.additions += additions;
    this.deletions += deletions;
    ++this.actions;

    if (!(languageId in this.languages)) {
      this.languages[languageId] = { additions, deletions, actions: 1 };
    } else {
      this.languages[languageId].additions += additions;
      this.languages[languageId].deletions += deletions;
      ++this.languages[languageId].actions;
    }
  }

  isEmpty(): boolean {
    return this.additions === 0 && this.deletions === 0;
  }
}

export default TimeTrackingEvent;
