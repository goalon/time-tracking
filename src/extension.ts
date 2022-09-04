/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import TimeTrackingController from './TimeTrackingController/TimeTrackingController';

let controller: TimeTrackingController;

export async function activate(context: vscode.ExtensionContext) {
	controller = new TimeTrackingController(context);
	await controller.activate();
}

export async function deactivate() {
	await controller.deactivate();
}
