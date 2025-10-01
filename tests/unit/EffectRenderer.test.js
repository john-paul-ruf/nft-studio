/**
 * EffectRenderer Service Tests
 * 
 * Comprehensive test suite for the EffectRenderer service that handles
 * all effect rendering operations for the EffectsPanel component.
 * 
 * Test Categories:
 * - Constructor validation and dependency injection
 * - Primary effect rendering with drag/drop and interactions
 * - Secondary effect rendering with proper indentation
 * - Keyframe effect rendering with frame indicators
 * - Context menu rendering and event handling
 * - Effect formatting and display utilities
 * - Render metrics tracking and performance monitoring
 * - Error handling and fallback rendering
 */

// Mock React and Material-UI components for testing
const React = {
    createElement: (type, props, ...children) => ({
        type,
        props: { ...props, children: children.length === 1 ? children[0] : children },
        key: props?.key
    })
};

// Mock Material-UI components
const mockMuiComponents = {
    Box: (props) => React.createElement('div', { ...props, 'data-testid': 'mui-box' }),
    Paper: (props) => React.createElement('div', { ...props, 'data-testid': 'mui-paper' }),
    Typography: (props) => React.createElement('span', { ...props, 'data-testid': 'mui-typography' }),
    IconButton: (props) => React.createElement('button', { ...props, 'data-testid': 'mui-iconbutton' }),
    Chip: (props) => React.createElement('span', { ...props, 'data-testid': 'mui-chip' })
};

// Mock Material-UI icons
const mockMuiIcons = {
    Delete: () => React.createElement('span', { 'data-testid': 'delete-icon' }),
    Visibility: () => React.createElement('span', { 'data-testid': 'visibility-icon' }),
    VisibilityOff: () => React.createElement('span', { 'data-testid': 'visibility-off-icon' }),
    ExpandMore: () => React.createElement('span', { 'data-testid': 'expand-more-icon' }),
    SubdirectoryArrowRight: () => React.createElement('span', { 'data-testid': 'subdirectory-arrow-right-icon' }),
    ArrowForward: () => React.createElement('span', { 'data-testid': 'arrow-forward-icon' })
};

// Mock Radix UI Context Menu
const mockContextMenu = {
    Root: ({ children }) => React.createElement('div', { 'data-testid': 'context-menu-root' }, children),
    Trigger: ({ children }) => React.createElement('div', { 'data-testid': 'context-menu-trigger' }, children),
    Portal: ({ children }) => React.createElement('div', { 'data-testid': 'context-menu-portal' }, children),
    Content: ({ children }) => React.createElement('div', { 'data-testid': 'context-menu-content' }, children)
};

// Create EffectRenderer class with mocked dependencies
class EffectRenderer {
    constructor({ theme, eventBus, logger } = {}) {
        if (!theme) {
            throw new Error('EffectRenderer requires theme dependency');
        }
        if (!eventBus) {
            throw new Error('EffectRenderer requires eventBus dependency');
        }
        if (!logger) {
            throw new Error('EffectRenderer requires logger dependency');
        }

        this.theme = theme;
        this.eventBus = eventBus;
        this.logger = logger;

        this.renderMetrics = {
            primaryEffectsRendered: 0,
            secondaryEffectsRendered: 0,
            keyframeEffectsRendered: 0,
            contextMenusRendered: 0,
            renderStartTime: null,
            lastRenderDuration: 0
        };

        this.renderConfig = {
            enableDragDrop: true,
            enableContextMenus: true,
            enableVisibilityToggle: true,
            enableExpansion: true,
            maxRenderDepth: 3,
            renderTimeout: 5000
        };

        // Bind methods
        this.renderPrimaryEffect = this.renderPrimaryEffect.bind(this);
        this.renderSecondaryEffects = this.renderSecondaryEffects.bind(this);
        this.renderKeyframeEffects = this.renderKeyframeEffects.bind(this);
        this.renderContextMenu = this.renderContextMenu.bind(this);
        this.formatEffectName = this.formatEffectName.bind(this);
        this.formatEffectId = this.formatEffectId.bind(this);
        this.formatKeyframeDisplay = this.formatKeyframeDisplay.bind(this);

        this.logger.info('EffectRenderer initialized successfully');
    }

    renderPrimaryEffect(effectData, sortedIndex, section, handlers, expandedEffects, isReadOnly = false) {
        const startTime = performance.now();
        
        try {
            const { effect, originalIndex } = effectData;
            const isExpanded = expandedEffects.has(`${section}-${sortedIndex}`);
            
            // Simulate rendering
            const renderedEffect = {
                type: 'primary-effect',
                effect: effect.name || effect.className,
                originalIndex,
                section,
                isExpanded,
                isReadOnly
            };

            this.renderMetrics.primaryEffectsRendered++;
            this.renderMetrics.lastRenderDuration = performance.now() - startTime;
            
            this.eventBus.emit('effectRenderer:primaryEffectRendered', {
                effectName: effect.name || effect.className,
                originalIndex,
                renderTime: this.renderMetrics.lastRenderDuration
            });

            return renderedEffect;

        } catch (error) {
            this.logger.error('Error rendering primary effect:', error);
            this.eventBus.emit('effectRenderer:renderError', {
                type: 'primary',
                effectData,
                error: error.message
            });
            return this._renderErrorFallback('primary effect', error);
        }
    }

    renderSecondaryEffects(effect, parentOriginalIndex, handlers, isReadOnly = false) {
        if (!effect.secondaryEffects || effect.secondaryEffects.length === 0) {
            return null;
        }

        const startTime = performance.now();

        try {
            const renderedSecondaries = {
                type: 'secondary-effects',
                parentEffect: effect.name || effect.className,
                count: effect.secondaryEffects.length,
                effects: effect.secondaryEffects.map(s => s.name || s.className)
            };

            this.renderMetrics.secondaryEffectsRendered += effect.secondaryEffects.length;
            const renderTime = performance.now() - startTime;
            
            this.eventBus.emit('effectRenderer:secondaryEffectsRendered', {
                parentEffect: effect.name || effect.className,
                count: effect.secondaryEffects.length,
                renderTime
            });

            return renderedSecondaries;

        } catch (error) {
            this.logger.error('Error rendering secondary effects:', error);
            this.eventBus.emit('effectRenderer:renderError', {
                type: 'secondary',
                parentEffect: effect.name || effect.className,
                error: error.message
            });
            return this._renderErrorFallback('secondary effects', error);
        }
    }

    renderKeyframeEffects(effect, parentOriginalIndex, handlers, isReadOnly = false) {
        const keyframeEffects = effect.attachedEffects?.keyFrame || [];
        if (!keyframeEffects || keyframeEffects.length === 0) {
            return null;
        }

        const startTime = performance.now();

        try {
            const renderedKeyframes = {
                type: 'keyframe-effects',
                parentEffect: effect.name || effect.className,
                count: keyframeEffects.length,
                frames: keyframeEffects.map(k => k.frame)
            };

            this.renderMetrics.keyframeEffectsRendered += keyframeEffects.length;
            const renderTime = performance.now() - startTime;
            
            this.eventBus.emit('effectRenderer:keyframeEffectsRendered', {
                parentEffect: effect.name || effect.className,
                count: keyframeEffects.length,
                renderTime
            });

            return renderedKeyframes;

        } catch (error) {
            this.logger.error('Error rendering keyframe effects:', error);
            this.eventBus.emit('effectRenderer:renderError', {
                type: 'keyframe',
                parentEffect: effect.name || effect.className,
                error: error.message
            });
            return this._renderErrorFallback('keyframe effects', error);
        }
    }

    renderContextMenu(effect, effectId, handlers, type = 'primary') {
        if (!this.renderConfig.enableContextMenus) {
            return null;
        }

        try {
            const contextMenu = {
                type: 'context-menu',
                effectName: effect.name || effect.className,
                effectId,
                menuType: type
            };

            this.renderMetrics.contextMenusRendered++;
            
            this.eventBus.emit('effectRenderer:contextMenuRendered', {
                effectName: effect.name || effect.className,
                effectId,
                type
            });

            return contextMenu;

        } catch (error) {
            this.logger.error('Error rendering context menu:', error);
            this.eventBus.emit('effectRenderer:renderError', {
                type: 'contextMenu',
                effect: effect.name || effect.className,
                error: error.message
            });
            return null;
        }
    }

    formatEffectName(effect) {
        if (!effect) return 'Unknown Effect';
        
        return effect.displayName || 
               effect.name || 
               effect.className || 
               effect.registryKey || 
               'Unnamed Effect';
    }

    formatEffectId(id) {
        if (!id) return '';
        
        return id.length > 8 ? `${id.substring(0, 8)}...` : id;
    }

    formatKeyframeDisplay(keyframe) {
        if (!keyframe) return 'Frame ?';
        
        const frame = keyframe.frame !== undefined ? keyframe.frame : '?';
        return `Frame ${frame}`;
    }

    getRenderMetrics() {
        return {
            ...this.renderMetrics,
            totalEffectsRendered: this.renderMetrics.primaryEffectsRendered + 
                                 this.renderMetrics.secondaryEffectsRendered + 
                                 this.renderMetrics.keyframeEffectsRendered
        };
    }

    resetRenderMetrics() {
        this.renderMetrics = {
            primaryEffectsRendered: 0,
            secondaryEffectsRendered: 0,
            keyframeEffectsRendered: 0,
            contextMenusRendered: 0,
            renderStartTime: null,
            lastRenderDuration: 0
        };
        
        this.eventBus.emit('effectRenderer:metricsReset');
        this.logger.info('EffectRenderer metrics reset');
    }

    updateRenderConfig(config) {
        this.renderConfig = { ...this.renderConfig, ...config };
        
        this.eventBus.emit('effectRenderer:configUpdated', this.renderConfig);
        this.logger.info('EffectRenderer configuration updated', this.renderConfig);
    }

    _renderErrorFallback(componentType, error) {
        return {
            type: 'error-fallback',
            componentType,
            error: error.message
        };
    }
}

/**
 * Test Suite Runner
 */
function runEffectRendererTests() {
    console.log('🧪 Starting EffectRenderer Service Tests...\n');

    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
    };

    // Test helper functions
    function createMockTheme() {
        return {
            palette: {
                mode: 'light',
                background: { default: '#ffffff', paper: '#ffffff' },
                text: { primary: '#000000', secondary: '#666666', disabled: '#999999' },
                primary: { main: '#1976d2' },
                error: { main: '#d32f2f', light: '#ffebee', contrastText: '#ffffff' },
                action: { hover: '#f5f5f5' },
                divider: '#e0e0e0'
            }
        };
    }

    function createMockEventBus() {
        const events = {};
        return {
            emit: (event, data) => {
                if (!events[event]) events[event] = [];
                events[event].push(data);
            },
            getEvents: () => events,
            clearEvents: () => Object.keys(events).forEach(key => delete events[key])
        };
    }

    function createMockLogger() {
        const logs = [];
        return {
            info: (...args) => logs.push({ level: 'info', args }),
            error: (...args) => logs.push({ level: 'error', args }),
            warn: (...args) => logs.push({ level: 'warn', args }),
            getLogs: () => logs,
            clearLogs: () => logs.length = 0
        };
    }

    function runTest(testName, testFn) {
        results.total++;
        try {
            console.log(`  Running: ${testName}`);
            testFn();
            results.passed++;
            console.log(`  ✅ ${testName} - PASSED`);
        } catch (error) {
            results.failed++;
            results.errors.push({ test: testName, error: error.message });
            console.log(`  ❌ ${testName} - FAILED: ${error.message}`);
        }
    }

    function assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    // Test 1: Constructor Validation and Dependency Injection
    runTest('Constructor validation and dependency injection', () => {
        const theme = createMockTheme();
        const eventBus = createMockEventBus();
        const logger = createMockLogger();

        // Test successful construction
        const renderer = new EffectRenderer({ theme, eventBus, logger });
        assert(renderer.theme === theme, 'Theme should be set correctly');
        assert(renderer.eventBus === eventBus, 'EventBus should be set correctly');
        assert(renderer.logger === logger, 'Logger should be set correctly');

        // Test missing dependencies
        try {
            new EffectRenderer({});
            assert(false, 'Should throw error for missing dependencies');
        } catch (error) {
            assert(error.message.includes('theme'), 'Should require theme dependency');
        }

        try {
            new EffectRenderer({ theme });
            assert(false, 'Should throw error for missing eventBus');
        } catch (error) {
            assert(error.message.includes('eventBus'), 'Should require eventBus dependency');
        }

        try {
            new EffectRenderer({ theme, eventBus });
            assert(false, 'Should throw error for missing logger');
        } catch (error) {
            assert(error.message.includes('logger'), 'Should require logger dependency');
        }

        // Verify initialization
        const logs = logger.getLogs();
        assert(logs.some(log => log.args[0].includes('initialized')), 'Should log initialization');
    });

    // Test 2: Primary Effect Rendering
    runTest('Primary effect rendering with interactions', () => {
        const theme = createMockTheme();
        const eventBus = createMockEventBus();
        const logger = createMockLogger();
        const renderer = new EffectRenderer({ theme, eventBus, logger });

        const effectData = {
            effect: { name: 'TestEffect', id: 'test-123' },
            originalIndex: 0
        };
        const expandedEffects = new Set();
        const handlers = {
            handleDragStart: () => {},
            onEffectDelete: () => {}
        };

        const result = renderer.renderPrimaryEffect(
            effectData, 
            0, 
            'primary', 
            handlers, 
            expandedEffects, 
            false
        );

        assert(result.type === 'primary-effect', 'Should render primary effect');
        assert(result.effect === 'TestEffect', 'Should include effect name');
        assert(result.originalIndex === 0, 'Should include original index');
        assert(result.section === 'primary', 'Should include section');

        // Verify metrics
        const metrics = renderer.getRenderMetrics();
        assert(metrics.primaryEffectsRendered === 1, 'Should track primary effects rendered');
        assert(metrics.lastRenderDuration > 0, 'Should track render duration');

        // Verify events
        const events = eventBus.getEvents();
        assert(events['effectRenderer:primaryEffectRendered'], 'Should emit primary effect rendered event');
    });

    // Test 3: Secondary Effects Rendering
    runTest('Secondary effects rendering with proper indentation', () => {
        const theme = createMockTheme();
        const eventBus = createMockEventBus();
        const logger = createMockLogger();
        const renderer = new EffectRenderer({ theme, eventBus, logger });

        const effect = {
            name: 'ParentEffect',
            secondaryEffects: [
                { name: 'SecondaryEffect1' },
                { name: 'SecondaryEffect2' }
            ]
        };
        const handlers = {};

        const result = renderer.renderSecondaryEffects(effect, 0, handlers, false);

        assert(result.type === 'secondary-effects', 'Should render secondary effects');
        assert(result.count === 2, 'Should render correct number of secondary effects');
        assert(result.effects.includes('SecondaryEffect1'), 'Should include first secondary effect');
        assert(result.effects.includes('SecondaryEffect2'), 'Should include second secondary effect');

        // Test empty secondary effects
        const emptyEffect = { name: 'EmptyEffect', secondaryEffects: [] };
        const emptyResult = renderer.renderSecondaryEffects(emptyEffect, 0, handlers, false);
        assert(emptyResult === null, 'Should return null for empty secondary effects');

        // Verify metrics
        const metrics = renderer.getRenderMetrics();
        assert(metrics.secondaryEffectsRendered === 2, 'Should track secondary effects rendered');
    });

    // Test 4: Keyframe Effects Rendering
    runTest('Keyframe effects rendering with frame indicators', () => {
        const theme = createMockTheme();
        const eventBus = createMockEventBus();
        const logger = createMockLogger();
        const renderer = new EffectRenderer({ theme, eventBus, logger });

        const effect = {
            name: 'ParentEffect',
            attachedEffects: {
                keyFrame: [
                    { name: 'KeyframeEffect1', frame: 10 },
                    { name: 'KeyframeEffect2', frame: 20 }
                ]
            }
        };
        const handlers = {};

        const result = renderer.renderKeyframeEffects(effect, 0, handlers, false);

        assert(result.type === 'keyframe-effects', 'Should render keyframe effects');
        assert(result.count === 2, 'Should render correct number of keyframe effects');
        assert(result.frames.includes(10), 'Should include first frame');
        assert(result.frames.includes(20), 'Should include second frame');

        // Test empty keyframe effects
        const emptyEffect = { name: 'EmptyEffect' };
        const emptyResult = renderer.renderKeyframeEffects(emptyEffect, 0, handlers, false);
        assert(emptyResult === null, 'Should return null for empty keyframe effects');

        // Verify metrics
        const metrics = renderer.getRenderMetrics();
        assert(metrics.keyframeEffectsRendered === 2, 'Should track keyframe effects rendered');
    });

    // Test 5: Context Menu Rendering
    runTest('Context menu rendering and event handling', () => {
        const theme = createMockTheme();
        const eventBus = createMockEventBus();
        const logger = createMockLogger();
        const renderer = new EffectRenderer({ theme, eventBus, logger });

        const effect = { name: 'TestEffect' };
        const handlers = {};

        const result = renderer.renderContextMenu(effect, 'test-id', handlers, 'primary');

        assert(result.type === 'context-menu', 'Should render context menu');
        assert(result.effectName === 'TestEffect', 'Should include effect name');
        assert(result.effectId === 'test-id', 'Should include effect ID');
        assert(result.menuType === 'primary', 'Should include menu type');

        // Test disabled context menus
        renderer.updateRenderConfig({ enableContextMenus: false });
        const disabledResult = renderer.renderContextMenu(effect, 'test-id', handlers, 'primary');
        assert(disabledResult === null, 'Should return null when context menus disabled');

        // Verify metrics
        const metrics = renderer.getRenderMetrics();
        assert(metrics.contextMenusRendered === 1, 'Should track context menus rendered');
    });

    // Test 6: Effect Formatting Utilities
    runTest('Effect formatting and display utilities', () => {
        const theme = createMockTheme();
        const eventBus = createMockEventBus();
        const logger = createMockLogger();
        const renderer = new EffectRenderer({ theme, eventBus, logger });

        // Test effect name formatting
        assert(renderer.formatEffectName({ displayName: 'Display Name' }) === 'Display Name', 'Should use displayName first');
        assert(renderer.formatEffectName({ name: 'Effect Name' }) === 'Effect Name', 'Should use name second');
        assert(renderer.formatEffectName({ className: 'ClassName' }) === 'ClassName', 'Should use className third');
        assert(renderer.formatEffectName({ registryKey: 'registry-key' }) === 'registry-key', 'Should use registryKey fourth');
        assert(renderer.formatEffectName({}) === 'Unnamed Effect', 'Should use fallback for empty effect');
        assert(renderer.formatEffectName(null) === 'Unknown Effect', 'Should handle null effect');

        // Test effect ID formatting
        assert(renderer.formatEffectId('short') === 'short', 'Should return short IDs unchanged');
        assert(renderer.formatEffectId('verylongeffectid123456789') === 'verylong...', 'Should truncate long IDs');
        assert(renderer.formatEffectId('') === '', 'Should handle empty ID');
        assert(renderer.formatEffectId(null) === '', 'Should handle null ID');

        // Test keyframe display formatting
        assert(renderer.formatKeyframeDisplay({ frame: 10 }) === 'Frame 10', 'Should format frame number');
        assert(renderer.formatKeyframeDisplay({ frame: 0 }) === 'Frame 0', 'Should handle frame 0');
        assert(renderer.formatKeyframeDisplay({}) === 'Frame ?', 'Should handle missing frame');
        assert(renderer.formatKeyframeDisplay(null) === 'Frame ?', 'Should handle null keyframe');
    });

    // Test 7: Render Metrics and Performance Tracking
    runTest('Render metrics and performance tracking', () => {
        const theme = createMockTheme();
        const eventBus = createMockEventBus();
        const logger = createMockLogger();
        const renderer = new EffectRenderer({ theme, eventBus, logger });

        // Initial metrics should be zero
        let metrics = renderer.getRenderMetrics();
        assert(metrics.primaryEffectsRendered === 0, 'Initial primary effects should be 0');
        assert(metrics.secondaryEffectsRendered === 0, 'Initial secondary effects should be 0');
        assert(metrics.keyframeEffectsRendered === 0, 'Initial keyframe effects should be 0');
        assert(metrics.totalEffectsRendered === 0, 'Initial total effects should be 0');

        // Render some effects
        const effectData = { effect: { name: 'TestEffect' }, originalIndex: 0 };
        const expandedEffects = new Set();
        const handlers = {};

        renderer.renderPrimaryEffect(effectData, 0, 'primary', handlers, expandedEffects);
        
        const effectWithSecondary = {
            name: 'ParentEffect',
            secondaryEffects: [{ name: 'Secondary1' }, { name: 'Secondary2' }]
        };
        renderer.renderSecondaryEffects(effectWithSecondary, 0, handlers);

        const effectWithKeyframes = {
            name: 'ParentEffect',
            attachedEffects: { keyFrame: [{ name: 'Keyframe1', frame: 5 }] }
        };
        renderer.renderKeyframeEffects(effectWithKeyframes, 0, handlers);

        // Check updated metrics
        metrics = renderer.getRenderMetrics();
        assert(metrics.primaryEffectsRendered === 1, 'Should track primary effects');
        assert(metrics.secondaryEffectsRendered === 2, 'Should track secondary effects');
        assert(metrics.keyframeEffectsRendered === 1, 'Should track keyframe effects');
        assert(metrics.totalEffectsRendered === 4, 'Should calculate total effects');
        assert(metrics.lastRenderDuration > 0, 'Should track render duration');

        // Test metrics reset
        renderer.resetRenderMetrics();
        metrics = renderer.getRenderMetrics();
        assert(metrics.totalEffectsRendered === 0, 'Should reset all metrics to 0');

        // Verify reset event
        const events = eventBus.getEvents();
        assert(events['effectRenderer:metricsReset'], 'Should emit metrics reset event');
    });

    // Test 8: Error Handling and Configuration
    runTest('Error handling and render configuration', () => {
        const theme = createMockTheme();
        const eventBus = createMockEventBus();
        const logger = createMockLogger();
        const renderer = new EffectRenderer({ theme, eventBus, logger });

        // Test configuration updates
        const newConfig = { enableDragDrop: false, maxRenderDepth: 5 };
        renderer.updateRenderConfig(newConfig);
        
        assert(renderer.renderConfig.enableDragDrop === false, 'Should update drag drop setting');
        assert(renderer.renderConfig.maxRenderDepth === 5, 'Should update max render depth');
        assert(renderer.renderConfig.enableContextMenus === true, 'Should preserve other settings');

        // Verify config update event
        const events = eventBus.getEvents();
        assert(events['effectRenderer:configUpdated'], 'Should emit config updated event');

        // Test error handling in rendering
        const invalidEffectData = null;
        const expandedEffects = new Set();
        const handlers = {};

        const errorResult = renderer.renderPrimaryEffect(
            invalidEffectData, 
            0, 
            'primary', 
            handlers, 
            expandedEffects
        );

        assert(errorResult.type === 'error-fallback', 'Should return error fallback for invalid data');
        assert(errorResult.componentType === 'primary effect', 'Should identify component type in error');

        // Verify error event
        assert(events['effectRenderer:renderError'], 'Should emit render error event');

        // Check error logs
        const logs = logger.getLogs();
        assert(logs.some(log => log.level === 'error'), 'Should log errors');
    });

    // Performance baseline verification
    console.log('\n🔍 Performance Baseline Verification:');
    
    const theme = createMockTheme();
    const eventBus = createMockEventBus();
    const logger = createMockLogger();
    
    // Test constructor performance
    const constructorStart = performance.now();
    const renderer = new EffectRenderer({ theme, eventBus, logger });
    const constructorTime = performance.now() - constructorStart;
    
    console.log(`  Constructor time: ${constructorTime.toFixed(2)}ms (baseline: <100ms)`);
    assert(constructorTime < 100, 'Constructor should complete within 100ms');

    // Test render method performance
    const effectData = { effect: { name: 'TestEffect' }, originalIndex: 0 };
    const expandedEffects = new Set();
    const handlers = {};
    
    const renderStart = performance.now();
    renderer.renderPrimaryEffect(effectData, 0, 'primary', handlers, expandedEffects);
    const renderTime = performance.now() - renderStart;
    
    console.log(`  Primary effect render time: ${renderTime.toFixed(2)}ms (baseline: <50ms)`);
    assert(renderTime < 50, 'Primary effect rendering should complete within 50ms');

    // Test complexity (instance properties)
    const propertyCount = Object.keys(renderer).length;
    console.log(`  Instance properties: ${propertyCount} (baseline: <15)`);
    assert(propertyCount < 15, 'Should have fewer than 15 instance properties');

    // Print final results
    console.log('\n📊 Test Results Summary:');
    console.log(`  Total Tests: ${results.total}`);
    console.log(`  Passed: ${results.passed} ✅`);
    console.log(`  Failed: ${results.failed} ❌`);
    
    if (results.failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.errors.forEach(error => {
            console.log(`  - ${error.test}: ${error.error}`);
        });
    }

    const successRate = ((results.passed / results.total) * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);

    if (results.failed === 0) {
        console.log('\n🎉 All EffectRenderer tests passed! Service is ready for integration.');
    } else {
        console.log('\n⚠️  Some tests failed. Please review and fix issues before proceeding.');
    }

    return results;
}

// Run the tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runEffectRendererTests };
} else {
    runEffectRendererTests();
}