import * as vscode from 'vscode';
import { log, error } from 'iconsole-logger';
import { request, getOptions } from './lib/request';

// Read workspace settings
// TODO: should be used in next release
const config = vscode.workspace.getConfiguration('ikosak-sync-now');

/**
 * Get response of Scripted Rest API Request
 * @param endpoint API endpoint
 * @param parameters for the request
 * @param body Request body as string
 */
export async function executeScriptAPIRequest(
	endpoint: string,
	parameters = {},
	body = ''
) {
	try {
		const options = getOptions(endpoint, parameters);
		options.body = body;
		const resp = await request(options);
		const data = JSON.parse(resp);
		return { status: resp.statusCode, result: data.result };
	} catch (err) {
		error(err);
		return { status: 404, result: '' };
	}
}

/**
 * Get all records of a table
 * @param tableName
 * @param parameters
 */
export async function getRecordsForTable(
	tableName: string,
	parameters: NowApiProperties = {}
): Promise<any[]> {
	const options = createRequestOptionsForTableAPI(tableName, parameters);
	const resp = JSON.parse(await request(options));
	return resp.result;
}

/**
 * Gets a single record by sys id
 * @param tableName Table name to get record for
 * @param sysId Sys ID of the record
 * @param [fields] The fields to get
 */
export async function getSingleRecord(
	tableName: string,
	sysId: string,
	fields = ''
): Promise<NowRecord> {
	const options = createRequestOptionsForTableAPI(tableName, {
		sysId,
		fields,
	});
	const resp = JSON.parse(await request(options));
	return resp.result;
}

/**
 * Updates the record in ServiceNow
 * @param tableName Table name of the record to update
 * @param sysId SysID of the record to update
 * @param body Body as JSON string
 */
export async function updateRecord(
	tableName: string,
	sysId: string,
	body = ''
) {
	const options = createRequestOptionsForTableAPI(tableName, {
		sysId,
		method: 'PUT',
	});
	options.body = body;
	const resp = JSON.parse(await request(options));
	return resp.result;
}

/**
 * Generates a url to the ServiceNow Table API either for a single record or the table.
 * @param tableName Table Name to generate URL for
 * @param sysId Record sys_id to generate URL for
 */
function generateUrl(tableName: string, sysId = '') {
	let url = `/api/now/table/${tableName}`;
	if (sysId !== '') {
		url += `/${sysId}`;
	}
	return url;
}

/**
 * Create a request options object
 * @param tableName Table name to create request for
 * @param parameters Parameters for the request
 */
function createRequestOptionsForTableAPI(
	tableName: string,
	parameters: NowApiProperties
) {
	const url = generateUrl(tableName, parameters.sysId);
	const options = getOptions(url, parameters);
	// const defaultQuery = '^sys_policy!=protected^ORsys_policy=';
	options.qs = {
		sysparm_query: parameters.query || '',
		sysparm_fields: injectSystemFields(parameters.fields || ''),
		sysparm_limit: parameters.limit || 10000,
		sysparm_display_value: parameters.displayValue || false,
	};
	return options;
}

/**
 * Adds system fields to make sure those are always returned
 * @param fields Initial field list
 */
function injectSystemFields(fields: string) {
	if (fields === '') {
		return '';
	}
	if (fields.indexOf('sys_id') === -1) {
		fields += ',sys_id';
	}
	if (fields.indexOf('sys_updated_by') === -1) {
		fields += ',sys_updated_by';
	}
	if (fields.indexOf('sys_updated_on') === -1) {
		fields += ',sys_updated_on';
	}
	return fields;
}

interface NowApiProperties {
	query?: string;
	fields?: string;
	displayValue?: 'all' | boolean;
	limit?: number;
	sysId?: string;
	method?: string;
}
