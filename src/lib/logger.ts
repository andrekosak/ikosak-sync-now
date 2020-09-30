import { OutputChannel, window } from 'vscode';
const pkg: any = require('./../../package.json');

export class Logger {
	private static _outputChannel: OutputChannel;

	static initialize() {
		if (!this._outputChannel) {
			this._outputChannel = window.createOutputChannel(`${pkg.name}`);
		}
	}

	static getChannel() {
		this.initialize();
		return this._outputChannel;
	}

	static info(value: string | object | undefined, indent = false, title = '') {
		if (title) {
			this._outputChannel.appendLine(title);
		}
		const message = prepareMessage(value, indent);
		this._outputChannel.appendLine(message);
	}
}

function prepareMessage(value: string | object | undefined, indent: boolean) {
	const prefix = indent ? '  ' : '';
	let text = '';
	if (typeof value === 'object') {
		if (Array.isArray(value)) {
			text = `${prefix}${JSON.stringify(value, undefined, 2)}`;
		} else {
			Object.entries(value).map((item) => {
				text += `${prefix}${item[0]} = ${item[1]}\n`;
			});
		}
		return text;
	}
	text = `${prefix}${value}`;
	return text;
}

Logger.initialize();
