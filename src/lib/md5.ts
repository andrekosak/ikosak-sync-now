import * as crypto from 'crypto';

/**
 * Calculates the MD5 hash of a string.
 * @param string The string (or buffer).
 */
export function md5(string: string): string {
	return crypto.createHash('md5').update(string).digest('hex');
}
