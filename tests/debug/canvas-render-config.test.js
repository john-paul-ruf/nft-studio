#!/usr/bin/env node
/**
 * Test Canvas component render config creation
 * Tests what the actual Canvas component sends to the backend
 */

console.log('🧪 Testing Canvas Render Config Creation\n');

// Mock Canvas state as it would exist in the UI
const mockCanvasState = {
    targetResolution: 512,
    isHorizontal: false,
    numFrames: 100,
    effects: [
        // Valid effect (what EffectPicker would create)
        {
            className: 'HexEffect',
            config: {
                numberOfHex: 8,
                strategy: ['rotate'],
                innerColor: '#FF0000',
                outerColor: '#0000FF'
            },
            type: 'primary',
            secondaryEffects: [],
            attachedEffects: {
                secondary: [],
                keyFrame: []
            }
        }
    ],
    colorScheme: 'neon-cyberpunk'
};

console.log('1. 📱 Mock Canvas State:');
console.log('   - Effects count:', mockCanvasState.effects.length);
console.log('   - First effect:', mockCanvasState.effects[0]);

// Simulate Canvas.handleRender function
function simulateCanvasHandleRender(config, selectedFrame = 0) {
    console.log('\n2. 🚀 Simulating Canvas.handleRender...');

    // This replicates Canvas.jsx handleRender logic exactly
    const dimensions = { w: 512, h: 512 }; // getResolutionDimensions()

    const renderConfig = {
        ...config,
        width: dimensions.w,
        height: dimensions.h,
        renderStartFrame: selectedFrame,
        renderJumpFrames: config.numFrames + 1
    };

    console.log('   📋 Render config created:', {
        width: renderConfig.width,
        height: renderConfig.height,
        frame: selectedFrame,
        effects: renderConfig.effects?.length || 0,
        colorScheme: renderConfig.colorScheme,
        effectsStructure: renderConfig.effects?.map(e => ({
            className: e.className,
            type: e.type,
            hasConfig: !!e.config
        }))
    });

    return renderConfig;
}

// Test with the mock state
const renderConfig = simulateCanvasHandleRender(mockCanvasState);

console.log('\n3. 🔍 Final Render Config Analysis:');
console.log('   Config keys:', Object.keys(renderConfig));
console.log('   Effects is array?', Array.isArray(renderConfig.effects));
console.log('   Effects length:', renderConfig.effects?.length);

if (renderConfig.effects && renderConfig.effects.length > 0) {
    renderConfig.effects.forEach((effect, index) => {
        console.log(`   Effect ${index}:`, {
            className: effect.className,
            type: effect.type,
            configKeys: effect.config ? Object.keys(effect.config) : 'no config',
            hasSecondaryEffects: Array.isArray(effect.secondaryEffects),
            hasKeyframeEffects: Array.isArray(effect.attachedEffects?.keyFrame)
        });
    });
}

console.log('\n4. 📡 Testing IPC Serialization:');
const serialized = JSON.stringify(renderConfig);
const deserialized = JSON.parse(serialized);

console.log('   Serialization successful:', serialized.length > 0);
console.log('   Effects preserved:', deserialized.effects?.length === renderConfig.effects?.length);
console.log('   First effect preserved:', deserialized.effects?.[0]?.className === renderConfig.effects?.[0]?.className);

// Test problematic cases that might be happening in the UI
console.log('\n5. 🧨 Testing Problematic UI States:');

const problematicStates = [
    {
        name: 'Empty effects array',
        state: { ...mockCanvasState, effects: [] }
    },
    {
        name: 'Effects array with null',
        state: { ...mockCanvasState, effects: [null] }
    },
    {
        name: 'Effects array with undefined',
        state: { ...mockCanvasState, effects: [undefined] }
    },
    {
        name: 'Effects with missing className',
        state: {
            ...mockCanvasState,
            effects: [{ config: {}, type: 'primary' }]
        }
    },
    {
        name: 'No effects property',
        state: { ...mockCanvasState, effects: undefined }
    }
];

for (const test of problematicStates) {
    console.log(`\n   Testing: ${test.name}`);
    try {
        const testRenderConfig = simulateCanvasHandleRender(test.state);
        console.log('     ✓ Config created successfully');
        console.log('     Effects:', testRenderConfig.effects);
    } catch (error) {
        console.log('     ❌ Error:', error.message);
    }
}

console.log('\n🎯 Canvas render config test completed!');

// Now test what would happen when this config hits the backend
console.log('\n6. ⚙️  Testing Backend Processing:');

function simulateBackendProcessing(config) {
    console.log('   Backend received config keys:', Object.keys(config));
    console.log('   Effects type:', typeof config.effects);
    console.log('   Effects is array:', Array.isArray(config.effects));
    console.log('   Effects length:', config.effects?.length);

    if (config.effects) {
        config.effects.forEach((effect, index) => {
            console.log(`   Processing effect ${index}:`, {
                effectDefined: effect !== undefined && effect !== null,
                effectType: typeof effect,
                className: effect?.className,
                effectName: effect?.className || effect?.effectClass?.name
            });
        });
    }
}

simulateBackendProcessing(renderConfig);