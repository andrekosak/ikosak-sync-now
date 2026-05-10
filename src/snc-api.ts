import { log, error } from './lib/console';
import { Logger } from './lib/logger';
import { request, getOptions, RequestOptions } from './lib/request';
import { getErrorMessage } from './lib/error-utils';
import { sleep } from './lib/utils';
import { settings, Config } from './services/settings';

const RESPONSE_PREVIEW_LENGTH = 4000;

interface DebuggableError extends Error {
	cause?: unknown;
	responsePreview?: string;
}

function parseApiResponse<T>(
	raw: string,
	methodName: string,
	options?: RequestOptions
): T {
	try {
		return JSON.parse(raw) as T;
	} catch (err) {
		const callSite = getCallSiteForMethod(methodName);
		const parseError = new Error(
			`${methodName} failed. ${getErrorMessage(
				err
			)}. ServiceNow response was not valid JSON. See Debug Console for response preview.`
		) as DebuggableError;

		parseError.cause = err;
		parseError.responsePreview = getResponsePreview(raw);

		logInvalidJsonResponse(methodName, callSite, options, raw, err);

		throw parseError;
	}
}

function logInvalidJsonResponse(
	methodName: string,
	callSite: string | undefined,
	options: RequestOptions | undefined,
	raw: string,
	err: unknown
) {
	const responsePreview = getResponsePreview(raw);
	const lines = [
		'[iKosak Sync Now] ServiceNow API response was not valid JSON.',
		`Method call: ${methodName}`,
		`Call site: ${callSite || 'unknown'}`,
		`Request: ${formatRequest(options)}`,
		`Parser error: ${getErrorMessage(err)}`,
		`Response preview (${Math.min(raw.length, RESPONSE_PREVIEW_LENGTH)} of ${
			raw.length
		} chars):`,
		responsePreview,
	];

	error(lines.join('\n'));

	if (err instanceof Error && err.stack) {
		error(err.stack);
	}
}

function getCallSiteForMethod(methodName: string) {
	const stack = new Error().stack;
	if (!stack) return undefined;

	const frames = stack.split('\n').map((line) => line.trim());
	const methodFrame = frames.find(
		(line) => line.includes(methodName) && !line.includes('parseApiResponse')
	);
	const apiFrame = frames.find(
		(line) =>
			/snc-api\.(ts|js)/.test(line) &&
			!line.includes('parseApiResponse') &&
			!line.includes('getCallSiteForMethod') &&
			!line.includes('logInvalidJsonResponse')
	);

	return normalizeStackFrame(methodFrame || apiFrame);
}

function normalizeStackFrame(frame: string | undefined) {
	return frame ? frame.replace(/^at\s+/, '') : undefined;
}

function formatRequest(options: RequestOptions | undefined) {
	if (!options) return 'unknown';

	const query = Object.keys(options.qs || {}).length
		? ` qs=${JSON.stringify(options.qs)}`
		: '';

	return `${options.method || 'GET'} ${redactUrl(options.url)}${query}`;
}

function redactUrl(url: string) {
	return url.replace(
		/([?&][^=]*(?:password|token|cookie|authorization|sysparm_ck)[^=]*=)[^&]*/gi,
		'$1[redacted]'
	);
}

function getResponsePreview(raw: string) {
	if (!raw) return '<empty response>';

	const normalized = raw.replace(/\r\n/g, '\n');
	if (normalized.length <= RESPONSE_PREVIEW_LENGTH) {
		return normalized;
	}

	return `${normalized.slice(0, RESPONSE_PREVIEW_LENGTH)}\n... truncated ${
		normalized.length - RESPONSE_PREVIEW_LENGTH
	} chars`;
}

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
		const options = await getOptions(endpoint, parameters);
		options.body = body;
		const resp = await request(options);
		await sleep(100);
		const data = parseApiResponse<{ result: unknown }>(
			resp,
			'executeScriptAPIRequest',
			options
		);
		return { status: 200, result: data.result };
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
	parameters: NowApiProperties = {},
	// Optional total records count — when provided and greater than threshold,
	// the function will page through results using n-record pages.
	recordsCount?: number
): Promise<any[]> {
	// Default threshold for paging through table API results. Can be overridden
	// by adding `records_threshold: <number>` to your `.snconfig/config.yaml`.
	const DEFAULT_THRESHOLD = 500;
	const sConfig = settings && (settings.config as Config);
	const cfg = (sConfig && sConfig.records_threshold) || DEFAULT_THRESHOLD;
	const THRESHOLD = Number(cfg) > 0 ? Number(cfg) : DEFAULT_THRESHOLD;

	// If no pagination needed, perform single request as before
	if (!recordsCount || recordsCount <= THRESHOLD) {
		const options = await createRequestOptionsForTableAPI(
			tableName,
			parameters
		);
		const raw = await request(options);
		await sleep(100);
		const resp = parseApiResponse<{ result: any[] }>(
			raw,
			'getRecordsForTable',
			options
		);
		return resp.result;
	}

	// Page through results in chunks of THRESHOLD using sysparm_limit and sysparm_offset
	const pages = Math.ceil(recordsCount / THRESHOLD);
	const results: any[] = [];

	for (let i = 0; i < pages; i++) {
		const offset = i * THRESHOLD;
		const message = `Requesting ${THRESHOLD} records for table ${tableName} with offset ${offset}`;
		log(message);
		Logger.info(message);
		const pageParams: NowApiProperties = {
			...parameters,
			limit: THRESHOLD,
			offset,
		};

		const options = await createRequestOptionsForTableAPI(
			tableName,
			pageParams
		);
		const respRaw = await request(options);
		await sleep(100);
		const resp = parseApiResponse<{ result: any }>(
			respRaw,
			'getRecordsForTable',
			options
		);

		if (resp && Array.isArray(resp.result)) {
			results.push(...resp.result);
		} else if (resp && resp.result) {
			results.push(resp.result);
		}
	}

	return results;
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
	const options = await createRequestOptionsForTableAPI(tableName, {
		sysId,
		fields,
	});
	const raw = await request(options);
	await sleep(100);
	const resp = parseApiResponse<{ result: NowRecord }>(
		raw,
		'getSingleRecord',
		options
	);
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
	const options = await createRequestOptionsForTableAPI(tableName, {
		sysId,
		method: 'PUT',
	});
	options.body = body;
	const raw = await request(options);
	await sleep(100);
	const resp = parseApiResponse<{ result: unknown }>(
		raw,
		'updateRecord',
		options
	);
	return resp.result;
}

/**
 * Get number of records in a table matching optional query using ServiceNow Stats API
 * Returns numeric count (0 on error).
 * @param tableName Table name to count records for
 * @param parameters Optional NowApiProperties - supports `query`
 */
export async function getRecordsCount(
	tableName: string,
	parameters: NowApiProperties = {}
): Promise<number> {
	try {
		// Use the Stats API which is the recommended way to get counts
		const url = `/api/now/stats/${tableName}`;
		const options = await getOptions(url, parameters);
		options.qs = {
			sysparm_query: parameters.query || '',
			sysparm_count: true,
		};

		const raw = await request(options);
		await sleep(100);
		const resp = parseApiResponse<{ result: any }>(
			raw,
			'getRecordsCount',
			options
		);

		// Handle several possible response shapes returned by ServiceNow or helpers
		// 1) resp.result is a number
		if (typeof resp.result === 'number') {
			return resp.result;
		}

		// 2) resp.result may be an object with stats.count as string
		if (resp.result && typeof resp.result === 'object') {
			if (resp.result.stats && resp.result.stats.count !== undefined) {
				// stats.count can be string or number
				const v = resp.result.stats.count;
				return typeof v === 'number' ? v : parseInt(String(v), 10) || 0;
			}
			// 3) resp.result.count
			if (resp.result.count !== undefined) {
				const v = resp.result.count;
				return typeof v === 'number' ? v : parseInt(String(v), 10) || 0;
			}
			// 4) resp.result may be an array of records (fallback)
			if (Array.isArray(resp.result)) {
				return resp.result.length;
			}
		}

		return 0;
	} catch (err) {
		error(err);
		return 0;
	}
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
async function createRequestOptionsForTableAPI(
	tableName: string,
	parameters: NowApiProperties
) {
	const url = generateUrl(tableName, parameters.sysId);
	const options = await getOptions(url, parameters);
	// const defaultQuery = '^sys_policy!=protected^ORsys_policy=';
	options.qs = {
		sysparm_query: parameters.query || '',
		sysparm_fields: injectSystemFields(parameters.fields || ''),
		sysparm_limit: parameters.limit || 10000,
		sysparm_offset: parameters.offset || 0,
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
	offset?: number;
	sysId?: string;
	method?: string;
}
