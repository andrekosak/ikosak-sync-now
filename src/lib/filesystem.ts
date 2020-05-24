import * as path from 'path';
import * as fs from 'fs';
import { error } from 'iconsole-logger';

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
