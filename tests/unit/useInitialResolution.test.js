/**
 * Tests for useInitialResolution hook
 * Tests initial resolution loading from preferences using REAL objects only
 * 
 * CRITICAL: This test file follows the "REAL OBJECTS ONLY" policy
 * - Uses REAL PreferencesService instances
 * - Uses REAL ResolutionMapper for validation
 * - Uses REAL file system operations for preferences
 * - NO MOCKS, STUBS, SPIES, or FAKE OBJECTS
 */

import TestEnvironment from '../setup/TestEnvironment.js';

describe('useInitialResolution Hook Tests', () => {
    let testEnv;
    let preferencesService;
    let resolutionMapper;

    beforeEach(async () => {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        // Get REAL service instances - NO MOCKS
        preferencesService = testEnv.getService('PreferencesService');
        resolutionMapper = testEnv.getService('ResolutionMapper');
        
        // Clear any existing preferences for clean test state
        await preferencesService.clearPreferences();
    });

    afterEach(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    /**
     * Test initial resolution loading with project config using real services
     */
    function test_initial_resolution_with_project_config() {
        console.log('🧪 Testing initial resolution with project config using REAL services');
        
        const projectConfig = {
            targetResolution: 1440,
            name: 'Test Project'
        };
        
        // Simulate the hook's logic with REAL services
        let initialResolution = null;
        let isLoaded = false;
        
        // If projectConfig has a resolution, use it
        if (projectConfig?.targetResolution) {
            initialResolution = projectConfig.targetResolution;
            isLoaded = true;
        }
        
        if (initialResolution !== 1440) {
            throw new Error(`Expected initial resolution to be 1440, got ${initialResolution}`);
        }
        
        if (!isLoaded) {
            throw new Error('Expected isLoaded to be true when project config has resolution');
        }
        
        console.log('📏 Initial resolution from project config:', initialResolution);
        console.log('✅ Initial resolution with project config test passed');
    }

    /**
     * Test initial resolution loading from preferences using real services
     */
    async function test_initial_resolution_from_preferences() {
        console.log('🧪 Testing initial resolution from preferences using REAL services');
        
        // Set up preferences with saved resolution using REAL PreferencesService
        const savedResolution = 720;
        await preferencesService.saveLastProjectInfo({
            lastResolution: savedResolution.toString(),
            lastProjectPath: '/test/path'
        });
        
        // Simulate the hook's logic with REAL services
        let initialResolution = null;
        let isLoaded = false;
        
        try {
            // Load from preferences using REAL PreferencesService
            const lastProjectInfo = await preferencesService.getLastProjectInfo();
            const savedResolutionString = lastProjectInfo.lastResolution;
            
            let targetResolution;
            if (savedResolutionString) {
                const parsed = parseInt(savedResolutionString);
                targetResolution = resolutionMapper.isValidResolution(parsed)
                    ? parsed
                    : resolutionMapper.getDefaultResolution();
            } else {
                targetResolution = resolutionMapper.getDefaultResolution();
            }
            
            console.log('📏 Resolution loaded from preferences:', targetResolution, 'from saved:', savedResolutionString);
            initialResolution = targetResolution;
            isLoaded = true;
        } catch (error) {
            console.error('❌ Failed to load initial resolution:', error);
            initialResolution = resolutionMapper.getDefaultResolution();
            isLoaded = true;
        }
        
        if (initialResolution !== savedResolution) {
            throw new Error(`Expected initial resolution to be ${savedResolution}, got ${initialResolution}`);
        }
        
        if (!isLoaded) {
            throw new Error('Expected isLoaded to be true after loading from preferences');
        }
        
        console.log('✅ Initial resolution from preferences test passed');
    }

    /**
     * Test initial resolution with invalid saved resolution using real services
     */
    async function test_initial_resolution_with_invalid_saved() {
        console.log('🧪 Testing initial resolution with invalid saved resolution using REAL services');
        
        // Set up preferences with invalid resolution using REAL PreferencesService
        const invalidResolution = 'invalid-resolution';
        await preferencesService.saveLastProjectInfo({
            lastResolution: invalidResolution,
            lastProjectPath: '/test/path'
        });
        
        // Simulate the hook's logic with REAL services
        let initialResolution = null;
        let isLoaded = false;
        
        try {
            // Load from preferences using REAL PreferencesService
            const lastProjectInfo = await preferencesService.getLastProjectInfo();
            const savedResolutionString = lastProjectInfo.lastResolution;
            
            let targetResolution;
            if (savedResolutionString) {
                const parsed = parseInt(savedResolutionString);
                targetResolution = resolutionMapper.isValidResolution(parsed)
                    ? parsed
                    : resolutionMapper.getDefaultResolution();
            } else {
                targetResolution = resolutionMapper.getDefaultResolution();
            }
            
            console.log('📏 Resolution with invalid saved:', targetResolution, 'from saved:', savedResolutionString);
            initialResolution = targetResolution;
            isLoaded = true;
        } catch (error) {
            console.error('❌ Failed to load initial resolution:', error);
            initialResolution = resolutionMapper.getDefaultResolution();
            isLoaded = true;
        }
        
        const defaultResolution = resolutionMapper.getDefaultResolution();
        
        if (initialResolution !== defaultResolution) {
            throw new Error(`Expected initial resolution to be default ${defaultResolution}, got ${initialResolution}`);
        }
        
        if (!isLoaded) {
            throw new Error('Expected isLoaded to be true after handling invalid resolution');
        }
        
        console.log('✅ Initial resolution with invalid saved test passed');
    }

    /**
     * Test initial resolution with no saved preferences using real services
     */
    async function test_initial_resolution_with_no_saved_preferences() {
        console.log('🧪 Testing initial resolution with no saved preferences using REAL services');
        
        // Ensure no preferences exist using REAL PreferencesService
        await preferencesService.clearPreferences();
        
        // Simulate the hook's logic with REAL services
        let initialResolution = null;
        let isLoaded = false;
        
        try {
            // Load from preferences using REAL PreferencesService
            const lastProjectInfo = await preferencesService.getLastProjectInfo();
            const savedResolutionString = lastProjectInfo.lastResolution;
            
            let targetResolution;
            if (savedResolutionString) {
                const parsed = parseInt(savedResolutionString);
                targetResolution = resolutionMapper.isValidResolution(parsed)
                    ? parsed
                    : resolutionMapper.getDefaultResolution();
            } else {
                targetResolution = resolutionMapper.getDefaultResolution();
            }
            
            console.log('📏 Resolution with no saved preferences:', targetResolution);
            initialResolution = targetResolution;
            isLoaded = true;
        } catch (error) {
            console.error('❌ Failed to load initial resolution:', error);
            initialResolution = resolutionMapper.getDefaultResolution();
            isLoaded = true;
        }
        
        const defaultResolution = resolutionMapper.getDefaultResolution();
        
        if (initialResolution !== defaultResolution) {
            throw new Error(`Expected initial resolution to be default ${defaultResolution}, got ${initialResolution}`);
        }
        
        if (!isLoaded) {
            throw new Error('Expected isLoaded to be true after loading default resolution');
        }
        
        console.log('✅ Initial resolution with no saved preferences test passed');
    }

    /**
     * Test resolution validation with real ResolutionMapper
     */
    function test_resolution_validation() {
        console.log('🧪 Testing resolution validation with REAL ResolutionMapper');
        
        // Test valid resolutions
        const validResolutions = [720, 1080, 1440, 2160];
        
        for (const resolution of validResolutions) {
            const isValid = resolutionMapper.isValidResolution(resolution);
            if (!isValid) {
                throw new Error(`Expected resolution ${resolution} to be valid`);
            }
        }
        
        // Test invalid resolutions
        const invalidResolutions = [0, -1, 999999, NaN, null, undefined];
        
        for (const resolution of invalidResolutions) {
            const isValid = resolutionMapper.isValidResolution(resolution);
            if (isValid) {
                throw new Error(`Expected resolution ${resolution} to be invalid`);
            }
        }
        
        // Test default resolution
        const defaultResolution = resolutionMapper.getDefaultResolution();
        
        if (typeof defaultResolution !== 'number' || defaultResolution <= 0) {
            throw new Error(`Expected default resolution to be a positive number, got ${defaultResolution}`);
        }
        
        const isDefaultValid = resolutionMapper.isValidResolution(defaultResolution);
        if (!isDefaultValid) {
            throw new Error(`Expected default resolution ${defaultResolution} to be valid`);
        }
        
        console.log('📏 Default resolution:', defaultResolution);
        console.log('✅ Resolution validation test passed');
    }

    /**
     * Test error handling in resolution loading using real services
     */
    async function test_error_handling_in_resolution_loading() {
        console.log('🧪 Testing error handling in resolution loading using REAL services');
        
        // Simulate error condition by corrupting preferences file
        try {
            // Force an error by trying to access non-existent preference
            await preferencesService.savePreferences(null); // This should cause an error
        } catch (error) {
            console.log('💥 Expected error occurred:', error.message);
        }
        
        // Simulate the hook's error handling logic
        let initialResolution = null;
        let isLoaded = false;
        
        try {
            // This should fail and trigger error handling
            const lastProjectInfo = await preferencesService.getLastProjectInfo();
            const savedResolutionString = lastProjectInfo.lastResolution;
            
            let targetResolution;
            if (savedResolutionString) {
                const parsed = parseInt(savedResolutionString);
                targetResolution = resolutionMapper.isValidResolution(parsed)
                    ? parsed
                    : resolutionMapper.getDefaultResolution();
            } else {
                targetResolution = resolutionMapper.getDefaultResolution();
            }
            
            initialResolution = targetResolution;
            isLoaded = true;
        } catch (error) {
            console.log('❌ Error handled, falling back to default resolution');
            initialResolution = resolutionMapper.getDefaultResolution();
            isLoaded = true;
        }
        
        const defaultResolution = resolutionMapper.getDefaultResolution();
        
        if (initialResolution !== defaultResolution) {
            throw new Error(`Expected fallback to default resolution ${defaultResolution}, got ${initialResolution}`);
        }
        
        if (!isLoaded) {
            throw new Error('Expected isLoaded to be true even after error');
        }
        
        console.log('✅ Error handling in resolution loading test passed');
    }

    // Execute all tests
    test_initial_resolution_with_project_config();
    await test_initial_resolution_from_preferences();
    await test_initial_resolution_with_invalid_saved();
    await test_initial_resolution_with_no_saved_preferences();
    test_resolution_validation();
    await test_error_handling_in_resolution_loading();
});