import * as vscode from 'vscode';
import { DateTime, Interval } from 'luxon';

class TimeTrackingEvent {
  additions: number;
  deletions: number;
  interval: Interval;
  workspaceName: string | null;
  languages: {
    [languageId: string]: {
      additions: number;
      deletions: number;
    }
  };

  constructor(date?: DateTime) {
    this.additions = 0;
    this.deletions = 0;
    const currentDate = date || DateTime.now();
    this.interval = Interval.fromDateTimes(currentDate, currentDate);
    this.workspaceName = vscode.workspace.name || null;
    this.languages = {};
  }

  serialize(): string {
    return JSON.stringify(this);
  }

  static deserialize(eventString: string): TimeTrackingEvent {
    const eventObject = JSON.parse(eventString);
    const event = new TimeTrackingEvent();
    event.additions = eventObject.additions;
    event.deletions = eventObject.deletions;
    const { start, end } = eventObject;
    event.interval = Interval.fromISO(`${start}/${end}`);
    event.workspaceName = eventObject.workspaceName;
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

    if (!(languageId in this.languages)) {
      this.languages[languageId] = { additions: 0, deletions: 0 };
    }

    this.languages[languageId].additions += additions;
    this.languages[languageId].deletions += deletions;
  }
}

export default TimeTrackingEvent;
