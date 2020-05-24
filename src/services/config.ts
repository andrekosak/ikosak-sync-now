import { log, error } from 'iconsole-logger';
import { settings, syncConfigFilename, configDir } from './settings';
import * as fs from 'fs';
import * as path from 'path';
import { showInfoMessage } from '../ui/promts';

/**
 * Creates a new SyncConfig file, copying the example from "assets" folder
 */
export const createInitSyncConfig = () => {
	try {
		const configPath = path.resolve(
			__dirname,
			`../assets/${syncConfigFilename}.yaml`
		);
		const initialConfig = fs.readFileSync(configPath, { encoding: 'utf8' });
		const configFileName = getFilePathForNewConfig();
		const configFilePath = path.resolve(
			settings.getProjectConfigDirPath(),
			configFileName
		);
		fs.writeFileSync(configFilePath, initialConfig, {
			encoding: 'utf8',
		});
		showInfoMessage(
			`Check your default sync config at ${configDir}/${configFileName}`
		);
	} catch (err) {
		error(err);
	}
};

/**
 * Determine file path for new config
 * Adding a digit if a config already exists
 */
function getFilePathForNewConfig() {
	let i = 0;
	const configDir = settings.getProjectConfigDirPath();
	while (true) {
		const newConfigFileName = syncConfigFilename + (i ? i : '');
		const pathToCheck = path.resolve(configDir, newConfigFileName);
		const exists = fs.existsSync(pathToCheck + '.yaml');
		if (!exists) {
			return newConfigFileName + '.yaml';
		}
		i++;
	}
}
