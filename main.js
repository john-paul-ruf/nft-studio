// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const fs = require('fs').promises

// Store active projects to keep them in scope for event forwarding
const activeProjects = new Map();

// Enhanced logging utilities for better readability
const logger = {
    header: (title) => {
        console.log('\n' + '='.repeat(60));
        console.log(`📋 ${title.toUpperCase()}`);
        console.log('='.repeat(60));
    },

    section: (title) => {
        console.log('\n' + '-'.repeat(40));
        console.log(`🔹 ${title}`);
        console.log('-'.repeat(40));
    },

    info: (message, data = null) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`ℹ️  [${timestamp}] ${message}`);
        if (data && typeof data === 'object') {
            console.log('   📊 Data:', JSON.stringify(data, null, 2));
        }
    },

    success: (message) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`✅ [${timestamp}] ${message}`);
    },

    warn: (message, details = null) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`⚠️  [${timestamp}] ${message}`);
        if (details) console.log('   🔍 Details:', details);
    },

    error: (message, error = null) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`❌ [${timestamp}] ${message}`);
        if (error) console.log('   💥 Error:', error);
    },

    event: (eventName, data = null) => {
        const timestamp = new Date().toLocaleTimeString();

        // Format events based on their type for better readability
        switch (eventName) {
            case 'frameCompleted':
                if (data) {
                    const progress = Math.round((data.progress || 0) * 100);
                    const timeStr = data.durationMs ? `${data.durationMs}ms` : 'N/A';
                    console.log(`🖼️  [${timestamp}] Frame ${data.frameNumber}/${data.totalFrames} completed (${progress}%) - ${timeStr}`);
                    if (data.outputPath) {
                        console.log(`   💾 Saved: ${data.outputPath.split('/').pop()}`);
                    }
                }
                break;

            case 'workerStarted':
                if (data && data.config) {
                    const { frameStart, frameEnd, totalFrames } = data.config;
                    console.log(`🔨 [${timestamp}] Worker started: frames ${frameStart}-${frameEnd} (${totalFrames} total) - ${data.workerId}`);
                }
                break;

            case 'workerCompleted':
                if (data) {
                    const avgTime = data.avgFrameTimeMs ? `${data.avgFrameTimeMs}ms avg` : 'N/A';
                    console.log(`✅ [${timestamp}] Worker completed: ${data.framesProcessed} frames in ${data.totalDurationMs}ms (${avgTime}) - ${data.workerId}`);
                }
                break;

            case 'projectProgress':
                if (data) {
                    const progress = Math.round((data.completedFrames / data.totalFrames) * 100);
                    console.log(`📊 [${timestamp}] Project Progress: ${data.completedFrames}/${data.totalFrames} frames (${progress}%)`);
                    if (data.estimatedTimeRemaining) {
                        console.log(`   ⏱️  ETA: ${data.estimatedTimeRemaining}`);
                    }
                }
                break;

            case 'GENERATION_ERROR':
                console.log(`❌ [${timestamp}] Generation Error: ${data?.error || 'Unknown error'}`);
                break;

            case 'effectApplied':
                if (data) {
                    console.log(`🎨 [${timestamp}] Effect applied: ${data.effectName} on frame ${data.frameNumber}`);
                }
                break;

            default:
                // Default formatting for unknown events
                console.log(`🔔 [${timestamp}] Event: ${eventName}`);
                if (data && Object.keys(data).length > 0) {
                    // Only show essential data, not all the verbose details
                    const essentialData = {};
                    if (data.frameNumber !== undefined) essentialData.frame = data.frameNumber;
                    if (data.progress !== undefined) essentialData.progress = `${Math.round(data.progress * 100)}%`;
                    if (data.durationMs !== undefined) essentialData.duration = `${data.durationMs}ms`;
                    if (data.workerId !== undefined) essentialData.worker = data.workerId.split('-').pop();

                    if (Object.keys(essentialData).length > 0) {
                        console.log('   📦', JSON.stringify(essentialData));
                    }
                }
                break;
        }
    },

    progress: (current, total, description) => {
        const percentage = Math.round((current / total) * 100);
        const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
        console.log(`🚀 Progress: [${progressBar}] ${percentage}% - ${description}`);
    }
};

function createWindow () {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    // Make the window full screen
    mainWindow.maximize()

    // and load the index.html of the app.
    mainWindow.loadFile('index.html')

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow()

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

// IPC handlers for file system operations
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return result;
});

ipcMain.handle('select-file', async (event, options = {}) => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: options.filters || [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    return result;
});

ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
        await fs.writeFile(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// NFT Generation IPC handlers
ipcMain.handle('start-new-project', async (event, projectConfig) => {
    logger.header('Starting New NFT Project');
    logger.info('Project Configuration Received', {
        projectName: projectConfig.projectName,
        resolution: projectConfig.resolution,
        numberOfFrames: projectConfig.numberOfFrames,
        colorScheme: projectConfig.colorScheme,
        effectsCount: {
            primary: projectConfig.effects?.primary?.length || 0,
            final: projectConfig.effects?.final?.length || 0
        }
    });

    try {
        // Import my-nft-gen modules using file paths
        const path = await import('path');
        const fs = await import('fs/promises');
        const { fileURLToPath } = await import('url');

        // Get the absolute path to my-nft-gen
        const myNftGenPath = path.resolve(process.cwd(), '../my-nft-gen');

        const { Project } = await import(`file://${myNftGenPath}/src/app/Project.js`);
        const { UnifiedEventBus } = await import(`file://${myNftGenPath}/src/core/events/UnifiedEventBus.js`);
        const { LayerConfig } = await import(`file://${myNftGenPath}/src/core/layer/LayerConfig.js`);
        const { ColorScheme } = await import(`file://${myNftGenPath}/src/core/color/ColorScheme.js`);

        // Create event bus
        const eventBus = new UnifiedEventBus({
            enableDebug: false,
            enableMetrics: true,
            enableEventHistory: true
        });

        // Note: Event forwarding will be set up later to use project's eventBus
        // This manual eventBus is only for setup/initialization events

        // Map projectConfig.effects to the Settings constructor format
        const effects = projectConfig.effects || { primary: [], secondary: [], keyFrame: [], final: [] };

        // Convert effects to LayerConfig instances for Settings constructor
        const allPrimaryEffects = [];
        if (effects.primary && effects.primary.length > 0) {
            for (const effect of effects.primary) {
                try {
                    // Dynamically import the effect class
                    const effectModule = await import(effect.effectClass.effectFile);
                    const EffectClass = effectModule[effect.effectClass.name];

                    if (!EffectClass) {
                        console.warn(`Effect class ${effect.effectClass.name} not found in ${effect.effectClass.effectFile}`);
                        continue;
                    }

                    // Dynamically import and instantiate the config class
                    let configInstance = null;
                    if (effect.effectClass.configModule && effect.effectClass.configClass) {
                        try {
                            const configModule = await import(effect.effectClass.configModule);
                            const ConfigClass = configModule[effect.effectClass.configClass];

                            if (ConfigClass) {
                                // Import PercentageRange and related classes for proper config handling
                                const { PercentageRange } = await import(`file://${myNftGenPath}/src/core/layer/configType/PercentageRange.js`);
                                const { PercentageShortestSide } = await import(`file://${myNftGenPath}/src/core/layer/configType/PercentageShortestSide.js`);
                                const { PercentageLongestSide } = await import(`file://${myNftGenPath}/src/core/layer/configType/PercentageLongestSide.js`);
                                const { ColorPicker } = await import(`file://${myNftGenPath}/src/core/layer/configType/ColorPicker.js`);

                                // Create default config first to get all defaults including complex types
                                const defaultConfig = new ConfigClass({});

                                // Process user config to handle special config types
                                const userConfig = effect.config || {};
                                const processedConfig = {};

                                // Process each user config property
                                for (const [key, value] of Object.entries(userConfig)) {
                                    const keyLower = key.toLowerCase();

                                    // Check if this property was originally a PercentageShortestSide or PercentageLongestSide
                                    const originalValue = defaultConfig[key];
                                    if (originalValue && typeof originalValue === 'object') {
                                        const originalClassName = originalValue.constructor?.name;
                                        if (originalClassName === 'PercentageShortestSide' && typeof value === 'number') {
                                            processedConfig[key] = new PercentageShortestSide(value);
                                            continue;
                                        } else if (originalClassName === 'PercentageLongestSide' && typeof value === 'number') {
                                            processedConfig[key] = new PercentageLongestSide(value);
                                            continue;
                                        }
                                    }

                                    // Handle color properties
                                    if (keyLower.includes('color') || keyLower.includes('colour')) {
                                        // Skip processing if value is already a proper ColorPicker instance
                                        if (value && typeof value === 'object' && typeof value.getColor === 'function') {
                                            // This is already a ColorPicker object, don't process it
                                            // Let the default config be preserved
                                            continue;
                                        } else if (typeof value === 'string') {
                                            processedConfig[key] = new ColorPicker(ColorPicker.SelectionType.color, value);
                                        } else if (value && typeof value === 'object' && value.selectionType) {
                                            const selectionTypeMap = {
                                                'color': ColorPicker.SelectionType.color,
                                                'colorBucket': ColorPicker.SelectionType.colorBucket,
                                                'neutralBucket': ColorPicker.SelectionType.neutralBucket
                                            };
                                            const mappedType = selectionTypeMap[value.selectionType] || ColorPicker.SelectionType.colorBucket;
                                            // For colorBucket and neutralBucket types, colorValue should be null so they use Settings methods
                                            const colorValue = (mappedType === ColorPicker.SelectionType.colorBucket || mappedType === ColorPicker.SelectionType.neutralBucket)
                                                ? null
                                                : (value.colorValue || '#ff0000');
                                            processedConfig[key] = new ColorPicker(mappedType, colorValue);
                                        } else if (value !== undefined && value !== null) {
                                            // Only override if the user actually provided a value
                                            processedConfig[key] = new ColorPicker(ColorPicker.SelectionType.colorBucket, null);
                                        }
                                        // If no valid value provided, preserve the default from defaultConfig
                                    }
                                    // Handle range properties
                                    else if (value && typeof value === 'object' && value.lower !== undefined && value.upper !== undefined) {
                                        // Check the original config to see what type of range this should be
                                        const originalValue = defaultConfig[key];
                                        const originalClassName = originalValue?.constructor?.name;

                                        if (originalClassName === 'PercentageRange') {
                                            // Only create PercentageRange if the original was a PercentageRange
                                            processedConfig[key] = new PercentageRange(
                                                new PercentageShortestSide(value.lower),
                                                new PercentageLongestSide(value.upper)
                                            );
                                        } else {
                                            // Keep as simple range object for Range class
                                            processedConfig[key] = value;
                                        }
                                    }
                                    // Handle other properties normally
                                    else {
                                        processedConfig[key] = value;
                                    }
                                }

                                // Deep merge function to preserve nested objects and ColorPicker instances
                                function deepMerge(target, source) {
                                    const result = { ...target };
                                    for (const key in source) {
                                        // Special handling for ColorPicker objects - preserve them as-is
                                        if (source[key] && typeof source[key] === 'object' && typeof source[key].getColor === 'function') {
                                            result[key] = source[key]; // Preserve ColorPicker instance
                                        } else if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                                            result[key] = deepMerge(target[key] || {}, source[key]);
                                        } else {
                                            result[key] = source[key];
                                        }
                                    }
                                    return result;
                                }
                                // Merge with defaults, preserving complex types that weren't configured
                                const mergedConfig = deepMerge(defaultConfig, processedConfig);

                                configInstance = new ConfigClass(mergedConfig);
                            }
                        } catch (configError) {
                            console.warn(`Failed to import config class ${effect.effectClass.configClass}:`, configError);
                        }
                    }

                    console.log(`Creating LayerConfig for ${effect.effectClass.name}:`, {
                        configInstance: configInstance,
                        hasConfig: configInstance !== null,
                        configKeys: configInstance ? Object.keys(configInstance) : []
                    });

                    const layerConfig = new LayerConfig({
                        name: effect.effectClass.name,
                        effect: EffectClass,
                        percentChance: effect.percentChance || 100,
                        currentEffectConfig: configInstance
                    });

                    console.log(`Created LayerConfig:`, {
                        name: layerConfig.name,
                        hasCurrentEffectConfig: layerConfig.currentEffectConfig !== null,
                        configKeys: layerConfig.currentEffectConfig ? Object.keys(layerConfig.currentEffectConfig) : []
                    });

                    allPrimaryEffects.push(layerConfig);
                } catch (importError) {
                    console.error(`Failed to import effect ${effect.effectClass.name}:`, importError);
                }
            }
        }
        // Only add default LayerConfig if we have actual effects
        // Don't add empty defaults as they might cause issues

        const allFinalImageEffects = [];
        if (effects.final && effects.final.length > 0) {
            for (const effect of effects.final) {
                try {
                    // Dynamically import the effect class
                    const effectModule = await import(effect.effectClass.effectFile);
                    const EffectClass = effectModule[effect.effectClass.name];

                    if (!EffectClass) {
                        console.warn(`Effect class ${effect.effectClass.name} not found in ${effect.effectClass.effectFile}`);
                        continue;
                    }

                    // Dynamically import and instantiate the config class
                    let configInstance = null;
                    if (effect.effectClass.configModule && effect.effectClass.configClass) {
                        try {
                            const configModule = await import(effect.effectClass.configModule);
                            const ConfigClass = configModule[effect.effectClass.configClass];

                            if (ConfigClass) {
                                // Import PercentageRange and related classes for proper config handling
                                const { PercentageRange } = await import(`file://${myNftGenPath}/src/core/layer/configType/PercentageRange.js`);
                                const { PercentageShortestSide } = await import(`file://${myNftGenPath}/src/core/layer/configType/PercentageShortestSide.js`);
                                const { PercentageLongestSide } = await import(`file://${myNftGenPath}/src/core/layer/configType/PercentageLongestSide.js`);
                                const { ColorPicker } = await import(`file://${myNftGenPath}/src/core/layer/configType/ColorPicker.js`);

                                // Create default config first to get all defaults including complex types
                                const defaultConfig = new ConfigClass({});

                                // Process user config to handle special config types
                                const userConfig = effect.config || {};
                                const processedConfig = {};

                                // Process each user config property
                                for (const [key, value] of Object.entries(userConfig)) {
                                    const keyLower = key.toLowerCase();

                                    // Check if this property was originally a PercentageShortestSide or PercentageLongestSide
                                    const originalValue = defaultConfig[key];
                                    if (originalValue && typeof originalValue === 'object') {
                                        const originalClassName = originalValue.constructor?.name;
                                        if (originalClassName === 'PercentageShortestSide' && typeof value === 'number') {
                                            processedConfig[key] = new PercentageShortestSide(value);
                                            continue;
                                        } else if (originalClassName === 'PercentageLongestSide' && typeof value === 'number') {
                                            processedConfig[key] = new PercentageLongestSide(value);
                                            continue;
                                        }
                                    }

                                    // Handle color properties
                                    if (keyLower.includes('color') || keyLower.includes('colour')) {
                                        // Skip processing if value is already a proper ColorPicker instance
                                        if (value && typeof value === 'object' && typeof value.getColor === 'function') {
                                            // This is already a ColorPicker object, don't process it
                                            // Let the default config be preserved
                                            continue;
                                        } else if (typeof value === 'string') {
                                            processedConfig[key] = new ColorPicker(ColorPicker.SelectionType.color, value);
                                        } else if (value && typeof value === 'object' && value.selectionType) {
                                            const selectionTypeMap = {
                                                'color': ColorPicker.SelectionType.color,
                                                'colorBucket': ColorPicker.SelectionType.colorBucket,
                                                'neutralBucket': ColorPicker.SelectionType.neutralBucket
                                            };
                                            const mappedType = selectionTypeMap[value.selectionType] || ColorPicker.SelectionType.colorBucket;
                                            // For colorBucket and neutralBucket types, colorValue should be null so they use Settings methods
                                            const colorValue = (mappedType === ColorPicker.SelectionType.colorBucket || mappedType === ColorPicker.SelectionType.neutralBucket)
                                                ? null
                                                : (value.colorValue || '#ff0000');
                                            processedConfig[key] = new ColorPicker(mappedType, colorValue);
                                        } else if (value !== undefined && value !== null) {
                                            // Only override if the user actually provided a value
                                            processedConfig[key] = new ColorPicker(ColorPicker.SelectionType.colorBucket, null);
                                        }
                                        // If no valid value provided, preserve the default from defaultConfig
                                    }
                                    // Handle range properties
                                    else if (value && typeof value === 'object' && value.lower !== undefined && value.upper !== undefined) {
                                        // Check the original config to see what type of range this should be
                                        const originalValue = defaultConfig[key];
                                        const originalClassName = originalValue?.constructor?.name;

                                        if (originalClassName === 'PercentageRange') {
                                            // Only create PercentageRange if the original was a PercentageRange
                                            processedConfig[key] = new PercentageRange(
                                                new PercentageShortestSide(value.lower),
                                                new PercentageLongestSide(value.upper)
                                            );
                                        } else {
                                            // Keep as simple range object for Range class
                                            processedConfig[key] = value;
                                        }
                                    }
                                    // Handle other properties normally
                                    else {
                                        processedConfig[key] = value;
                                    }
                                }

                                // Deep merge function to preserve nested objects and ColorPicker instances
                                function deepMerge(target, source) {
                                    const result = { ...target };
                                    for (const key in source) {
                                        // Special handling for ColorPicker objects - preserve them as-is
                                        if (source[key] && typeof source[key] === 'object' && typeof source[key].getColor === 'function') {
                                            result[key] = source[key]; // Preserve ColorPicker instance
                                        } else if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                                            result[key] = deepMerge(target[key] || {}, source[key]);
                                        } else {
                                            result[key] = source[key];
                                        }
                                    }
                                    return result;
                                }
                                // Merge with defaults, preserving complex types that weren't configured
                                const mergedConfig = deepMerge(defaultConfig, processedConfig);

                                configInstance = new ConfigClass(mergedConfig);
                            }
                        } catch (configError) {
                            console.warn(`Failed to import config class ${effect.effectClass.configClass}:`, configError);
                        }
                    }

                    console.log(`Creating LayerConfig for final effect ${effect.effectClass.name}:`, {
                        configInstance: configInstance,
                        hasConfig: configInstance !== null,
                        configKeys: configInstance ? Object.keys(configInstance) : []
                    });

                    const layerConfig = new LayerConfig({
                        name: effect.effectClass.name,
                        effect: EffectClass,
                        percentChance: effect.percentChance || 100,
                        currentEffectConfig: configInstance
                    });

                    console.log(`Created final LayerConfig:`, {
                        name: layerConfig.name,
                        hasCurrentEffectConfig: layerConfig.currentEffectConfig !== null,
                        configKeys: layerConfig.currentEffectConfig ? Object.keys(layerConfig.currentEffectConfig) : []
                    });

                    allFinalImageEffects.push(layerConfig);
                } catch (importError) {
                    console.error(`Failed to import effect ${effect.effectClass.name}:`, importError);
                }
            }
        }

        // Map resolution string to pixel dimensions - matches wizard options
        const resolutionMap = {
            'qvga': { width: 320, height: 240 },
            'vga': { width: 640, height: 480 },
            'svga': { width: 800, height: 600 },
            'xga': { width: 1024, height: 768 },
            'hd720': { width: 1280, height: 720 },
            'hd': { width: 1920, height: 1080 },
            'square_small': { width: 720, height: 720 },
            'square': { width: 1080, height: 1080 },
            'wqhd': { width: 2560, height: 1440 },
            '4k': { width: 3840, height: 2160 },
            '5k': { width: 5120, height: 2880 },
            '8k': { width: 7680, height: 4320 },
            'portrait_hd': { width: 1080, height: 1920 },
            'portrait_4k': { width: 2160, height: 3840 },
            'ultrawide': { width: 3440, height: 1440 },
            'cinema_2k': { width: 2048, height: 1080 },
            'cinema_4k': { width: 4096, height: 2160 }
        };

        // Determine orientation from resolution
        const resolution = resolutionMap[projectConfig.resolution] || resolutionMap['hd'];
        const isHorizontal = resolution.width > resolution.height;

        console.log('Project configuration:', {
            projectName: projectConfig.projectName,
            resolutionString: projectConfig.resolution,
            resolution: resolution,
            numberOfFrames: projectConfig.numberOfFrames,
            isHorizontal: isHorizontal,
            longestSide: Math.max(resolution.width, resolution.height),
            shortestSide: Math.min(resolution.width, resolution.height)
        });

        // Validate resolution values
        if (!resolution.width || !resolution.height || resolution.width <= 0 || resolution.height <= 0) {
            throw new Error(`Invalid resolution: width=${resolution.width}, height=${resolution.height}`);
        }

        // Define color schemes inline (since we can't import ES modules in Electron main process)
        const predefinedColorSchemes = {
            'neon-cyberpunk': {
                neutrals: ['#FFFFFF', '#CCCCCC', '#808080', '#333333'],
                backgrounds: ['#000000', '#0a0a0a', '#1a1a1a', '#111111'],
                lights: ['#00FFFF', '#FF00FF', '#FFFF00', '#FF0080', '#8000FF', '#00FF80'],
                description: 'Electric blues, magentas, and cyans for futuristic vibes'
            },
            'synthwave': {
                neutrals: ['#F8F8FF', '#E6E6FA', '#DDA0DD', '#9370DB'],
                backgrounds: ['#191970', '#301934', '#4B0082', '#2F2F4F'],
                lights: ['#FF1493', '#FF69B4', '#FF6347', '#00CED1', '#7FFF00', '#FFD700'],
                description: 'Retro 80s neon with deep purples and hot pinks'
            }
        };

        const colorSchemeData = predefinedColorSchemes[projectConfig.colorScheme] || predefinedColorSchemes['neon-cyberpunk'];

        // Create ColorScheme object with colorBucket from lights array
        const colorBucket = colorSchemeData.lights || ['#FFFF00', '#FF00FF', '#00FFFF', '#FF0000', '#00FF00', '#0000FF'];
        console.log('Creating ColorScheme with colorBucket:', colorBucket);
        const colorScheme = new ColorScheme({
            colorBucket: colorBucket,
            colorSchemeInfo: colorSchemeData.description || 'Custom color scheme'
        });
        console.log('Created ColorScheme:', colorScheme);


        // Initialize and start the project
        console.log('Passing colorScheme to Project constructor:', colorScheme);
        console.log('ColorScheme colorBucket before Project:', colorScheme.colorBucket);

        const project = new Project({
            projectName: projectConfig.projectName,
            colorScheme: colorScheme,
            neutrals: projectConfig.customColors?.neutrals || colorSchemeData.neutrals || ['#FFFFFF'],
            backgrounds: projectConfig.customColors?.backgrounds || colorSchemeData.backgrounds || ['#000000'],
            lights: projectConfig.customColors?.lights || colorSchemeData.lights || ['#FFFF00', '#FF00FF', '#00FFFF', '#FF0000', '#00FF00', '#0000FF'],
            numberOfFrame: projectConfig.numberOfFrames,
            longestSideInPixels: Math.max(resolution.width, resolution.height),
            shortestSideInPixels: Math.min(resolution.width, resolution.height),
            isHorizontal: isHorizontal,
            projectDirectory: projectConfig.projectDirectory,
            frameStart: 0
        });

        logger.section('Event System Setup');

        // Set up event forwarding from project's eventBus to renderer
        // Create a universal event forwarder using enhanced logger
        const forwardEventToRenderer = (eventName, data) => {
            logger.event(eventName, data);
            if (BrowserWindow.getAllWindows().length > 0) {
                BrowserWindow.getAllWindows()[0].webContents.send('worker-event', { eventName, data });
            }
        };

        // Listen to all worker events using the UnifiedEventBus method
        // This connects to the Project's internal event forwarding
        if (project.eventBus.subscribeToAllEvents) {
            logger.info('Setting up event forwarding using subscribeToAllEvents');
            project.eventBus.subscribeToAllEvents((enrichedData) => {
                // The subscribeToAllEvents passes an enrichedData object with eventName included
                const { eventName, ...data } = enrichedData;
                forwardEventToRenderer(eventName, data);
            });
        } else {
            logger.warn('subscribeToAllEvents not found, using fallback emit wrapping');
            // Fallback: wrap the emit method more carefully
            const originalEmit = project.eventBus.emit.bind(project.eventBus);
            project.eventBus.emit = function(eventName, ...args) {
                // Forward to renderer
                forwardEventToRenderer(eventName, args[0]);
                // Call original
                return originalEmit(eventName, ...args);
            };
        }

        logger.section('Adding Effects to Project');
        logger.info(`Adding ${allPrimaryEffects.length} primary effects and ${allFinalImageEffects.length} final effects`);
        logger.info('Color scheme configured', {
            colorBucket: colorScheme.colorBucket,
            neutrals: projectConfig.customColors?.neutrals || colorSchemeData.neutrals,
            backgrounds: projectConfig.customColors?.backgrounds || colorSchemeData.backgrounds,
            lights: projectConfig.customColors?.lights || colorSchemeData.lights
        });

        for(let i = 0; i < allPrimaryEffects.length; i++) {
            logger.progress(i + 1, allPrimaryEffects.length, `Adding primary effect: ${allPrimaryEffects[i].name} (${allPrimaryEffects[i].percentChance}% chance)`);
            project.addPrimaryEffect({ layerConfig: allPrimaryEffects[i] });
        }

        for(let i = 0; i < allFinalImageEffects.length; i++) {
            logger.progress(i + 1, allFinalImageEffects.length, `Adding final effect: ${allFinalImageEffects[i].name} (${allFinalImageEffects[i].percentChance}% chance)`);
            project.addFinalEffect({ layerConfig: allFinalImageEffects[i] });
        }

        // If no effects were added, warn
        if (allPrimaryEffects.length === 0 && allFinalImageEffects.length === 0) {
            console.warn('WARNING: No effects configured! Images will be blank.');
        }

        // Store project to keep it in scope for event forwarding
        const projectId = `${projectConfig.projectName}-${Date.now()}`;
        activeProjects.set(projectId, project);

        logger.section('Starting Generation Process');
        logger.success(`Project '${projectConfig.projectName}' initialized successfully!`);
        logger.info('Generation started - this may run for hours or days depending on settings');

        // Start generation without blocking (can run for days)
        project.generateRandomLoop()
            .then(() => {
                logger.success(`Generation completed for project ${projectId}`);
                // Clean up after completion
                activeProjects.delete(projectId);
            })
            .catch(error => {
                logger.error('Generation failed', error);
                // Send error event to renderer
                if (BrowserWindow.getAllWindows().length > 0) {
                    BrowserWindow.getAllWindows()[0].webContents.send('worker-event', {
                        eventName: 'GENERATION_ERROR',
                        data: { error: error.message, timestamp: new Date().toISOString() }
                    });
                }
                // Clean up after error
                activeProjects.delete(projectId);
            });

        return { success: true, message: 'Generation started successfully', projectId };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('resume-project', async (event, settingsPath) => {
    try {
        // Import my-nft-gen modules
        const { RequestNewWorkerThread } = await import('my-nft-gen/src/core/worker-threads/RequestNewWorkerThread.js');
        const { UnifiedEventBus } = await import('my-nft-gen/src/core/events/UnifiedEventBus.js');

        // Create event bus
        const eventBus = new UnifiedEventBus({
            enableDebug: false,
            enableMetrics: true,
            enableEventHistory: true
        });

        // Set up enhanced event forwarding for worker thread events
        const forwardEventToRenderer = (eventName, data) => {
            logger.event(eventName, data);
            if (BrowserWindow.getAllWindows().length > 0) {
                BrowserWindow.getAllWindows()[0].webContents.send('worker-event', { eventName, data });
            }
        };

        // Wrap the eventBus emit to use enhanced logging
        const originalEmit = eventBus.emit.bind(eventBus);
        eventBus.emit = function(eventName, data) {
            const result = originalEmit(eventName, data);
            forwardEventToRenderer(eventName, data);
            return result;
        };

        // Start worker thread
        await RequestNewWorkerThread(settingsPath, eventBus);

        return { success: true, metrics: eventBus.getMetrics() };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Effect Discovery IPC handlers
ipcMain.handle('discover-effects', async (event) => {
    try {
        console.log('Using registry-based effect discovery');

        // Load the effects into the registry first
        const { PluginLoader } = await import('my-nft-gen/src/core/plugins/PluginLoader.js');
        const { EffectRegistry } = await import('my-nft-gen/src/core/registry/EffectRegistry.js');

        console.log('Loading core effects into registry...');

        // Directly call the registration function with proper await
        const { registerCoreEffects } = await import('my-nft-gen/src/core/registry/CoreEffectsRegistration.js');
        await registerCoreEffects();

        console.log('Getting all registered effects from global registry...');
        const registeredEffects = EffectRegistry.getAllGlobal();

        console.log(`Found ${registeredEffects.length} registered effects`);

        const effects = { primary: [], secondary: [], keyFrame: [], final: [] };

        // Use the registry data directly - no import path construction
        for (const effectInfo of registeredEffects) {
            try {
                const { name, effectClass, category, metadata } = effectInfo;

                // Create effect data using the registry information (no complex objects for IPC)
                const effectData = {
                    name: name,
                    displayName: name.replace('Effect', '').replace(/([A-Z])/g, ' $1').trim() || name,
                    description: metadata?.description || `${name} effect`,
                    configClass: name.replace('Effect', 'Config'),
                    category: category
                };

                // Add to appropriate category
                const categoryKey = category || 'primary';
                if (effects[categoryKey]) {
                    effects[categoryKey].push(effectData);
                    console.log(`Added from registry: ${effectData.name} -> ${categoryKey}`);
                } else {
                    effects.primary.push(effectData);
                    console.log(`Added to primary (unknown category): ${effectData.name}`);
                }
            } catch (effectError) {
                console.warn(`Failed to process effect ${effectInfo.name}:`, effectError.message);
            }
        }

        console.log('=== DISCOVERED EFFECTS ===');
        Object.keys(effects).forEach(category => {
            console.log(`${category} effects:`, effects[category].length);
            effects[category].forEach(effect => {
                console.log(`  - ${effect.name} (${effect.displayName})`);
            });
        });

        return { success: true, effects };
    } catch (error) {
        console.error('Error discovering effects:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-effect-metadata', async (event, { effectName, category }) => {
    try {
        const { EffectDiscovery } = await import('my-nft-gen/src/core/discovery/EffectDiscovery.js');
        const metadata = await EffectDiscovery.getEffectMetadata(effectName, category);
        return { success: true, metadata };
    } catch (error) {
        console.error('Error getting effect metadata:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('validate-effect', async (event, effectMetadata) => {
    try {
        const { EffectDiscovery } = await import('my-nft-gen/src/core/discovery/EffectDiscovery.js');
        const isValid = await EffectDiscovery.validateEffect(effectMetadata);
        return { success: true, isValid };
    } catch (error) {
        console.error('Error validating effect:', error);
        return { success: false, error: error.message };
    }
});

// Effect Preview IPC handlers
ipcMain.handle('preview-effect', async (event, { effectClass, effectConfig, frameNumber = 0, totalFrames = 60, projectSettings = {} }) => {
    try {
        const { EffectPreviewRenderer } = await import('my-nft-gen/src/core/preview/EffectPreviewRenderer.js');

        // Validate effect class metadata
        if (!effectClass || !effectClass.name) {
            console.error('Invalid effect class metadata:', effectClass);
            return { success: false, error: 'Invalid effect class metadata. Missing required properties (name).' };
        }

        // Get effect and config classes from registry instead of dynamic imports
        const { EffectRegistry } = await import('my-nft-gen/src/core/registry/EffectRegistry.js');
        const { registerCoreEffects } = await import('my-nft-gen/src/core/registry/CoreEffectsRegistration.js');

        // Ensure effects are loaded
        await registerCoreEffects();

        // Get the effect class from registry
        const EffectClassConstructor = EffectRegistry.getGlobal(effectClass.name);

        if (!EffectClassConstructor) {
            throw new Error(`Effect class '${effectClass.name}' not found in registry`);
        }

        // Get the config class by creating a default instance and checking its constructor
        let ConfigClassConstructor, properEffectConfig;
        try {
            // Create a temporary instance to get the config class
            const tempEffect = new EffectClassConstructor({});
            ConfigClassConstructor = tempEffect.config.constructor;

            if (!ConfigClassConstructor) {
                throw new Error(`Could not determine config class for effect '${effectClass.name}'`);
            }

            // Import ColorPicker for color properties
            const { ColorPicker } = await import('my-nft-gen/src/core/layer/configType/ColorPicker.js');

            // Create proper config instance with user's configuration
            console.log('Creating config instance for preview-effect:', {
                configClass: effectClass.configClass,
                userConfig: effectConfig
            });

            // First create a default config to get all defaults
            let defaultConfig;
            try {
                defaultConfig = new ConfigClassConstructor({});
            } catch (configError) {
                console.error('Error creating config instance:', configError);
                // Try creating with explicit base class check
                if (configError.message.includes('EffectConfig') || configError.message.includes('initialization')) {
                    // Wait a bit and try again to allow module initialization to complete
                    await new Promise(resolve => setTimeout(resolve, 100));
                    try {
                        defaultConfig = new ConfigClassConstructor({});
                    } catch (retryError) {
                        console.error('Retry failed, falling back to simple config object');
                        // Fallback: create a simple config with user values
                        defaultConfig = effectConfig || {};
                    }
                } else {
                    throw configError;
                }
            }

            // Process user config to convert values to proper object types
            const processedConfig = {};
            for (const [key, value] of Object.entries(effectConfig)) {
                const keyLower = key.toLowerCase();

                // Import PercentageShortestSide/PercentageLongestSide/PercentageRange for preview processing
                const { PercentageShortestSide } = await import('my-nft-gen/src/core/layer/configType/PercentageShortestSide.js');
                const { PercentageLongestSide } = await import('my-nft-gen/src/core/layer/configType/PercentageLongestSide.js');
                const { PercentageRange } = await import('my-nft-gen/src/core/layer/configType/PercentageRange.js');

                // Check if this property was originally a PercentageShortestSide, PercentageLongestSide, or PercentageRange
                const originalValue = defaultConfig[key];
                if (originalValue && typeof originalValue === 'object') {
                    const originalClassName = originalValue.constructor?.name;
                    if (originalClassName === 'PercentageShortestSide' && typeof value === 'number') {
                        processedConfig[key] = new PercentageShortestSide(value);
                        continue;
                    } else if (originalClassName === 'PercentageLongestSide' && typeof value === 'number') {
                        processedConfig[key] = new PercentageLongestSide(value);
                        continue;
                    } else if (originalClassName === 'PercentageRange' && value && typeof value === 'object' &&
                               typeof value.lower !== 'undefined' && typeof value.upper !== 'undefined') {
                        try {
                            let lowerSideInstance, upperSideInstance;

                            // Handle new enhanced format {lower: {percent: 0.1, side: 'shortest'}, upper: {percent: 0.9, side: 'longest'}}
                            if (value.lower && typeof value.lower === 'object' && value.lower.percent !== undefined) {
                                const lowerPercent = value.lower.percent;
                                const lowerSide = value.lower.side || 'shortest';
                                lowerSideInstance = lowerSide === 'longest'
                                    ? new PercentageLongestSide(lowerPercent)
                                    : new PercentageShortestSide(lowerPercent);
                            } else {
                                // Legacy format - assume shortest side for lower bound
                                lowerSideInstance = new PercentageShortestSide(typeof value.lower === 'number' ? value.lower : 0.1);
                            }

                            if (value.upper && typeof value.upper === 'object' && value.upper.percent !== undefined) {
                                const upperPercent = value.upper.percent;
                                const upperSide = value.upper.side || 'longest';
                                upperSideInstance = upperSide === 'longest'
                                    ? new PercentageLongestSide(upperPercent)
                                    : new PercentageShortestSide(upperPercent);
                            } else {
                                // Legacy format - assume longest side for upper bound
                                upperSideInstance = new PercentageLongestSide(typeof value.upper === 'number' ? value.upper : 0.9);
                            }

                            const testRange = new PercentageRange(lowerSideInstance, upperSideInstance);
                            // Verify the PercentageRange was created properly (without calling the functions)
                            if (typeof testRange.lower === 'function' && typeof testRange.upper === 'function') {
                                processedConfig[key] = testRange;
                                console.log(`Successfully created enhanced PercentageRange for ${key}:`, processedConfig[key]);
                            } else {
                                throw new Error('PercentageRange created but properties are not functions');
                            }
                        } catch (rangeError) {
                            console.warn(`Error creating PercentageRange for ${key}:`, rangeError);
                            // Fallback to simple range
                            const lowerVal = typeof value.lower === 'object' ? value.lower.percent || 0.1 : (typeof value.lower === 'number' ? value.lower : 0.1);
                            const upperVal = typeof value.upper === 'object' ? value.upper.percent || 0.9 : (typeof value.upper === 'number' ? value.upper : 0.9);
                            processedConfig[key] = {
                                lower: function() { return lowerVal; },
                                upper: function() { return upperVal; }
                            };
                            console.log(`Created fallback PercentageRange for ${key}:`, processedConfig[key]);
                        }
                        continue;
                    }
                }

                if (keyLower.includes('color') || keyLower.includes('colour')) {
                    if (typeof value === 'string') {
                        // Simple string color value
                        processedConfig[key] = new ColorPicker(ColorPicker.SelectionType.color, value);
                    } else if (value && typeof value === 'object' && value.selectionType) {
                        // Object from ColorPickerInput with selectionType
                        const selectionTypeMap = {
                            'color': ColorPicker.SelectionType.color,
                            'colorBucket': ColorPicker.SelectionType.colorBucket,
                            'neutralBucket': ColorPicker.SelectionType.neutralBucket
                        };
                        const mappedType = selectionTypeMap[value.selectionType] || ColorPicker.SelectionType.colorBucket;
                        // For colorBucket and neutralBucket types, colorValue should be null so they use Settings methods
                        const colorValue = (mappedType === ColorPicker.SelectionType.colorBucket || mappedType === ColorPicker.SelectionType.neutralBucket)
                            ? null
                            : (value.colorValue || '#ff0000');
                        processedConfig[key] = new ColorPicker(mappedType, colorValue);
                    } else if (value !== undefined && value !== null) {
                        // Only override if the user actually provided a value, default to color bucket
                        processedConfig[key] = new ColorPicker(ColorPicker.SelectionType.colorBucket, null);
                    }
                    // If no valid value provided, preserve the default from defaultConfig
                } else {
                    processedConfig[key] = value;
                }
            }

            // Deep merge function to preserve nested objects and ColorPicker instances
            function deepMerge(target, source) {
                const result = { ...target };
                for (const key in source) {
                    // Special handling for ColorPicker objects - preserve them as-is
                    if (source[key] && typeof source[key] === 'object' && typeof source[key].getColor === 'function') {
                        result[key] = source[key]; // Preserve ColorPicker instance
                    } else if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        if (target[key] && typeof target[key] === 'object') {
                            result[key] = deepMerge(target[key], source[key]);
                        } else {
                            result[key] = source[key];
                        }
                    } else {
                        result[key] = source[key];
                    }
                }
                return result;
            }

            const mergedConfig = deepMerge(defaultConfig, processedConfig);
            properEffectConfig = new ConfigClassConstructor(mergedConfig);

            console.log('Created config instance for preview-effect:', properEffectConfig);
        } catch (importError) {
            console.error('Error importing effect/config class:', importError);
            return { success: false, error: `Cannot import effect '${effectClass.name}' or config '${effectClass.configClass}': ${importError.message}` };
        }

        console.log('Calling EffectPreviewRenderer.renderSingleEffect with:', {
            effectClass: EffectClassConstructor.name,
            effectConfig: typeof properEffectConfig,
            frameNumber,
            totalFrames
        });

        // Use the color scheme data from the frontend (EffectPreview.jsx)
        // Use project resolution instead of hardcoded dimensions
        const enhancedProjectSettings = {
            width: projectSettings.width || 1920,
            height: projectSettings.height || 1080,
            isHorizontal: projectSettings.isHorizontal,
            colorScheme: projectSettings.colorScheme || {
                colorBucket: ['#00FFFF', '#FF00FF', '#FFFF00', '#FF0080', '#8000FF', '#00FF80'],
                colorSchemeInfo: 'Default preview color scheme'
            },
            neutrals: projectSettings.neutrals || ['#FFFFFF'],
            backgrounds: projectSettings.backgrounds || ['#000000'],
            lights: projectSettings.lights || ['#FFFF00', '#FF00FF', '#00FFFF', '#FF0000', '#00FF00', '#0000FF'],
            ...projectSettings // Allow other settings to override
        };

        const buffer = await EffectPreviewRenderer.renderSingleEffect({
            effectClass: EffectClassConstructor,
            effectConfig: properEffectConfig,
            frameNumber,
            totalFrames,
            projectSettings: enhancedProjectSettings
        });

        // Convert buffer to base64 for transmission
        const base64 = buffer.toString('base64');
        return { success: true, imageData: `data:image/png;base64,${base64}` };
    } catch (error) {
        console.error('Effect preview error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('preview-effect-thumbnail', async (event, { effectClass, effectConfig, frameNumber = 0, totalFrames = 60, projectSettings = {}, thumbnailSize = 200 }) => {
    try {
        const { EffectPreviewRenderer } = await import('my-nft-gen/src/core/preview/EffectPreviewRenderer.js');

        // Validate effect class metadata
        if (!effectClass || !effectClass.name) {
            console.error('Invalid effect class metadata:', effectClass);
            return { success: false, error: 'Invalid effect class metadata. Missing required properties (name).' };
        }

        // Get effect and config classes from registry instead of dynamic imports
        const { EffectRegistry } = await import('my-nft-gen/src/core/registry/EffectRegistry.js');
        const { registerCoreEffects } = await import('my-nft-gen/src/core/registry/CoreEffectsRegistration.js');

        // Ensure effects are loaded
        await registerCoreEffects();

        // Get the effect class from registry
        const EffectClassConstructor = EffectRegistry.getGlobal(effectClass.name);

        if (!EffectClassConstructor) {
            throw new Error(`Effect class '${effectClass.name}' not found in registry`);
        }

        // Get the config class by creating a default instance and checking its constructor
        let ConfigClassConstructor, properEffectConfig;
        try {
            // Create a temporary instance to get the config class
            const tempEffect = new EffectClassConstructor({});
            ConfigClassConstructor = tempEffect.config.constructor;

            if (!ConfigClassConstructor) {
                throw new Error(`Could not determine config class for effect '${effectClass.name}'`);
            }

            // Import ColorPicker for color properties
            const { ColorPicker } = await import('my-nft-gen/src/core/layer/configType/ColorPicker.js');

            // Create proper config instance with user's configuration
            console.log('Creating config instance for thumbnail:', {
                configClass: effectClass.configClass,
                userConfig: effectConfig
            });

            // First create a default config to get all defaults
            let defaultConfig;
            try {
                defaultConfig = new ConfigClassConstructor({});
            } catch (configError) {
                console.error('Error creating config instance:', configError);
                // Try creating with explicit base class check
                if (configError.message.includes('EffectConfig') || configError.message.includes('initialization')) {
                    // Wait a bit and try again to allow module initialization to complete
                    await new Promise(resolve => setTimeout(resolve, 100));
                    try {
                        defaultConfig = new ConfigClassConstructor({});
                    } catch (retryError) {
                        console.error('Retry failed, falling back to simple config object');
                        // Fallback: create a simple config with user values
                        defaultConfig = effectConfig || {};
                    }
                } else {
                    throw configError;
                }
            }

            // Process user config to convert values to proper object types
            const processedConfig = {};
            for (const [key, value] of Object.entries(effectConfig)) {
                const keyLower = key.toLowerCase();

                // Import PercentageShortestSide/PercentageLongestSide/PercentageRange for preview processing
                const { PercentageShortestSide } = await import('my-nft-gen/src/core/layer/configType/PercentageShortestSide.js');
                const { PercentageLongestSide } = await import('my-nft-gen/src/core/layer/configType/PercentageLongestSide.js');
                const { PercentageRange } = await import('my-nft-gen/src/core/layer/configType/PercentageRange.js');

                // Check if this property was originally a PercentageShortestSide, PercentageLongestSide, or PercentageRange
                const originalValue = defaultConfig[key];
                if (originalValue && typeof originalValue === 'object') {
                    const originalClassName = originalValue.constructor?.name;
                    if (originalClassName === 'PercentageShortestSide' && typeof value === 'number') {
                        processedConfig[key] = new PercentageShortestSide(value);
                        continue;
                    } else if (originalClassName === 'PercentageLongestSide' && typeof value === 'number') {
                        processedConfig[key] = new PercentageLongestSide(value);
                        continue;
                    } else if (originalClassName === 'PercentageRange' && value && typeof value === 'object' &&
                               typeof value.lower !== 'undefined' && typeof value.upper !== 'undefined') {
                        try {
                            let lowerSideInstance, upperSideInstance;

                            // Handle new enhanced format {lower: {percent: 0.1, side: 'shortest'}, upper: {percent: 0.9, side: 'longest'}}
                            if (value.lower && typeof value.lower === 'object' && value.lower.percent !== undefined) {
                                const lowerPercent = value.lower.percent;
                                const lowerSide = value.lower.side || 'shortest';
                                lowerSideInstance = lowerSide === 'longest'
                                    ? new PercentageLongestSide(lowerPercent)
                                    : new PercentageShortestSide(lowerPercent);
                            } else {
                                // Legacy format - assume shortest side for lower bound
                                lowerSideInstance = new PercentageShortestSide(typeof value.lower === 'number' ? value.lower : 0.1);
                            }

                            if (value.upper && typeof value.upper === 'object' && value.upper.percent !== undefined) {
                                const upperPercent = value.upper.percent;
                                const upperSide = value.upper.side || 'longest';
                                upperSideInstance = upperSide === 'longest'
                                    ? new PercentageLongestSide(upperPercent)
                                    : new PercentageShortestSide(upperPercent);
                            } else {
                                // Legacy format - assume longest side for upper bound
                                upperSideInstance = new PercentageLongestSide(typeof value.upper === 'number' ? value.upper : 0.9);
                            }

                            const testRange = new PercentageRange(lowerSideInstance, upperSideInstance);
                            // Verify the PercentageRange was created properly (without calling the functions)
                            if (typeof testRange.lower === 'function' && typeof testRange.upper === 'function') {
                                processedConfig[key] = testRange;
                                console.log(`Successfully created enhanced PercentageRange for ${key}:`, processedConfig[key]);
                            } else {
                                throw new Error('PercentageRange created but properties are not functions');
                            }
                        } catch (rangeError) {
                            console.warn(`Error creating PercentageRange for ${key}:`, rangeError);
                            // Fallback to simple range
                            const lowerVal = typeof value.lower === 'object' ? value.lower.percent || 0.1 : (typeof value.lower === 'number' ? value.lower : 0.1);
                            const upperVal = typeof value.upper === 'object' ? value.upper.percent || 0.9 : (typeof value.upper === 'number' ? value.upper : 0.9);
                            processedConfig[key] = {
                                lower: function() { return lowerVal; },
                                upper: function() { return upperVal; }
                            };
                            console.log(`Created fallback PercentageRange for ${key}:`, processedConfig[key]);
                        }
                        continue;
                    }
                }

                if (keyLower.includes('color') || keyLower.includes('colour')) {
                    if (typeof value === 'string') {
                        // Simple string color value
                        processedConfig[key] = new ColorPicker(ColorPicker.SelectionType.color, value);
                    } else if (value && typeof value === 'object' && value.selectionType) {
                        // Object from ColorPickerInput with selectionType
                        const selectionTypeMap = {
                            'color': ColorPicker.SelectionType.color,
                            'colorBucket': ColorPicker.SelectionType.colorBucket,
                            'neutralBucket': ColorPicker.SelectionType.neutralBucket
                        };
                        const mappedType = selectionTypeMap[value.selectionType] || ColorPicker.SelectionType.colorBucket;
                        // For colorBucket and neutralBucket types, colorValue should be null so they use Settings methods
                        const colorValue = (mappedType === ColorPicker.SelectionType.colorBucket || mappedType === ColorPicker.SelectionType.neutralBucket)
                            ? null
                            : (value.colorValue || '#ff0000');
                        processedConfig[key] = new ColorPicker(mappedType, colorValue);
                    } else if (value !== undefined && value !== null) {
                        // Only override if the user actually provided a value, default to color bucket
                        processedConfig[key] = new ColorPicker(ColorPicker.SelectionType.colorBucket, null);
                    }
                    // If no valid value provided, preserve the default from defaultConfig
                } else {
                    processedConfig[key] = value;
                }
            }

            // Deep merge function to preserve nested objects and ColorPicker instances
            function deepMerge(target, source) {
                const result = { ...target };
                for (const key in source) {
                    // Special handling for ColorPicker objects - preserve them as-is
                    if (source[key] && typeof source[key] === 'object' && typeof source[key].getColor === 'function') {
                        result[key] = source[key]; // Preserve ColorPicker instance
                    } else if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        if (target[key] && typeof target[key] === 'object') {
                            result[key] = deepMerge(target[key], source[key]);
                        } else {
                            result[key] = source[key];
                        }
                    } else {
                        result[key] = source[key];
                    }
                }
                return result;
            }

            const mergedConfig = deepMerge(defaultConfig, processedConfig);
            properEffectConfig = new ConfigClassConstructor(mergedConfig);

            console.log('Created config instance for thumbnail:', properEffectConfig);
        } catch (importError) {
            console.error('Error importing effect/config class:', importError);
            return { success: false, error: `Cannot import effect '${effectClass.name}' or config '${effectClass.configClass}': ${importError.message}` };
        }

        // Use the color scheme data from the frontend (EffectPreview.jsx)
        // Use project resolution instead of forcing square thumbnails
        const projectWidth = projectSettings.width || 1920;
        const projectHeight = projectSettings.height || 1080;

        // Scale the resolution down to fit within thumbnail size while maintaining aspect ratio
        const aspectRatio = projectWidth / projectHeight;
        let renderWidth, renderHeight;

        if (aspectRatio > 1) {
            // Landscape - constrain width
            renderWidth = thumbnailSize;
            renderHeight = Math.round(thumbnailSize / aspectRatio);
        } else {
            // Portrait or square - constrain height
            renderHeight = thumbnailSize;
            renderWidth = Math.round(thumbnailSize * aspectRatio);
        }

        const enhancedProjectSettings = {
            width: renderWidth,
            height: renderHeight,
            isHorizontal: projectSettings.isHorizontal,
            colorScheme: projectSettings.colorScheme || {
                colorBucket: ['#00FFFF', '#FF00FF', '#FFFF00', '#FF0080', '#8000FF', '#00FF80'],
                colorSchemeInfo: 'Default preview color scheme'
            },
            neutrals: projectSettings.neutrals || ['#FFFFFF'],
            backgrounds: projectSettings.backgrounds || ['#000000'],
            lights: projectSettings.lights || ['#FFFF00', '#FF00FF', '#00FFFF', '#FF0000', '#00FF00', '#0000FF'],
            ...projectSettings // Allow other settings to override
        };

        const buffer = await EffectPreviewRenderer.renderThumbnail({
            effectClass: EffectClassConstructor,
            effectConfig: properEffectConfig,
            frameNumber,
            totalFrames,
            projectSettings: enhancedProjectSettings,
            thumbnailSize
        });

        // Convert buffer to base64 for transmission
        const base64 = buffer.toString('base64');
        return { success: true, imageData: `data:image/png;base64,${base64}` };
    } catch (error) {
        console.error('Effect thumbnail preview error:', error);
        return { success: false, error: error.message };
    }
});

// Frame Viewing IPC handlers
ipcMain.handle('read-frame-image', async (event, framePath) => {
    try {
        // Read the frame file as a buffer
        const buffer = await fs.readFile(framePath);

        // Convert to base64 for transmission
        const base64 = buffer.toString('base64');
        const imageData = `data:image/png;base64,${base64}`;

        return { success: true, imageData };
    } catch (error) {
        console.error('Error reading frame:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('list-completed-frames', async (event, projectDirectory) => {
    try {
        const frameFiles = [];
        const files = await fs.readdir(projectDirectory);

        // Filter for PNG frame files and sort them
        const pngFiles = files
            .filter(file => file.endsWith('.png') && file.includes('frame'))
            .sort((a, b) => {
                // Extract frame numbers for proper sorting
                const frameA = parseInt(a.match(/frame[-_]?(\d+)/i)?.[1] || '0');
                const frameB = parseInt(b.match(/frame[-_]?(\d+)/i)?.[1] || '0');
                return frameA - frameB;
            });

        for (const file of pngFiles) {
            const filePath = path.join(projectDirectory, file);
            try {
                const stats = await fs.stat(filePath);
                frameFiles.push({
                    filename: file,
                    path: filePath,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    frameNumber: parseInt(file.match(/frame[-_]?(\d+)/i)?.[1] || '0')
                });
            } catch (statError) {
                console.warn('Error reading file stats for', file, statError);
            }
        }

        return { success: true, frames: frameFiles };
    } catch (error) {
        console.error('Error listing frames:', error);
        return { success: false, error: error.message };
    }
});

/**
 * Apply Point2D center override based on project resolution
 * @param {Object} config - The config object to modify
 * @param {Object} projectData - Project data containing resolution info
 */
function applyPoint2DCenterOverride(config, projectData) {
    if (!projectData?.resolution) {
        return;
    }

    // Resolution mapping - same as frontend
    const resolutions = {
        'qvga': { width: 320, height: 240 },
        'vga': { width: 640, height: 480 },
        'svga': { width: 800, height: 600 },
        'xga': { width: 1024, height: 768 },
        'hd720': { width: 1280, height: 720 },
        'hd': { width: 1920, height: 1080 },
        'square_small': { width: 720, height: 720 },
        'square': { width: 1080, height: 1080 },
        'wqhd': { width: 2560, height: 1440 },
        '4k': { width: 3840, height: 2160 },
        '5k': { width: 5120, height: 2880 },
        '8k': { width: 7680, height: 4320 },
        'portrait_hd': { width: 1080, height: 1920 },
        'portrait_4k': { width: 2160, height: 3840 },
        'ultrawide': { width: 3440, height: 1440 },
        'cinema_2k': { width: 2048, height: 1080 },
        'cinema_4k': { width: 4096, height: 2160 }
    };

    const baseResolution = resolutions[projectData.resolution] || resolutions.hd;

    // Apply isHoz setting - same logic as frontend
    const autoIsHoz = baseResolution.width > baseResolution.height;
    const isHoz = projectData?.isHoz !== null ? projectData.isHoz : autoIsHoz;

    // Determine actual dimensions based on orientation setting
    let width, height;
    if (isHoz) {
        width = baseResolution.width;
        height = baseResolution.height;
    } else {
        width = baseResolution.height;
        height = baseResolution.width;
    }

    const projectCenter = {
        x: width / 2,
        y: height / 2
    };

    // Find and override Point2D properties that look like center points
    for (const [key, value] of Object.entries(config)) {
        if (value && typeof value === 'object' &&
            typeof value.x === 'number' && typeof value.y === 'number') {

            // Check if this looks like a center property
            const isCenter = key.toLowerCase().includes('center') ||
                           key.toLowerCase().includes('position') ||
                           key.toLowerCase().includes('point');

            if (isCenter) {
                console.log(`Backend: Overriding Point2D ${key} from {x: ${value.x}, y: ${value.y}} to {x: ${projectCenter.x}, y: ${projectCenter.y}}`);
                config[key] = projectCenter;
            }
        }
    }
}

// Config Introspection IPC handler
ipcMain.handle('introspect-config', async (event, { effectName, projectData }) => {
    try {
        console.log(`=== CONFIG INTROSPECTION ===`);
        console.log(`Getting config for effect: ${effectName}`);

        // Get effect and config classes from registry instead of imports
        const { EffectRegistry } = await import('my-nft-gen/src/core/registry/EffectRegistry.js');
        const { registerCoreEffects } = await import('my-nft-gen/src/core/registry/CoreEffectsRegistration.js');

        // Ensure effects are loaded
        await registerCoreEffects();

        // Get the effect class from registry
        const EffectClassConstructor = EffectRegistry.getGlobal(effectName);

        if (!EffectClassConstructor) {
            throw new Error(`Effect class '${effectName}' not found in registry`);
        }

        // Get the config class by creating a default instance and checking its constructor
        const tempEffect = new EffectClassConstructor({});
        const ConfigClass = tempEffect.config.constructor;

        if (!ConfigClass) {
            throw new Error(`Could not determine config class for effect '${effectName}'`);
        }

        console.log(`Found config class: ${ConfigClass.name} for effect: ${effectName}`);

        // Create an instance to introspect its properties
        console.log(`Creating instance of ${ConfigClass.name}...`);

        // Create instance like the effects do: new ConfigClass({})
        // This triggers destructuring defaults properly
        const instance = new ConfigClass({});
        console.log(`Instance created with empty object (triggers destructured defaults):`, instance);
        console.log(`Instance properties:`, Object.getOwnPropertyNames(instance).sort());

        console.log(`Created ${ConfigClass.name} instance with ${Object.keys(instance).length} properties:`, Object.keys(instance));

        // Extract ALL properties (own + inherited + prototype)
        const properties = {};
        const allKeys = new Set();

        // Get own properties (enumerable and non-enumerable)
        Object.getOwnPropertyNames(instance).forEach(key => allKeys.add(key));

        // Get inherited properties from prototype chain
        let proto = Object.getPrototypeOf(instance);
        while (proto && proto !== Object.prototype) {
            Object.getOwnPropertyNames(proto).forEach(key => {
                if (key !== 'constructor') allKeys.add(key);
            });
            proto = Object.getPrototypeOf(proto);
        }

        // Get enumerable properties (for good measure)
        for (const key in instance) {
            allKeys.add(key);
        }

        console.log(`Found ${allKeys.size} total properties (own + inherited):`, Array.from(allKeys).sort());

        // Also log the instance structure
        console.log('Instance structure:', instance);
        console.log('Instance prototype:', Object.getPrototypeOf(instance).constructor.name);

        for (const key of allKeys) {
            try {
                const value = instance[key];
                const type = typeof value;

                // Skip common prototype methods but keep actual properties
                if (type === 'function' &&
                    (key === 'constructor' || key.startsWith('__') ||
                     ['toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable'].includes(key))) {
                    continue;
                }

                let className = null;
                if (value && typeof value === 'object' && value.constructor) {
                    className = value.constructor.name;
                }

                // Make sure the value is serializable
                let serializableValue = value;

                // Special handling for known object types (outside try-catch to avoid fallback to [Object])
                if (className === 'PercentageShortestSide' || className === 'PercentageLongestSide') {
                    // Extract only the percent value, not the function
                    serializableValue = value.percent || 0;
                } else if (className === 'PercentageRange') {
                    // Enhanced handling for PercentageRange - provide field-specific defaults
                    try {
                        // Field-specific defaults based on the actual FuzzFlareConfig
                        const fieldDefaults = {
                            'flareOffset': {
                                lower: { percent: 0.01, side: 'shortest' },
                                upper: { percent: 0.06, side: 'shortest' }
                            },
                            'flareRingsSizeRange': {
                                lower: { percent: 0.05, side: 'shortest' },
                                upper: { percent: 1.0, side: 'longest' }
                            },
                            'flareRaysSizeRange': {
                                lower: { percent: 0.7, side: 'longest' },
                                upper: { percent: 1.0, side: 'longest' }
                            }
                        };

                        // Use field-specific defaults if available
                        if (fieldDefaults[key]) {
                            serializableValue = fieldDefaults[key];
                        } else {
                            // Generic PercentageRange default
                            serializableValue = {
                                lower: { percent: 0.1, side: 'shortest' },
                                upper: { percent: 0.9, side: 'longest' }
                            };
                        }
                    } catch (rangeError) {
                        console.warn(`Error extracting PercentageRange values for ${key}:`, rangeError);
                        serializableValue = {
                            lower: { percent: 0.1, side: 'shortest' },
                            upper: { percent: 0.9, side: 'longest' }
                        };
                    }
                } else {
                    // Test if value can be serialized for other types
                    try {
                        JSON.stringify(value);
                    } catch (e) {
                        // If not serializable, convert to string representation
                        if (type === 'object') {
                            serializableValue = '[Object]';
                        } else if (type === 'function') {
                            serializableValue = '[Function]';
                        } else {
                            serializableValue = String(value);
                        }
                    }
                }

                properties[key] = {
                    type,
                    value: serializableValue,
                    className
                };

                console.log(`Property ${key}: ${type} = `, value);
            } catch (error) {
                console.warn(`Could not access property ${key}:`, error.message);
                properties[key] = {
                    type: 'inaccessible',
                    value: '[Inaccessible]',
                    className: null
                };
            }
        }

        console.log(`Captured ${Object.keys(properties).length} properties for UI generation`);

        // Create a serializable version of the default instance
        const serializableInstance = {};
        for (const [key, prop] of Object.entries(properties)) {
            if (prop.type !== 'function' && prop.type !== 'inaccessible') {
                try {
                    // Test if the value can be JSON serialized
                    JSON.stringify(prop.value);

                    // Preserve className information for PercentageRange objects
                    if (prop.className === 'PercentageRange') {
                        // Create an object that preserves the className for the config introspector
                        serializableInstance[key] = {
                            ...prop.value,
                            __className: 'PercentageRange'
                        };
                    } else {
                        serializableInstance[key] = prop.value;
                    }
                } catch (e) {
                    console.warn(`Skipping non-serializable property ${key}:`, e.message);
                    // Skip non-serializable values
                }
            }
        }

        console.log(`Created serializable instance with ${Object.keys(serializableInstance).length} properties`);

        // Override Point2D center properties with project resolution center if projectData is available
        if (projectData && projectData.resolution) {
            console.log(`Applying Point2D center override for project resolution: ${projectData.resolution}`);
            applyPoint2DCenterOverride(serializableInstance, projectData);
        }

        // Ensure everything is fully serializable by round-tripping through JSON
        try {
            const fullySerializable = JSON.parse(JSON.stringify({
                success: true,
                properties,
                defaultInstance: serializableInstance
            }));
            return fullySerializable;
        } catch (serializeError) {
            console.error('Failed to serialize result:', serializeError);
            // Return a minimal fallback
            return {
                success: true,
                properties: {},
                defaultInstance: {}
            };
        }
    } catch (error) {
        console.error('Error introspecting config:', error);
        return { success: false, error: error.message };
    }
});
