// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const fs = require('fs').promises

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

        // Set up event forwarding to renderer
        const originalEmit = eventBus.emit;
        eventBus.emit = function(eventName, data) {
            const result = originalEmit.apply(this, arguments);
            // Forward events to renderer process
            if (BrowserWindow.getAllWindows().length > 0) {
                BrowserWindow.getAllWindows()[0].webContents.send('worker-event', { eventName, data });
            }
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
        const { EffectDiscovery } = await import('my-nft-gen/src/core/discovery/EffectDiscovery.js');
        const effects = await EffectDiscovery.discoverAvailableEffects();
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
        if (!effectClass || !effectClass.effectFile || !effectClass.name || !effectClass.configModule || !effectClass.configClass) {
            console.error('Invalid effect class metadata:', effectClass);
            return { success: false, error: 'Invalid effect class metadata. Missing required properties (effectFile, name, configModule, configClass).' };
        }

        // Dynamically import the effect class and config class
        let EffectClassConstructor, ConfigClassConstructor, properEffectConfig;
        try {
            const effectModule = await import(effectClass.effectFile);
            EffectClassConstructor = effectModule[effectClass.name];

            if (!EffectClassConstructor) {
                throw new Error(`Effect class '${effectClass.name}' not found in module '${effectClass.effectFile}'`);
            }

            // Also import the config class to properly instantiate it
            const configModule = await import(effectClass.configModule);
            ConfigClassConstructor = configModule[effectClass.configClass];

            if (!ConfigClassConstructor) {
                throw new Error(`Config class '${effectClass.configClass}' not found in module '${effectClass.configModule}'`);
            }

            // Create proper config instance with user's configuration
            console.log('Creating config instance for preview-effect:', {
                configClass: effectClass.configClass,
                userConfig: effectConfig
            });

            // First create a default config to get all defaults, then deep merge with user config
            const defaultConfig = new ConfigClassConstructor({});

            // Deep merge function to preserve nested objects
            function deepMerge(target, source) {
                const result = { ...target };
                for (const key in source) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
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

            const mergedConfig = deepMerge(defaultConfig, effectConfig);
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

        const buffer = await EffectPreviewRenderer.renderSingleEffect({
            effectClass: EffectClassConstructor,
            effectConfig: properEffectConfig,
            frameNumber,
            totalFrames,
            projectSettings
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
        if (!effectClass || !effectClass.effectFile || !effectClass.name || !effectClass.configModule || !effectClass.configClass) {
            console.error('Invalid effect class metadata:', effectClass);
            return { success: false, error: 'Invalid effect class metadata. Missing required properties (effectFile, name, configModule, configClass).' };
        }

        // Dynamically import the effect class and config class
        let EffectClassConstructor, ConfigClassConstructor, properEffectConfig;
        try {
            const effectModule = await import(effectClass.effectFile);
            EffectClassConstructor = effectModule[effectClass.name];

            if (!EffectClassConstructor) {
                throw new Error(`Effect class '${effectClass.name}' not found in module '${effectClass.effectFile}'`);
            }

            // Also import the config class to properly instantiate it
            const configModule = await import(effectClass.configModule);
            ConfigClassConstructor = configModule[effectClass.configClass];

            if (!ConfigClassConstructor) {
                throw new Error(`Config class '${effectClass.configClass}' not found in module '${effectClass.configModule}'`);
            }

            // Create proper config instance with user's configuration
            console.log('Creating config instance for thumbnail:', {
                configClass: effectClass.configClass,
                userConfig: effectConfig
            });

            // First create a default config to get all defaults, then deep merge with user config
            const defaultConfig = new ConfigClassConstructor({});

            // Deep merge function to preserve nested objects
            function deepMerge(target, source) {
                const result = { ...target };
                for (const key in source) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
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

            const mergedConfig = deepMerge(defaultConfig, effectConfig);
            properEffectConfig = new ConfigClassConstructor(mergedConfig);

            console.log('Created config instance for thumbnail:', properEffectConfig);
        } catch (importError) {
            console.error('Error importing effect/config class:', importError);
            return { success: false, error: `Cannot import effect '${effectClass.name}' or config '${effectClass.configClass}': ${importError.message}` };
        }

        const buffer = await EffectPreviewRenderer.renderThumbnail({
            effectClass: EffectClassConstructor,
            effectConfig: properEffectConfig,
            frameNumber,
            totalFrames,
            projectSettings,
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

// Config Introspection IPC handler
ipcMain.handle('introspect-config', async (event, { configModule, configClass }) => {
    try {
        // Dynamically import the config module
        const module = await import(configModule);
        const ConfigClass = module[configClass];

        if (!ConfigClass) {
            throw new Error(`Config class ${configClass} not found in module ${configModule}`);
        }

        // Create an instance to introspect its properties
        // Many config classes use destructuring parameters, so provide an empty object
        const instance = new ConfigClass({});

        // Extract all enumerable properties
        const properties = {};

        for (const key of Object.keys(instance)) {
            const value = instance[key];
            const type = typeof value;

            let className = null;
            if (value && typeof value === 'object' && value.constructor) {
                className = value.constructor.name;
            }

            properties[key] = {
                type,
                value,
                className
            };
        }

        // Also return the complete default instance for initialization
        return {
            success: true,
            properties,
            defaultInstance: instance
        };
    } catch (error) {
        console.error('Error introspecting config:', error);
        return { success: false, error: error.message };
    }
});
