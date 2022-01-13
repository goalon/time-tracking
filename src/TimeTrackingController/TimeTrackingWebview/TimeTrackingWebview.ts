import * as vscode from 'vscode';
import * as path from 'path';

const data = {
	labels: [],
	datasets: [
		{
			label: 'Additions',
			borderColor: '#00FF00',
			backgroundColor: '#00FF00',
			data: [],
		},
		{
			label: 'Deletions',
			borderColor: '#FF0000',
			backgroundColor: '#FF0000',
			data: [],
		}
	],
};

class TimeTrackingWebview {
	private styleSrc: vscode.Uri;
	private scriptSrc: vscode.Uri;

	constructor(extensionPath: string, panel: vscode.WebviewPanel) {
		const localPath = path.join(extensionPath, 'src', 'TimeTrackingController', 'TimeTrackingWebview');
		this.styleSrc = TimeTrackingWebview.getTargetUri(localPath, panel, 'style.css');
		this.scriptSrc = TimeTrackingWebview.getTargetUri(localPath, panel, 'script.js');
	}

	private static getTargetUri(
		localPath: string,
		panel: vscode.WebviewPanel,
		target: string,
	): vscode.Uri {
		const targetUri = vscode.Uri.file(path.join(localPath, target));
		const targetWebviewUri = panel.webview.asWebviewUri(targetUri);
		return targetWebviewUri;
	}

  getContent() {
    return `
		<!DOCTYPE html>
		<html lang="en">
			<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>Time Tracking</title>
					<script src="https://cdn.jsdelivr.net/npm/chart.js@^3"></script>
          <script src="https://cdn.jsdelivr.net/npm/luxon@^2"></script>
          <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon@^1"></script>
					<script src="https://cdn.jsdelivr.net/npm/fullcalendar@^5/main.js"></script>
					<link href="https://cdn.jsdelivr.net/npm/fullcalendar@^5/main.css" rel="stylesheet" />
					<link href="${this.styleSrc}" rel="stylesheet" />
					<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@1.2.0/dist/chartjs-plugin-annotation.min.js"></script>
					<script src="${this.scriptSrc}"></script>
			</head>
			<body>
				<button onclick="switchToLiveView()">
					Live view
				</button>
				<button onclick="switchToCalendarView()">
					Calendar view
				</button>
				<input type="checkbox" onclick="switchToWeirdView()">
				<canvas id="chart"></canvas>
				<div id="calendar"></div>
				<input id="fromTime" type="time">
				<input id="toTime" type="time">
				<button onclick="postTime()">
					Change time
				</button>
				<button onclick="showAnnotations()">
					Show annotations
				</button>
				<div id="reasons" style="display: none">
					<input value="installing NPM packages">
					<input value="coffee break">
					<input value="refactoring">
				</div>
				<script>
				let date = null;
				const vscode = acquireVsCodeApi();
				const calendarElement = document.getElementById('calendar');
        const calendar = new FullCalendar.Calendar(calendarElement, {
          initialView: 'dayGridMonth',
					dateClick: function (info) {
						date = info.date;
						switchToDayView();
					}
        });
				
				const labels = [];
				const data = ${JSON.stringify(data)};
				const config = {
					type: 'line',
					data: data,
					options: {
            scales: {
              x: {
                type: 'timeseries',
                time: {
                  tooltipFormat: 'HH:mm:ss',
                },
              },
              //y: {
                //min: -100,
                //max: 100,
              //},
            },
          },
				};
				let chart = new Chart(
					document.getElementById('chart'),
					config
				);
				window.addEventListener('message', event => {
					const { additions, deletions, data, labels, annotations } = event.data.data;
					chart.data.labels = labels;
					if (data) {
						let i = 0;
						for (const l in data[0]) {
							chart.data.datasets[i] = {
								label: l + '-a',
								borderColor: '#00FF00',
								backgroundColor: '#00FF00',
								data: data.map(d => d[l].additions),
							};
							chart.data.datasets[i + 1] = {
								label: l + '-d',
								borderColor: '#FF0000',
								backgroundColor: '#FF0000',
								data: data.map(d => d[l].deletions),
							};
							i += 2;
						}
					} else {
						chart.data.datasets[0].data = additions;
						chart.data.datasets[1].data = deletions;
					}

					if (annotations) {
						const anno = {};
						for (let i = 0; i < annotations.length; ++i) {
							anno[i] = {
								type: 'box',
								backgroundColor: 'rgba(0,0,255,0.5)',
								xMax: annotations[i].to,
								xMin: annotations[i].from,
							};
						}
						chart.options.plugins.annotation = {
							annotations: anno,
						};
						document.getElementById("reasons").style.display = 'block';
					} else {
						chart.options.plugins.annotation = {};
						document.getElementById("reasons").style.display = 'none';
					}

					chart.update('none');	
			});

				let currentView = 'live';
				const switchToLiveView = () => {
					currentView = 'live';
					calendar.destroy();
					chart = new Chart(
						document.getElementById('chart'),
						config
					);
					vscode.postMessage({ view: 'live' });
				};
				const switchToCalendarView = () => {
					currentView = 'calendar';
					vscode.postMessage({ view: 'calendar' });
					chart.destroy();
					calendar.render();
				};
				const switchToWeirdView = () => {
					currentView = 'weird';
					vscode.postMessage({ view: 'weird' });
				};
				const switchToDayView = () => {
					currentView = 'day';
					calendar.destroy();
					chart = new Chart(
						document.getElementById('chart'),
						config
					);
					vscode.postMessage({ view: 'day', date });
				};
				const postTime = () => {
					const fromTime = document.getElementById('fromTime').value;
					const toTime = document.getElementById('toTime').value;
					vscode.postMessage({ view: 'day', date, fromTime, toTime });
				};
				const showAnnotations = () => {
					const fromTime = document.getElementById('fromTime').value;
					const toTime = document.getElementById('toTime').value;
					vscode.postMessage({ view: 'day', date, fromTime, toTime, annotations: true });
				};
				</script>
			</body>
		</html>
	`;
  }
}

export default TimeTrackingWebview;
