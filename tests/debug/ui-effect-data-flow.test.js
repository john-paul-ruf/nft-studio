#!/usr/bin/env node
/**
 * Test to debug UI effect data flow and identify where effects become undefined
 * This will simulate the exact path from UI to backend
 */

console.log('🔍 UI Effect Data Flow Debug Test\n');

// Mock the UI effect creation process
function simulateEffectPicker() {
    console.log('1. 📱 Simulating EffectPicker.jsx effect creation...');

    // This simulates what EffectPicker.handleEffectSelect creates
    const newEffect = {
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
    };

    console.log('   ✓ Effect created:', {
        className: newEffect.className,
        configKeys: Object.keys(newEffect.config),
        type: newEffect.type
    });

    return newEffect;
}

function simulateCanvasState() {
    console.log('\n2. 🖼️  Simulating Canvas.jsx state management...');

    const effect = simulateEffectPicker();

    // Simulate Canvas state
    const canvasConfig = {
        targetResolution: 512,
        isHorizontal: false,
        numFrames: 100,
        effects: [effect],  // This is how Canvas stores effects
        colorScheme: 'neon-cyberpunk'
    };

    console.log('   ✓ Canvas config created:', {
        effectsCount: canvasConfig.effects.length,
        firstEffectClass: canvasConfig.effects[0]?.className,
        firstEffectType: canvasConfig.effects[0]?.type
    });

    return canvasConfig;
}

function simulateRenderCall() {
    console.log('\n3. 🚀 Simulating Canvas.handleRender...');

    const config = simulateCanvasState();

    // This simulates Canvas.handleRender's renderConfig creation
    const renderConfig = {
        ...config,
        width: 512,
        height: 512,
        renderStartFrame: 0,
        renderJumpFrames: config.numFrames + 1
    };

    console.log('   ✓ Render config prepared:', {
        width: renderConfig.width,
        height: renderConfig.height,
        effectsLength: renderConfig.effects?.length,
        firstEffect: renderConfig.effects?.[0] ? 'defined' : 'undefined'
    });

    return renderConfig;
}

function simulateIPCTransfer(renderConfig) {
    console.log('\n4. 📡 Simulating IPC transfer to backend...');

    // This simulates what happens when data is sent via IPC
    const serialized = JSON.stringify(renderConfig);
    const deserialized = JSON.parse(serialized);

    console.log('   ✓ IPC serialization test:', {
        originalEffectsLength: renderConfig.effects?.length,
        deserializedEffectsLength: deserialized.effects?.length,
        effectPreserved: deserialized.effects?.[0]?.className === renderConfig.effects?.[0]?.className,
        configPreserved: JSON.stringify(deserialized.effects?.[0]?.config) === JSON.stringify(renderConfig.effects?.[0]?.config)
    });

    return deserialized;
}

function simulateBackendReceive(config) {
    console.log('\n5. ⚙️  Simulating backend processing...');

    console.log('   📋 Backend received config structure:');
    console.log('      - Config keys:', Object.keys(config));
    console.log('      - Effects array?', Array.isArray(config.effects));
    console.log('      - Effects length:', config.effects?.length);

    if (config.effects && config.effects.length > 0) {
        config.effects.forEach((effect, index) => {
            console.log(`      - Effect ${index}:`, {
                defined: effect !== undefined,
                className: effect?.className,
                hasConfig: !!effect?.config,
                configKeys: effect?.config ? Object.keys(effect.config) : 'no config'
            });
        });
    } else {
        console.log('      ❌ No effects found in config!');
    }

    return config;
}

function testEffectProcessingService(config) {
    console.log('\n6. 🔧 Simulating EffectProcessingService.processEffects...');

    const effects = config.effects || [];

    console.log(`   📊 Processing ${effects.length} effects...`);

    for (let i = 0; i < effects.length; i++) {
        const effect = effects[i];
        console.log(`
        Effect ${i}:
        - Raw effect object:`, effect);
        console.log(`   - Effect defined?`, effect !== undefined);
        console.log(`   - Effect keys:`, effect ? Object.keys(effect) : 'undefined effect');
        console.log(`   - className:`, effect?.className);
        console.log(`   - effectClass?.name:`, effect?.effectClass?.name);

        // This is where the error occurs
        const effectName = effect?.className || effect?.effectClass?.name;
        console.log(`   - Resolved effect name:`, effectName);

        if (!effectName) {
            console.log(`   ❌ No effect name found - this would cause "undefined" error!`);
        }
    }
}

// Run the complete simulation
console.log('🏁 Starting complete UI → Backend data flow simulation...\n');

try {
    const renderConfig = simulateRenderCall();
    const ipcConfig = simulateIPCTransfer(renderConfig);
    const backendConfig = simulateBackendReceive(ipcConfig);
    testEffectProcessingService(backendConfig);

    console.log('\n✅ Data flow simulation completed successfully!');

} catch (error) {
    console.error('\n❌ Data flow simulation failed:', error);
}

// Test with problematic data to identify issues
console.log('\n\n🧪 Testing with problematic data...\n');

const problematicConfigs = [
    { name: 'Empty effects array', config: { effects: [] } },
    { name: 'Undefined effects', config: { effects: undefined } },
    { name: 'Null effects', config: { effects: null } },
    { name: 'Effects with undefined items', config: { effects: [undefined, null] } },
    { name: 'Effects with missing className', config: { effects: [{ config: {}, type: 'primary' }] } }
];

for (const test of problematicConfigs) {
    console.log(`\n🔍 Testing: ${test.name}`);
    try {
        testEffectProcessingService(test.config);
        console.log('   ✓ Handled gracefully');
    } catch (error) {
        console.log('   ❌ Would cause error:', error.message);
    }
}

console.log('\n🎯 Debug test completed!');