import * as vscode from 'vscode';
import { settings } from '../services/settings';

export class UploadButton {
	position: vscode.StatusBarAlignment;
	positionIndex: number;
	uploadItemDefaultIcon: string;
	uploadItemDefaultText: string;
	uploadItem: vscode.StatusBarItem;
	uploadItemInProgress: vscode.StatusBarItem;
	constructor() {
		this.position = vscode.StatusBarAlignment.Left;
		this.positionIndex = Number.MAX_SAFE_INTEGER - 2;
		this.uploadItemDefaultIcon = '$(cloud-upload)';
		this.uploadItemDefaultText = 'Upload file';

		this.uploadItem = vscode.window.createStatusBarItem(
			this.position,
			this.positionIndex
		);
		this.uploadItem.command = 'ikosak-sync-now.uploadFile';
		this.uploadItem.tooltip = 'Upload current file to ServiceNow.';
		this.uploadItem.text =
			this.uploadItemDefaultIcon + ' ' + this.uploadItemDefaultText;

		this.uploadItemInProgress = vscode.window.createStatusBarItem(
			this.position,
			this.positionIndex
		);
		this.uploadItemInProgress.tooltip = 'Upload in Progress';
	}

	initItem() {
		this.uploadItem.show();
	}

	startSpinner() {
		this.uploadItem.hide();
		this.uploadItemInProgress.text =
			'$(sync~spin) ' + this.uploadItemDefaultText;
		this.uploadItemInProgress.show();
	}

	stopSpinner() {
		this.uploadItemInProgress.hide();
		this.uploadItem.show();
	}
}

export class ResyncButton {
	position: vscode.StatusBarAlignment;
	positionIndex: number;
	itemDefaultIcon: string;
	menuBarItem: vscode.StatusBarItem;
	itemInProgress: vscode.StatusBarItem;
	instanceLabel: any;
	constructor() {
		this.position = vscode.StatusBarAlignment.Left;
		this.positionIndex = Number.MAX_SAFE_INTEGER - 1;
		this.itemDefaultIcon = '$(code)';

		this.menuBarItem = vscode.window.createStatusBarItem(
			this.position,
			this.positionIndex
		);
		this.menuBarItem.command = 'ikosak-sync-now.resyncInstance';
		this.menuBarItem.tooltip = 'Resync all files';

		this.itemInProgress = vscode.window.createStatusBarItem(
			this.position,
			this.positionIndex
		);
		this.itemInProgress.tooltip = 'Syncing...';
	}

	updateText() {
		this.instanceLabel = settings.currentInstance.label;
		this.menuBarItem.text = this.itemDefaultIcon + ' ' + this.instanceLabel;
	}

	initItem() {
		this.updateText();
		this.menuBarItem.show();
	}

	startSpinner() {
		this.menuBarItem.hide();
		this.itemInProgress.text = '$(sync~spin) ' + this.instanceLabel;
		this.itemInProgress.show();
	}

	stopSpinner() {
		this.itemInProgress.hide();
		this.menuBarItem.show();
	}
}
