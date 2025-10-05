# Backend Changes Required in my-nft-gen

## ⚠️ CRITICAL: These changes must be made in the `my-nft-gen` repository first

The pin feature cannot work without these backend modifications.

---

## File: `my-nft-gen/src/app/Project.js`

### Change 1: Update Method Signature

**Location:** Line 373

**Current:**
```javascript
async generateSingleFrame(frameNumber, totalFrames = null, returnAsBuffer = true, outputDirectory = null)
```

**Change to:**
```javascript
async generateSingleFrame(frameNumber, totalFrames = null, returnAsBuffer = true, settingsFile = null)
```

---

### Change 2: Add Settings File Loading Logic

**Location:** After line 387 (after FRAME_GENERATION_STARTED event)

**Add this logic:**
```javascript
// Check if we should load existing settings (pinned mode)
let settings;
let configPath;
let workingDirectory;
let finalFinalName;

if (settingsFile) {
    // PINNED MODE: Load existing settings file
    this.emit(ProjectEvents.SETTINGS_LOADING, { settingsFile });
    
    try {
        const settingsContent = await fs.readFile(settingsFile, 'utf8');
        const loadedSettings = JSON.parse(settingsContent);
        
        // Reconstruct Settings object from loaded data
        settings = new Settings(loadedSettings.config);
        
        // Restore all the settings properties
        Object.assign(settings, loadedSettings);
        
        // Use the working directory from loaded settings
        workingDirectory = settings.config.workingDirectory;
        finalFinalName = settings.config.finalFileName;
        configPath = settingsFile; // Reuse the same settings file
        
        this.emit(ProjectEvents.SETTINGS_LOADED, {
            settingsFile,
            finalFileName: finalFinalName,
            message: 'Loaded existing settings (pinned mode - no randomization)'
        });
        
        console.log('📌 PIN MODE: Loaded existing settings from:', settingsFile);
        console.log('📌 No randomization will occur');
        
    } catch (error) {
        throw new Error(`Failed to load settings file: ${settingsFile}. Error: ${error.message}`);
    }
    
} else {
    // UNPINNED MODE: Generate new settings with randomization
    
    // Create temporary directory for frame generation
    const tempDir = `${this.projectDirectory}/temp-frame-${randomId()}/`;
    finalFinalName = this.projectName + '-frame-' + frameNumber;
    workingDirectory = `${tempDir}${finalFinalName}/`;

    this.emit(ProjectEvents.DIRECTORY_CREATING, { workingDirectory });
    await fs.mkdir(workingDirectory + 'settings/', { recursive: true });
    this.emit(ProjectEvents.DIRECTORY_CREATED, { workingDirectory });

    // Create settings for single frame generation
    this.emit(ProjectEvents.SETTINGS_CREATING, { finalFileName: finalFinalName });
    settings = new Settings({
        colorScheme: this.colorScheme,
        neutrals: this.neutrals,
        backgrounds: this.backgrounds,
        lights: this.lights,
        _INVOKER_: this.artist,
        pluginPaths: this.pluginPaths,
        runName: this.projectName,
        finalFileName: finalFinalName,
        numberOfFrame: actualTotalFrames,
        longestSideInPixels: this.longestSideInPixels,
        shortestSideInPixels: this.shortestSideInPixels,
        isHorizontal: this.isHorizontal,
        workingDirectory,
        allPrimaryEffects: this.selectedPrimaryEffectConfigs,
        allFinalImageEffects: this.selectedFinalEffectConfigs,
        maxConcurrentFrameBuilderThreads: 1,
        frameInc: 1,
        frameStart: frameNumber,
    });

    // 🎲 RANDOMIZATION HAPPENS HERE
    await settings.generateEffects();

    settings.backgroundColor = settings.getBackgroundFromBucket();
    
    this.emit(ProjectEvents.SETTINGS_CREATED, {
        settings: settings,
        projectInfo: {
            finalFileName: finalFinalName,
            numberOfFrame: actualTotalFrames,
            frameNumber,
            backgroundColor: settings.backgroundColor
        }
    });

    // Save the newly generated settings
    configPath = `${settings.config.configFileOut}-settings.json`;
    this.emit(ProjectEvents.CONFIG_SAVING, { configPath });
    await fs.writeFile(configPath, JSON.stringify(settings));
    this.emit(ProjectEvents.CONFIG_SAVED, { configPath, settings });
    
    console.log('🎲 UNPINNED MODE: Generated new settings with randomization');
    console.log('🎲 Settings saved to:', configPath);
}
```

**Replace lines 388-437 with the above code.**

---

### Change 3: Update Return Value

**Location:** Lines 490-506

**Current:**
```javascript
returnValue = imageBuffer;
} else {
    returnValue = frameFilename;
}

this.emit(ProjectEvents.FRAME_GENERATION_COMPLETED, {
    frameNumber,
    totalFrames: actualTotalFrames,
    projectName: this.projectName,
    frameFilename,
    workingDirectory,
    configPath,
    returnedAsBuffer: returnAsBuffer,
    timestamp: new Date().toISOString()
});

return returnValue;
```

**Change to:**
```javascript
returnValue = {
    buffer: imageBuffer,
    settingsFile: configPath
};
} else {
    returnValue = {
        path: frameFilename,
        settingsFile: configPath
    };
}

this.emit(ProjectEvents.FRAME_GENERATION_COMPLETED, {
    frameNumber,
    totalFrames: actualTotalFrames,
    projectName: this.projectName,
    frameFilename,
    workingDirectory,
    configPath,
    settingsFile: configPath,
    returnedAsBuffer: returnAsBuffer,
    isPinned: !!settingsFile,
    timestamp: new Date().toISOString()
});

return returnValue;
```

---

### Change 4: Update Cleanup Logic (Optional)

**Location:** Line 475

**Current:**
```javascript
// Remove temp directory if we created it
if (!outputDirectory) {
    const tempDir = workingDirectory.split('/').slice(0, -2).join('/') + '/';
    await fs.rmdir(tempDir, { recursive: true });
}
```

**Change to:**
```javascript
// Remove temp directory if we created it (only in unpinned mode)
if (!settingsFile) {
    const tempDir = workingDirectory.split('/').slice(0, -2).join('/') + '/';
    await fs.rmdir(tempDir, { recursive: true });
}
```

---

## Summary of Changes

1. **Parameter change**: `outputDirectory` → `settingsFile`
2. **Conditional logic**: Check if `settingsFile` is provided
3. **Load mode**: If `settingsFile` exists, load it (no randomization)
4. **Generate mode**: If `settingsFile` is null, generate new settings (with randomization)
5. **Return value**: Always return both the image buffer/path AND the settings file path
6. **Events**: Emit appropriate events for loading vs creating settings

---

## Testing the Backend Changes

After making these changes, test with:

```javascript
// Test 1: Unpinned mode (should generate different results)
const result1 = await project.generateSingleFrame(0, 100, true, null);
console.log('Result 1:', result1.settingsFile);

const result2 = await project.generateSingleFrame(0, 100, true, null);
console.log('Result 2:', result2.settingsFile);
// result1 and result2 should have different images

// Test 2: Pinned mode (should generate same result)
const result3 = await project.generateSingleFrame(0, 100, true, result1.settingsFile);
console.log('Result 3:', result3.settingsFile);
// result3 should match result1 exactly
```

---

## Impact on Existing Code

⚠️ **Breaking Change**: The return value format has changed from:
- `Buffer` or `string` 

To:
- `{ buffer: Buffer, settingsFile: string }` or `{ path: string, settingsFile: string }`

Any code calling `generateSingleFrame()` will need to be updated to handle the new return format.

---

## Next Steps

1. ✅ Make these changes in `my-nft-gen/src/app/Project.js`
2. ✅ Test the backend changes independently
3. ✅ Update frontend to use the new return format
4. ✅ Implement the complete pin feature flow in nft-studio