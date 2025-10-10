// This test ensures that credentials.initialize(context) is called before modules
// that access SecretStorage are imported (e.g. SettingsService). The original bug
// caused SettingsService to call credentials.getUsername() during its async
// initialization before SecretStorage was available.

// Use the manual mock in src/__mocks__/vscode.js
jest.mock('vscode');

describe('activation ordering', () => {
	beforeEach(() => {
		// Ensure a clean module registry for each test
		jest.resetModules();
	});

	test('credentials initialized before settings import prevents errors', async () => {
		// Create a minimal mock of vscode.ExtensionContext.secrets
		const secretStore: Record<string, string> = {};

		const mockSecrets = {
			store: async (k: string, v: string) => {
				secretStore[k] = v;
			},
			get: async (k: string) => {
				return secretStore[k];
			},
			delete: async (k: string) => {
				delete secretStore[k];
			},
		};

		// Provide a fake ExtensionContext with the secrets API
		const fakeContext = { secrets: mockSecrets } as any;

		// Import credentials and initialize it BEFORE importing settings
		const credentialsMod = await import('./credentials');
		// Should not throw
		credentialsMod.credentials.initialize(fakeContext);

		// Now import settings which during previous versions triggered migration
		// that called credentials.getUsername() during module initialization.
		const settingsMod = await import('./settings');

		// The settings instance should exist and calling getBasicAuth should not throw
		const basicAuth = await settingsMod.settings.getBasicAuth();
		expect(basicAuth).toBeUndefined();
	});
});
