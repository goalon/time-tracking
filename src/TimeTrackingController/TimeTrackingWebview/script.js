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
    this.calendarViewElem = document.getElementById('calendar-view');
    this.liveViewButton = document.getElementById('live-view-button');
    this.calendarViewButton = document.getElementById('calendar-view-button');

    this.liveViewElem.style.display = 'block';
    this.calendarViewElem.style.display = 'none';
  }
}

class TimeTrackingEventsParser {
  constructor(totalBuffer, languagesBuffer, dateTimeLabels, selectedLanguage) {
    this.totalBuffer = totalBuffer;
    this.languagesBuffer = languagesBuffer;
    this.dateTimeLabels = dateTimeLabels;
    this.selectedLanguage = selectedLanguage;
  }

  get buffer() {
    return this.selectedLanguage ? this.languagesBuffer[this.selectedLanguage] : this.totalBuffer;
  }
}

class TimeTrackingWebviewHelper extends TimeTrackingWebviewConstants {
  constructor() {
    super();

    this.selectedDate = null;
    this.chart = new Chart(this.chartElem, this.basicConfig);
    this.calendar = null;
    this.liveEventsParser = null;

    window.addEventListener('message', event => {
      switch (event.data.action) {
        case 'loadLiveData':
          this.loadLiveData(event.data.data);
          break;
        case 'loadDayData':
          if (!event.data.error) {
            this.loadDayData(event.data.data);
          }
          break;
        default:
          console.error(`Unrecognized event action: ${event.action}`);
      }
    });
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

    const staticEventsParser = new TimeTrackingEventsParser(totalBuffer, languagesBuffer, dateTimeLabels, null);
    this.showNewEventsData(staticEventsParser);
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

    this.liveViewElem.style.display = this.helpSetDisplayCSS(willShowLiveView);
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
        this.selectedDate = info.date;
        this.switchToDayView();
      }
    });
    this.calendar.render();
  }

  switchToDayView = () => {
    this.vscode.postMessage({ action: 'loadDayData', data: { date: this.selectedDate } });
  };

  changeTimeSpan = (timeSpanMinutes) => {
    this.vscode.postMessage({ action: 'changeTimeSpan', data: { timeSpanMinutes } });
  };
}
