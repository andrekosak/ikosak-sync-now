# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Secure credential storage using VS Code SecretStorage API**
  - Credentials are now stored using OS-native secure storage instead of plain text in config files
  - macOS: Credentials stored in system Keychain
  - Windows: Credentials stored in Credential Manager
  - Linux: Credentials stored using Secret Service API (gnome-keyring or similar)
  - Automatic migration from old `connect_basic_auth` field to SecretStorage on first launch
  - Enhanced security - passwords never written to disk in plain text
  - See [docs/SECRETSTORAGE_MACOS.md](docs/SECRETSTORAGE_MACOS.md) for platform-specific details
- New config option `connect_basic_auth_legacy` to bypass SecretStorage and use basic auth directly from config file
  - Useful for CI/CD pipelines, Docker containers, and automated environments
  - See [docs/LEGACY_AUTH.md](docs/LEGACY_AUTH.md) for detailed documentation
  - When configured, credential migration to SecretStorage is automatically skipped

### Changed

- Credentials service refactored to use VS Code's SecretStorage API
- Settings initialization now runs asynchronously to support credential migration
- Login flow updated to store credentials in secure storage instead of config file

## [1.2.0] - 2020-06-08

### Added

- New command **Pull current file from instance** to allow users to pull the latest content from the remote server for the currently open file. Thanks to David's issue #12. More than 3 years since issue has been created 🤯
- Devcontainer configuration for VSCode extension development

### Fixed

- uploadFile uses getExactCasePath for accurate file handling
- update release workflow to use consistent version handling and Node 16

## [1.1.8] - 2020-06-08

### Features

* Added key binding `cmd-k-o` for Open in Browser command

## [1.1.6] - 2020-06-08

### Fixes

* Fixed RegExp that should exclude characters in filenames so files could be created

## [1.1.0] - 2020-05-24

### Github release

From this version upwards i have decided to share the code to Github community
