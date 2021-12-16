import * as vscode from 'vscode';

const SAMPLING_INTERVAL_LENGTH = 5;
const PLOT_INTERVAL = 1;

class EventBuffer {
  buffer: any[];
  fileSystem: any;
  onoff: boolean;
  
  constructor(fileSystem: any) {
    this.buffer = [this.getNewEvent(new Date())];
    this.fileSystem = fileSystem;
    this.onoff = true;
  }

  getNewEvent(now: Date) {
    return {
			additions: 0,
			deletions: 0,
			start: now,
			end: now,
			workspaceName: vscode.workspace.name || null,
      languages: {},
		};
	}

  get lastEvent() {
    return this.buffer[this.buffer.length - 1];
  }

  push(event: vscode.TextDocumentChangeEvent) {
    if (!this.onoff) {
      return;
    }

    const now = new Date();
		if (now.getTime() - this.lastEvent.start.getTime() > SAMPLING_INTERVAL_LENGTH * 1000) {
			this.buffer.push(this.getNewEvent(now));
		} else {
      this.lastEvent.endTimestamp = now;
    }
		
    const { languageId } = event.document;
		
		const [additions, deletions] = event.contentChanges.reduce(
      ([additions, deletions], contentChange) => [
        additions + contentChange.text.length,
        deletions + contentChange.rangeLength,
      ],
      [0, 0],
    );

    this.lastEvent.additions += additions;
    this.lastEvent.deletions += deletions;

    if (!(languageId in this.lastEvent.languages)) {
      this.lastEvent.languages[languageId] = { additions: 0, deletions: 0 };
    }

    this.lastEvent.languages[languageId].additions += additions;
    this.lastEvent.languages[languageId].deletions += deletions;
  }

  getDataForPlot() {
    let additions : any[] = [];
    let deletions : any[] = [];
    let labels : any[] = [];

    if (!this.onoff) {
      additions = this.buffer.map(b => b.additions);
      deletions = this.buffer.map(b => -b.deletions);
      labels = this.buffer.map(b => b.start);

      return { additions, deletions, labels };
    }

    let i = this.buffer.length - 1;
    
    const intervalLength = SAMPLING_INTERVAL_LENGTH * 1000;
    const plottingLength = PLOT_INTERVAL * 60 * 1000;
    let intervalEnd = new Date().getTime();
    let intervalStart = intervalEnd - intervalLength;
    const plottingStart = intervalEnd - plottingLength;

    while (intervalStart > plottingStart) {
      let a = 0;
      let d = 0;

      while (i >= 0) {
        const intersectionLength = Math.min(this.buffer[i].end, intervalEnd) - Math.max(this.buffer[i].start, intervalStart);
        if (intersectionLength < 0) {
          break;
        }
        if (intersectionLength === 0) {
          if (this.buffer[i].start < this.buffer[i].end) {
            break;
          }
          a += this.buffer[i].additions;
          d += this.buffer[i].deletions;
          --i;
          continue;
        }
        
        const fraction = (this.buffer[i].end - this.buffer[i].start) / intersectionLength;
        a += this.buffer[i].additions * fraction;
        d += this.buffer[i].deletions * fraction;
          
        if (this.buffer[i].start < intervalStart) {
          break;
        }
        --i;
      }

      additions.push(a);
      deletions.push(-d);
      labels.push(new Date(intervalEnd));

      intervalStart -= intervalLength;
      intervalEnd -= intervalLength;
    }

    additions.reverse();
    deletions.reverse();
    labels.reverse();

		return { additions, deletions, labels };
  }

  async save() {
    await this.fileSystem.save(this.buffer);
  }

  async read(filePath: string[]) {
    this.buffer = await this.fileSystem.read(filePath);
  }

  turn(onoff: boolean) {
    this.onoff = onoff;
  }
}

export default EventBuffer;
