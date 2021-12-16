import * as vscode from 'vscode';
import Webview from './Webview';
import EventBuffer from './EventBuffer';
import FileSystem from './FileSystem';

export async function activate(context: vscode.ExtensionContext) {
	const { globalStorageUri } = context;
	
	const fileSystem = new FileSystem(globalStorageUri);
	await fileSystem.init();

	const buffer = new EventBuffer(fileSystem);

	// TODO: Save to file in an hour
	// TODO: Queue buffer for limiting entries (last 10 minutes)
	// TODO: Fix types in TypeScript

	vscode.workspace.onDidChangeTextDocument((event) => {
		buffer.push(event);
	});

	let disposable = vscode.commands.registerCommand('timeTracking.open', () => {
		const panel = vscode.window.createWebviewPanel(
			'timeTracking',
			'Time Tracking',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
			},
		);
		const webview = new Webview();
		panel.webview.html = webview.getContent();
		panel.webview.postMessage({ data: buffer.getDataForPlot() }); // TODO: Move to content
		setInterval(() => {
			panel.webview.postMessage({ data: buffer.getDataForPlot() });
		}, 5000);

		panel.webview.onDidReceiveMessage(
			message => {
				switch (message.view) {
					case "another":
						buffer.turn(false);
						buffer.read(['2021', '12', '15.jsonl']);
						return;
					case 'now':
						buffer.turn(true);
						return;
				}
			},
			undefined,
			context.subscriptions
		);
	});

	let disposable2 = vscode.commands.registerCommand('timeTracking.dump', () => {
		buffer.save();
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable2);
}

export function deactivate() {}
