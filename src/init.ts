import { log, print } from 'iconsole-logger';
import * as vscode from 'vscode';

import { meta } from './services/meta';
import { recordSyncer } from './services/record-syncer';
import { settings } from './services/settings';

const pkg: any = require('./../package.json');

export class IkosakInit {
	// Only for "Meta" instance to be created
	private meta = meta;
	// Only for "Setting" instance to be created
	private settings = settings;
	constructor() {
		/**
		 * If config could not be parsed - create only an "Error" status bar item
		 */
		if (recordSyncer.configLoadError) {
			const errorBarItem = vscode.window.createStatusBarItem(
				vscode.StatusBarAlignment.Left,
				Number.MAX_SAFE_INTEGER
			);
			errorBarItem.tooltip = recordSyncer.configLoadError;
			errorBarItem.text = '$(alert) Error loading config';
			errorBarItem.show();
			return;
		}
	}

	/**
	 * Main init function
	 */
	init() {
		log(`Activating extension ${pkg.name}`);
		print('Node version ' + process.version);
	}
}

export const IKOSAK_INIT = new IkosakInit();
