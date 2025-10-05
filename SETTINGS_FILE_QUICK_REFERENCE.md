# Settings File Generation - Quick Reference

## Overview
RenderCoordinator now automatically generates settings files before rendering operations using the new `generateSettingsFile()` method from my-nft-gen.

---

## Key Changes

### Method Name Change
- **Old**: `project.exportSettingsFile(path)`
- **New**: `project.generateSettingsFile(path)`

### Automatic Generation
Settings files are now automatically generated for:
- ✅ Single frame rendering
- ✅ Render loop operations
- ✅ Project resume operations
- ✅ Pin capture operations

---

## Usage Examples

### 1. Render a Frame (Auto-generates settings file)
```javascript
const result = await renderCoordinator.renderFrame(
    project,
    frameNumber,
    totalFrames,
    projectName
    // settingsFile parameter is optional - will auto-generate if not provided
);

console.log('Settings file:', result.settingsFile);
```

### 2. Render a Frame with Pinned Settings
```javascript
// First render - generates settings file
const result1 = await renderCoordinator.renderFrame(project, 0, 100, 'test');

// Second render - use the generated settings file for pinning
const result2 = await renderCoordinator.renderFrame(
    project,
    0,
    100,
    'test',
    result1.settingsFile  // Pin to these settings
);

// result1 and result2 will be identical
```

### 3. Start Render Loop (Auto-generates settings file)
```javascript
const result = await renderCoordinator.startRenderLoop(
    project,
    projectState
    // settingsFile parameter is optional
);

// Check events for settingsFile property
```

### 4. Capture Settings for Pin Mode
```javascript
const result = await renderCoordinator.captureSettingsForPin(project);

if (result.success) {
    console.log('Settings captured:', result.settingsFilePath);
    
    // Use this settings file for pinned rendering
    await renderCoordinator.renderFrame(
        project,
        0,
        100,
        'test',
        result.settingsFilePath
    );
}
```

---

## Settings File Locations

All settings files are stored in the system's temporary directory:

| Operation | File Name Pattern | Example |
|-----------|------------------|---------|
| Frame render | `frame-settings-{timestamp}.json` | `frame-settings-1234567890.json` |
| Loop render | `loop-settings-{timestamp}.json` | `loop-settings-1234567890.json` |
| Resume operation | `resume-settings-{timestamp}.json` | `resume-settings-1234567890.json` |
| Pin capture | `pin-settings-{timestamp}.json` | `pin-settings-1234567890.json` |

---

## Event Properties

All render events now include:

```javascript
{
    // ... existing properties
    settingsFile: string | null,  // Path to settings file
    isPinned: boolean             // True if using pinned settings
}
```

**Events with these properties**:
- `render.loop.start`
- `project.resume.start`
- `frameStarted`
- `frameCompleted`

---

## Error Handling

Settings file generation is **non-blocking**:

```javascript
// If generation fails, rendering continues without settings file
try {
    await project.generateSettingsFile(path);
} catch (error) {
    // Logs warning but continues
    this.logger.warn('Failed to generate settings file, continuing without it', error);
    effectiveSettingsFile = null;
}
```

---

## Backward Compatibility

✅ All changes are backward compatible:
- Existing code works without modification
- Settings file parameter is optional
- Graceful fallback if method doesn't exist
- No breaking changes to API

---

## Requirements

### my-nft-gen Requirements
The project instance must have the `generateSettingsFile()` method:

```javascript
class Project {
    /**
     * Generate settings file from current project configuration
     * @param {string} outputPath - Path where settings file should be saved
     * @returns {Promise<void>}
     */
    async generateSettingsFile(outputPath) {
        // Implementation in my-nft-gen
    }
}
```

### Checking for Method Availability
```javascript
if (project && typeof project.generateSettingsFile === 'function') {
    // Method is available
    await project.generateSettingsFile(path);
} else {
    // Method not available - handle gracefully
    console.warn('generateSettingsFile method not available');
}
```

---

## Testing Checklist

- [ ] Frame rendering generates settings file
- [ ] Loop rendering generates settings file
- [ ] Resume operations generate settings file
- [ ] Pin capture uses correct method name
- [ ] Pinned rendering produces identical results
- [ ] Error handling works when method is missing
- [ ] Settings files are created in temp directory
- [ ] Events include settingsFile and isPinned properties
- [ ] Backward compatibility maintained

---

## Common Issues

### Issue: Settings file not generated
**Cause**: `generateSettingsFile()` method not available on project instance

**Solution**: Ensure my-nft-gen has been updated with the new method

### Issue: Pin feature not working
**Cause**: Settings file path is incorrect or file doesn't exist

**Solution**: Check that settings file was successfully generated and path is valid

### Issue: Different results with same settings file
**Cause**: Settings file not being passed correctly to backend

**Solution**: Verify parameter order in `generateSingleFrame()` call (see PIN_FEATURE_BUG_FIX.md)

---

## Related Documentation

- [SETTINGS_FILE_GENERATION_UPDATE.md](./SETTINGS_FILE_GENERATION_UPDATE.md) - Detailed changes
- [PIN_FEATURE_BUG_FIX.md](./PIN_FEATURE_BUG_FIX.md) - Parameter position fix
- [PIN_FEATURE_ARCHITECTURE.md](./PIN_FEATURE_ARCHITECTURE.md) - Overall architecture
- [project-plans/PIN_SETTING_FEATURE.md](./project-plans/PIN_SETTING_FEATURE.md) - Original plan

---

## Quick Commands

```bash
# Run tests
npm test

# Start development
npm run start:dev

# Check for settings files in temp directory
ls -la $(node -e "console.log(require('os').tmpdir())")/pin-settings-*
ls -la $(node -e "console.log(require('os').tmpdir())")/frame-settings-*
ls -la $(node -e "console.log(require('os').tmpdir())")/loop-settings-*
```

---

## Status

✅ **Implementation Complete**
⏳ **Testing Required**
⏳ **Documentation Review Needed**