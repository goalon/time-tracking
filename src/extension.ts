import * as vscode from 'vscode';
import TimeTrackingController from './TimeTrackingController/TimeTrackingController';

export async function activate(context: vscode.ExtensionContext) {
	const controller = new TimeTrackingController(context);
	controller.activate();
}

export function deactivate() {}
