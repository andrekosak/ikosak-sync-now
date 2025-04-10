import * as vscode from 'vscode';
import { log, print } from 'iconsole-logger';
import * as commands from './commands';
import { IKOSAK_INIT } from './init';

// This method is called when your extension is activated. Activation is
// controlled by activation events defined in package.json.
/**
 *
 * @param {*} context
 */
export function activate(context: vscode.ExtensionContext) {
	log(`Activation started`);
	IKOSAK_INIT.init();
	commands.initializeStatusBarItems();
	initCommands(context);
}

function initCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'ikosak-sync-now.runBackgroundScriptGlobal',
			commands.executeScriptGlobal
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'ikosak-sync-now.runBackgroundScriptCurrent',
			commands.executeScriptCurrentScope
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'ikosak-sync-now.enterConnectionSettings',
			commands.enterAuthData
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'ikosak-sync-now.createInitialConfig',
			commands.createInitialConfigCommand
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'ikosak-sync-now.resyncInstance',
			commands.resyncInstance
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'ikosak-sync-now.resyncTable',
			commands.resyncTable
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'ikosak-sync-now.resyncCurrentFile',
			commands.resyncCurrentFile
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'ikosak-sync-now.uploadFile',
			commands.uploadFile
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'ikosak-sync-now.openInBrowser',
			commands.openInBrowser
		)
	);
}
