import { getErrorMessage, getErrorCode, isUnauthorized } from './error-utils';

describe('error-utils', () => {
	test('getErrorMessage handles string', () => {
		expect(getErrorMessage('oops')).toBe('oops');
	});

	test('getErrorMessage handles Error', () => {
		expect(getErrorMessage(new Error('boom'))).toBe('boom');
	});

	test('getErrorMessage handles object with message', () => {
		expect(getErrorMessage({ message: 'objmsg' })).toBe('objmsg');
	});

	test('getErrorCode finds statusCode and code', () => {
		expect(getErrorCode({ statusCode: 401 })).toBe(401);
		expect(getErrorCode({ code: 'EACCES' })).toBe('EACCES');
	});

	test('isUnauthorized matches 401', () => {
		expect(isUnauthorized({ statusCode: 401 })).toBe(true);
		expect(isUnauthorized({ code: '401' })).toBe(true);
		expect(isUnauthorized({ code: 'Unauthorized' })).toBe(true);
	});
});
