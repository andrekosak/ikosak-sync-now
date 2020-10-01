[![Installations count](https://img.shields.io/visual-studio-marketplace/i/AndreKosak.ikosak-sync-now)](https://marketplace.visualstudio.com/items?itemName=AndreKosak.ikosak-sync-now) 

The VSCode extension "iKosak Sync Now" synchronizes records with ServiceNow instances. Sync is done via REST protocol. Start syncing NOW records to the hard drive just after installing the extension. No other programs are required.

Synced records are being saved as files in folder `./src`. You can edit them and upload back to instance via `CMD+k+j` __(or CTRL+k+j for Windows)__ shortcut.

# Features

- Work on records from ANY scope (including Global)
- Synchronize NOW records to files on the hard drive
- Upload records to NOW via shortcut (CMD+k+j)
- Select a code snippet to execute it on server, get a prompt result in a new window (CMD+k+p)
- Easy to use YAML configuration file
- Shows diffs if record has been changed on instance since pulled
- Check if the record being uploaded belongs to same scope as current Update Set
- Written in Typescript with 🖤

# Usage

[Watch video guide (3 min)](https://youtu.be/Tvexo9GNAuA) how to get started or follow the description.

1. Create an empty folder to sync with a NOW instance. Open this folder in VSCode.
2. Search for the command "Login to instance" to launch the extension and start authentication.
3. Once entered login data, check the config located at `./snconfig/syncconfig.yaml` to define tables, queries, naming of the files to be synced. Default config includes most useful data for a developer.
4. Click on instance name in bottom left corner of VS Code to start pulling data.
5. Search for a file in `./src` folder. __For example, press `CMD+p` and search for "Caller Close" to find the Business rule "Caller Close" on incident table.__
6. Once edited a file, use **CMD+k+j** (or Ctrl+k+j) shortcut to upload the updated record to the instance.

# FAQ

*I have created a new record in NOW. How do i get it to the editor?*

You should use the **Pull a table** command and select the table you want to re-sync.

*Why i cannot push the record to NOW?*

There could be several reasons:
- You have no internet
- The record you are trying to edit is secured by system
- VS code got stucked. Reload it.
- The extension has a bug. Please [create an issue](https://github.com/andrekosak/ikosak-sync-now/issues) in Github.

# Known restrictions

* Only basic auth is supported. 2FA will be never suppoted. oAuth - coming soon.
* There could be some issues for Windows users, as i am developing and testing mainly on macOS.
* You cannot create and upload new records.
