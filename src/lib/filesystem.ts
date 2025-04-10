import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Create a folder with all parent folders
 * @param directoryPath
 */
export function mkdirp(directoryPath: string) {
	try {
		fs.mkdirSync(directoryPath);
	} catch (err) {
		if (err.code === 'EEXIST') {
			return;
		}
		if (['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1) {
			throw new Error(`Permission denied, ${path}`);
		}
		// Make parent path
		mkdirp(path.dirname(directoryPath));
		// Make self again recursively
		mkdirp(directoryPath);
	}
}

/**
 * Recursivly removes directory
 * @param directoryPath Dir path
 */
export function rmrf(directoryPath: string) {
	try {
		const dirList = fs.readdirSync(directoryPath);
		for (let i = 0; i < dirList.length; i++) {
			const filename = path.join(directoryPath, dirList[i]);
			const stat = fs.statSync(filename);

			if (filename === '.' || filename === '..') {
				// pass these files
			} else if (stat.isDirectory()) {
				// rmdir recursively
				rmrf(filename);
			} else {
				// rm fiilename
				fs.unlinkSync(filename);
			}
		}
		fs.rmdirSync(directoryPath);
	} catch (err) {
		// We do not actually want to see any error
		// error(err);
	}
}

export function getExactCasePath(filePath: string): string {
	const dir = path.dirname(filePath);
	const baseName = path.basename(filePath).toLowerCase(); // Case-insensitive match

	// Read directory entries
	const files = fs.readdirSync(dir);
	const exactName = files.find((f) => f.toLowerCase() === baseName);

	if (!exactName) {
		throw new Error(`File not found: ${filePath}`);
	}

	return path.join(dir, exactName);
}

/**
 * Replaces the content of the current file with the provided content
 */
export async function replaceFileContent(
	editor: vscode.TextEditor,
	newContent: string
): Promise<boolean> {
	const fullRange = new vscode.Range(
		editor.document.positionAt(0),
		editor.document.positionAt(editor.document.getText().length)
	);

	const edit = new vscode.WorkspaceEdit();
	edit.replace(editor.document.uri, fullRange, newContent);

	return vscode.workspace.applyEdit(edit);
}
