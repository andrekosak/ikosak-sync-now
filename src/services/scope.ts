import * as api from '../snc-api';
import * as ui from '../ui/promts';
import { meta } from './meta';
import { log, print } from 'iconsole-logger';

class ScopeService {
	private metaService = meta;
	private _currentApp: any;
	private _lastFileApp: any;
	constructor() {
		this._currentApp = undefined;
		this._lastFileApp = undefined;
	}

	/**
	 * Queries SNOW and stores all applications with scope in metadata
	 */
	async getAllApplicationScopes() {
		const apps = await api.getRecordsForTable('sys_scope');
		const appMetaData = apps.map((app) => {
			return {
				scope: app.scope,
				name: app.name,
				sysId: app.sys_id,
			};
		});
		this.metaService.setApplicationMetaData(appMetaData);
	}

	/**
	 * Queries SNOW for the current application scope
	 */
	async getCurrentApp() {
		const currentAppPreference: any[] = await api.getRecordsForTable(
			'sys_user_preference',
			{
				query:
					'name=apps.current_app^userDYNAMIC90d1921e5f510100a9ad2572f2b477fe',
			}
		);
		const currentAppSysId = currentAppPreference.length
			? currentAppPreference[0].value
			: 'global';
		this._currentApp = this.metaService.getApplicationFromId(currentAppSysId);
		return this._currentApp;
	}

	/**
	 * Checks if the current scope matches the scope of a given file
	 * @param {FileMetaData} fileMeta File metadata
	 * @return {boolean}
	 */
	async fileIsInCurrentScope(fileMeta: FileMetaData) {
		const currentApp = await this.getCurrentApp();
		// Do nothig if could not get current scope
		if (!currentApp) return true;

		const fileApp = this.metaService.getApplicationFromId(fileMeta.scope);
		if (!fileApp) return;

		this._lastFileApp = fileApp;
		return fileApp.sysId === currentApp.sysId;
	}

	async showScopeErrorMessageFromLastComparison() {
		ui.showErrorMessage(
			`Record is in application ${this._lastFileApp.name}, but your current application is ${this._currentApp.name}`
		);
	}

	get currentScope() {
		return this._currentApp.sysId;
	}
}

export const scopeService = new ScopeService();
