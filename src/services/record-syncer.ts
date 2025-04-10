import * as fs from 'fs';
import { error, log } from 'iconsole-logger';
import * as yaml from 'js-yaml';
import * as path from 'path';
import * as vscode from 'vscode';

import * as files from '../lib/filesystem';
import { md5 } from '../lib/md5';
import * as api from '../snc-api';
import * as ui from '../ui/promts';
import { showProgressBar } from './../ui/notifications';
import { createInitSyncConfig } from './config';
import { meta } from './meta';
import { scopeService } from './scope';
import { settings, syncConfigFilename } from './settings';
import { Logger } from '../lib/logger';

const process = require('process');

/**
 * Someday I will need to use the config
 */
// const config = vscode.workspace.getConfiguration('ikosak-sync-now');

/**
 * Syncronisation of files between client and SNC
 */
export class RecordSyncerService {
	configLoadError = '';
	private _config: SyncConfiguration = [];
	constructor() {
		this.loadSyncConfig();
	}

	loadSyncConfig() {
		const configDir = settings.getProjectConfigDirPath();
		const configFilePathYaml = path.resolve(
			configDir,
			syncConfigFilename + '.yaml'
		);
		const yamlConfigExists = fs.existsSync(configFilePathYaml);
		if (yamlConfigExists) {
			try {
				/**
				 * @private
				 * @type {SyncConfiguration}
				 */
				this._config = yaml.safeLoad(
					fs.readFileSync(configFilePathYaml, 'utf8')
				);
			} catch (e) {
				this.configLoadError = `Error while loading sync config file ${
					syncConfigFilename + '.yaml'
				}: ${e.message}`;
				ui.showErrorMessage(this.configLoadError);
			}
		} else {
			/**
			 *  Backwards compatibility with the .json style config
			 */
			const configFilePathJson = path.resolve(
				configDir,
				syncConfigFilename + '.json'
			);
			const legacyConfigExists = fs.existsSync(configFilePathJson);
			if (!legacyConfigExists) {
				// Do not creating initial config here as commands.ts should import record-syncer.ts
				createInitSyncConfig();
				return;
			}

			try {
				this._config = require(configFilePathJson).folders;
			} catch (e) {
				this.configLoadError = `Error while loading config file ${
					syncConfigFilename + '.json'
				}: ${e.message}`;
				ui.showErrorMessage(this.configLoadError);
			}
		}
	}

	/**
	 * Resynchronize all data from ServiceNow
	 * @return {Promise<void>}
	 */
	async resyncAllData() {
		let syncCancelled = false;
		const startTime = process.hrtime();
		meta.clearMetaData();

		// Reload config from hard drive
		this.loadSyncConfig();

		const progressBar = showProgressBar('Syncing', true);
		const progressStep = Math.round((1 / this._config.length) * 100);
		progressBar.token?.onCancellationRequested(() => {
			syncCancelled = true;
		});

		try {
			// Getting list of scopes
			await scopeService.getAllApplicationScopes();
			await files.rmrf(settings.getSourceDirPath());

			// Get each table and write to disk
			for (let index = 0; index < this._config.length; index++) {
				// Skip if user has cancelled sync
				if (syncCancelled) continue;

				log(`Resyncing table ${this._config[index].table}`);
				const msg = ` ${this._config[index].table} (${index + 1} of ${
					this._config.length
				})...`;
				progressBar.progress?.report({
					increment: progressStep,
					message: msg,
				});

				// Resync a table
				try {
					await this.resyncData(this._config[index]);
				} catch (err) {
					error(err);
					ui.showErrorMessage(
						`Error while resyncing table ${this._config[index].table}`
					);
				}
			}
			progressBar.resolve?.();
		} catch (err) {
			if (err.statusCode === 401) {
				ui.showNotAuthenticatedMessage();
			} else {
				ui.showErrorMessage('Error:' + err.message);
			}
		} finally {
			// Resolve progress bar if still there
			progressBar.resolve?.();
			meta.saveMetaData();
		}

		const endTime = process.hrtime(startTime);
		vscode.window.showInformationMessage(
			`Sync finished. Elapsed time: ${endTime[0]}s. Files created: ${meta._metadata.filesCount}`
		);
	}

	/**
	 * Synchronize a table from ServiceNow
	 * @param {string} tableName Name of table to synchronize
	 * @return {Promise<void>}
	 */
	async resyncTable(tableName: string) {
		const config = this._config.find((conf) => conf.table === tableName);
		if (!config) {
			return;
		}
		await this.resyncData(config);
	}

	/**
	 * Synchronize a top-level folder from ServiceNow
	 * @param {string} folderName Name of folder to synchronize
	 * @return {Promise<void>}
	 */
	async resyncFolder(folderName: string) {
		const config = this._config.find((conf) => conf.folder === folderName);
		if (!config) {
			return;
		}
		await this.resyncData(config);
	}

	/**
	 * Resync a ServiceNow table completely
	 * @param {TableConfiguration} config TableConfig object for resync
	 * @return {Promise<void>}
	 */
	async resyncData(config: TableConfiguration) {
		try {
			// Try to avoid macOS error "ENFILE: file table overflow"
			// see http://blog.mact.me/2014/10/22/yosemite-upgrade-changes-open-file-limit
			// await RecordSyncerService.setPromiseTimeout(200);

			meta.clearFolderMetaData(config.folder);
			const records = await api.getRecordsForTable(config.table, {
				query: config.query,
			});

			// Delete folder if still there
			const folder = path.resolve(settings.getSourceDirPath(), config.folder);
			try {
				await files.rmrf(folder);
			} catch (err) {
				// Folder did not exist
			}

			// Create folder
			await files.mkdirp(folder);
			log(`Got for ${config.table}: ${records.length} records`);
			Logger.info(`Got for ${config.table}: ${records.length} records`);

			// Loop all retrieved records and save to files
			for (let i = 0; i < records.length; i++) {
				await this.saveRecord(records[i], config, folder);
			}

			// Update file count after files synced
			meta._metadata.filesCount += records.length;
		} catch (err) {
			throw err;
		}
	}

	/**
	 * Upload the file to ServiceNow
	 * @param {string} filePath Full path to file
	 * @return {Promise<boolean>}
	 */
	async uploadFile(filePath: string) {
		// First saving all dirty files
		await vscode.workspace.saveAll();

		// Check if table configuration could be found
		const config = this.getTableConfigurationFromFilePath(filePath);
		if (!config) {
			ui.showErrorMessage('File not recognized as SNOW record.');
			return false;
		}

		// Check file has been alredy synced to metadata
		const fileMetaData = meta.getFileMetaData(config.folder, filePath);
		if (!fileMetaData) {
			Logger.info(
				`Could not find metadata for the path: ${filePath} in folder ${config.folder}`
			);
			ui.showErrorMessage(
				`File ${path.basename(filePath)} is not being tracked`
			);
			return false;
		}

		// Check if file is in current scope
		if (!(await scopeService.fileIsInCurrentScope(fileMetaData))) {
			await scopeService.showScopeErrorMessageFromLastComparison();
			return;
		}

		let message = vscode.window.setStatusBarMessage(
			`Fetching remote content...`
		);
		const remoteRecord = await api.getSingleRecord(
			config.table,
			fileMetaData.sysId
		);

		// Check whether the data has been modified
		const remoteFile = (remoteRecord[fileMetaData.field] as string).replace(
			/\r\n/g,
			'\n'
		);
		const fileNotChanged = this.checkIntegrity(fileMetaData.hash, remoteFile);
		const userWantsToContinue =
			fileNotChanged ||
			(await ui.promptUserAboutConflict(
				remoteRecord[fileMetaData.field] as string,
				filePath
			));
		if (!fileNotChanged && !userWantsToContinue) {
			message.dispose();
			return false;
		}

		// Get content to be uploaded
		const content = fs.readFileSync(filePath, 'utf8');
		const data = {
			[fileMetaData.field]: content,
		};

		message.dispose();
		message = vscode.window.setStatusBarMessage(
			`Uploading ${path.basename(filePath)} ...`
		);
		await api.updateRecord(
			config.table,
			fileMetaData.sysId,
			JSON.stringify(data)
		);
		vscode.window.showInformationMessage('Upload was successful ✅');
		Logger.info(
			`Successfully uploaded content of the file: ${path.basename(filePath)}`
		);

		// Save hash to metadata object in memory
		fileMetaData.hash = md5(content);
		// Save metadasta to file system
		meta.saveMetaData();

		message.dispose();
		return true;
	}

	/**
	 * Save a single record to a file or files
	 * @param record Record to save
	 * @param config Record's table config
	 * @param folder Absolute path to folder where to store data in
	 */
	async saveRecord(
		record: NowRecord,
		config: TableConfiguration,
		folder: string
	) {
		const pathRegExp = new RegExp('[^a-zA-Z0-9\\s-+_()]', 'g');
		const name = record[config.key];
		let subDir = '';

		// Get subdir pattern for record
		if (config.subDirPattern) {
			subDir = this.compileSubdirPattern(config.subDirPattern, record);
		}

		// If more than one field is synced, create own folder for record
		if (config.fields.length > 1) {
			subDir = `${name}`;
		}

		// Create subdirectory
		subDir = subDir.replace(pathRegExp, ' ').trim();
		const subDirPath = path.resolve(folder, subDir);
		try {
			await files.mkdirp(subDirPath);
		} catch (err) {
			error(err);
		}

		// Sync individual fields
		for (let i = 0; i < config.fields.length; i++) {
			const fieldConfig = config.fields[i];
			// Either the name is specified or use KEY.EXTENSION
			let fileName = fieldConfig.name || (name as string);
			// Replace all symbols in filename that could be a problem
			fileName = fileName.replace(pathRegExp, ' ');
			const filePath = path.resolve(
				subDirPath,
				`${fileName}.${fieldConfig.extension}`
			);
			try {
				let data = record[fieldConfig.field_name];
				// If field is secured by policy
				if (!data) {
					continue;
				}
				// Make file have LF instead of CRLF line endings
				data = (data as string).replace(/\r\n/g, '\n');
				await fs.writeFileSync(filePath, data);
				meta.addFileMetaData(config.folder, {
					filePath,
					sysId: record.sys_id as string,
					field: fieldConfig.field_name,
					hash: md5(data),
					scope: record.sys_scope && (record.sys_scope as NowScope).value,
				});
			} catch (err) {
				error(err);
				vscode.window.showErrorMessage(`Error synchronizing file ${filePath}`);
			}
		}
	}

	/**
	 * Compiles a subdir pattern into a valid dir
	 * e.g. active_<active>/<when> to active_true/before
	 * @param pattern Subdir pattern
	 * @param {*} record Record to compile pattern for
	 */
	compileSubdirPattern(pattern: string, record: NowRecord) {
		// This pattern matches anything in angle brackets <>
		// TODO: handle dotwalking (to avoid same filenames in client scripts)
		const replPattern = /<([\w_]+)>/;
		const dirs = pattern.split('/');
		for (let i = 0; i < dirs.length; i++) {
			const m = dirs[i].match(replPattern);
			if (m) {
				dirs[i] = dirs[i].replace(
					replPattern,
					(record[m[1]] as string) || 'NONE'
				);
			}
		}
		return dirs.join('/');
	}

	/**
	 * Get the different fields needed for the subdir pattern
	 * @param pattern Subdir pattern
	 */
	getSubdirFields(pattern: string): string[] {
		const fields = [];
		// This pattern matches anything in angle brackets <>
		const replPattern = /<([\w_]+)>/;
		const dirs = pattern.split('/');
		for (let i = 0; i < dirs.length; i++) {
			const m = dirs[i].match(replPattern);
			if (m) {
				fields.push(m[1]);
			}
		}
		return fields;
	}

	/**
	 * Get the TableConfiguartion for the given table name
	 * @param tableName The table name to look for
	 */
	getTableConfigurationFromTable(tableName: string) {
		return this._config.find((conf) => conf.table === tableName);
	}

	/**
	 * Get the TableConfiguartion for the given folder name
	 * @param filePath The table name to look for
	 */
	getTableConfigurationFromFilePath(filePath: string) {
		const config = this._config.find((f) => {
			const patternToFind = new RegExp('\\W' + f.folder + '\\W');
			// return filePath.indexOf('/' + f.folder + '/') > -1;
			return patternToFind.test(filePath);
		});
		return config;
	}

	/**
	 * Check if the data has been unchanged, i.e. check if the given hash is equal to the data's hash
	 * @param hash Original md5 hash of data
	 * @param data Data to check
	 */
	checkIntegrity(hash: string, data: string): boolean {
		const dataHash = md5(data);
		return dataHash === hash;
	}

	get config() {
		return this._config;
	}

	static setPromiseTimeout = async function (ms: number) {
		return new Promise((resolve, reject) => {
			global.setTimeout(() => {
				resolve();
			}, ms);
		});
	};
}

export const recordSyncer = new RecordSyncerService();
