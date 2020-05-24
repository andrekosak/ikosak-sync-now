/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import {
	QuickPickItem,
	window,
	Disposable,
	CancellationToken,
	QuickInputButton,
	QuickInput,
	ExtensionContext,
	QuickInputButtons,
	Uri,
} from 'vscode';
import { settings } from './../services/settings';

/**
 * A multi-step input using window.createQuickPick() and window.createInputBox().
 *
 * This first part uses the helper class `MultiStepInput` that wraps the API for the multi-step case.
 */
export async function multiStepLogin() {
	interface State {
		title: string;
		instance: string;
		username: string;
		password: string;
		step: number;
		totalSteps: number;
		resourceGroup: QuickPickItem | string;
		name: string;
		runtime: QuickPickItem;
	}

	/**
	 * This function starting the input wizard flow
	 */
	async function collectInputs() {
		const state = {
			instance: settings.currentInstance.label,
		} as Partial<State>;
		await MultiStepInput.run((input) => inputInstance(input, state));
		return state as State;
	}

	const title = 'Authentication';

	async function inputInstance(input: MultiStepInput, state: Partial<State>) {
		const instanceNameInput = await input.showInputBox({
			title,
			step: 1,
			totalSteps: 3,
			value: state.instance || '',
			prompt: 'Enter NOW instance name (Example: dev00001)',
			validate: validateSncInstance,
			shouldResume,
		});
		// if (pick instanceof MyButton) {
		// 	return (input: MultiStepInput) => inputResourceGroupName(input, state);
		// }
		state.instance = instanceNameInput;
		return (input: MultiStepInput) => inputUsername(input, state);
	}

	async function inputUsername(input: MultiStepInput, state: Partial<State>) {
		state.username = await input.showInputBox({
			title,
			step: 2,
			totalSteps: 3,
			value: state.username || '',
			prompt: 'Your user name for authentification',
			validate: validateMandatory,
			shouldResume,
		});
		return (input: MultiStepInput) => inputPassword(input, state);
	}

	async function inputPassword(input: MultiStepInput, state: Partial<State>) {
		state.password = await input.showInputBox({
			title,
			step: 3,
			totalSteps: 3,
			value: state.password || '',
			prompt: 'Your password for authentification',
			validate: validateMandatory,
			shouldResume,
			password: true,
		});
	}

	function shouldResume() {
		// Could show a notification with the option to resume.
		return new Promise<boolean>((resolve, reject) => {});
	}

	/**
	 * Instance name validation
	 * @param name
	 */
	async function validateSncInstance(name: string) {
		// await new Promise(resolve => setTimeout(resolve, 1000));
		if (!name) return 'Mandatory input';
		if (/[^a-z0-9]/.test(name))
			return 'Should be only lower-case chars and numbers';
		return undefined;
	}

	/**
	 * Validate value should be mandatory
	 * @param name
	 */
	async function validateMandatory(name: string) {
		if (!name) return 'Mandatory input';
		return undefined;
	}

	const state = await collectInputs();
	return state;
	// window.showInformationMessage(`Creating Application Service '${state.password}'`);
}

// -------------------------------------------------------
// Helper code that wraps the API for the multi-step case.
// -------------------------------------------------------

class InputFlowAction {
	private constructor() {}
	static back = new InputFlowAction();
	static cancel = new InputFlowAction();
	static resume = new InputFlowAction();
}

type InputStep = (input: MultiStepInput) => Thenable<InputStep | void>;

interface QuickPickParameters<T extends QuickPickItem> {
	title: string;
	step: number;
	totalSteps: number;
	items: T[];
	activeItem?: T;
	placeholder: string;
	buttons?: QuickInputButton[];
	shouldResume: () => Thenable<boolean>;
}

interface InputBoxParameters {
	title: string;
	step: number;
	totalSteps: number;
	value: string;
	prompt: string;
	validate: (value: string) => Promise<string | undefined>;
	buttons?: QuickInputButton[];
	shouldResume: () => Thenable<boolean>;
	password?: boolean;
}

class MultiStepInput {
	static async run<T>(start: InputStep) {
		const input = new MultiStepInput();
		return input.stepThrough(start);
	}

	private current?: QuickInput;
	private steps: InputStep[] = [];

	private async stepThrough<T>(start: InputStep) {
		let step: InputStep | void = start;
		while (step) {
			this.steps.push(step);
			if (this.current) {
				this.current.enabled = false;
				this.current.busy = true;
			}
			try {
				step = await step(this);
			} catch (err) {
				if (err === InputFlowAction.back) {
					this.steps.pop();
					step = this.steps.pop();
				} else if (err === InputFlowAction.resume) {
					step = this.steps.pop();
				} else if (err === InputFlowAction.cancel) {
					step = undefined;
				} else {
					throw err;
				}
			}
		}
		if (this.current) {
			this.current.dispose();
		}
	}

	async showQuickPick<
		T extends QuickPickItem,
		P extends QuickPickParameters<T>
	>({
		title,
		step,
		totalSteps,
		items,
		activeItem,
		placeholder,
		buttons,
		shouldResume,
	}: P) {
		const disposables: Disposable[] = [];
		try {
			return await new Promise<
				T | (P extends { buttons: (infer I)[] } ? I : never)
			>((resolve, reject) => {
				const input = window.createQuickPick<T>();
				input.title = title;
				input.step = step;
				input.totalSteps = totalSteps;
				input.placeholder = placeholder;
				input.items = items;
				input.ignoreFocusOut = true;
				if (activeItem) {
					input.activeItems = [activeItem];
				}
				input.buttons = [
					...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
					...(buttons || []),
				];
				disposables.push(
					input.onDidTriggerButton((item) => {
						if (item === QuickInputButtons.Back) {
							reject(InputFlowAction.back);
						} else {
							resolve(<any>item);
						}
					}),
					input.onDidChangeSelection((items) => resolve(items[0])),
					input.onDidHide(() => {
						(async () => {
							reject(
								shouldResume && (await shouldResume())
									? InputFlowAction.resume
									: InputFlowAction.cancel
							);
						})().catch(reject);
					})
				);
				if (this.current) {
					this.current.dispose();
				}
				this.current = input;
				this.current.show();
			});
		} finally {
			disposables.forEach((d) => d.dispose());
		}
	}

	async showInputBox<P extends InputBoxParameters>({
		title,
		step,
		totalSteps,
		value,
		prompt,
		validate,
		buttons,
		shouldResume,
		password = false,
	}: P) {
		const disposables: Disposable[] = [];
		try {
			return await new Promise<
				string | (P extends { buttons: (infer I)[] } ? I : never)
			>((resolve, reject) => {
				const input = window.createInputBox();
				input.title = title;
				input.step = step;
				input.totalSteps = totalSteps;
				input.value = value || '';
				input.prompt = prompt;
				input.ignoreFocusOut = true;
				input.password = password;
				input.buttons = [
					...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
					...(buttons || []),
				];
				let validating = validate('');
				disposables.push(
					input.onDidTriggerButton((item) => {
						if (item === QuickInputButtons.Back) {
							reject(InputFlowAction.back);
						} else {
							resolve(<any>item);
						}
					}),
					input.onDidAccept(async () => {
						const value = input.value;
						input.enabled = false;
						input.busy = true;
						if (!(await validate(value))) {
							resolve(value);
						}
						input.enabled = true;
						input.busy = false;
					}),
					input.onDidChangeValue(async (text) => {
						// Do nothing if value is empty
						if (!text) return;
						const current = validate(text);
						validating = current;
						const validationMessage = await current;
						if (current === validating) {
							input.validationMessage = validationMessage;
						}
					}),
					input.onDidHide(() => {
						(async () => {
							reject(
								shouldResume && (await shouldResume())
									? InputFlowAction.resume
									: InputFlowAction.cancel
							);
						})().catch(reject);
					})
				);
				if (this.current) {
					this.current.dispose();
				}
				this.current = input;
				this.current.show();
			});
		} finally {
			disposables.forEach((d) => d.dispose());
		}
	}
}
