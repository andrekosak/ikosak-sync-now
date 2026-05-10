# Using Legacy Basic Auth

By default, iKosak Sync Now stores your ServiceNow credentials securely using your operating system's secure storage mechanism (Keychain on macOS, Credential Manager on Windows, Secret Service on Linux).

However, in some scenarios you may want to bypass the secure storage and use basic authentication directly from the config file:

- Automated environments or CI/CD pipelines
- Docker containers or development containers
- Environments where secure storage is not available or causes issues

## Configuration

To use legacy basic auth, add the `connect_basic_auth_legacy` attribute to your `.snconfig/config.yaml` file:

```yaml
connect_instance_url: https://your-instance.service-now.com
connect_instance_label: your-instance
connect_basic_auth_legacy: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
```

## Generating the Basic Auth String

The value for `connect_basic_auth_legacy` should be a Base64-encoded string in the format `Basic <base64(username:password)>`.

You can generate this value using the following methods:

### Using Node.js/JavaScript

```javascript
const username = 'your_username';
const password = 'your_password';
const basicAuth = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
console.log(basicAuth);
```

### Using Command Line (macOS/Linux)

```bash
echo -n "username:password" | base64 | sed 's/^/Basic /'
```

### Using Command Line (Windows PowerShell)

```powershell
$credentials = "username:password"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($credentials)
$base64 = [Convert]::ToBase64String($bytes)
Write-Output "Basic $base64"
```

### Using Online Tool

You can also use online Base64 encoders, but **be aware of security implications** when using third-party services with your credentials. Format your credentials as `username:password`, encode to Base64, then prepend `Basic `.

## Security Considerations

⚠️ **Important Security Notes:**

1. **Base64 is NOT encryption** - It's encoding. Your credentials can be easily decoded by anyone with access to the file.

2. **File permissions** - Ensure your `.snconfig/config.yaml` file has appropriate permissions and is not committed to version control:
   ```bash
   # Add to your .gitignore
   .snconfig/config.yaml
   ```

3. **Use environment-specific configs** - Consider different config files for different environments and never commit sensitive configs to your repository.

4. **Recommended only for specific use cases** - The secure storage method is strongly recommended for regular development work.

## Behavior

If `connect_instance_user_token` or `connect_instance_cookie` is configured, those ServiceNow session headers take precedence over bearer auth, `connect_basic_auth_legacy`, and secure storage for instance requests.

If `connect_instance_bearer` is configured, bearer auth takes precedence over `connect_basic_auth_legacy` and secure storage for instance requests.

When `connect_basic_auth_legacy` is configured:

1. The extension will use this value for authentication instead of querying the secure storage
2. Credential migration from old `connect_basic_auth` will be skipped
3. The login dialog will still work, but credentials entered will be stored in secure storage and won't override the legacy auth setting

## Migration

If you previously had credentials in the old `connect_basic_auth` field and want to keep using them:

1. Copy the value from `connect_basic_auth`
2. Rename it to `connect_basic_auth_legacy`
3. The extension will now use this value and skip automatic migration

Example:

```yaml
# Before
connect_basic_auth: Basic dXNlcm5hbWU6cGFzc3dvcmQ=

# After (to prevent migration)
connect_basic_auth_legacy: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
```
