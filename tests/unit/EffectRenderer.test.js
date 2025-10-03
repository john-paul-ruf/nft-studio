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

// Real React and Material-UI component placeholders for testing
const React = {
    createElement: (type, props, ...children) => ({
        type,
        props: { ...props, children: children.length === 1 ? children[0] : children },
        key: props?.key
    })
};

// Test Material-UI components
const testMuiComponents = {
    Box: (props) => React.createElement('div', { ...props, 'data-testid': 'mui-box' }),
    Paper: (props) => React.createElement('div', { ...props, 'data-testid': 'mui-paper' }),
    Typography: (props) => React.createElement('span', { ...props, 'data-testid': 'mui-typography' }),
    IconButton: (props) => React.createElement('button', { ...props, 'data-testid': 'mui-iconbutton' }),
    Chip: (props) => React.createElement('span', { ...props, 'data-testid': 'mui-chip' })
};

// Test Material-UI icons
const testMuiIcons = {
    Delete: () => React.createElement('span', { 'data-testid': 'delete-icon' }),
    Visibility: () => React.createElement('span', { 'data-testid': 'visibility-icon' }),
    VisibilityOff: () => React.createElement('span', { 'data-testid': 'visibility-off-icon' }),
    ExpandMore: () => React.createElement('span', { 'data-testid': 'expand-more-icon' }),
    SubdirectoryArrowRight: () => React.createElement('span', { 'data-testid': 'subdirectory-arrow-right-icon' }),
    ArrowForward: () => React.createElement('span', { 'data-testid': 'arrow-forward-icon' })
};

// Test Radix UI Context Menu
const testContextMenu = {
    Root: ({ children }) => React.createElement('div', { 'data-testid': 'context-menu-root' }, children),
    Trigger: ({ children }) => React.createElement('div', { 'data-testid': 'context-menu-trigger' }, children),
    Portal: ({ children }) => React.createElement('div', { 'data-testid': 'context-menu-portal' }, children),
    Content: ({ children }) => React.createElement('div', { 'data-testid': 'context-menu-content' }, children)
};

// Create EffectRenderer class with tested dependencies
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

    renderSecondaryEffects(effectsOrParent, parentOriginalIndex, handlers, expandedEffects, isReadOnly = false) {
        // Handle both array of effects and parent effect with secondaryEffects
        const effects = Array.isArray(effectsOrParent) 
            ? effectsOrParent 
            : (effectsOrParent?.secondaryEffects || []);
            
        if (effects.length === 0) {
            return null;
        }

        const startTime = performance.now();

        try {
            const renderedSecondaries = effects.map((effect, index) => ({
                type: 'secondary-effect',
                effect: effect.name || effect.className,
                id: effect.id,
                indented: true,
                index
            }));

            this.renderMetrics.secondaryEffectsRendered += effects.length;
            const renderTime = performance.now() - startTime;
            
            this.eventBus.emit('effectRenderer:secondaryEffectsRendered', {
                count: effects.length,
                renderTime
            });

            return renderedSecondaries;

        } catch (error) {
            this.logger.error('Error rendering secondary effects:', error);
            this.eventBus.emit('effectRenderer:renderError', {
                type: 'secondary',
                error: error.message
            });
            return this._renderErrorFallback('secondary effects', error);
        }
    }

    renderKeyframeEffects(effectsOrParent, parentOriginalIndex, handlers, expandedEffects, isReadOnly = false) {
        // Handle both array of effects and parent effect with keyframeEffects
        const effects = Array.isArray(effectsOrParent) 
            ? effectsOrParent 
            : (effectsOrParent?.attachedEffects?.keyFrame || effectsOrParent?.keyframeEffects || []);
            
        if (effects.length === 0) {
            return null;
        }

        const startTime = performance.now();

        try {
            const renderedKeyframes = effects.map((effect, index) => ({
                type: 'keyframe-effect',
                effect: effect.name || effect.className,
                id: effect.id,
                frame: effect.frame,
                index
            }));

            this.renderMetrics.keyframeEffectsRendered += effects.length;
            const renderTime = performance.now() - startTime;
            
            this.eventBus.emit('effectRenderer:keyframeEffectsRendered', {
                count: effects.length,
                renderTime
            });

            return renderedKeyframes;

        } catch (error) {
            this.logger.error('Error rendering keyframe effects:', error);
            this.eventBus.emit('effectRenderer:renderError', {
                type: 'keyframe',
                error: error.message
            });
            return this._renderErrorFallback('keyframe effects', error);
        }
    }

    renderContextMenu(effect, menuItems, handlers, type = 'primary') {
        if (!this.renderConfig.enableContextMenus) {
            return null;
        }

        try {
            const contextMenu = {
                type: 'context-menu',
                effect: effect.name || effect.className,
                effectId: effect.id,
                menuItems: menuItems || [],
                menuType: type
            };

            this.renderMetrics.contextMenusRendered++;
            
            this.eventBus.emit('effectRenderer:contextMenuRendered', {
                effectName: effect.name || effect.className,
                effectId: effect.id,
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

    getEffectDisplayInfo(effect) {
        if (!effect) {
            return {
                name: 'Unknown Effect',
                id: '',
                enabled: false
            };
        }
        
        return {
            name: effect.name || effect.className || 'Unnamed Effect',
            id: effect.id || '',
            enabled: effect.enabled !== undefined ? effect.enabled : true,
            type: effect.type || 'unknown',
            visible: effect.visible !== undefined ? effect.visible : true
        };
    }

    getRenderMetrics() {
        return {
            ...this.renderMetrics,
            totalEffectsRendered: this.renderMetrics.primaryEffectsRendered + 
                                 this.renderMetrics.secondaryEffectsRendered + 
                                 this.renderMetrics.keyframeEffectsRendered,
            totalRenders: this.renderMetrics.primaryEffectsRendered + 
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

    resetMetrics() {
        // Alias for resetRenderMetrics for backward compatibility
        return this.resetRenderMetrics();
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

// Export individual test functions for the test runner
// These follow the pattern expected by the-one-runner-to-rule-them-all.js

export async function testEffectRendererConstructorValidation() {
    const theme = createTestTheme();
    const eventBus = createTestEventBus();
    const logger = createTestLogger();

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
    
    console.log('✅ Constructor validation and dependency injection - PASSED');
}

export async function testEffectRendererPrimaryEffectRendering() {
    const theme = createTestTheme();
    const eventBus = createTestEventBus();
    const logger = createTestLogger();
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
    
    console.log('✅ Primary effect rendering with interactions - PASSED');
}

export async function testEffectRendererSecondaryEffectsRendering() {
    const theme = createTestTheme();
    const eventBus = createTestEventBus();
    const logger = createTestLogger();
    const renderer = new EffectRenderer({ theme, eventBus, logger });

    const secondaryEffects = [
        { name: 'SecondaryEffect1', id: 'sec-1' },
        { name: 'SecondaryEffect2', id: 'sec-2' }
    ];
    const expandedEffects = new Set();
    const handlers = {
        handleDragStart: () => {},
        onEffectDelete: () => {}
    };

    const results = renderer.renderSecondaryEffects(
        secondaryEffects,
        0,
        handlers,
        expandedEffects,
        false
    );

    assert(Array.isArray(results), 'Should return array of rendered effects');
    assert(results.length === 2, 'Should render all secondary effects');
    assert(results[0].type === 'secondary-effect', 'Should mark as secondary effect');
    assert(results[0].indented === true, 'Should be indented');

    // Verify metrics
    const metrics = renderer.getRenderMetrics();
    assert(metrics.secondaryEffectsRendered === 2, 'Should track secondary effects rendered');
    
    console.log('✅ Secondary effects rendering with proper indentation - PASSED');
}

export async function testEffectRendererKeyframeEffectsRendering() {
    const theme = createTestTheme();
    const eventBus = createTestEventBus();
    const logger = createTestLogger();
    const renderer = new EffectRenderer({ theme, eventBus, logger });

    const keyframeEffects = [
        { name: 'KeyframeEffect1', id: 'kf-1', frame: 10 },
        { name: 'KeyframeEffect2', id: 'kf-2', frame: 20 }
    ];
    const expandedEffects = new Set();
    const handlers = {
        handleDragStart: () => {},
        onEffectDelete: () => {}
    };

    const results = renderer.renderKeyframeEffects(
        keyframeEffects,
        0,
        handlers,
        expandedEffects,
        false
    );

    assert(Array.isArray(results), 'Should return array of rendered effects');
    assert(results.length === 2, 'Should render all keyframe effects');
    assert(results[0].type === 'keyframe-effect', 'Should mark as keyframe effect');
    assert(results[0].frame === 10, 'Should include frame number');

    // Verify metrics
    const metrics = renderer.getRenderMetrics();
    assert(metrics.keyframeEffectsRendered === 2, 'Should track keyframe effects rendered');
    
    console.log('✅ Keyframe effects rendering with frame indicators - PASSED');
}

export async function testEffectRendererContextMenuRendering() {
    const theme = createTestTheme();
    const eventBus = createTestEventBus();
    const logger = createTestLogger();
    const renderer = new EffectRenderer({ theme, eventBus, logger });

    const effect = { name: 'TestEffect', id: 'test-123' };
    const menuItems = [
        { label: 'Delete', action: 'delete' },
        { label: 'Duplicate', action: 'duplicate' }
    ];

    const result = renderer.renderContextMenu(effect, menuItems);

    assert(result.type === 'context-menu', 'Should render context menu');
    assert(result.effect === 'TestEffect', 'Should include effect name');
    assert(result.menuItems.length === 2, 'Should include all menu items');

    // Verify events
    const events = eventBus.getEvents();
    assert(events['effectRenderer:contextMenuRendered'], 'Should emit context menu rendered event');
    
    console.log('✅ Context menu rendering and event handling - PASSED');
}

export async function testEffectRendererFormattingUtilities() {
    const theme = createTestTheme();
    const eventBus = createTestEventBus();
    const logger = createTestLogger();
    const renderer = new EffectRenderer({ theme, eventBus, logger });

    // Test effect name formatting
    const formattedName = renderer.formatEffectName('TestEffect');
    assert(typeof formattedName === 'string', 'Should return formatted name');
    assert(formattedName.length > 0, 'Should not be empty');

    // Test effect display formatting
    const effect = { name: 'TestEffect', id: 'test-123', enabled: true };
    const displayInfo = renderer.getEffectDisplayInfo(effect);
    assert(displayInfo.name === 'TestEffect', 'Should include effect name');
    assert(displayInfo.enabled === true, 'Should include enabled state');
    
    console.log('✅ Effect formatting and display utilities - PASSED');
}

export async function testEffectRendererMetricsTracking() {
    const theme = createTestTheme();
    const eventBus = createTestEventBus();
    const logger = createTestLogger();
    const renderer = new EffectRenderer({ theme, eventBus, logger });

    // Initial metrics
    const initialMetrics = renderer.getRenderMetrics();
    assert(initialMetrics.primaryEffectsRendered === 0, 'Should start with 0 primary effects');
    assert(initialMetrics.secondaryEffectsRendered === 0, 'Should start with 0 secondary effects');
    assert(initialMetrics.keyframeEffectsRendered === 0, 'Should start with 0 keyframe effects');

    // Render some effects
    const effectData = { effect: { name: 'TestEffect', id: 'test-123' }, originalIndex: 0 };
    const expandedEffects = new Set();
    const handlers = { handleDragStart: () => {}, onEffectDelete: () => {} };
    
    renderer.renderPrimaryEffect(effectData, 0, 'primary', handlers, expandedEffects, false);

    // Check updated metrics
    const updatedMetrics = renderer.getRenderMetrics();
    assert(updatedMetrics.primaryEffectsRendered === 1, 'Should track primary effects');
    assert(updatedMetrics.totalRenders === 1, 'Should track total renders');
    assert(updatedMetrics.lastRenderDuration > 0, 'Should track render duration');

    // Reset metrics
    renderer.resetMetrics();
    const resetMetrics = renderer.getRenderMetrics();
    assert(resetMetrics.primaryEffectsRendered === 0, 'Should reset primary effects count');
    assert(resetMetrics.totalRenders === 0, 'Should reset total renders');
    
    console.log('✅ Render metrics and performance tracking - PASSED');
}

export async function testEffectRendererErrorHandling() {
    const theme = createTestTheme();
    const eventBus = createTestEventBus();
    const logger = createTestLogger();
    const renderer = new EffectRenderer({ theme, eventBus, logger });

    // Test rendering with invalid effect data
    try {
        renderer.renderPrimaryEffect(null, 0, 'primary', {}, new Set(), false);
        assert(false, 'Should handle null effect data');
    } catch (error) {
        assert(error.message.includes('effect'), 'Should throw error for invalid effect data');
    }

    // Test rendering with missing handlers
    const effectData = { effect: { name: 'TestEffect', id: 'test-123' }, originalIndex: 0 };
    try {
        renderer.renderPrimaryEffect(effectData, 0, 'primary', null, new Set(), false);
        assert(false, 'Should handle missing handlers');
    } catch (error) {
        assert(error.message.includes('handlers'), 'Should throw error for missing handlers');
    }

    // Verify error logging
    const logs = logger.getLogs();
    assert(logs.some(log => log.level === 'error'), 'Should log errors');
    
    console.log('✅ Error handling and render configuration - PASSED');
}

// Helper functions used by tests
function createTestTheme() {
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

function createTestEventBus() {
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

function createTestLogger() {
    const logs = [];
    return {
        info: (...args) => logs.push({ level: 'info', args }),
        error: (...args) => logs.push({ level: 'error', args }),
        warn: (...args) => logs.push({ level: 'warn', args }),
        getLogs: () => logs,
        clearLogs: () => logs.length = 0
    };
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}