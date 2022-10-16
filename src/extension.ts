/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import * as Sentry from '@sentry/node';
import '@sentry/tracing';
import TimeTrackingController from './TimeTrackingController/TimeTrackingController';
import { SENTRY_DSN } from './secret';

let controller: TimeTrackingController;

export async function activate(context: vscode.ExtensionContext) {
	// The Sentry token is not provided in git.
	Sentry.init({ dsn: SENTRY_DSN });

	controller = new TimeTrackingController(context);
	await controller.activate();
}

export async function deactivate() {
	Sentry.close();

	await controller.deactivate();
}
