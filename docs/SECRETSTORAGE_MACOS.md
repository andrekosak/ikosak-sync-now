# VS Code SecretStorage on macOS - Research Summary

**Date:** October 2, 2025  
**Platform:** macOS (Apple Silicon M-series)  
**VS Code Version:** 1.104.2

## Key Finding

VS Code's `SecretStorage` API on macOS **does NOT directly store secrets in the macOS Keychain**. Instead, secrets are stored in an encrypted SQLite database.

## Storage Location

```
~/Library/Application Support/Code/User/globalStorage/state.vscdb
```

This is a **SQLite database** that contains all encrypted secrets for VS Code extensions.

## How It Works

1. **Secrets are encrypted** using Electron's `safeStorage` API
2. **Encrypted data is stored** in the SQLite database (`state.vscdb`)
3. **Encryption key is stored** in macOS Keychain (not the secrets themselves)

### Architecture

```
User Secret → VS Code SecretStorage API
              ↓
              Encrypted using Electron safeStorage
              ↓
              Stored in SQLite: state.vscdb
              
Encryption Key → macOS Keychain
```

## Database Structure

Secrets are stored in the `ItemTable` with this format:

```javascript
Key: secret://{"extensionId":"extension-id","key":"secret-key"}
Value: {"type":"Buffer","data":[...encrypted bytes...]}
```

### Example Query

```bash
# View all secrets in the database
sqlite3 ~/Library/Application\ Support/Code/User/globalStorage/state.vscdb \
  "SELECT * FROM ItemTable WHERE key LIKE 'secret://%';"
```

## Security Properties

### ✅ Protected From:
- **Other macOS users** - Encryption key is in user's Keychain
- **Physical access** - Data is encrypted at rest
- **Casual inspection** - Not stored in plain text

### ❌ NOT Protected From:
- **Other VS Code extensions** - Any extension can read the SQLite DB and decrypt
- **Other applications** running as the same user
- **Malicious extensions** - Can access all secrets from all extensions

## Security Implications

According to [VS Code GitHub Issue #213903](https://github.com/microsoft/vscode/issues/213903):

> "An extension can read the VSCode sqlite3 db (which stores the encrypted values), 
> as well as read from the keyring and then decrypt/read all the secrets from 
> other extensions."

**Key takeaway:** VS Code's SecretStorage provides encryption at rest but does not provide isolation between extensions or applications.

## For Extension Developers

When using `context.secrets.store()`:

1. **Secrets ARE encrypted** using OS-native cryptography (macOS Keychain for the key)
2. **Secrets persist** across VS Code restarts
3. **Secrets are NOT synced** across machines
4. **Consider additional security** if your extension handles highly sensitive data

## Platform Differences

- **macOS:** Encryption key in Keychain, secrets in SQLite
- **Windows:** Uses DPAPI (Data Protection API)
- **Linux:** Varies by desktop environment (libsecret, kwallet, or plaintext fallback)

## References

- [VS Code SecretStorage API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)
- [Electron safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
- [VS Code Issue #213903](https://github.com/microsoft/vscode/issues/213903) - SecretStorage documentation improvements
- [Security Research Blog Post](https://control-plane.io/posts/abusing-vscode-from-malicious-extensions-to-stolen-credentials-part-2/)

## Verification Steps

To verify where your extension's secrets are stored:

```bash
# Check if secrets exist for your extension
sqlite3 ~/Library/Application\ Support/Code/User/globalStorage/state.vscdb \
  "SELECT * FROM ItemTable WHERE key LIKE '%your-extension-id%';"
```

## Best Practices

1. **Use SecretStorage for credentials** - It's the recommended approach
2. **Don't store secrets in workspace/global state** - Use SecretStorage instead
3. **Be aware of the security model** - Other extensions can potentially access secrets
4. **Educate users** - Let them know where sensitive data is stored
5. **Consider additional encryption** for highly sensitive data beyond VS Code's built-in protection
