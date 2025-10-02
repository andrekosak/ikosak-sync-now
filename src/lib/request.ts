import { settings } from '../services/settings';
import * as r from 'request-promise-native';

// TODO: Create a generic method that would catch errors

class Request {
	r = r.defaults({
		jar: true,
		// resolveWithFullResponse: true,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			timeout: 90000,
			method: 'GET',
		},
	});
	constructor() {}

	static async getRequestOptions(
		url: string,
		params: any = {}
	): Promise<r.Options> {
		/**
		 * Read configs before each request
		 */
		await settings.intialize();

		const basicAuth = await settings.getBasicAuth();

		return {
			url: settings.currentInstance.url + url,
			method: params.method || 'GET',
			body: '',
			headers: {
				Authorization: basicAuth || '',
			},
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
}

export const request = new Request().r;
export const getOptions = Request.getRequestOptions;
