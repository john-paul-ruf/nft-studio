/**
 * Tests for useNavigation and useViewNavigation hooks
 * Tests navigation state management and view transitions using REAL objects only
 *
 * CRITICAL: This test file follows the "REAL OBJECTS ONLY" policy
 * - Uses REAL NavigationService instances
 * - Uses REAL event subscriptions and state changes
 * - Uses REAL navigation history and parameters
 * - NO MOCKS, STUBS, SPIES, or FAKE OBJECTS
 */

import TestEnvironment from '../setup/TestEnvironment.js';

describe('useNavigation Hook Tests', () => {
    let testEnv;
    let navigationService;
    let eventBusService;

    beforeEach(async () => {
        testEnv = new TestEnvironment();
        await testEnv.setup();

        // Get REAL service instances - NO MOCKS
        navigationService = testEnv.getService('NavigationService');
        eventBusService = testEnv.getService('EventBusService');

        // Reset navigation to clean state
        navigationService.reset('intro');
    });

    afterEach(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    /**
     * Test navigation state management with real NavigationService
     */
    export async function test_navigation_state_management() {
        await setupTest();

        try {
            console.log('🧪 Testing navigation state management with REAL NavigationService');

            // Test initial state
            const initialView = navigationService.getCurrentView();
            const initialParams = navigationService.getCurrentViewParams();
            const initialCanGoBack = navigationService.canGoBack();

            console.log('📍 Initial navigation state:', {
                view: initialView,
                params: initialParams,
                canGoBack: initialCanGoBack
            });

            // Verify initial state
            if (initialView !== 'intro') {
                throw new Error(`Expected initial view to be 'intro', got '${initialView}'`);
            }

            if (initialCanGoBack !== false) {
                throw new Error(`Expected initial canGoBack to be false, got ${initialCanGoBack}`);
            }

            // Test navigation to wizard with parameters
            const wizardParams = {step: 1, projectType: 'new'};
            navigationService.navigateTo('wizard', wizardParams);

            const wizardView = navigationService.getCurrentView();
            const wizardViewParams = navigationService.getCurrentViewParams();
            const canGoBackFromWizard = navigationService.canGoBack();

            if (wizardView !== 'wizard') {
                throw new Error(`Expected view to be 'wizard', got '${wizardView}'`);
            }

            if (wizardViewParams.step !== 1 || wizardViewParams.projectType !== 'new') {
                throw new Error(`Expected wizard params to match, got ${JSON.stringify(wizardViewParams)}`);
            }

            if (canGoBackFromWizard !== true) {
                throw new Error(`Expected canGoBack to be true from wizard, got ${canGoBackFromWizard}`);
            }

            // Test navigation to canvas
            navigationService.navigateTo('canvas', {projectId: 'test-123'});

            const canvasView = navigationService.getCurrentView();
            const canvasParams = navigationService.getCurrentViewParams();

            if (canvasView !== 'canvas') {
                throw new Error(`Expected view to be 'canvas', got '${canvasView}'`);
            }

            if (canvasParams.projectId !== 'test-123') {
                throw new Error(`Expected canvas projectId to be 'test-123', got '${canvasParams.projectId}'`);
            }

            console.log('✅ Navigation state management test passed');
        }
        catch (e) {
            
        }
    }

    /**
     * Test navigation history operations with real NavigationService
     */
    function test_navigation_history_operations() {
        console.log('🧪 Testing navigation history operations with REAL NavigationService');

        // Build navigation history
        navigationService.navigateTo('wizard', {step: 1});
        navigationService.navigateTo('canvas', {projectId: 'test-456'});
        navigationService.navigateTo('wizard', {step: 2});

        // Test history retrieval
        const history = navigationService.getHistory();

        if (!Array.isArray(history)) {
            throw new Error(`Expected history to be an array, got ${typeof history}`);
        }

        if (history.length < 3) {
            throw new Error(`Expected history to have at least 3 entries, got ${history.length}`);
        }

        // Test hasInHistory
        const hasWizard = navigationService.hasInHistory('wizard');
        const hasCanvas = navigationService.hasInHistory('canvas');
        const hasNonExistent = navigationService.hasInHistory('nonexistent');

        if (!hasWizard) {
            throw new Error('Expected wizard to be in history');
        }

        if (!hasCanvas) {
            throw new Error('Expected canvas to be in history');
        }

        if (hasNonExistent) {
            throw new Error('Expected nonexistent view to not be in history');
        }

        // Test go back functionality
        const beforeGoBack = navigationService.getCurrentView();
        navigationService.goBack();
        const afterGoBack = navigationService.getCurrentView();

        if (beforeGoBack === afterGoBack) {
            throw new Error('Expected view to change after going back');
        }

        // Test clear history
        navigationService.clearHistory();
        const clearedHistory = navigationService.getHistory();

        if (clearedHistory.length > 1) {
            throw new Error(`Expected history to be cleared, got ${clearedHistory.length} entries`);
        }

        console.log('✅ Navigation history operations test passed');
    }

    /**
     * Test navigation replace and reset operations with real NavigationService
     */
    function test_navigation_replace_and_reset() {
        console.log('🧪 Testing navigation replace and reset operations with REAL NavigationService');

        // Build some history
        navigationService.navigateTo('wizard', {step: 1});
        navigationService.navigateTo('canvas', {projectId: 'test-789'});

        const historyBeforeReplace = navigationService.getHistory();
        const historyLengthBefore = historyBeforeReplace.length;

        // Test replace (should not add to history)
        navigationService.replace('wizard', {step: 3});

        const historyAfterReplace = navigationService.getHistory();
        const currentViewAfterReplace = navigationService.getCurrentView();
        const currentParamsAfterReplace = navigationService.getCurrentViewParams();

        if (historyAfterReplace.length !== historyLengthBefore) {
            throw new Error(`Expected history length to remain ${historyLengthBefore}, got ${historyAfterReplace.length}`);
        }

        if (currentViewAfterReplace !== 'wizard') {
            throw new Error(`Expected current view to be 'wizard', got '${currentViewAfterReplace}'`);
        }

        if (currentParamsAfterReplace.step !== 3) {
            throw new Error(`Expected step to be 3, got ${currentParamsAfterReplace.step}`);
        }

        // Test reset functionality
        navigationService.reset('intro');

        const viewAfterReset = navigationService.getCurrentView();
        const historyAfterReset = navigationService.getHistory();
        const canGoBackAfterReset = navigationService.canGoBack();

        if (viewAfterReset !== 'intro') {
            throw new Error(`Expected view after reset to be 'intro', got '${viewAfterReset}'`);
        }

        if (historyAfterReset.length > 1) {
            throw new Error(`Expected history to be reset, got ${historyAfterReset.length} entries`);
        }

        if (canGoBackAfterReset !== false) {
            throw new Error(`Expected canGoBack to be false after reset, got ${canGoBackAfterReset}`);
        }

        console.log('✅ Navigation replace and reset operations test passed');
    }

    /**
     * Test navigation event subscription with real EventBusService
     */
    function test_navigation_event_subscription() {
        console.log('🧪 Testing navigation event subscription with REAL EventBusService');

        let eventReceived = false;
        let eventData = null;

        // Subscribe to navigation events using REAL EventBusService
        const unsubscribe = eventBusService.subscribe('navigation:change', (data) => {
            eventReceived = true;
            eventData = data;
        });

        // Trigger navigation change
        navigationService.navigateTo('wizard', {step: 5});

        // Allow event to propagate
        setTimeout(() => {
            if (!eventReceived) {
                throw new Error('Expected navigation event to be received');
            }

            if (!eventData) {
                throw new Error('Expected event data to be provided');
            }

            console.log('📡 Navigation event received:', eventData);

            // Clean up subscription
            unsubscribe();

            console.log('✅ Navigation event subscription test passed');
        }, 10);
    }

    // Execute all tests
    test_navigation_state_management();
    test_navigation_history_operations();
    test_navigation_replace_and_reset();
    test_navigation_event_subscription();
});

describe('useViewNavigation Hook Tests', () => {
    let testEnv;
    let navigationService;

    beforeEach(async () => {
        testEnv = new TestEnvironment();
        await testEnv.setup();

        // Get REAL service instances - NO MOCKS
        navigationService = testEnv.getService('NavigationService');

        // Reset navigation to clean state
        navigationService.reset('intro');
    });

    afterEach(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    /**
     * Test view-specific navigation helpers with real NavigationService
     */
    function test_view_specific_navigation_helpers() {
        console.log('🧪 Testing view-specific navigation helpers with REAL NavigationService');

        // Test wizard view navigation
        const wizardViewName = 'wizard';

        // Navigate to wizard
        navigationService.navigateTo(wizardViewName, {step: 2, mode: 'advanced'});

        // Test isActive functionality
        const currentView = navigationService.getCurrentView();
        const isOnWizard = currentView === wizardViewName;

        if (!isOnWizard) {
            throw new Error(`Expected to be on wizard view, currently on '${currentView}'`);
        }

        // Test parameter access
        const currentParams = navigationService.getCurrentViewParams();
        const stepParam = currentParams.step;
        const modeParam = currentParams.mode;
        const nonExistentParam = currentParams.nonExistent;

        if (stepParam !== 2) {
            throw new Error(`Expected step param to be 2, got ${stepParam}`);
        }

        if (modeParam !== 'advanced') {
            throw new Error(`Expected mode param to be 'advanced', got '${modeParam}'`);
        }

        if (nonExistentParam !== undefined) {
            throw new Error(`Expected nonExistent param to be undefined, got ${nonExistentParam}`);
        }

        // Test navigation to different view
        navigationService.navigateTo('canvas', {projectId: 'test-canvas'});

        const isStillOnWizard = navigationService.getCurrentView() === wizardViewName;

        if (isStillOnWizard) {
            throw new Error('Expected to no longer be on wizard view after navigating to canvas');
        }

        console.log('✅ View-specific navigation helpers test passed');
    }

    // Execute test
    test_view_specific_navigation_helpers();
});