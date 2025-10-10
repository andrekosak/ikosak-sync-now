"use strict";
/**
 * Test script to verify where VS Code SecretStorage stores secrets on macOS
 * Run this in the VS Code Extension Development Host
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.testSecretStorage = void 0;
const vscode = require("vscode");
function testSecretStorage() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const testKey = 'test-secret-key';
        const testValue = 'test-secret-value-12345';
        console.log('=== Testing VS Code SecretStorage ===');
        console.log('Extension ID:', (_a = vscode.extensions.getExtension('andrekosak.ikosak-sync-now')) === null || _a === void 0 ? void 0 : _a.id);
        // Get the secret storage (would come from ExtensionContext in real usage)
        // For this test, we'll need to run it from a command
        // Store a secret
        console.log(`Storing secret with key: "${testKey}"`);
        console.log(`Value: "${testValue}"`);
        // Retrieve the secret
        console.log('Retrieving secret...');
        // Delete the secret
        console.log('Deleting secret...');
        console.log('=== Test Complete ===');
        console.log('Now search Keychain Access for:');
        console.log('- Service: vscode (or variations)');
        console.log('- Account: test-secret-key');
        console.log('- Or search for: andrekosak.ikosak-sync-now');
    });
}
exports.testSecretStorage = testSecretStorage;
// Command to run the test
function activate(context) {
    const disposable = vscode.commands.registerCommand('ikosak-sync-now.testSecretStorage', () => __awaiter(this, void 0, void 0, function* () {
        const secretStorage = context.secrets;
        const testKey = 'test-secret-key';
        const testValue = 'test-secret-value-12345';
        try {
            console.log('=== Testing VS Code SecretStorage ===');
            console.log('Extension ID:', context.extension.id);
            // Store a secret
            console.log(`\n1. Storing secret with key: "${testKey}"`);
            yield secretStorage.store(testKey, testValue);
            console.log('✓ Secret stored successfully');
            // Retrieve the secret
            console.log(`\n2. Retrieving secret...`);
            const retrieved = yield secretStorage.get(testKey);
            console.log(`✓ Retrieved value: "${retrieved}"`);
            console.log(`✓ Match: ${retrieved === testValue}`);
            // Show notification
            vscode.window.showInformationMessage('Secret stored! Check Keychain Access for "vscode" or extension ID.');
            console.log('\n=== Test Complete ===');
            console.log('Now search macOS Keychain Access for:');
            console.log('  - Service name containing: vscode');
            console.log('  - Or search for your extension ID');
            console.log('  - Account: test-secret-key');
            console.log('\nOr run in terminal:');
            console.log('  security find-generic-password -a "test-secret-key" -l "vscode"');
        }
        catch (error) {
            console.error('Error during test:', error);
            vscode.window.showErrorMessage(`Test failed: ${error}`);
        }
    }));
    context.subscriptions.push(disposable);
}
exports.activate = activate;
//# sourceMappingURL=test-secret-storage.js.map