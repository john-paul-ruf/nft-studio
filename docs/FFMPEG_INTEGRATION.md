# FFmpeg Integration for ASAR-Packaged Electron Builds

## Overview

This document describes the FFmpeg configuration integration that enables NFT Studio to work correctly in both development and production (ASAR-packaged) modes.

## Problem Statement

Electron applications use ASAR packaging for production builds, which bundles application files into a single archive. However, native binaries like FFmpeg cannot be executed from within ASAR archives. This causes video generation to fail in production builds unless FFmpeg binaries are properly unpacked and their paths are correctly resolved.

## Solution Architecture

### Components

1. **AsarFFmpegResolver** (`src/utils/AsarFFmpegResolver.js`)
   - Singleton service that automatically detects development vs production mode
   - Resolves FFmpeg binary paths for the current environment
   - Provides `FFmpegConfig` instances to Project classes

2. **ProjectLifecycleManager** (`src/services/ProjectLifecycleManager.js`)
   - Updated to use AsarFFmpegResolver when creating Project instances
   - Passes FFmpegConfig to all main project creation flows

3. **PreviewHandlers** (`src/main/handlers/PreviewHandlers.js`)
   - Updated to use AsarFFmpegResolver for effect preview generation
   - Ensures preview projects have correct FFmpeg paths

4. **Package Configuration** (`package.json`)
   - ASAR unpacking configured for `ffmpeg-ffprobe-static` binaries
   - Ensures binaries are available in production builds

## How It Works

### Development Mode

In development mode (`app.isPackaged === false`):

1. AsarFFmpegResolver detects development mode
2. Resolves FFmpeg binaries from `my-nft-gen/node_modules/ffmpeg-ffprobe-static/`
3. Uses `require.resolve()` to find the correct paths
4. Returns paths like: `/path/to/my-nft-gen/node_modules/ffmpeg-ffprobe-static/ffmpeg`

### Production Mode

In production mode (`app.isPackaged === true`):

1. AsarFFmpegResolver detects production mode
2. Constructs paths to ASAR unpacked directory
3. Resolves binaries from `app.asar.unpacked/node_modules/my-nft-gen/node_modules/ffmpeg-ffprobe-static/`
4. Verifies binaries exist before returning paths
5. Returns platform-specific paths (e.g., `ffmpeg.exe` on Windows)

### Path Resolution Logic

```javascript
// Development
/path/to/my-nft-gen/node_modules/ffmpeg-ffprobe-static/ffmpeg

// Production (ASAR unpacked)
/path/to/app.asar.unpacked/node_modules/my-nft-gen/node_modules/ffmpeg-ffprobe-static/ffmpeg
```

## Integration Points

### 1. Project Creation

```javascript
// In ProjectLifecycleManager.createProjectInstance()
const ffmpegConfig = await AsarFFmpegResolver.getFFmpegConfig();

const project = new Project({
    // ... other config
    ffmpegConfig: ffmpegConfig  // ✅ FFmpeg config passed
});
```

### 2. Preview Generation

```javascript
// In PreviewHandlers.createPreviewProject()
const ffmpegConfig = await AsarFFmpegResolver.getFFmpegConfig();

return new Project({
    // ... other config
    ffmpegConfig: ffmpegConfig  // ✅ FFmpeg config passed
});
```

### 3. Settings Propagation

The `Project` class automatically passes `ffmpegConfig` to `Settings` instances:

```javascript
// In Project.generateSettingsFile()
const settings = new Settings({
    // ... other config
    ffmpegConfig: this.ffmpegConfig  // ✅ Propagated from Project
});
```

## ASAR Unpacking Configuration

The `package.json` includes the following unpacking configuration:

```json
{
  "build": {
    "asar": true,
    "asarUnpack": [
      "**/node_modules/sharp/**/*",
      "**/node_modules/@img/**/*",
      "**/node_modules/canvas/**/*",
      "**/node_modules/my-nft-gen/**/*",
      "**/node_modules/ffmpeg-ffprobe-static/**/*"
    ]
  }
}
```

This ensures:
- ✅ FFmpeg binaries are unpacked and executable
- ✅ All native dependencies are available
- ✅ `my-nft-gen` library and its dependencies are accessible

## Testing

### Test Scripts

1. **Path Verification** (Node.js)
   ```bash
   npm run test:ffmpeg:paths
   ```
   - Verifies FFmpeg binaries exist in expected locations
   - Checks file structure and symlinks
   - Runs in Node.js (no Electron required)

2. **Integration Test** (Electron)
   ```bash
   npm run test:ffmpeg
   ```
   - Tests AsarFFmpegResolver in Electron context
   - Verifies Project and Settings integration
   - Confirms FFmpegConfig propagation
   - Runs in development mode

### Test Results

Development mode test output:
```
✅ FFmpeg Path: /path/to/my-nft-gen/node_modules/ffmpeg-ffprobe-static/ffmpeg
✅ FFprobe Path: /path/to/my-nft-gen/node_modules/ffmpeg-ffprobe-static/ffprobe
✅ Project created with FFmpegConfig
✅ Settings has ffmpegConfig
```

## Platform Support

The solution supports all Electron platforms:

- ✅ **macOS** (darwin): `ffmpeg`, `ffprobe`
- ✅ **Windows** (win32): `ffmpeg.exe`, `ffprobe.exe`
- ✅ **Linux**: `ffmpeg`, `ffprobe`

Architecture detection is automatic via `process.arch`.

## Benefits

1. **Production-Ready**: Handles ASAR packaging automatically
2. **Development-Friendly**: Falls back to development paths seamlessly
3. **No Breaking Changes**: Existing code continues to work
4. **Single Source of Truth**: AsarFFmpegResolver is the only place that knows about paths
5. **Testable**: Can be mocked for testing scenarios
6. **Maintainable**: Clear separation of concerns
7. **SOLID Compliance**: Follows Dependency Inversion Principle

## Troubleshooting

### FFmpeg Not Found in Production

If FFmpeg binaries are not found in production:

1. Check ASAR unpacking configuration in `package.json`
2. Verify binaries are in the unpacked directory
3. Use diagnostics:
   ```javascript
   const diagnostics = AsarFFmpegResolver.getDiagnostics();
   console.log(diagnostics);
   ```

### Development Mode Issues

If FFmpeg is not found in development:

1. Ensure `my-nft-gen` is installed: `npm install`
2. Check that `ffmpeg-ffprobe-static` is in `my-nft-gen/node_modules/`
3. Verify symlinks are working (for `file:` dependencies)

## Future Enhancements

Potential improvements:

1. **IPC Diagnostics**: Expose `getDiagnostics()` via IPC for UI troubleshooting
2. **Custom Binary Paths**: Allow users to specify custom FFmpeg paths
3. **Binary Verification**: Add checksum verification for security
4. **Fallback Strategies**: Support system FFmpeg as fallback option

## Related Files

- `src/utils/AsarFFmpegResolver.js` - Main resolver implementation
- `src/services/ProjectLifecycleManager.js` - Project creation integration
- `src/main/handlers/PreviewHandlers.js` - Preview generation integration
- `package.json` - ASAR unpacking configuration
- `scripts/test-ffmpeg-integration.js` - Integration test
- `scripts/test-ffmpeg-paths.js` - Path verification test

## References

- [Electron ASAR Documentation](https://www.electronjs.org/docs/latest/tutorial/asar-archives)
- [my-nft-gen FFmpegConfig](../my-nft-gen/src/core/config/FFmpegConfig.js)
- [ffmpeg-ffprobe-static Package](https://www.npmjs.com/package/ffmpeg-ffprobe-static)