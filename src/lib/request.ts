import { settings } from '../services/settings';
import got, { Method } from 'got';
import { CookieJar } from 'tough-cookie';

interface RequestParams {
	method?: string;
	[key: string]: unknown;
}

export interface RequestOptions {
	url: string;
	method?: string;
	body?: string;
	headers?: Record<string, unknown>;
	qs?: Record<string, unknown>;
	form?: Record<string, unknown>;
}

// TODO: Create a generic method that would catch errors

class Request {
	private cookieJar = new CookieJar();
	r = async (options: RequestOptions) => {
		const headers = {
			Accept: 'application/json',
			...(options.form ? {} : { 'Content-Type': 'application/json' }),
			...this.normalizeHeaders(options.headers),
		};

		const response = await got(options.url, {
			method: (options.method || 'GET') as Method,
			headers,
			body: options.body || undefined,
			form: this.normalizeRecord(options.form),
			searchParams: this.normalizeRecord(options.qs),
			cookieJar: this.cookieJar,
			timeout: {
				request: 90000,
			},
		});

		return response.body;
	};
	constructor() {}

	static async getRequestOptions<
		T extends { method?: string } = { method?: string }
	>(url: string, params: T = {} as T): Promise<RequestOptions> {
		/**
		 * Read configs before each request
		 */
		await settings.intialize();

		const authHeaders = await settings.getInstanceAuthHeaders();

		return {
			url: settings.currentInstance.url + url,
			method: params.method || 'GET',
			body: '',
			headers: authHeaders,
			qs: {},
		};
	}

	/**
	 * Sending a dummy request to renew cookies
	 */
	async sendDummyRequest() {
		const options = await Request.getRequestOptions(
			'api/now/v2/table/sys_user?user_name=admin&sysparm_fields=user_name,name'
		);
		return this.r(options);
	}

	private normalizeHeaders(headers: RequestOptions['headers']) {
		const normalized: Record<string, string> = {};
		for (const [key, value] of Object.entries(headers || {})) {
			if (value === undefined) continue;
			normalized[key] = String(value);
		}
		return normalized;
	}

	private normalizeRecord(record: Record<string, unknown> | undefined) {
		if (!record) return undefined;

		const normalized: Record<string, string> = {};
		for (const [key, value] of Object.entries(record)) {
			if (value === undefined) continue;
			normalized[key] = String(value);
		}
		return normalized;
	}
}

export const request = new Request().r;
export const getOptions = Request.getRequestOptions;
