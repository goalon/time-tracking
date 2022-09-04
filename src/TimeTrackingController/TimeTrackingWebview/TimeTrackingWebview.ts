/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as nunjucks from 'nunjucks';
import { DateTime } from 'luxon';

// The way of loading node modules is inspired by
// https://github.com/microsoft/vscode-extension-samples/blob/main/webview-codicons-sample/src/extension.ts.
class TimeTrackingWebview {
	readonly content: string;

	constructor(context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
		const { extensionPath } = context;
		const userId = context.globalState.get('userId') || '';
		const lastSaveTimestampRaw: string = context.globalState.get('lastSaveTimestamp') || '';
		const lastSaveTimestamp = lastSaveTimestampRaw ?
			DateTime.fromISO(lastSaveTimestampRaw).toISO({ includeOffset: false }) :
			'';
		const lastUploadTimestampRaw: string = context.globalState.get('lastUploadTimestamp') || '';
		const lastUploadTimestamp = lastUploadTimestampRaw ?
			DateTime.fromISO(lastUploadTimestampRaw).toISO({ includeOffset: false }) :
			'';

		const localPathBase = path.join(extensionPath, 'src', 'TimeTrackingController', 'TimeTrackingWebview');
		const getLocalPath = (...targetPath: string[]) => path.join(localPathBase, ...targetPath);
		const nodeModulesPathBase = path.join(extensionPath, 'node_modules');
		const getNodeModulesPath = (...targetPath: string[]) => path.join(nodeModulesPathBase, ...targetPath);

		const chartSrcPath = getNodeModulesPath('chart.js', 'dist', 'chart.min.js');
		const chartSrc = TimeTrackingWebview.getTargetUri(chartSrcPath, panel);
		const luxonSrcPath = getNodeModulesPath('luxon', 'build', 'global', 'luxon.min.js');
		const luxonSrc = TimeTrackingWebview.getTargetUri(luxonSrcPath, panel);
		const chartAdapterLuxonSrcPath = getNodeModulesPath('chartjs-adapter-luxon', 'dist', 'chartjs-adapter-luxon.min.js');
		const chartAdapterLuxonSrc = TimeTrackingWebview.getTargetUri(chartAdapterLuxonSrcPath, panel);
		
		const fullCalendarSrcPath = getNodeModulesPath('fullcalendar', 'main.min.js');
		const fullCalendarSrc = TimeTrackingWebview.getTargetUri(fullCalendarSrcPath, panel);
		const fullCalendarStyleSrcPath = getNodeModulesPath('fullcalendar', 'main.min.css');
		const fullCalendarStyleSrc = TimeTrackingWebview.getTargetUri(fullCalendarStyleSrcPath, panel);

		const codiconsStyleSrcPath = getNodeModulesPath('@vscode/codicons', 'dist', 'codicon.css');
		const codiconsStyleSrc = TimeTrackingWebview.getTargetUri(codiconsStyleSrcPath, panel);

		const styleSrcPath = getLocalPath('style.css');
		const styleSrc = TimeTrackingWebview.getTargetUri(styleSrcPath, panel);
		const scriptSrcPath = getLocalPath('script.js');
		const scriptSrc = TimeTrackingWebview.getTargetUri(scriptSrcPath, panel);
		
		const templatePath = getLocalPath('content.njk');
		const templateVariables = {
			chartSrc,
			luxonSrc,
			chartAdapterLuxonSrc,
			fullCalendarSrc,
			fullCalendarStyleSrc,
			codiconsStyleSrc,
			styleSrc,
			scriptSrc,
			userId,
			lastSaveTimestamp,
			lastUploadTimestamp,
		};
		
		this.content = nunjucks.render(templatePath, templateVariables);
	}

	private static getTargetUri(
		targetPath: string,
		panel: vscode.WebviewPanel,
	): vscode.Uri {
		const targetUri = vscode.Uri.file(targetPath);
		const targetWebviewUri = panel.webview.asWebviewUri(targetUri);
		return targetWebviewUri;
	}
}

export default TimeTrackingWebview;
