import * as vscode from 'vscode';
import { settings } from '../services/settings';
const elegantSpinner = require('elegant-spinner');

export class UploadButton {
	position: vscode.StatusBarAlignment;
	positionIndex: number;
	uploadItemDefaultIcon: string;
	uploadItemDefaultText: string;
	interval: any;
	uploadItem: vscode.StatusBarItem;
	uploadItemInProgress: vscode.StatusBarItem;
	constructor() {
		this.position = vscode.StatusBarAlignment.Left;
		this.positionIndex = Number.MAX_SAFE_INTEGER - 2;
		this.uploadItemDefaultIcon = '$(cloud-upload)';
		this.uploadItemDefaultText = 'Upload file';
		this.interval = undefined;

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

		const spinner = elegantSpinner();
		const update = () => {
			this.uploadItemInProgress.text =
				spinner() + ' ' + this.uploadItemDefaultText;
		};
		this.interval = global.setInterval(update, 100);
		this.uploadItemInProgress.show();
	}

	stopSpinner() {
		if (this.interval !== undefined) {
			global.clearInterval(this.interval);
			this.interval = undefined;
		}
		this.uploadItemInProgress.hide();
		this.uploadItem.show();
	}
}

export class ResyncButton {
	position: vscode.StatusBarAlignment;
	positionIndex: number;
	itemDefaultIcon: string;
	interval: any;
	menuBarItem: vscode.StatusBarItem;
	itemInProgress: vscode.StatusBarItem;
	instanceLabel: any;
	constructor() {
		this.position = vscode.StatusBarAlignment.Left;
		this.positionIndex = Number.MAX_SAFE_INTEGER - 1;
		this.itemDefaultIcon = '$(code)';
		this.interval = undefined;

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

		const spinner = elegantSpinner();
		const update = () => {
			this.itemInProgress.text = spinner() + ' ' + this.instanceLabel;
		};
		this.interval = global.setInterval(update, 100);
		this.itemInProgress.show();
	}

	stopSpinner() {
		if (this.interval !== undefined) {
			global.clearInterval(this.interval);
			this.interval = undefined;
		}
		this.itemInProgress.hide();
		this.menuBarItem.show();
	}
}
