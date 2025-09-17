/**
 * Test utilities and helpers for NFT Studio tests
 */

/**
 * Creates a mock project configuration for testing
 */
export function createMockProjectConfig(overrides = {}) {
    return {
        artistName: 'Test Artist',
        projectName: 'Test Project',
        outputDirectory: '/test/output',
        targetResolution: 1920,
        isHorizontal: true,
        numFrames: 100,
        effects: [],
        colorScheme: 'neon-cyberpunk',
        ...overrides
    };
}

/**
 * Creates a mock effect configuration for testing
 */
export function createMockEffect(overrides = {}) {
    return {
        className: 'TestEffect',
        config: {
            intensity: 0.5,
            enabled: true
        },
        ...overrides
    };
}

/**
 * Creates a mock file dialog result
 */
export function createMockFileResult(overrides = {}) {
    return {
        canceled: false,
        filePaths: ['/test/path/project.json'],
        ...overrides
    };
}

/**
 * Creates a mock API response
 */
export function createMockApiResponse(success = true, data = null, error = null) {
    return {
        success,
        ...(success ? { content: JSON.stringify(data), config: data } : { error })
    };
}

/**
 * Waits for next tick in async operations
 */
export function waitForNextTick() {
    return new Promise(resolve => setImmediate(resolve));
}

/**
 * Creates a mock event object
 */
export function createMockEvent(overrides = {}) {
    return {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: { value: 'test' },
        clientX: 100,
        clientY: 100,
        ...overrides
    };
}

/**
 * Resets all mocked API functions
 */
export function resetApiMocks() {
    Object.values(window.api).forEach(mockFn => {
        if (jest.isMockFunction(mockFn)) {
            mockFn.mockReset();
        }
    });
}

/**
 * Sets up common API mock responses for successful operations
 */
export function setupSuccessfulApiMocks() {
    window.api.selectFile.mockResolvedValue(createMockFileResult());
    window.api.selectDirectory.mockResolvedValue(createMockFileResult());
    window.api.loadProject.mockResolvedValue(createMockApiResponse(true, createMockProjectConfig()));
    window.api.saveProject.mockResolvedValue(createMockApiResponse(true));
    window.api.discoverEffects.mockResolvedValue(createMockApiResponse(true, ['TestEffect']));
    window.api.getEffectDefaults.mockResolvedValue(createMockApiResponse(true, { intensity: 0.5 }));
    window.api.renderFrame.mockResolvedValue(createMockApiResponse(true, { frameData: 'data:image/png;base64,test' }));
}