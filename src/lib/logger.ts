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
			this._outputChannel.appendLine(`${formatTimestamp()}${title}`);
		}
		const message = prepareMessage(value, indent);
		// appendLine will add a trailing newline; preserve multi-line content
		message.split('\n').forEach((line) => this._outputChannel.appendLine(line));
	}
}

function prepareMessage(value: string | object | undefined, indent: boolean) {
	const bodyPrefix = indent ? '  ' : '';
	const lines: string[] = [];
	if (typeof value === 'object') {
		if (Array.isArray(value)) {
			const json = JSON.stringify(value, undefined, 2);
			lines.push(...json.split('\n'));
		} else {
			Object.entries(value).forEach((item) => {
				lines.push(`${item[0]} = ${item[1]}`);
			});
		}
	} else {
		lines.push(String(value));
	}
	const ts = formatTimestamp();
	return lines.map((l) => `${ts}${bodyPrefix}${l}`).join('\n');
}

function formatTimestamp() {
	const d = new Date();
	const hh = String(d.getHours()).padStart(2, '0');
	const mm = String(d.getMinutes()).padStart(2, '0');
	const ss = String(d.getSeconds()).padStart(2, '0');
	const ms = String(d.getMilliseconds()).padStart(3, '0');
	return `[${hh}:${mm}:${ss} ${ms}] `;
}

Logger.initialize();
