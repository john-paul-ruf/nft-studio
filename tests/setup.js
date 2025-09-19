/**
 * Test setup file for NFT Studio
 * This file configures the testing environment and mocks
 */

// Simple mock function implementation
function createMockFunction() {
    const mockFn = function(...args) {
        mockFn.calls.push(args);
        return mockFn.returnValue || Promise.resolve(mockFn.resolvedValue || { success: true });
    };

    mockFn.calls = [];
    mockFn.returnValue = undefined;
    mockFn.resolvedValue = undefined;

    mockFn.mockResolvedValue = function(value) {
        mockFn.resolvedValue = value;
        return mockFn;
    };

    mockFn.mockReturnValue = function(value) {
        mockFn.returnValue = value;
        return mockFn;
    };

    mockFn.mockReset = function() {
        mockFn.calls = [];
        mockFn.returnValue = undefined;
        mockFn.resolvedValue = undefined;
    };

    return mockFn;
}

// Mock Electron APIs that are used in the components
global.window = global.window || {};
global.window.api = {
    // File operations
    selectFile: createMockFunction(),
    selectDirectory: createMockFunction(),
    selectFolder: createMockFunction(),
    readFile: createMockFunction(),
    writeFile: createMockFunction(),
    loadProject: createMockFunction(),
    saveProject: createMockFunction(),

    // Effect operations
    discoverEffects: createMockFunction(),
    getAvailableEffects: createMockFunction(),
    getEffectDefaults: createMockFunction(),
    getEffectSchema: createMockFunction(),
    validateEffect: createMockFunction(),
    previewEffect: createMockFunction(),
    generateThumbnail: createMockFunction(),
    getEffectMetadata: createMockFunction(),

    // Rendering operations
    renderFrame: createMockFunction(),
    startRenderLoop: createMockFunction(),
    stopRenderLoop: createMockFunction(),

    // Project operations
    startNewProject: createMockFunction(),
    resumeProject: createMockFunction(),

    // Preferences
    getPreferences: createMockFunction(),
    savePreferences: createMockFunction(),

    // File system operations
    listCompletedFrames: createMockFunction(),
    readFrameImage: createMockFunction()
};

// Store original console for testing
const originalConsole = global.console;

// Mock console methods to reduce noise in tests (but keep for verification)
global.console = {
    ...originalConsole,
    log: createMockFunction(),
    debug: createMockFunction(),
    info: createMockFunction()
};

// Restore console for test output
global.console.error = originalConsole.error;
global.console.warn = originalConsole.warn;

// Mock window.require for any remaining legacy calls
global.window.require = createMockFunction();
global.window.require.mockReturnValue({
    ipcRenderer: {
        invoke: createMockFunction()
    }
});

// Export mock utilities
global.mockUtils = {
    createMockFunction,
    resetAllMocks: function() {
        Object.values(global.window.api).forEach(fn => {
            if (fn.mockReset) fn.mockReset();
        });
    }
};