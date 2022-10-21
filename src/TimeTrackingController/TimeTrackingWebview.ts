/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as nunjucks from 'nunjucks';
import * as fs from 'fs';
import Helper from './Helper';

// The way of loading node modules is inspired by
// https://github.com/microsoft/vscode-extension-samples/blob/main/webview-codicons-sample/src/extension.ts.
class TimeTrackingWebview {
	readonly content: string;

	constructor(context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
		const { cspSource } = panel.webview;
		const { extensionPath } = context;
		const userId = context.globalState.get('userId') || '';
		
		const staticPathBase = path.join(extensionPath, 'static');
		const getStaticPath = (...targetPath: string[]) => path.join(staticPathBase, ...targetPath);
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

		const styleSrcPath = getStaticPath('style.css');
		const styleSrc = TimeTrackingWebview.getTargetUri(styleSrcPath, panel);
		const scriptSrcPath = getStaticPath('script.js');
		const scriptSrc = TimeTrackingWebview.getTargetUri(scriptSrcPath, panel);
		
		const templatePath = getStaticPath('content.njk');
		const templateVariables = {
			cspSource,
			chartSrc,
			luxonSrc,
			chartAdapterLuxonSrc,
			fullCalendarSrc,
			fullCalendarStyleSrc,
			codiconsStyleSrc,
			styleSrc,
			scriptSrc,
			userId,
			...Helper.getTimestampMetadata(context),
		};
		
		// Workaround for an issue with `nunjucks.render` on Windows.
		const templateStr = fs.readFileSync(templatePath).toString();
		this.content = nunjucks.renderString(templateStr, templateVariables);
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
