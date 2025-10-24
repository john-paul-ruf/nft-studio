# Plugin Management — Dynamic Installation in Both Dev & Prod

## The Solution

Your app now supports **true dynamic plugin installation everywhere** — development, production, macOS, Windows, and Linux. Users can install any npm package at runtime without needing npm pre-installed.

## How It Works

Instead of relying on the npm CLI (which isn't available in packaged apps), the system:

1. **Downloads package metadata** from npm registry API (`registry.npmjs.org`)
2. **Fetches the tarball** directly from npm CDN
3. **Extracts** using system `tar` (or Node.js fallback)
4. **Validates** the plugin structure
5. **Shows real-time progress** to the user

This works everywhere because it only uses:
- Built-in Node.js `https` module
- System `tar` command (with automatic fallback)
- No external dependencies

## Architecture

### New Service: PluginDownloadService
**Location**: `src/services/PluginDownloadService.js`

Handles the entire download-extract-validate flow:
- Fetches package info from npm registry
- Downloads tarballs
- Extracts with smart fallback (system tar → Node.js tar)
- Validates plugin.json structure
- Reports progress at each step

### Updated: PluginManagerService
**Location**: `src/services/PluginManagerService.js`

- Uses `PluginDownloadService` for npm installations
- Supports progress callbacks
- Batch install capability (`installMultipleFromNpm()`)
- Works in dev and prod identically

### UI: Real-Time Progress
**Updated**: `src/components/PluginManagerDialog.jsx`

- Shows download progress bar with percentage
- Displays status messages ("Fetching package info...", "Downloading...", etc.)
- Listens for IPC events from main process
- Smooth UX with actual work happening

### IPC Handler: Progress Events
**Updated**: `src/main/handlers/PluginHandlers.js`

- Emits progress updates back to renderer during download
- Uses `event.sender.send()` to update UI in real-time
- Non-blocking installation

### Preload API: Event Listeners
**Updated**: `preload.js`

- Added `api.on(channel, callback)` for listening to IPC events
- Added `api.off(channel, callback)` for cleanup
- Safe unsubscribe pattern with returned function

## Usage

### For End Users

In the Plugin Manager dialog:

1. Enter any npm package name (e.g., `my-effects-plugin`)
2. Click **Install**
3. Watch the progress bar as it:
   - Fetches package info
   - Downloads the tarball
   - Extracts files
   - Validates the plugin
   - Refreshes effect registry
4. ✅ Done! New effects available immediately

Works the same whether they're using dev or packaged production app.

### For Developers

```javascript
// Install a single plugin
const result = await window.api.plugins.installFromNpm('my-plugin');

// Listen for progress updates
const unsubscribe = window.api.on('plugins:install-progress', (data) => {
  console.log(`${data.percentage}% - ${data.message}`);
});

// Cleanup
unsubscribe();
```

## Directory Structure

```
~/.nftconfig/
├── plugins/
│   ├── my-plugin-1.0.0/
│   │   ├── package.json
│   │   ├── index.js (or main entry)
│   │   └── ... (plugin files)
│   ├── another-plugin-2.5.0/
│   └── local-custom-plugin/
├── plugins-config.json
└── ...
```

## Configuration Format

`plugins-config.json`:
```json
[
  {
    "name": "my-effect-plugin",
    "path": "/home/user/.nftconfig/plugins/my-plugin-1.0.0",
    "type": "npm",
    "version": "1.0.0",
    "description": "Plugin description from package.json",
    "enabled": true,
    "addedAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "name": "my-local-plugin",
    "path": "/path/to/local/plugin",
    "type": "local",
    "version": "0.1.0",
    "enabled": false,
    "addedAt": "2024-01-16T14:22:00.000Z",
    "updatedAt": "2024-01-16T14:22:00.000Z"
  }
]
```

## Features

✅ **Works everywhere**: dev, prod, all platforms  
✅ **No npm required**: Uses npm registry API directly  
✅ **Real-time feedback**: Progress bar + status messages  
✅ **Any npm package**: Supports all package types  
✅ **Smart extraction**: System tar with automatic fallback  
✅ **Batch install**: Install multiple plugins at once  
✅ **Error handling**: Clear messages on failures  
✅ **Plugin validation**: Ensures proper structure  
✅ **Auto-refresh effects**: Updates registry after install  

## What Users Can Do

✅ Install any npm package as a plugin  
✅ Add local plugins from disk  
✅ Enable/disable plugins  
✅ Remove plugins  
✅ See installation progress  
✅ Get clear error messages  

## Requirements

For users to install plugins, their system needs:
- **Internet connection** (to download from npm registry)
- **System `tar` command** (Windows/macOS/Linux all have this)
  - Automatic fallback to Node.js if system tar unavailable
- **Write permissions** to app data directory (~/.nftconfig/plugins/)

## Development & Testing

Test the download flow locally:

```bash
# 1. In dev mode (works normally)
npm run start:dev

# 2. Try installing a real npm package
# In Plugin Manager: type "lodash" and click Install
# Watch it download, extract, and show progress

# 3. Test progress updates
# The UI should show: Fetching... → Downloading... → Extracting... → Complete
```

Test with network issues:

```javascript
// The download service has built-in timeout handling (60 seconds)
// Automatic fallback for tar extraction
// Graceful error messages
```

## Production Deployment

Your packaged app works as-is:

```bash
npm run build
npm run package:mac  # or package:win, package:linux

# Users can now install plugins directly in the packaged app!
# No special setup needed
```

---

**Key Achievement**: Users now have true dynamic plugin management in production, just like in development. 🎉