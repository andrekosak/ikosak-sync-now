export function getErrorMessage(err: unknown): string {
	if (!err) return '';
	if (typeof err === 'string') return err;
	if (err instanceof Error) return err.message;
	const anyErr = err as any;
	if (anyErr && typeof anyErr.message === 'string') return anyErr.message;
	try {
		return JSON.stringify(anyErr);
	} catch (_e) {
		return String(anyErr);
	}
}

export function getErrorCode(err: unknown): number | string | undefined {
	const anyErr = err as any;
	if (!anyErr) return undefined;
	if (typeof anyErr.statusCode !== 'undefined') return anyErr.statusCode;
	if (typeof anyErr.code !== 'undefined') return anyErr.code;
	return undefined;
}

export function isUnauthorized(err: unknown): boolean {
	const code = getErrorCode(err);
	return code === 401 || code === '401' || code === 'Unauthorized';
}
