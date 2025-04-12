# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2020-06-08

### Added

- New command **Pull current file from instance** to allow users to pull the latest content from the remote server for the currently open file. Thanks to David #12. More than 3 years since issue has been created 🤯
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
