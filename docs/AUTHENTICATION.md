# Authentication

iKosak Sync Now authenticates ServiceNow instance requests with one of the configured methods below. The default setup uses VS Code SecretStorage for the username and password entered through the extension's login command. Advanced setups can provide request headers directly in `.snconfig/config.yaml`.

For the legacy config-based option, see [Using Legacy Basic Auth](LEGACY_AUTH.md).

## Default Login Flow

1. Open the workspace folder in VS Code.
2. Run the `Login to Instance` command.
3. Enter the ServiceNow instance URL, username, and password.

The extension writes the instance URL and label to `.snconfig/config.yaml`, then stores the username and password in VS Code SecretStorage. The password is not written to the workspace config file.

When a request is sent to ServiceNow, the extension reads the stored username and password for the configured instance URL and builds a Basic `Authorization` header at request time.

## Secure Storage

Credentials entered through `Login to Instance` are stored with VS Code's SecretStorage API:

- **macOS**: protected by the platform secure storage used by VS Code
- **Windows**: protected by Windows credential storage through VS Code
- **Linux**: protected by the desktop secret service available to VS Code

The credential lookup key includes `connect_instance_url`, so changing the instance URL in `.snconfig/config.yaml` changes which stored credentials are used.

To remove stored credentials for the current instance, run the `Delete stored credentials for current instance` command. This deletes the saved username and password and clears the configured instance URL and label.

## Configuration File

Authentication settings live in `.snconfig/config.yaml` as top-level YAML values.

```yaml
connect_instance_url: https://your-instance.service-now.com
connect_instance_label: your-instance
```

## Configuration Parameters

| Parameter | Required | Used for |
| --- | --- | --- |
| `connect_instance_url` | Yes | Base URL for all ServiceNow API requests. It is also used as the SecretStorage key suffix for credentials saved by `Login to Instance`. |
| `connect_instance_label` | Recommended | Display label shown by the extension in the VS Code status bar. The login command derives it from the instance URL when possible. |
| `connect_instance_user_token` | Optional | Advanced option. Sends the value as the `X-UserToken` request header. If configured, it is used before bearer or stored username/password authentication. |
| `connect_instance_cookie` | Optional | Advanced option. Sends the value as the `Cookie` request header. If configured, it is used before bearer or stored username/password authentication. |
| `connect_instance_bearer` | Optional | Advanced option. Sends a bearer-token `Authorization` header. Used only when ServiceNow session headers are not configured. |
| `connect_basic_auth_legacy` | Optional | Covered separately in [Using Legacy Basic Auth](LEGACY_AUTH.md). |

## ServiceNow Session Headers

Use ServiceNow session headers when the instance expects an existing ServiceNow session instead of a Basic or Bearer `Authorization` header.

These parameters are intended for advanced users who already manage their own ServiceNow session lifecycle. The extension sends the configured header values as-is and does not refresh the session, renew cookies, or request a new user token.

```yaml
connect_instance_url: https://your-instance.service-now.com
connect_instance_label: your-instance
connect_instance_user_token: your-user-token
connect_instance_cookie: glide_sso_id=...; JSESSIONID=...
```

`connect_instance_user_token` and `connect_instance_cookie` are independent. You can configure either one or both:

- `connect_instance_user_token` becomes the `X-UserToken` header.
- `connect_instance_cookie` becomes the `Cookie` header.

If either value is present after trimming whitespace, the extension sends only these configured session headers for authentication. It does not send a Basic or Bearer `Authorization` header for that request.

## Bearer Token

Use `connect_instance_bearer` when the instance expects bearer token authentication.

This parameter is intended for advanced users who already manage token issuance and rotation. The extension sends the configured token as-is and does not refresh expired bearer tokens.

```yaml
connect_instance_url: https://your-instance.service-now.com
connect_instance_label: your-instance
connect_instance_bearer: your-token
```

The value can be either the raw token or the full header value:

```yaml
connect_instance_bearer: your-token
```

```yaml
connect_instance_bearer: Bearer your-token
```

If the value already starts with `Bearer `, the extension sends it unchanged. Otherwise, the extension prepends `Bearer ` before sending the `Authorization` header.

Bearer auth is used only when `connect_instance_user_token` and `connect_instance_cookie` are not configured.

## Authentication Precedence

For every ServiceNow request, the extension chooses authentication headers in this order:

1. ServiceNow session headers from `connect_instance_user_token` and/or `connect_instance_cookie`
2. Bearer auth from `connect_instance_bearer`
3. Legacy config option, covered separately in [Using Legacy Basic Auth](LEGACY_AUTH.md)
4. Stored username/password credentials from VS Code SecretStorage

If a higher-priority option is configured, lower-priority options are ignored for that request.

## Credential Migration

When upgrading from older versions, credentials in the old file-based field are migrated to VS Code SecretStorage on first launch. After successful migration, the old field is removed from `.snconfig/config.yaml`.

Migration is skipped when config-based authentication is already configured, because those values intentionally bypass SecretStorage.
