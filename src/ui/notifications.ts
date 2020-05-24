import {
	ExtensionContext,
	StatusBarAlignment,
	window,
	StatusBarItem,
	Selection,
	workspace,
	TextEditor,
	commands,
	ProgressLocation,
	CancellationToken,
	Progress,
} from 'vscode';

type ResolveFunction = () => void;

export const showProgressBar = function (title: string, cancellable = true) {
	let rProgress: undefined | Progress<{ message?: string; increment?: number }>,
		rToken: undefined | CancellationToken,
		rResolve: undefined | ResolveFunction;
	window.withProgress(
		{
			location: ProgressLocation.Notification,
			title,
			cancellable,
		},
		(progress, token) => {
			rProgress = progress;
			rToken = token;

			return new Promise((resolve) => {
				rResolve = resolve;
			});
		}
	);

	return {
		progress: rProgress,
		resolve: rResolve,
		token: rToken,
	};
};
