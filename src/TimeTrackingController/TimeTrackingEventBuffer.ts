import * as vscode from 'vscode';
import { DateTime, Duration, Interval } from 'luxon';
import TimeTrackingEvent from './TimeTrackingEvent';
import TimeTrackingFileSystem from './TimeTrackingFileSystem';
import TimeTrackingPlot, { TimeTrackingPlotData } from './TimeTrackingPlot';

const SAMPLING_INTERVAL_LENGTH = 5;
const PLOT_INTERVAL = 1;

type PlotBufferName = 'live' | 'static';

class TimeTrackingEventBuffer {
  liveBuffer: TimeTrackingEvent[];
  staticBuffer: TimeTrackingEvent[];
  fileSystem: TimeTrackingFileSystem;
  
  constructor(globalStorageUri: vscode.Uri) {
    this.liveBuffer = [new TimeTrackingEvent()];
    this.fileSystem = new TimeTrackingFileSystem(globalStorageUri);
    this.staticBuffer = [];
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

  getDataForPlot(
    buffer: PlotBufferName = 'live',
    interval: Interval = Interval.before(DateTime.now(), Duration.fromObject({ minutes: 10 })),
    annotations: boolean = false,
  ): TimeTrackingPlotData {
    const plot = new TimeTrackingPlot(buffer === 'live' ? this.liveBuffer : this.staticBuffer);
    const samplingIntervalDuration = Duration.fromObject({ seconds: 30 });
    // Interval.before(DateTime.fromObject({ year: 2021, month: 12, day: 15, hour: 17 }), Duration.fromObject({ hours: 1 }))
    return plot.prepareData(samplingIntervalDuration, interval, annotations);
  }

  getDataForPlot2(buffer: PlotBufferName = 'live') {
    const plot = new TimeTrackingPlot(buffer === 'live' ? this.liveBuffer : this.staticBuffer);
    const samplingIntervalDuration = Duration.fromObject({ seconds: 30 });
    // Interval.before(DateTime.fromObject({ year: 2021, month: 12, day: 15, hour: 17 }), Duration.fromObject({ hours: 1 }))
    return plot.prepareDataForLanguages(samplingIntervalDuration, Interval.before(DateTime.now(), Duration.fromObject({ minutes: 10 })));
  }

  async save() {
    await this.fileSystem.save(this.liveBuffer);
  }

  async read(date: DateTime) {
    this.staticBuffer = await this.fileSystem.read(date);
  }
}

export default TimeTrackingEventBuffer;
