import * as vscode from 'vscode';
import { log } from 'iconsole-logger';

/**
 * Service for storing and retrieving credentials securely using VS Code's SecretStorage API
 * This uses the OS-native secure storage: Keychain on macOS, Credential Manager on Windows
 */
class CredentialsService {
	private secretStorage: vscode.SecretStorage | undefined;
	private static readonly SERVICE_NAME = 'ikosak-sync-now';
	private static readonly USERNAME_KEY_PREFIX = 'username:';
	private static readonly PASSWORD_KEY_PREFIX = 'password:';

	/**
	 * Initialize the credentials service with the extension context
	 * @param context VS Code extension context
	 */
	initialize(context: vscode.ExtensionContext) {
		this.secretStorage = context.secrets;
		log('CredentialsService initialized with SecretStorage');
	}

	/**
	 * Store credentials for an instance
	 * @param instance Instance identifier
	 * @param username Username for the instance
	 * @param password Password for the instance
	 */
	async storeCredentials(
		instance: string,
		username: string,
		password: string
	): Promise<void> {
		if (!this.secretStorage) {
			throw new Error('CredentialsService not initialized');
		}

		const usernameKey = this.getUsernameKey(instance);
		const passwordKey = this.getPasswordKey(instance);

		await this.secretStorage.store(usernameKey, username);
		await this.secretStorage.store(passwordKey, password);
		log(`Credentials stored for instance: ${instance}`);
	}

	/**
	 * Retrieve username for an instance
	 * @param instance Instance identifier
	 * @returns Username or undefined if not found
	 */
	async getUsername(instance: string): Promise<string | undefined> {
		if (!this.secretStorage) {
			throw new Error('CredentialsService not initialized');
		}

		const usernameKey = this.getUsernameKey(instance);
		return this.secretStorage.get(usernameKey);
	}

	/**
	 * Retrieve password for an instance
	 * @param instance Instance identifier
	 * @returns Password or undefined if not found
	 */
	async getPassword(instance: string): Promise<string | undefined> {
		if (!this.secretStorage) {
			throw new Error('CredentialsService not initialized');
		}

		const passwordKey = this.getPasswordKey(instance);
		return this.secretStorage.get(passwordKey);
	}

	/**
	 * Get basic auth header for an instance
	 * @param instance Instance identifier
	 * @returns Basic auth header or undefined if credentials not found
	 */
	async getBasicAuth(instance: string): Promise<string | undefined> {
		const username = await this.getUsername(instance);
		const password = await this.getPassword(instance);

		if (!username || !password) {
			return undefined;
		}

		const credentials = `${username}:${password}`;
		const encoded = Buffer.from(credentials).toString('base64');
		return `Basic ${encoded}`;
	}

	/**
	 * Delete credentials for an instance
	 * @param instance Instance identifier
	 */
	async deleteCredentials(instance: string): Promise<void> {
		if (!this.secretStorage) {
			throw new Error('CredentialsService not initialized');
		}

		const usernameKey = this.getUsernameKey(instance);
		const passwordKey = this.getPasswordKey(instance);

		await this.secretStorage.delete(usernameKey);
		await this.secretStorage.delete(passwordKey);
		log(`Credentials deleted for instance: ${instance}`);
	}

	private getUsernameKey(instance: string): string {
		return `${CredentialsService.USERNAME_KEY_PREFIX}${instance}`;
	}

	private getPasswordKey(instance: string): string {
		return `${CredentialsService.PASSWORD_KEY_PREFIX}${instance}`;
	}
}

export const credentials = new CredentialsService();
