import * as fs from 'fs';
import { error, log } from 'iconsole-logger';
import * as path from 'path';

import { KosGlobals } from '../types/kos-globals';
import { metaFileName, settings } from './settings';

const configDir = settings.getConfigDirPath();
const metaFilePath = path.resolve(configDir, metaFileName);
const legacyMetaFilePath = path.resolve(
	settings.getLegacyDirPath(),
	metaFileName
);

class MetaService {
	_metadata: Metadata = { files: {}, apps: [], filesCount: 0 };
	globals: KosGlobals = {};
	constructor() {
		this.loadMetaData();
		// Temporary solution to migrate legacy config
		if (this.hasLegacyMetaData()) {
			this.saveMetaData();
		}
		log('MetaService created');
	}

	/**
	 * Check for legacy metadata file and migrate if needed
	 */
	hasLegacyMetaData() {
		if (fs.existsSync(legacyMetaFilePath)) {
			try {
				this._metadata = require(legacyMetaFilePath);
				fs.unlinkSync(legacyMetaFilePath);
			} catch (err) {
				error('hasLegacyMetaData funtion failed with: ', err);
			}
			return true;
		}
		return false;
	}

	/**
	 * Stores the current metadata in the meta file
	 * @return {void}
	 */
	saveMetaData() {
		// TODO: Check if directory exists
		// Check that metadata is defined
		log(`saveMetaData called`);
		if (!!this._metadata) {
			fs.writeFileSync(metaFilePath, JSON.stringify(this._metadata));
		}
	}

	/**
	 * Clears metadata for folder
	 * @param {string} folderName Folder to clear
	 */
	clearFolderMetaData(folderName: string) {
		this._metadata.files[folderName] = [];
	}

	/**
	 * Clears metadata and meta file
	 * @return {void}
	 */
	clearMetaData() {
		this._metadata = { files: {}, apps: [], filesCount: 0 };
		this.saveMetaData();
	}

	/**
	 * Loads metadata from meta file if possible
	 * @return {void}
	 */
	loadMetaData() {
		if (fs.existsSync(metaFilePath)) {
			try {
				this._metadata = require(metaFilePath);
			} catch (err) {
				error('loadMetaData function failed with: ', err);
			}
		} else {
			this._metadata = { files: {}, apps: [], filesCount: 0 };
			this.saveMetaData();
		}
	}

	/**
	 * Get the matching metadata for a file
	 * @param {string} folder Top-level folder name
	 * @param {string} filePath Path of file to find
	 * @return {FileMetaData}
	 */
	getFileMetaData(folder: string, filePath: string) {
		const files = this._metadata.files[folder];
		return files.find((f) => f.filePath === filePath);
	}

	/**
	 * Get the matching metadata for a file
	 * @param {string} filePath Path of file to find
	 */
	findMetaDataForFile(filePath: string): FileMetaData | undefined {
		const files = this._metadata.files;
		for (const folder in files) {
			if (Object.prototype.hasOwnProperty.call(files, folder)) {
				const config = this.getFileMetaData(folder, filePath);
				if (config) {
					return config;
				}
			}
		}
		return;
	}

	/**
	 * Add MetaData for a single file
	 * @param {string} folder Top-level folder
	 * @return {void}
	 */
	addFileMetaData(folder: string, meta: FileMetaData) {
		this._metadata.files[folder].push(meta);
	}

	/**
	 * Set application metadata
	 * @param data App meta data
	 */
	setApplicationMetaData(data: AppMetaData[]) {
		this._metadata.apps = data;
	}

	/**
	 * Get the ApplicationMetaData based on the sys_id of the application.
	 * @param {string} id ID of the application
	 */
	getApplicationFromId(id: string): AppMetaData | undefined {
		return this._metadata.apps.find((app) => app.sysId === id);
	}

	mergeToMetadata(options: { [key: string]: string }) {
		this._metadata = { ...this._metadata, ...options };
	}
}

export const meta = new MetaService();
