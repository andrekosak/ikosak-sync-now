/**
 * Utility functions for common operations
 */

/**
 * Pauses execution for a specified duration.
 * Useful for rate limiting API requests or adding delays between operations.
 *
 * @param ms - The number of milliseconds to sleep/wait
 * @returns A promise that resolves after the specified duration
 *
 * @example
 * ```typescript
 * // Wait for 100ms between API calls
 * await sleep(100);
 * ```
 */
export function sleep(ms: number): Promise<void> {
	// eslint-disable-next-line no-undef, no-restricted-globals
	return new Promise((resolve) => global.setTimeout(resolve, ms));
}
