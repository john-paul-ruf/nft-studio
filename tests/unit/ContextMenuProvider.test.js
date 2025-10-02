/**
 * Test Suite: ContextMenuProvider
 * Purpose: Comprehensive testing of the ContextMenuProvider service
 * Created as part of God Object Destruction Plan - Phase 3, Step 3.3
 */

import TestEnvironment from '../setup/TestEnvironment.js';

/**
 * Test: ContextMenuProvider Constructor and Initialization
 */
export async function testContextMenuProviderConstructor(testEnv) {
    console.log('🧪 Testing ContextMenuProvider constructor...');
    
    try {
        const ContextMenuProvider = (await import('../../src/services/ContextMenuProvider.js')).default;
        
        // Use real EventBusService
        const eventBusInstance = (await import('../../src/services/EventBusService.js')).default;
        const eventBus = eventBusInstance;
        eventBus.isLoggingEnabled = false;

        // Test constructor
        const provider = new ContextMenuProvider(eventBus);
        
        // Verify initialization
        if (!provider) {
            throw new Error('ContextMenuProvider not created');
        }
        
        // Verify initial state
        if (provider.hasActiveMenus()) {
            throw new Error('Should have no active menus initially');
        }
        
        if (provider.menuCounter !== 0) {
            throw new Error('Menu counter should start at 0');
        }
        
        // Verify menu styles are configured
        if (!provider.menuStyles || !provider.itemStyles || !provider.separatorStyles) {
            throw new Error('Menu styles not properly configured');
        }
        
        console.log('✅ ContextMenuProvider constructor test passed');
        
        return {
            testName: 'ContextMenuProvider Constructor',
            status: 'PASSED',
            details: 'Constructor and initialization working correctly'
        };
        
    } catch (error) {
        throw new Error(`ContextMenuProvider constructor test failed: ${error.message}`);
    }
}

/**
 * Test: Primary Effect Context Menu Creation
 */
export async function testPrimaryEffectMenuCreation(testEnv) {
    console.log('🧪 Testing primary effect context menu creation...');
    
    try {
        const ContextMenuProvider = (await import('../../src/services/ContextMenuProvider.js')).default;
        
        const eventBusInstance = (await import('../../src/services/EventBusService.js')).default;
        const eventBus = eventBusInstance;
        eventBus.isLoggingEnabled = false;

        let emittedEvents = [];
        // Track emitted events
        const originalEmit = eventBus.emit.bind(eventBus);
        eventBus.emit = (event, data, metadata) => {
            emittedEvents.push({ event, data, metadata });
            return originalEmit(event, data, metadata);
        };
        
        const provider = new ContextMenuProvider(eventBus);
        
        // Test primary menu creation
        const menuConfig = provider.createPrimaryEffectMenu({
            effectIndex: 0,
            isReadOnly: false,
            isEffectFinal: false,
            secondaryEffects: [
                { name: 'blur', displayName: 'Blur Effect' },
                { name: 'glow', displayName: 'Glow Effect' }
            ],
            keyframeEffects: [
                { name: 'fade', displayName: 'Fade Effect' }
            ]
        });
        
        // Verify menu configuration
        if (!menuConfig || !menuConfig.id || menuConfig.type !== 'primary') {
            throw new Error('Invalid primary menu configuration');
        }
        
        if (menuConfig.effectIndex !== 0) {
            throw new Error('Effect index not set correctly');
        }
        
        if (!Array.isArray(menuConfig.items) || menuConfig.items.length === 0) {
            throw new Error('Menu items not configured correctly');
        }
        
        // Verify edit item exists
        const editItem = menuConfig.items.find(item => item.id === 'edit');
        if (!editItem || editItem.action !== 'edit-primary-effect') {
            throw new Error('Edit item not configured correctly');
        }
        
        // Verify secondary submenu exists
        const secondarySubmenu = menuConfig.items.find(item => item.id === 'add-secondary');
        if (!secondarySubmenu || secondarySubmenu.type !== 'submenu') {
            throw new Error('Secondary submenu not configured correctly');
        }
        
        if (secondarySubmenu.items.length !== 2) {
            throw new Error('Secondary submenu items not configured correctly');
        }
        
        // Verify keyframe submenu exists
        const keyframeSubmenu = menuConfig.items.find(item => item.id === 'add-keyframe');
        if (!keyframeSubmenu || keyframeSubmenu.type !== 'submenu') {
            throw new Error('Keyframe submenu not configured correctly');
        }
        
        // Verify menu is tracked
        if (!provider.hasActiveMenus() || provider.getAllActiveMenus().length !== 1) {
            throw new Error('Menu not tracked correctly');
        }
        
        console.log('✅ Primary effect menu creation test passed');
        
        return {
            testName: 'Primary Effect Menu Creation',
            status: 'PASSED',
            details: 'Primary menu creation and configuration working correctly'
        };
        
    } catch (error) {
        throw new Error(`Primary effect menu creation test failed: ${error.message}`);
    }
}

/**
 * Test: Secondary Effect Context Menu Creation
 */
export async function testSecondaryEffectMenuCreation(testEnv) {
    console.log('🧪 Testing secondary effect context menu creation...');
    
    try {
        const ContextMenuProvider = (await import('../../src/services/ContextMenuProvider.js')).default;
        
        const eventBusInstance = (await import('../../src/services/EventBusService.js')).default;
        const eventBus = eventBusInstance;
        eventBus.isLoggingEnabled = false;
        const provider = new ContextMenuProvider(eventBus);
        
        // Test secondary menu creation
        const menuConfig = provider.createSecondaryEffectMenu({
            parentIndex: 1,
            secondaryIndex: 0,
            isReadOnly: false
        });
        
        // Verify menu configuration
        if (!menuConfig || !menuConfig.id || menuConfig.type !== 'secondary') {
            throw new Error('Invalid secondary menu configuration');
        }
        
        if (menuConfig.parentIndex !== 1 || menuConfig.secondaryIndex !== 0) {
            throw new Error('Parent/secondary indices not set correctly');
        }
        
        if (!Array.isArray(menuConfig.items) || menuConfig.items.length !== 3) {
            throw new Error('Secondary menu should have 3 items (edit, separator, delete)');
        }
        
        // Verify edit item
        const editItem = menuConfig.items.find(item => item.id === 'edit');
        if (!editItem || editItem.action !== 'edit-secondary-effect') {
            throw new Error('Edit item not configured correctly');
        }
        
        // Verify delete item
        const deleteItem = menuConfig.items.find(item => item.id === 'delete');
        if (!deleteItem || deleteItem.action !== 'delete-secondary-effect') {
            throw new Error('Delete item not configured correctly');
        }
        
        // Test read-only menu
        const readOnlyConfig = provider.createSecondaryEffectMenu({
            parentIndex: 1,
            secondaryIndex: 0,
            isReadOnly: true
        });
        
        const readOnlyEditItem = readOnlyConfig.items.find(item => item.id === 'edit');
        if (!readOnlyEditItem.disabled) {
            throw new Error('Read-only edit item should be disabled');
        }
        
        console.log('✅ Secondary effect menu creation test passed');
        
        return {
            testName: 'Secondary Effect Menu Creation',
            status: 'PASSED',
            details: 'Secondary menu creation and read-only handling working correctly'
        };
        
    } catch (error) {
        throw new Error(`Secondary effect menu creation test failed: ${error.message}`);
    }
}

/**
 * Test: Keyframe Effect Context Menu Creation
 */
export async function testKeyframeEffectMenuCreation(testEnv) {
    console.log('🧪 Testing keyframe effect context menu creation...');
    
    try {
        const ContextMenuProvider = (await import('../../src/services/ContextMenuProvider.js')).default;
        
        const eventBusInstance = (await import('../../src/services/EventBusService.js')).default;
        const eventBus = eventBusInstance;
        eventBus.isLoggingEnabled = false;
        const provider = new ContextMenuProvider(eventBus);
        
        // Test keyframe menu creation
        const menuConfig = provider.createKeyframeEffectMenu({
            parentIndex: 2,
            keyframeIndex: 1,
            isReadOnly: false,
            frame: 30
        });
        
        // Verify menu configuration
        if (!menuConfig || !menuConfig.id || menuConfig.type !== 'keyframe') {
            throw new Error('Invalid keyframe menu configuration');
        }
        
        if (menuConfig.parentIndex !== 2 || menuConfig.keyframeIndex !== 1) {
            throw new Error('Parent/keyframe indices not set correctly');
        }
        
        if (menuConfig.frame !== 30) {
            throw new Error('Frame number not set correctly');
        }
        
        if (!Array.isArray(menuConfig.items) || menuConfig.items.length !== 3) {
            throw new Error('Keyframe menu should have 3 items (edit, separator, delete)');
        }
        
        // Verify edit item includes frame data
        const editItem = menuConfig.items.find(item => item.id === 'edit');
        if (!editItem || editItem.action !== 'edit-keyframe-effect') {
            throw new Error('Edit item not configured correctly');
        }
        
        if (!editItem.data || editItem.data.frame !== 30) {
            throw new Error('Edit item frame data not set correctly');
        }
        
        console.log('✅ Keyframe effect menu creation test passed');
        
        return {
            testName: 'Keyframe Effect Menu Creation',
            status: 'PASSED',
            details: 'Keyframe menu creation and frame handling working correctly'
        };
        
    } catch (error) {
        throw new Error(`Keyframe effect menu creation test failed: ${error.message}`);
    }
}

/**
 * Test: Menu Action Handling
 */
export async function testMenuActionHandling(testEnv) {
    console.log('🧪 Testing menu action handling...');
    
    try {
        const ContextMenuProvider = (await import('../../src/services/ContextMenuProvider.js')).default;
        
        const eventBusInstance = (await import('../../src/services/EventBusService.js')).default;
        const eventBus = eventBusInstance;
        eventBus.isLoggingEnabled = false;

        let emittedEvents = [];
        // Track emitted events
        const originalEmit = eventBus.emit.bind(eventBus);
        eventBus.emit = (event, data, metadata) => {
            emittedEvents.push({ event, data, metadata });
            return originalEmit(event, data, metadata);
        };
        
        const provider = new ContextMenuProvider(eventBus);
        
        // Create a menu
        const menuConfig = provider.createPrimaryEffectMenu({
            effectIndex: 0,
            isReadOnly: false,
            isEffectFinal: false,
            secondaryEffects: [],
            keyframeEffects: []
        });
        
        // Test action handling
        provider.handleMenuAction(menuConfig.id, 'edit-primary-effect', { effectIndex: 0 });
        
        // Verify event was emitted
        const actionEvent = emittedEvents.find(e => e.event === 'context-menu-action');
        if (!actionEvent) {
            throw new Error('Context menu action event not emitted');
        }
        
        if (actionEvent.data.action !== 'edit-primary-effect') {
            throw new Error('Action data not correct');
        }
        
        if (actionEvent.data.menuType !== 'primary') {
            throw new Error('Menu type not correct');
        }
        
        // Verify menu was closed after action
        const closeEvent = emittedEvents.find(e => e.event === 'context-menu-closed');
        if (!closeEvent) {
            throw new Error('Context menu close event not emitted');
        }
        
        if (provider.hasActiveMenus()) {
            throw new Error('Menu should be closed after action');
        }
        
        // Verify metrics were updated
        const metrics = provider.getContextMenuMetrics();
        if (metrics.totalActions !== 1) {
            throw new Error('Action metrics not updated correctly');
        }
        
        console.log('✅ Menu action handling test passed');
        
        return {
            testName: 'Menu Action Handling',
            status: 'PASSED',
            details: 'Action handling and event emission working correctly'
        };
        
    } catch (error) {
        throw new Error(`Menu action handling test failed: ${error.message}`);
    }
}

/**
 * Test: Menu State Management
 */
export async function testMenuStateManagement(testEnv) {
    console.log('🧪 Testing menu state management...');
    
    try {
        const ContextMenuProvider = (await import('../../src/services/ContextMenuProvider.js')).default;
        
        const eventBusInstance = (await import('../../src/services/EventBusService.js')).default;
        const eventBus = eventBusInstance;
        eventBus.isLoggingEnabled = false;
        const provider = new ContextMenuProvider(eventBus);
        
        // Test initial state
        if (provider.hasActiveMenus()) {
            throw new Error('Should have no active menus initially');
        }
        
        if (provider.getAllActiveMenus().length !== 0) {
            throw new Error('Should return empty array for no active menus');
        }
        
        // Create multiple menus
        const menu1 = provider.createPrimaryEffectMenu({ effectIndex: 0, isReadOnly: false, isEffectFinal: false });
        const menu2 = provider.createSecondaryEffectMenu({ parentIndex: 1, secondaryIndex: 0, isReadOnly: false });
        const menu3 = provider.createKeyframeEffectMenu({ parentIndex: 2, keyframeIndex: 1, isReadOnly: false, frame: 15 });
        
        // Verify state
        if (!provider.hasActiveMenus()) {
            throw new Error('Should have active menus');
        }
        
        if (provider.getAllActiveMenus().length !== 3) {
            throw new Error('Should have 3 active menus');
        }
        
        // Test individual menu retrieval
        const retrievedMenu1 = provider.getActiveMenu(menu1.id);
        if (!retrievedMenu1 || retrievedMenu1.id !== menu1.id) {
            throw new Error('Menu retrieval not working correctly');
        }
        
        // Test individual menu closing
        provider.closeMenu(menu1.id);
        if (provider.getAllActiveMenus().length !== 2) {
            throw new Error('Individual menu closing not working');
        }
        
        // Test close all menus
        provider.closeAllMenus();
        if (provider.hasActiveMenus()) {
            throw new Error('Close all menus not working');
        }
        
        console.log('✅ Menu state management test passed');
        
        return {
            testName: 'Menu State Management',
            status: 'PASSED',
            details: 'Menu state tracking and management working correctly'
        };
        
    } catch (error) {
        throw new Error(`Menu state management test failed: ${error.message}`);
    }
}

/**
 * Test: Menu Configuration Validation
 */
export async function testMenuConfigValidation(testEnv) {
    console.log('🧪 Testing menu configuration validation...');
    
    try {
        const ContextMenuProvider = (await import('../../src/services/ContextMenuProvider.js')).default;
        
        const eventBusInstance = (await import('../../src/services/EventBusService.js')).default;
        const eventBus = eventBusInstance;
        eventBus.isLoggingEnabled = false;
        const provider = new ContextMenuProvider(eventBus);
        
        // Test valid configuration
        const validConfig = {
            id: 'test-menu',
            type: 'primary',
            items: [
                { id: 'edit', label: 'Edit', action: 'edit', data: { index: 0 } },
                { type: 'separator' },
                { id: 'delete', label: 'Delete', action: 'delete', data: { index: 0 } }
            ]
        };
        
        if (!provider.validateMenuConfig(validConfig)) {
            throw new Error('Valid configuration should pass validation');
        }
        
        // Test invalid configurations
        const invalidConfigs = [
            null,
            {},
            { id: 'test' }, // missing type and items
            { id: 'test', type: 'primary' }, // missing items
            { id: 'test', type: 'primary', items: 'not-array' }, // items not array
            { id: 'test', type: 'primary', items: [{ label: 'Test' }] }, // item missing id
            { id: 'test', type: 'primary', items: [{ id: 'test' }] }, // item missing label
            { id: 'test', type: 'primary', items: [{ id: 'test', label: 'Test', action: 'test' }] } // action without data
        ];
        
        for (const invalidConfig of invalidConfigs) {
            if (provider.validateMenuConfig(invalidConfig)) {
                throw new Error(`Invalid configuration should fail validation: ${JSON.stringify(invalidConfig)}`);
            }
        }
        
        console.log('✅ Menu configuration validation test passed');
        
        return {
            testName: 'Menu Configuration Validation',
            status: 'PASSED',
            details: 'Menu configuration validation working correctly'
        };
        
    } catch (error) {
        throw new Error(`Menu configuration validation test failed: ${error.message}`);
    }
}

/**
 * Test: ContextMenuProvider Performance
 */
export async function testContextMenuProviderPerformance(testEnv) {
    console.log('🧪 Testing ContextMenuProvider performance...');
    
    try {
        const ContextMenuProvider = (await import('../../src/services/ContextMenuProvider.js')).default;
        
        const eventBusInstance = (await import('../../src/services/EventBusService.js')).default;
        const eventBus = eventBusInstance;
        eventBus.isLoggingEnabled = false;
        
        // Test instantiation performance
        const startTime = Date.now();
        const provider = new ContextMenuProvider(eventBus);
        const instantiationTime = Date.now() - startTime;
        
        // Test menu creation performance
        const menuStartTime = Date.now();
        for (let i = 0; i < 10; i++) {
            provider.createPrimaryEffectMenu({
                effectIndex: i,
                isReadOnly: false,
                isEffectFinal: false,
                secondaryEffects: [{ name: 'test', displayName: 'Test' }],
                keyframeEffects: [{ name: 'test', displayName: 'Test' }]
            });
        }
        const menuCreationTime = Date.now() - menuStartTime;
        
        // Test state access performance
        const stateStartTime = Date.now();
        for (let i = 0; i < 100; i++) {
            provider.hasActiveMenus();
            provider.getAllActiveMenus();
            provider.getContextMenuMetrics();
        }
        const stateAccessTime = Date.now() - stateStartTime;
        
        const performance = {
            instantiationTime,
            menuCreationTime,
            stateAccessTime,
            totalTime: instantiationTime + menuCreationTime + stateAccessTime
        };
        
        console.log('✅ ContextMenuProvider performance test completed:', performance);
        
        // Verify performance meets requirements
        if (instantiationTime > 50) {
            console.warn(`⚠️ Slow instantiation: ${instantiationTime}ms`);
        }
        
        if (menuCreationTime > 100) {
            console.warn(`⚠️ Slow menu creation: ${menuCreationTime}ms`);
        }
        
        return {
            testName: 'ContextMenuProvider Performance',
            status: 'PASSED',
            performance,
            meetsBaseline: instantiationTime < 100 && menuCreationTime < 200
        };
        
    } catch (error) {
        throw new Error(`ContextMenuProvider performance test failed: ${error.message}`);
    }
}

// Test registration
export const tests = [
    {
        name: 'ContextMenuProvider Constructor',
        category: 'unit',
        fn: testContextMenuProviderConstructor,
        description: 'Tests ContextMenuProvider constructor and initialization'
    },
    {
        name: 'Primary Effect Menu Creation',
        category: 'unit',
        fn: testPrimaryEffectMenuCreation,
        description: 'Tests primary effect context menu creation'
    },
    {
        name: 'Secondary Effect Menu Creation',
        category: 'unit',
        fn: testSecondaryEffectMenuCreation,
        description: 'Tests secondary effect context menu creation'
    },
    {
        name: 'Keyframe Effect Menu Creation',
        category: 'unit',
        fn: testKeyframeEffectMenuCreation,
        description: 'Tests keyframe effect context menu creation'
    },
    {
        name: 'Menu Action Handling',
        category: 'unit',
        fn: testMenuActionHandling,
        description: 'Tests menu action handling and event emission'
    },
    {
        name: 'Menu State Management',
        category: 'unit',
        fn: testMenuStateManagement,
        description: 'Tests menu state tracking and management'
    },
    {
        name: 'Menu Configuration Validation',
        category: 'unit',
        fn: testMenuConfigValidation,
        description: 'Tests menu configuration validation logic'
    },
    {
        name: 'ContextMenuProvider Performance',
        category: 'unit',
        fn: testContextMenuProviderPerformance,
        description: 'Tests ContextMenuProvider performance baselines'
    }
];

// Main test runner
if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        console.log('🚀 Running ContextMenuProvider Tests...\n');
        
        const testEnv = new TestEnvironment();
        let passed = 0;
        let failed = 0;
        
        for (const test of tests) {
            try {
                console.log(`\n📋 Running: ${test.name}`);
                const result = await test.fn(testEnv);
                console.log(`✅ ${test.name}: PASSED`);
                passed++;
            } catch (error) {
                console.error(`❌ ${test.name}: FAILED`);
                console.error(`   Error: ${error.message}`);
                failed++;
            }
        }
        
        console.log(`\n🎯 ContextMenuProvider Test Results:`);
        console.log(`   ✅ Passed: ${passed}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
        
        if (failed === 0) {
            console.log('\n🎉 All ContextMenuProvider tests passed!');
        } else {
            console.log('\n⚠️ Some ContextMenuProvider tests failed.');
            process.exit(1);
        }
    })();
}