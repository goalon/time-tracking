/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

const VIEW = {
  live: 'live',
  calendar: 'calendar',
  day: 'day',
};

class TimeTrackingWebviewConstants {
  constructor() {
    const labelYTransform = (y) => {
      if (y > 0) {
        return Math.round(Math.pow(2, y)) - 1;
      }

      return -Math.round(Math.pow(2, -y)) + 1;
    };
    
    this.red = '#FF0000';
    this.green = '#00FF00';
    this.additionsLabel = 'Additions';
    this.deletionsLabel = 'Deletions';
    this.basicData = {
      labels: [],
      datasets: [
        {
          label: this.additionsLabel,
          borderColor: this.green,
          backgroundColor: this.green,
          data: [],
        },
        {
          label: this.deletionsLabel,
          borderColor: this.red,
          backgroundColor: this.red,
          data: [],
        }
      ],
    };
    this.basicConfig = {
      type: 'line',
      data: this.basicData,
      options: {
        scales: {
          x: {
            type: 'timeseries',
            time: {
              tooltipFormat: 'HH:mm',
            },
          },
          y: {
            ticks: {
              callback: labelYTransform,
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${labelYTransform(context.parsed.y)}`,
            },
          },
        },
      },
    };

    this.vscode = acquireVsCodeApi();
    this.currentView = VIEW.live;

    this.chartElem = document.getElementById('chart');
    this.calendarElem = document.getElementById('calendar');
    this.liveViewElem = document.getElementById('live-view');
    this.dayViewElem = document.getElementById('day-view');
    this.calendarViewElem = document.getElementById('calendar-view');
    this.liveViewButton = document.getElementById('live-view-button');
    this.calendarViewButton = document.getElementById('calendar-view-button');
    this.timeSpanSelect = document.getElementById('time-span');
    this.fromTimeInput = document.getElementById('from-time');
    this.toTimeInput = document.getElementById('to-time');
    this.changeTimeBoundariesButton = document.getElementById('change-time-boundaries-button');
    this.titleElem = document.getElementById('title');
    this.lastSaveInput = document.getElementById('last-save');
    this.lastUploadInput = document.getElementById('last-upload');
    this.refreshMetadataButton = document.getElementById('refresh-metadata-button');
    this.saveButton = document.getElementById('save-button');
    this.uploadButton = document.getElementById('upload-button');

    this.liveViewElem.style.display = 'block';
    this.calendarViewElem.style.display = 'none';
  }
}

class TimeTrackingEventsParser {
  constructor(totalBuffer, languagesBuffer, dateTimeLabels, selectedLanguage) {
    this.totalBuffer = totalBuffer;
    this.languagesBuffer = languagesBuffer;
    this.dateTimeLabels = dateTimeLabels;
    this.selectedLanguage = selectedLanguage; // This feature is unavailable in the current version.
  }

  get buffer() {
    return this.selectedLanguage ? this.languagesBuffer[this.selectedLanguage] : this.totalBuffer;
  }
}

const WEBVIEW_ACTION_NAME = {
  loadLiveData: 'loadLiveData',
  loadDayData: 'loadDayData',
  save: 'save',
  upload: 'upload',
  saveEnd: 'saveEnd',
  uploadEnd: 'uploadEnd',
  refreshMetadata: 'refreshMetadata',
  changeTimeSpan: 'changeTimeSpan',
  changeTimeBoundaries: 'changeTimeBoundaries',
};

class TimeTrackingWebviewHelper extends TimeTrackingWebviewConstants {
  constructor() {
    super();

    this.selectedDate = null;
    this.chart = new Chart(this.chartElem, this.basicConfig);
    this.calendar = null;
    this.liveEventsParser = null;

    this.connectEventHandlers();

    window.addEventListener('message', event => this.handleWebviewAction(event));
  }

  // It removes the need to use inline scripts for the current CSP.
  connectEventHandlers() {
    this.calendarViewButton.onclick = () => this.switchToCalendarView();
    this.liveViewButton.onclick = () => this.switchToLiveView();
    this.saveButton.onclick = () => this.save();
    this.uploadButton.onclick = () => this.upload();
    this.timeSpanSelect.onchange = (event) => this.changeTimeSpan(event);
    this.changeTimeBoundariesButton.onclick = () => this.changeTimeBoundaries();
    this.refreshMetadataButton.onclick = () => this.refreshMetadata();
  }

  handleWebviewAction(event) {
    switch (event.data.action) {
      case WEBVIEW_ACTION_NAME.loadLiveData:
        this.loadLiveData(event.data.data);
        break;
      case WEBVIEW_ACTION_NAME.loadDayData:
        if (!event.data.error) {
          this.loadDayData(event.data.data);
        }
        break;
      case WEBVIEW_ACTION_NAME.changeTimeBoundaries:
        this.reloadDayData(event.data.data);
        break;
      case WEBVIEW_ACTION_NAME.refreshMetadata:
        const { lastSaveTimestamp, lastUploadTimestamp } = event.data.data;
        if (lastSaveTimestamp) {
          this.lastSaveInput.value = lastSaveTimestamp;
        }
        if (lastUploadTimestamp) {
          this.lastUploadInput.value = lastUploadTimestamp;
        }
        break;
      case WEBVIEW_ACTION_NAME.saveEnd:
        this.saveButton.disabled = false;
        break;
      case WEBVIEW_ACTION_NAME.uploadEnd:
        this.uploadButton.disabled = false;
        break;
      default:
        console.error(`Unrecognized event action: ${event.data.action}`);
    }
  }

  loadLiveData({ totalBuffer, languagesBuffer, dateTimeLabels }) {
    this.liveEventsParser = new TimeTrackingEventsParser(totalBuffer, languagesBuffer, dateTimeLabels, null);

    if (this.currentView === VIEW.live) {
      this.showUpdatedEventsData(this.liveEventsParser);
    }
  }

  loadDayData({ totalBuffer, languagesBuffer, dateTimeLabels }) {
    this.destroyCalendarSafely();
    this.calendarViewButton.style.display = 'block';
    this.dayViewElem.style.display = 'block';
    const selectedDateLuxon = luxon.DateTime.fromISO(this.selectedDate);
    this.titleElem.innerHTML = `${selectedDateLuxon.weekdayShort}, ${selectedDateLuxon.toISODate()}`;

    const staticEventsParser = new TimeTrackingEventsParser(totalBuffer, languagesBuffer, dateTimeLabels, null);
    this.showNewEventsData(staticEventsParser);
  }

  reloadDayData({ totalBuffer, languagesBuffer, dateTimeLabels }) {
    const staticEventsParser = new TimeTrackingEventsParser(totalBuffer, languagesBuffer, dateTimeLabels, null);
    this.showUpdatedEventsData(staticEventsParser);
  }

  helpSetDisplayCSS(flag) {
    return flag ? 'block' : 'none';
  }

  destroyChartSafely() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  destroyCalendarSafely() {
    if (this.calendar) {
      this.calendar.destroy();
      this.calendar = null;
    }
  }

  switchToCalendarOrLiveView(willShowLiveView = true) {
    this.currentView = willShowLiveView ? VIEW.live : VIEW.calendar;

    this.destroyChartSafely();
    this.destroyCalendarSafely();

    this.titleElem.innerHTML = willShowLiveView ? "Live" : "Calendar";
    this.liveViewElem.style.display = this.helpSetDisplayCSS(willShowLiveView);
    this.dayViewElem.style.display = 'none';
    this.calendarViewElem.style.display = this.helpSetDisplayCSS(!willShowLiveView);
    this.liveViewButton.style.display = this.helpSetDisplayCSS(!willShowLiveView);
    this.calendarViewButton.style.display = this.helpSetDisplayCSS(willShowLiveView);
    this.chartElem.style.display = this.helpSetDisplayCSS(willShowLiveView);
  }

  switchToLiveView() {
    if (this.currentView === VIEW.day) {
      this.currentView = VIEW.live;
      this.showUpdatedEventsData(this.liveEventsParser);

      return;
    }

    this.switchToCalendarOrLiveView(true);
    this.showNewEventsData(this.liveEventsParser);
  }

  mapAdditions(a) {
    return Math.log2(a + 1);
  }

  mapDeletions(d) {
    return -Math.log2(d + 1);
  }

  showNewEventsData(data) {
    if (data) {
      this.basicConfig.data.labels = data.dateTimeLabels;
      this.basicConfig.data.datasets[0].data = data.buffer.additions.map((a) => this.mapAdditions(a));
      this.basicConfig.data.datasets[1].data = data.buffer.deletions.map((d) => this.mapDeletions(d));
    }
    this.chartElem.style.display = 'block';
    this.chart = new Chart(this.chartElem, this.basicConfig);
  }

  showUpdatedEventsData(data) {
    if (this.chart && data) {
      this.chart.data.labels = data.dateTimeLabels;
      this.chart.data.datasets[0].data = data.buffer.additions.map((a) => this.mapAdditions(a));
      this.chart.data.datasets[1].data = data.buffer.deletions.map((d) => this.mapDeletions(d));
      this.chart.update('none');
    }
  }

  switchToCalendarView() {
    this.switchToCalendarOrLiveView(false);

    this.calendar = new FullCalendar.Calendar(this.calendarElem, {
      initialView: 'dayGridMonth',
      dateClick: (info) => {
        this.selectedDate = info.dateStr;
        this.switchToDayView();
      }
    });
    this.calendar.render();
  }

  switchToDayView() {
    this.vscode.postMessage({ action: WEBVIEW_ACTION_NAME.loadDayData, data: { date: this.selectedDate } });
  };

  changeTimeSpan(event) {
    const timeSpanMinutes = event.target.value;
    this.vscode.postMessage({ action: WEBVIEW_ACTION_NAME.changeTimeSpan, data: { timeSpanMinutes } });
  };

  save() {
    this.saveButton.disabled = true;
    this.vscode.postMessage({ action: WEBVIEW_ACTION_NAME.save });
  };

  upload() {
    this.uploadButton.disabled = true;
    this.vscode.postMessage({ action: WEBVIEW_ACTION_NAME.upload });
  };
  
  refreshMetadata() {
    this.vscode.postMessage({ action: WEBVIEW_ACTION_NAME.refreshMetadata });
  };

  changeTimeBoundaries() {
    const fromTime = this.fromTimeInput.value;
    const toTime = this.toTimeInput.value;
    const data = { fromTime, toTime };
    this.vscode.postMessage({ action: WEBVIEW_ACTION_NAME.changeTimeBoundaries, data });
  }
}

let helper;
window.addEventListener('DOMContentLoaded', (event) => {
  new TimeTrackingWebviewHelper();
});
