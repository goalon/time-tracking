import { DateTime, Duration, Interval } from 'luxon';
import TimeTrackingEvent from './TimeTrackingEvent';

type TimeTrackingPlotData = {
  additions: number[];
  deletions: number[];
  labels: DateTime[];
  annotations?: { from: number, to: number }[];
};

type Temp = {
  [key: string]: { additions: number, deletions: number }    
};


class TimeTrackingPlot {
  data: TimeTrackingEvent[];

  constructor(data: TimeTrackingEvent[]) {
    this.data = data;
  }

  // TODO: Could be optimized with binary search
  private getLastEventIndexForPlot(plotEnd: DateTime): number {
    let i = this.data.length - 1;
    while (i >= 0 && this.data[i].interval.isAfter(plotEnd)) {
      --i;
    }

    return i;
  }

  prepareData(samplingIntervalDuration: Duration, plotInterval: Interval, annotations: boolean = false): TimeTrackingPlotData {
    const additions : number[] = [];
    const deletions : number[] = [];
    const labels : DateTime[] = [];
    let samplingInterval = Interval.before(plotInterval.end, samplingIntervalDuration);
    let i = this.getLastEventIndexForPlot(plotInterval.end);

    while (plotInterval.start <= samplingInterval.start) {
      let samplingIntervalAdditions = 0;
      let samplingIntervalDeletions = 0;

      while (i >= 0) {
        if (samplingInterval.engulfs(this.data[i].interval)) {
          samplingIntervalAdditions += this.data[i].additions;
          samplingIntervalDeletions += this.data[i].deletions;
        } else {
          const intervalsIntersection = samplingInterval.intersection(this.data[i].interval);
          if (!intervalsIntersection) {
            break;
          }
          
          const ratio = intervalsIntersection!.length() / this.data[i].interval.length();
          samplingIntervalAdditions += this.data[i].additions * ratio;
          samplingIntervalDeletions += this.data[i].deletions * ratio;

          if (this.data[i].interval.start < samplingInterval.start) {
            break;
          }
        }
        --i;
      }

      additions.push(samplingIntervalAdditions);
      deletions.push(-samplingIntervalDeletions);
      labels.push(samplingInterval.end);

      samplingInterval = Interval.before(samplingInterval.start, samplingIntervalDuration);
    }

    additions.reverse();
    deletions.reverse();
    labels.reverse();

    // i = this.getLastEventIndexForPlot(plotInterval.end);
    // const annotationsData = [];
    // let aDate = plotInterval.end;
    // while (plotInterval.start <= aDate) {
    //   const endDate = aDate;
    //   while (plotInterval.start <= aDate && this.data[i].additions === 0 && this.data[i].deletions === 0) {
    //     aDate = aDate.minus(samplingIntervalDuration);
    //   }
    //   aDate = aDate.minus(samplingIntervalDuration);
    // }

    // TODO: it's just a placeholder, not a working algorithm to find appropriate intervals
    const baseDateTime = DateTime.fromObject({ year: 2021, month: 12, day: 15 });
    const annotationsData = [
      { from: baseDateTime.set({ hour: 16, minute: 19, second: 30 }).toMillis(), to: baseDateTime.set({ hour: 16, minute: 22, second: 30 }).toMillis() },
      { from: baseDateTime.set({ hour: 16, minute: 29, second: 30 }).toMillis(), to: baseDateTime.set({ hour: 16, minute: 30, second: 30 }).toMillis() },
      { from: baseDateTime.set({ hour: 16, minute: 3, second: 30 }).toMillis(), to: baseDateTime.set({ hour: 16, minute: 4, second: 30 }).toMillis() },
    ];

		return { additions, deletions, labels, annotations: annotations ? annotationsData : undefined };
  }

  getLanguages(): string[] {
    // TODO: suboptimal and slightly wrong
    const languages = {};
    for (const event of this.data) {
      Object.assign(languages, event.languages);
    }
    return Object.keys(languages);
  }

  // TODO: weird; not Temp
  getEmptyLanguages(): Temp {
    const template = { additions: 0, deletions: 0 };
    const emptylanguages = this.getLanguages().reduce((acc, l) => Object.assign(acc, { [l]: { ...template } }), {});
    return emptylanguages;
  }

  // TODO: verbose
  prepareDataForLanguages(samplingIntervalDuration: Duration, plotInterval: Interval): { data: Temp[], labels: DateTime[] } {
    const data : Temp[] = [];
    const labels : DateTime[] = [];
    let samplingInterval = Interval.before(plotInterval.end, samplingIntervalDuration);
    let i = this.getLastEventIndexForPlot(plotInterval.end);
  
    while (plotInterval.start <= samplingInterval.start) {
      let samplingIntervalData = this.getEmptyLanguages();
  
      while (i >= 0) {
        if (samplingInterval.engulfs(this.data[i].interval)) {
          for (const language in this.data[i].languages) {
            samplingIntervalData[language].additions += this.data[i].languages[language].additions;
            samplingIntervalData[language].deletions -= this.data[i].languages[language].deletions;
          }
        } else {
          const intervalsIntersection = samplingInterval.intersection(this.data[i].interval);
          if (!intervalsIntersection) {
            break;
          }
          
          const ratio = intervalsIntersection!.length() / this.data[i].interval.length();
          for (const language in this.data[i].languages) {
            samplingIntervalData[language].additions += this.data[i].languages[language].additions * ratio;
            samplingIntervalData[language].deletions -= this.data[i].languages[language].deletions * ratio;
          }
  
          if (this.data[i].interval.start < samplingInterval.start) {
            break;
          }
        }
        --i;
      }
  
      data.push(samplingIntervalData);
      labels.push(samplingInterval.end);
  
      samplingInterval = Interval.before(samplingInterval.start, samplingIntervalDuration);
    }
  
    data.reverse();
    labels.reverse();
  
    return { data, labels };
  }  
}

export default TimeTrackingPlot;
export { TimeTrackingPlotData };
