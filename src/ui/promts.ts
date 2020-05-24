import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { settings } from '../services/settings';
import { log } from 'iconsole-logger';

/**
 * Prompt the user whether they want to see a diff, continue with the current action or cancel the operation.
 * @param data Content for diff
 * @param filePath Filepath for diff
 */
export async function promptUserAboutConflict(
	data: string,
	filePath: string
): Promise<boolean> {
	const returnDefault = false;
	const resp = await showInfoMessage(
		'The record has been modified on instance since last sync. Overwrite remote version?',
		'Skip for now',
		'Yes, overwrite',
		'SHOW DIFF'
	);
	if (resp === 'Yes, overwrite') {
		return true;
	}
	if (resp === 'Skip for now') {
		return false;
	}
	if (resp === 'SHOW DIFF') {
		await showDiffBetweenFileAndData(data, filePath);
		return false;
	}
	return returnDefault;
}
/**
 *
 * @param prompt The prompt to show
 * @param actions The actions to display
 */
export function showInfoMessage(prompt: string, ...actions: string[]) {
	return vscode.window.showInformationMessage(prompt, ...actions);
}

/**
 * Show a prompt to the user which is required to fill out
 * @param question The question to ask
 * @return {Promise<boolean>} Whether the user replied yes
 */
export async function askYesNoQuestion(question: string) {
	const reply = await vscode.window.showInformationMessage(
		question,
		'Yes',
		'No'
	);
	return reply === 'Yes';
}

/**
 * Show a prompt to the user which is required to fill out
 * @param message Message to show
 */
export function showRequiredPrompt(message: string) {
	const options = generateRequiredPromptOptions(message);
	return vscode.window.showInputBox(options);
}

/**
 * Show a prompt to the user which is not required to fill out
 * @param message Message to show
 * @return {Thenable<string>} The user's answer
 */
export function showPrompt(message: string) {
	const options = generatePromptOptions(message);
	return vscode.window.showInputBox(options);
}
/**
 * Show a prompt to the user which is required to fill out with password mode
 * @param message Message to show
 */
export function showPasswordPrompt(message: string) {
	const options = generateRequiredPromptOptions(message);
	options.password = true;
	return vscode.window.showInputBox(options);
}

/**
 * Generates InputBoxOptions for a prompt. Includes validation that checks for
 * 	empty string.
 * @param message Message to show
 */
function generateRequiredPromptOptions(message: string) {
	const userPromptOptions = generatePromptOptions(message);
	userPromptOptions.validateInput = (val) => {
		if (val === '') {
			return 'Please enter a valid value.';
		}
		return;
	};
	return userPromptOptions;
}

/**
 * Generates InputBoxOptions for a prompt. Includes validation that checks for
 * 	empty string.
 * @param message Message to show
 */
function generatePromptOptions(message: string): vscode.InputBoxOptions {
	const userPromptOptions = {
		prompt: message,
		password: false,
	};
	return userPromptOptions;
}

/**
 * Show a message that the user is not authenticated
 * @return {Promise<void>}
 */
export async function showNotAuthenticatedMessage() {
	await showErrorMessage('Not authorized! User/Password may be incorrect.');
}

/**
 * Show an error message to the user
 * @param message Message to show
 * @return {Promise<false>} Always returns false
 */
export async function showErrorMessage(message: string) {
	await vscode.window.showErrorMessage(message);
	return false;
}

/**
 * Shows a diff view for a specified file and provided content.
 * @param data Data that's compared to file
 * @param filePath Path to file to compare
 */
export async function showDiffBetweenFileAndData(
	data: string,
	filePath: string
) {
	const fileUri = vscode.Uri.file(filePath);
	// Create temporary file
	const tempFilePath = path.resolve(
		settings.getConfigDirPath(),
		`tmp${path.extname(filePath)}`
	);
	await fs.writeFileSync(tempFilePath, data);
	const tempUri = vscode.Uri.file(tempFilePath);
	await vscode.commands.executeCommand(
		'vscode.diff',
		tempUri,
		fileUri,
		'Remote SNC Instance ↔ Local'
	);
	return;
}
