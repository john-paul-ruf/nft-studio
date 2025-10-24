const { contextBridge, ipcRenderer } = require('electron');

// Debug: Log ALL IPC messages on worker-event channel
ipcRenderer.on('worker-event', (event, data) => {
    console.log('🔍 [Preload RAW] IPC worker-event received:', data?.eventName || 'unknown');
});

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
    // File system operations
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    selectFile: (options) => ipcRenderer.invoke('select-file', options),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
    checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
    listCompletedFrames: (projectDirectory) => ipcRenderer.invoke('list-completed-frames', projectDirectory),
    readFrameImage: (framePath) => ipcRenderer.invoke('read-frame-image', framePath),

    // Project management
    startNewProject: (config) => ipcRenderer.invoke('start-new-project', config),
    createProject: (config) => ipcRenderer.invoke('create-project', config),
    resumeProject: (settingsPath) => ipcRenderer.invoke('resume-project', settingsPath),
    importFromSettings: (settingsPath) => ipcRenderer.invoke('import-from-settings', settingsPath),
    loadProject: (filePath) => ipcRenderer.invoke('load-project', filePath),
    saveProject: (filePath, config) => ipcRenderer.invoke('save-project', filePath, config),
    renderFrame: (config, frameNumber, settingsFile = null) => ipcRenderer.invoke('render-frame', config, frameNumber, settingsFile),

    // Project persistence
    saveProjectFile: (filePath, projectData) => ipcRenderer.invoke('save-project-file', filePath, projectData),
    loadProjectFile: (filePath) => ipcRenderer.invoke('load-project-file', filePath),
    projectFileExists: (filePath) => ipcRenderer.invoke('project-file-exists', filePath),
    generateProjectPath: (projectDirectory, projectName) => ipcRenderer.invoke('generate-project-path', projectDirectory, projectName),
    getDirname: (filePath) => ipcRenderer.invoke('get-dirname', filePath),
    joinPaths: (...pathSegments) => ipcRenderer.invoke('join-paths', ...pathSegments),

    // Effect management
    discoverEffects: () => ipcRenderer.invoke('discover-effects'),
    getAvailableEffects: () => ipcRenderer.invoke('get-available-effects'),
    getEffectDefaults: (className) => ipcRenderer.invoke('get-effect-defaults', className),
    getEffectSchema: (className) => ipcRenderer.invoke('get-effect-schema', className),
    getEffectMetadata: (params) => ipcRenderer.invoke('get-effect-metadata', params),
    validateEffect: (effectConfig) => ipcRenderer.invoke('validate-effect', effectConfig),
    previewEffect: (previewConfig) => ipcRenderer.invoke('preview-effect', previewConfig),
    previewEffectThumbnail: (thumbnailConfig) => ipcRenderer.invoke('preview-effect-thumbnail', thumbnailConfig),
    generateThumbnail: (effectConfig) => ipcRenderer.invoke('generate-thumbnail', effectConfig),
    refreshEffectRegistry: (skipPluginReload = true) => ipcRenderer.invoke('refresh-effect-registry', skipPluginReload),
    debugEffectRegistry: () => ipcRenderer.invoke('debug-effect-registry'),

    // Preset management
    getEffectPresets: (effectName) => ipcRenderer.invoke('get-effect-presets', effectName),
    getPreset: (effectName, presetName) => ipcRenderer.invoke('get-preset', { effectName, presetName }),
    hasPresets: (effectName) => ipcRenderer.invoke('has-presets', effectName),
    getPresetNames: (effectName) => ipcRenderer.invoke('get-preset-names', effectName),

    // User presets
    saveUserPreset: (effectName, presetName, config) => ipcRenderer.invoke('save-user-preset', { effectName, presetName, config }),
    deleteUserPreset: (effectName, presetName) => ipcRenderer.invoke('delete-user-preset', { effectName, presetName }),
    listUserPresets: (effectName) => ipcRenderer.invoke('list-user-presets', effectName),

    // Config introspection
    introspectConfig: (params) => ipcRenderer.invoke('introspect-config', params),

    // Algorithm management
    getFindValueAlgorithms: () => ipcRenderer.invoke('get-findvalue-algorithms'),

    // Frame viewing
    viewFrames: (projectPath) => ipcRenderer.invoke('view-frames', projectPath),

    // Event handling
    onWorkerEvent: (callback) => {
        ipcRenderer.on('worker-event', (event, data) => {
            // Log frame events for debugging
            if (data.eventName === 'frameStarted' || data.eventName === 'frameCompleted') {
                console.log(`📥 [Preload] Received IPC worker-event: ${data.eventName} - Frame ${data.data?.frameNumber || 'unknown'}`);
            }
            callback(data);
        });
    },
    removeWorkerEventListener: () => {
        ipcRenderer.removeAllListeners('worker-event');
    },
    
    // Test IPC channel
    testIpcChannel: () => {
        console.log('🧪 [Preload] Testing IPC channel...');
        return ipcRenderer.invoke('test-ipc-channel');
    },

    // EventBus monitoring
    startEventMonitoring: (config) => ipcRenderer.invoke('start-event-monitoring', config),
    stopEventMonitoring: () => ipcRenderer.invoke('stop-event-monitoring'),
    getEventBuffer: () => ipcRenderer.invoke('get-event-buffer'),
    clearEventBuffer: () => ipcRenderer.invoke('clear-event-buffer'),
    onEventBusMessage: (callback) => {
        ipcRenderer.on('eventbus-message', (event, data) => callback(event, data));
    },
    offEventBusMessage: (callback) => {
        ipcRenderer.removeListener('eventbus-message', callback);
    },

    // Render loop
    startRenderLoop: (config) => ipcRenderer.invoke('start-render-loop', config),
    startResumeLoop: (config) => ipcRenderer.invoke('start-resume-loop', config),
    stopRenderLoop: () => ipcRenderer.invoke('stop-render-loop'),

    // Plugin management
    plugins: {
        getAll: () => ipcRenderer.invoke('plugins:get-all'),
        getEnabled: () => ipcRenderer.invoke('plugins:get-enabled'),
        add: (pluginData) => ipcRenderer.invoke('plugins:add', pluginData),
        remove: (pluginName) => ipcRenderer.invoke('plugins:remove', pluginName),
        toggle: (pluginName) => ipcRenderer.invoke('plugins:toggle', pluginName),
        validate: (pluginPath) => ipcRenderer.invoke('plugins:validate', pluginPath),
        installFromNpm: (packageName) => ipcRenderer.invoke('plugins:install-npm', packageName),
        selectLocal: () => ipcRenderer.invoke('plugins:select-local'),
        getForGeneration: () => ipcRenderer.invoke('plugins:get-for-generation'),
        getDebugLogPath: () => ipcRenderer.invoke('plugins:get-debug-log-path')
    },

    // Event listeners for async updates
    on: (channel, callback) => {
        // Create a wrapper for the listener
        const listener = (event, data) => {
            callback(data);
        };
        
        ipcRenderer.on(channel, listener);
        
        // Return unsubscribe function
        return () => {
            ipcRenderer.removeListener(channel, listener);
        };
    },
    
    off: (channel, callback) => {
        ipcRenderer.removeListener(channel, callback);
    }
});