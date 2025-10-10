import * as vscode from 'vscode';
import { log, print } from 'iconsole-logger';
import { credentials } from './services/credentials';

// This method is called when your extension is activated. Activation is
// controlled by activation events defined in package.json.
/**
 *
 * @param {*} context
 */
export async function activate(context: vscode.ExtensionContext) {
	log(`Activation started`);
	// Initialize credentials (SecretStorage) first so any services that rely on it
	// won't throw during module initialization.
	credentials.initialize(context);

	// Defer importing modules that create SettingsService or otherwise access
	// SecretStorage until after credentials.initialize has run.
	const initMod = await import('./init');
	const commands = await import('./commands');

	initMod.IKOSAK_INIT.init();
	commands.initializeStatusBarItems();
	initCommands(context, commands);
}

function initCommands(context: vscode.ExtensionContext, commands: any) {
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
