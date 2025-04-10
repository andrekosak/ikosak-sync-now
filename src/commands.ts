import { error, log } from 'iconsole-logger';
import * as vscode from 'vscode';

import { createInitSyncConfig } from './services/config';
import { meta } from './services/meta';
import { recordSyncer } from './services/record-syncer';
import { scopeService } from './services/scope';
import { backgroundScript } from './services/scripts-background';
import { settings } from './services/settings';
import { multiStepLogin } from './ui/multiStepLogin';
import { showProgressBar } from './ui/notifications';
import * as ui from './ui/promts';
import { resyncTableDialog } from './ui/resync-table-dialog';
import { ResyncButton, UploadButton } from './ui/statusbar-buttons';
import { Logger } from './lib/logger';
import { getExactCasePath, replaceFileContent } from './lib/filesystem';
import { md5 } from './lib/md5';

const uploadItem = new UploadButton();
const resyncButton = new ResyncButton();

/**
 * Initializes the status bar
 * @return {void}
 */
export function initializeStatusBarItems() {
	uploadItem.initItem();
	resyncButton.initItem();
}

/**
 * Full instance resync prompt
 */
export async function resyncInstance() {
	const responce = await ui.showInfoMessage(
		'Are you sure you want to pull all data? (current ./src folder will be deleted)',
		'Yes',
		'No'
	);
	if (responce !== 'Yes') {
		return;
	}

	resyncButton.startSpinner();
	const message = vscode.window.setStatusBarMessage('Synchronizing...');

	// Start sync
	await recordSyncer.resyncAllData();

	message.dispose();
	resyncButton.stopSpinner();
}

/**
 * Upload current File
 */
export async function uploadFile() {
	if (!vscode.window.activeTextEditor) return;

	uploadItem.startSpinner();
	const filePath = getExactCasePath(
		vscode.window.activeTextEditor.document.uri.fsPath
	);

	try {
		await recordSyncer.uploadFile(filePath);
	} catch (e) {
		error(e);
		ui.showErrorMessage(
			`Could not upload file ${filePath}. Error ${e.statusCode}. message: ${e.message}`
		);
	}
	uploadItem.stopSpinner();
}

/**
 * Open the currently active document in the standard browser
 * @return {void}
 */
export function openInBrowser() {
	if (!vscode.window.activeTextEditor)
		return ui.showErrorMessage('Should be focused in editor');

	const path = vscode.window.activeTextEditor.document.uri.fsPath;
	const metaData = meta.findMetaDataForFile(path);
	if (!metaData) {
		ui.showErrorMessage('File not recognized as SNOW record');
		return;
	}

	const base = settings.currentInstance.url;
	const config = recordSyncer.getTableConfigurationFromFilePath(
		metaData.filePath
	);
	if (!config) {
		ui.showErrorMessage("Can't find configuration for file.");
		return;
	}
	const recordLink = `${base}/nav_to.do?uri=${config.table}.do?sys_id=${metaData.sysId}`;
	// No need to parse
	// const parsedURL = vscode.Uri.parse(recordLink);

	Logger.info(`Going to open URL: ${recordLink}`);

	// Dont know why .openExternal is not in type spec - using "ignore"
	// @ts-ignore
	vscode.env.openExternal(recordLink);
}

/**
 * Create inital config yaml
 */
export function createInitialConfigCommand() {
	createInitSyncConfig();
}

/**
 * Execure background script in global scope
 */
export async function executeScriptGlobal() {
	try {
		await backgroundScript.execute();
	} catch (err) {
		error(err.message);
	}
}

/**
 * Execure background script in current scope
 */
export async function executeScriptCurrentScope() {
	// Refresh current scope
	await scopeService.getCurrentApp();

	try {
		await backgroundScript.execute(scopeService.currentScope);
	} catch (err) {
		ui.showErrorMessage(`Script could not be executed (internal error)`);
		error(err.message);
	}
}

/**
 * Promt for enter connection data
 */
export async function enterAuthData() {
	const inputState = await multiStepLogin();
	settings.updateAuthData(
		inputState.instance,
		inputState.username,
		inputState.password
	);
	ui.showInfoMessage('Auth data has been updated');
	resyncButton.updateText();
}

/**
 * Promt for a table name for resync
 */
export async function resyncTable() {
	const tableNames = recordSyncer.config.map((v) => ({
		label: v.table,
	}));
	const dialogState = await resyncTableDialog(tableNames);
	const progressBar = showProgressBar(
		`Pulling table ${dialogState.pickedTableName}`,
		true
	);
	await recordSyncer.resyncTable(dialogState.pickedTableName);
	ui.showInfoMessage(`Successfully pulled ${dialogState.pickedTableName}`);

	progressBar.resolve?.();
}

/**
 * Resync the current file with the remote version
 */
export async function resyncCurrentFile(): Promise<void> {
	try {
		if (!vscode.window.activeTextEditor) return;

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No file is currently open');
			return;
		}

		const filePath = getExactCasePath(editor.document.uri.fsPath);
		const currentContent = editor.document.getText();

		// Show progress indicator
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: 'Syncing file with remote...',
				cancellable: true,
			},
			async (progress) => {
				// Retrieve the remote content
				const remoteContent = await recordSyncer.fetchRemoteFileContent(
					filePath
				);

				if (!remoteContent) {
					vscode.window.showErrorMessage('Failed to fetch remote file content');
					return;
				}

				// Compare local and remote content
				if (currentContent === remoteContent) {
					vscode.window.showInformationMessage(
						'File is already in sync with remote version'
					);
					return;
				}

				// Show confirmation dialog if files differ
				const action = await vscode.window.showWarningMessage(
					'Local file differs from remote. Overwrite local file with remote content?',
					'Yes',
					'No',
					'Show Diff'
				);

				if (action === 'Yes') {
					// Overwrite local content with remote content
					await replaceFileContent(editor, remoteContent);
					// Save hash to metadata object in memory
					const config = recordSyncer.getTableConfigurationFromFilePath(
						filePath
					);
					if (!config) {
						ui.showErrorMessage('File not recognized as SNOW record.');
						return;
					}

					const fileMetaData = meta.getFileMetaData(config.folder, filePath);
					if (fileMetaData) {
						fileMetaData.hash = md5(remoteContent);
					}
					// Save metadasta to file system
					meta.saveMetaData();

					vscode.window.showInformationMessage(
						'File successfully synced with remote version'
					);
				} else if (action === 'Show Diff') {
					// Show diff view
					ui.showDiffBetweenFileAndData(remoteContent, filePath);
				}
			}
		);
	} catch (err) {
		error('Error resyncing file:', err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		vscode.window.showErrorMessage(`Failed to resync file: ${errorMessage}`);
	}
}
