import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { log } from '../lib/console';
import * as yaml from 'js-yaml';
import * as ui from '../ui/promts';
import { credentials } from './credentials';
import { migrateCredentialsToSecureStorage as migrateCredentialsUtil } from './settings-utils';
import { getErrorMessage } from '../lib/error-utils';
interface PackageInfo {
	name?: string;
	displayName?: string;
}
const pkg = require('./../../package.json') as PackageInfo;

export const configDir = '.snconfig';
const configFile = `config.yaml`;
const sourcesDirPath = `src`;
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
		// Note: initialization will complete asynchronously
		this.intialize();
	}

	async intialize() {
		this.loadConfigFile();
		// Run migration via util so it can be removed easily in future versions
		await migrateCredentialsUtil(
			this.ConfigObj,
			this.saveConfigToFile.bind(this)
		);
	}

	loadConfigFile() {
		const configFilePathYaml = path.resolve(
			this.getProjectConfigDirPath(),
			configFile
		);
		const yamlConfigExists = fs.existsSync(configFilePathYaml);
		if (yamlConfigExists) {
			try {
				this.ConfigObj = yaml.load(
					fs.readFileSync(configFilePathYaml, 'utf8')
				) as Config;
				return;
			} catch (e) {
				ui.showErrorMessage(
					`Error while loading config file ${configFile}: ${getErrorMessage(e)}`
				);
				return;
			}
		}

		this.ConfigObj = {
			connect_instance_label: '',
			connect_instance_url: '',
			connect_instance_bearer: '',
			connect_instance_user_token: '',
			connect_instance_cookie: '',
		};
		// There is no config - create a new file
		SettingsService.writeFileOrCreate(
			configFilePathYaml,
			yaml.dump(this.config)
		);
	}

	get config(): Partial<Config> {
		return this.ConfigObj;
	}

	saveConfigToFile() {
		const configDir = this.getProjectConfigDirPath();
		const configPath = path.resolve(configDir, `${configFile}`);
		fs.writeFileSync(configPath, yaml.dump(this.config), {
			encoding: 'utf8',
		});
	}

	/**
	 * Clear configured instance URL and label and persist the config
	 */
	async clearInstance(): Promise<void> {
		this.ConfigObj.connect_instance_url = '';
		this.ConfigObj.connect_instance_label = '';
		this.saveConfigToFile();
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
	 * Update authentication data for SNOW. Credentials are stored in secure storage.
	 * @param {username: string, password: string} params Parameters to encode
	 * @return {void}
	 */
	async updateAuthData(
		instanceUrl: string,
		username: string,
		password: string
	) {
		// capture whatever comes after the protocol and before the first dot
		// e.g. https://SUBDOMAIN.example.com -> captures 'SUBDOMAIN'
		const match = instanceUrl.match(/^https?:\/\/([^./]+)\./i);
		this.ConfigObj.connect_instance_label = match
			? match[1]
			: instanceUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
		this.ConfigObj.connect_instance_url = instanceUrl;
		await credentials.storeCredentials(
			this.ConfigObj.connect_instance_url,
			username,
			password
		);
		this.saveConfigToFile();
	}

	/**
	 * Get the basic auth header from secure storage or legacy config
	 * @return {Promise<string | undefined>} Basic auth header or undefined if not found
	 */
	async getBasicAuth(): Promise<string | undefined> {
		// Check if legacy basic auth is configured (bypasses SecretStorage)
		if (this.config.connect_basic_auth_legacy) {
			return this.config.connect_basic_auth_legacy;
		}

		// Otherwise, use SecretStorage
		const instance = this.config.connect_instance_url;
		if (!instance) {
			return undefined;
		}
		return credentials.getBasicAuth(instance);
	}

	/**
	 * Get authentication headers for instance API requests
	 * @return {Promise<Record<string, string>>} Authentication headers
	 */
	async getInstanceAuthHeaders(): Promise<Record<string, string>> {
		const userToken = this.config.connect_instance_user_token?.trim();
		const cookie = this.config.connect_instance_cookie?.trim();
		if (userToken || cookie) {
			const headers: Record<string, string> = {};
			if (userToken) {
				headers['X-UserToken'] = userToken;
			}
			if (cookie) {
				headers.Cookie = cookie;
			}
			return headers;
		}

		const bearer = this.config.connect_instance_bearer?.trim();
		if (bearer) {
			return {
				Authorization: /^Bearer\s+/i.test(bearer) ? bearer : `Bearer ${bearer}`,
			};
		}

		const basicAuth = await this.getBasicAuth();
		return basicAuth ? { Authorization: basicAuth } : {};
	}

	/**
	 * Migrate credentials from file-based storage to secure storage
	 * This runs on first initialization after upgrade
	 */
	// Migration logic moved to settings-utils.ts
	async migrateCredentialsToSecureStorage() {
		return migrateCredentialsUtil(
			this.ConfigObj,
			this.saveConfigToFile.bind(this)
		);
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
	private static writeFileOrCreate(filePath: string, data: string) {
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

export interface Config {
	connect_instance_url: string;
	connect_instance_label: string;
	connect_instance_bearer?: string;
	connect_instance_user_token?: string;
	connect_instance_cookie?: string;
	connect_basic_auth_legacy?: string;
	// When present, limits page size used by table API pagination in snc-api
	// Default when absent is 500
	records_threshold?: number;
}
