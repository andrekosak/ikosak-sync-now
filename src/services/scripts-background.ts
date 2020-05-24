import * as cheerio from 'cheerio';
import * as Request from 'request-promise-native';
import { ViewColumn, window } from 'vscode';

import { showProgressBar } from '../ui/notifications';
import { showErrorMessage } from '../ui/promts';
import { meta } from './meta';
import { getOptions, request } from '../lib/request';
import { scopeService } from './scope';
import { settings } from './settings';

class ScriptsBackground {
	constructor() {}
	async execute(scope = 'Global') {
		const editor = window.activeTextEditor;
		const script = editor?.document.getText(editor.selection);
		if (!script?.length) {
			showErrorMessage('No code selected');
			return;
		}

		const bar = showProgressBar(`Execution scope: ${scope}`, false);
		await scopeService.getCurrentApp();
		const ckToken = await this.getCkToken();
		if (!ckToken) {
			showErrorMessage('Could not get token');
			return;
		}
		meta.mergeToMetadata({
			ckToken,
		});

		const executionResult = await this.executeOnServer(script, ckToken, scope);
		this.showResultInNewTab(executionResult);
		bar.resolve?.();
	}

	async executeOnServer(script: string, ckToken: string, scope = 'global') {
		const options: Request.Options = getOptions('/sys.scripts.do', {
			method: 'POST',
		});
		options.form = {
			script,
			sysparm_ck: ckToken,
			runscript: 'Run script',
			sys_scope: scope,
			record_for_rollback: true,
			// quota_managed_transaction: quotaManagedTransaction
		};
		return request(options);
	}

	/**
	 * Gets value if hidden <input> tag with ck token
	 */
	async getCkToken() {
		const options = getOptions('/sys.scripts.do');
		const body = await request(options);
		const bodyHtml = cheerio.load(body);
		return bodyHtml('input[name="sysparm_ck"]').attr('value');
	}

	/**
	 * Show execution result in a webview panel
	 * @param result execution result
	 */
	showResultInNewTab(result: string) {
		if (meta.globals.BG_SCRIPT_RESULT_PANEL)
			meta.globals.BG_SCRIPT_RESULT_PANEL.dispose();

		const panel = window.createWebviewPanel(
			'WebView',
			'Title',
			ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				// TODO: Include a library for highlighting of result
				// localResourceRoots: [
				// 	Uri.file(
				// 		path.join(
				// 		)
				// 	)
				// ]
			}
		);
		meta.globals.BG_SCRIPT_RESULT_PANEL = panel;
		panel.title = 'Scripts Backgroud result';
		result = result.replace(
			/ href='/gi,
			` href='${settings.currentInstance.url}/`
		);
		panel.webview.html = result;
	}
}

export const backgroundScript = new ScriptsBackground();
