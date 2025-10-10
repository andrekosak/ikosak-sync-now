// Minimal mock of the vscode API used by the tests
module.exports = {
	workspace: {
		workspaceFolders: [{ uri: { fsPath: process.cwd() } }],
		rootPath: process.cwd(),
	},
	window: {
		showErrorMessage: () => {},
		showInformationMessage: () => {},
		createStatusBarItem: () => ({ show: () => {}, dispose: () => {} }),
	},
	StatusBarAlignment: {
		Left: 0,
	},
	env: {
		openExternal: () => {},
	},
};
