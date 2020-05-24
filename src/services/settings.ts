import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { log } from 'iconsole-logger';
import * as yaml from 'js-yaml';
import * as ui from '../ui/promts';
const pkg: any = require('./../../package.json');

export const legacyConfigDir = '.snsync',
	configDir = '.snconfig',
	settingsFile = 'config.json',
	configFile = `config.yaml`,
	sourcesDirPath = `src`;
export const metaFileName = `metadata.json`;
export const syncConfigFilename = `syncconfig`;

class SettingsService {
	ConfigObj: Partial<Config> = {};
	constructor() {
		log('Init SettingsService');
		if (!SettingsService.getWorkSpacePath()) {
			ui.showErrorMessage(
				`Could not activate ${pkg.displayName}: please open a folder and try again`
			);
			return;
		}
		this.intialize();
	}

	intialize() {
		this.loadConfigFile();
		if (this.hasLegacyConfig()) {
			this.saveConfigToFile();
		}
		if (this.hasLegacySettingsFile()) {
			this.saveConfigToFile();
		}
	}

	loadConfigFile() {
		const configFilePathYaml = path.resolve(
			this.getProjectConfigDirPath(),
			configFile
		);
		const yamlConfigExists = fs.existsSync(configFilePathYaml);
		if (yamlConfigExists) {
			try {
				this.ConfigObj = yaml.safeLoad(
					fs.readFileSync(configFilePathYaml, 'utf8')
				);
				return;
			} catch (e) {
				ui.showErrorMessage(
					`Error while loading config file ${configFile}: ${e.message}`
				);
				return;
			}
		}

		this.ConfigObj = {
			connect_basic_auth: '',
			connect_instance_label: '',
			connect_instance_url: '',
		};
		// There is no config - create a new file
		SettingsService.writeFileOrCreate(
			configFilePathYaml,
			yaml.safeDump(this.config)
		);
	}

	get config(): Partial<Config> {
		return this.ConfigObj;
	}

	/**
	 * Read settings from file
	 */
	hasLegacySettingsFile() {
		const workspacePath = SettingsService.getWorkSpacePath();

		const filePath = path.resolve(workspacePath, legacyConfigDir, settingsFile);
		if (fs.existsSync(filePath)) {
			// invalidate cache
			delete require.cache[require.resolve(filePath)];
			const legacyConfig = require(filePath);
			// this.ConfigObj.connect_basic_auth = settings.auth.match(/Basic (.+)/)[1];
			this.ConfigObj.connect_basic_auth = legacyConfig.auth;
			fs.unlinkSync(filePath);
			return true;
		}
		return;
	}

	hasLegacyConfig() {
		const legacyConfigFile = 'instances.json';
		const fPath = path.resolve(
			this.getProjectConfigDirPath(),
			legacyConfigFile
		);
		if (fs.existsSync(fPath)) {
			const instanceData = require(fPath);
			// Check if value is defined and has property length
			if (!instanceData || !instanceData.length) {
				return;
			}
			this.ConfigObj.connect_instance_url = instanceData[0].url;
			this.ConfigObj.connect_instance_label = instanceData[0].display;

			fs.unlinkSync(fPath);
			return true;
		}
		return;
	}

	saveConfigToFile() {
		const configDir = this.getProjectConfigDirPath();
		const configPath = path.resolve(configDir, `${configFile}`);
		fs.writeFileSync(configPath, yaml.safeDump(this.config), {
			encoding: 'utf8',
		});
	}

	/**
	 * Get the current instance
	 * @return {Instance}
	 */
	get currentInstance() {
		return {
			url: this.config.connect_instance_url,
			label: this.config.connect_instance_label,
		};
	}

	/**
	 * Update authentication data for SNOW. User+Password combination will be turned into
	 * 	a Base64 encoded Basic Auth Header
	 * @param {username: string, password: string} params Parameters to encode
	 * @return {void}
	 */
	updateAuthData(instance: string, username: string, password: string) {
		this.ConfigObj.connect_basic_auth =
			'Basic ' + new Buffer(username + ':' + password).toString('base64');
		this.ConfigObj.connect_instance_label = instance;
		this.ConfigObj.connect_instance_url = `https://${instance}.service-now.com`;
		this.saveConfigToFile();
	}

	/**
	 * Get the path to the current workspace
	 * @return {string}
	 */
	getSourceDirPath() {
		const workspacePath = SettingsService.getWorkSpacePath();
		return path.resolve(workspacePath, sourcesDirPath);
	}

	/**
	 * Get the path to the current workspace
	 * TODO: vscode.workspace.rootPath is deprecated - see specification
	 */
	static getWorkSpacePath() {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		const workspacePath = workspaceFolders
			? workspaceFolders[0].uri.fsPath
			: vscode.workspace.rootPath;

		if (!workspacePath) {
			const errMessage = `workspacePath not found`;
			ui.showErrorMessage(errMessage);
			throw new Error(errMessage);
		}
		return workspacePath;
	}

	/**
	 * Get the path for the workspace's hidden settings folder
	 * This folder should store settings not checked into git like metadata, temporary files and local settings
	 * @return {string}
	 */
	getConfigDirPath() {
		const workspacePath = SettingsService.getWorkSpacePath();
		const dirPath = path.resolve(workspacePath, configDir);
		return dirPath;
	}

	getLegacyDirPath() {
		const workspacePath = SettingsService.getWorkSpacePath();
		const dirPath = path.resolve(workspacePath, legacyConfigDir);
		return dirPath;
	}

	/**
	 * Get the path for the workspace's hidden project configuration folder
	 * This folder should store configuration that is checked into git on a per-project basis
	 * @return {string}
	 */
	getProjectConfigDirPath() {
		const workspacePath = SettingsService.getWorkSpacePath();
		const dirPath = path.resolve(workspacePath, configDir);
		return dirPath;
	}

	/**
	 * Writes data to file. If directory doesn't exist, creates said directory.
	 * @param {string} filePath Path to file
	 * @param {string} data Data to write to file
	 * @return {void}
	 */
	static writeFileOrCreate(filePath: string, data: string) {
		const dir = path.dirname(filePath);
		try {
			fs.mkdirSync(dir);
		} catch (e) {
			// ignore
		}
		fs.writeFileSync(filePath, data, 'utf8');
	}
}

export const settings = new SettingsService();

interface Config {
	connect_instance_url: string;
	connect_basic_auth: string;
	connect_instance_label: string;
}
