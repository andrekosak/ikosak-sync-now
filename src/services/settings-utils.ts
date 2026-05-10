import { credentials } from './credentials';
import * as ui from '../ui/promts';
import { log } from 'iconsole-logger';

/**
 * Migrate credentials from config object to secure storage.
 * This is extracted so the migration can be removed in a future release.
 *
 * @param configObj Mutable config object (will be cleaned-up on success)
 * @param saveConfigToFile Callback to persist the modified config object
 */
export async function migrateCredentialsToSecureStorage(
	configObj: any,
	saveConfigToFile: () => void | Promise<void>
) {
	const instance = configObj.connect_instance_url;
	if (!instance) {
		return;
	}

	// Skip migration if config-based auth is configured (user wants to bypass SecretStorage)
	if (
		configObj.connect_instance_user_token ||
		configObj.connect_instance_cookie ||
		configObj.connect_instance_bearer ||
		configObj.connect_basic_auth_legacy
	) {
		log('Skipping migration - config-based auth is configured');
		return;
	}

	// Check if credentials already exist in secure storage
	const existingUsername = await credentials.getUsername(instance);
	if (existingUsername) {
		// Already migrated
		return;
	}

	const basicAuthToMigrate = configObj.connect_basic_auth;

	if (basicAuthToMigrate) {
		try {
			// Decode the basic auth header
			const base64Credentials = basicAuthToMigrate.replace('Basic ', '');
			const credentials_str = Buffer.from(base64Credentials, 'base64').toString(
				'utf8'
			);
			// Split only on the first colon to handle passwords containing colons
			const colonIndex = credentials_str.indexOf(':');
			const username = credentials_str.substring(0, colonIndex);
			const password = credentials_str.substring(colonIndex + 1);

			if (username && password) {
				// Store in secure storage
				await credentials.storeCredentials(instance, username, password);
				log(`Migrated credentials for instance ${instance} to secure storage`);

				// Remove from config object
				delete configObj.connect_basic_auth;

				// Save config without the auth data
				await Promise.resolve(saveConfigToFile());
				ui.showInfoMessage(
					"Credentials were moved to VS Code's secure storage. See the v1.3.0 CHANGELOG for details."
				);
			}
		} catch (e) {
			const ex: any = e;
			log(`Error migrating credentials: ${ex}`);
		}
	}
}
