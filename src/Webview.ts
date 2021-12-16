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

class Webview {
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
					<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@1.2.0/dist/chartjs-plugin-annotation.min.js"></script>
			</head>
			<body>
				<button onclick="() => vscode.postMessage({ view: "now" })">View now</button>
				<canvas id="myChart"></canvas>
				<div id="calendar"></div>
				<script>
				const vscode = acquireVsCodeApi();
				var calendarEl = document.getElementById('calendar');
        var calendar = new FullCalendar.Calendar(calendarEl, {
          initialView: 'dayGridMonth',
					dateClick: function(info) {
						vscode.postMessage({ view: "another" });
					}
        });
        calendar.render();
				
				const labels = [];
				const data = ${JSON.stringify(data)};
				const config = {
					type: 'line',
					data: data,
					options: {
            scales: {
              x: {
                type: 'time',
                time: {
                  tooltipFormat: 'HH:mm:ss',
                },
              },
              y: {
                min: -100,
                max: 100,
              },
            },
          },
				};
				const myChart = new Chart(
					document.getElementById('myChart'),
					config
				);
				window.addEventListener('message', event => {
					const { additions, deletions, labels } = event.data.data;
					myChart.data.labels = labels;
					myChart.data.datasets[0].data = additions;
					myChart.data.datasets[1].data = deletions;
					myChart.update('none');	
			});
				</script>
			</body>
		</html>
	`;
  }
}

export default Webview;
