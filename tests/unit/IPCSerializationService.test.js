/**
 * IPCSerializationService Tests
 * 
 * Tests for IPC serialization service that handles config object serialization
 * for inter-process communication, including ColorPicker and range object handling.
 * 
 * REAL OBJECTS ONLY - NO MOCKS
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import IPCSerializationService from '../../src/services/IPCSerializationService.js';

/**
 * Test 1: Service initialization and method availability
 */
export async function testIPCSerializationServiceInitialization() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Verify service exists and has expected methods
        if (!IPCSerializationService) {
            throw new Error('IPCSerializationService should be defined');
        }
        if (typeof IPCSerializationService.serializeConfigForIPC !== 'function') {
            throw new Error('serializeConfigForIPC method should exist');
        }
        if (typeof IPCSerializationService.serializeProjectForIPC !== 'function') {
            throw new Error('serializeProjectForIPC method should exist');
        }

        console.log('✅ IPCSerializationService initialized with all expected methods');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 2: Basic config serialization with primitive values
 */
export async function testBasicConfigSerialization() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const config = {
            name: 'test-effect',
            enabled: true,
            opacity: 0.8,
            count: 42,
            description: null,
            tags: undefined
        };

        const result = IPCSerializationService.serializeConfigForIPC(config);

        // Verify all primitive values are preserved
        if (result.name !== 'test-effect') throw new Error('String value not preserved');
        if (result.enabled !== true) throw new Error('Boolean value not preserved');
        if (result.opacity !== 0.8) throw new Error('Number value not preserved');
        if (result.count !== 42) throw new Error('Integer value not preserved');
        if (result.description !== null) throw new Error('Null value not preserved');
        if (result.tags !== undefined) throw new Error('Undefined value not preserved');

        console.log('✅ Basic config serialization preserves primitive values correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 3: Function removal during serialization
 */
export async function testFunctionRemoval() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const config = {
            name: 'test-effect',
            getValue: () => 'test-value',
            calculate: function() { return 42; },
            data: {
                nested: true,
                getNestedValue: () => 'nested'
            }
        };

        const result = IPCSerializationService.serializeConfigForIPC(config);

        // Verify functions are removed
        if (result.getValue !== undefined) throw new Error('Function getValue should be removed');
        if (result.calculate !== undefined) throw new Error('Function calculate should be removed');
        if (result.data.getNestedValue !== undefined) throw new Error('Nested function should be removed');
        
        // Verify other values are preserved
        if (result.name !== 'test-effect') throw new Error('Name should be preserved');
        if (result.data.nested !== true) throw new Error('Nested data should be preserved');

        console.log('✅ Functions removed correctly during serialization');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 4: ColorPicker object serialization
 */
export async function testColorPickerSerialization() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const mockColorPicker = {
            getColor: () => '#ff0000',
            selectionType: 'colorBucket',
            colorValue: '#ff0000',
            someMethod: () => 'test'
        };

        const config = {
            primaryColor: mockColorPicker,
            secondaryColor: {
                getColor: () => '#00ff00',
                selectionType: 'custom',
                colorValue: '#00ff00'
            }
        };

        const result = IPCSerializationService.serializeConfigForIPC(config);

        // Verify ColorPicker serialization
        if (result.primaryColor.selectionType !== 'colorBucket') throw new Error('Primary color selectionType not preserved');
        if (result.primaryColor.colorValue !== '#ff0000') throw new Error('Primary color colorValue not preserved');
        if (result.primaryColor.__className !== 'ColorPicker') throw new Error('Primary color __className not set');
        if (result.primaryColor.getColor !== undefined) throw new Error('Primary color getColor method should be removed');
        if (result.primaryColor.someMethod !== undefined) throw new Error('Primary color someMethod should be removed');

        if (result.secondaryColor.selectionType !== 'custom') throw new Error('Secondary color selectionType not preserved');
        if (result.secondaryColor.colorValue !== '#00ff00') throw new Error('Secondary color colorValue not preserved');
        if (result.secondaryColor.__className !== 'ColorPicker') throw new Error('Secondary color __className not set');

        console.log('✅ ColorPicker objects serialized correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 5: Range object serialization with working methods
 */
export async function testRangeObjectSerialization() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const mockRange = {
            lower: () => 10,
            upper: () => 50,
            someOtherMethod: () => 'test'
        };

        const config = {
            sizeRange: mockRange,
            opacityRange: {
                lower: () => 0.2,
                upper: () => 0.8
            }
        };

        const result = IPCSerializationService.serializeConfigForIPC(config);

        // Verify range serialization
        if (result.sizeRange.lower !== 10) throw new Error('Size range lower value not extracted');
        if (result.sizeRange.upper !== 50) throw new Error('Size range upper value not extracted');
        if (result.sizeRange.someOtherMethod !== undefined) throw new Error('Range method should be removed');

        if (result.opacityRange.lower !== 0.2) throw new Error('Opacity range lower value not extracted');
        if (result.opacityRange.upper !== 0.8) throw new Error('Opacity range upper value not extracted');

        console.log('✅ Range objects serialized correctly with method extraction');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 6: Range object serialization with failing methods and fallback
 */
export async function testRangeObjectFallback() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const mockRange = {
            lower: () => { throw new Error('Method failed'); },
            upper: () => { throw new Error('Method failed'); },
            lowerValue: 5,
            upperValue: 25
        };

        const config = {
            problematicRange: mockRange
        };

        const result = IPCSerializationService.serializeConfigForIPC(config);

        // Verify fallback values are used
        if (result.problematicRange.lower !== 5) throw new Error('Fallback lower value not used');
        if (result.problematicRange.upper !== 25) throw new Error('Fallback upper value not used');

        console.log('✅ Range object fallback values used correctly when methods fail');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 7: Complex nested object serialization
 */
export async function testComplexNestedSerialization() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const config = {
            effect: {
                name: 'complex-effect',
                settings: {
                    color: {
                        getColor: () => '#ff0000',
                        selectionType: 'colorBucket',
                        colorValue: '#ff0000'
                    },
                    range: {
                        lower: () => 10,
                        upper: () => 50
                    },
                    nested: {
                        deep: {
                            value: 42,
                            method: () => 'test'
                        }
                    }
                }
            }
        };

        const result = IPCSerializationService.serializeConfigForIPC(config);

        // Verify nested structure is preserved
        if (result.effect.name !== 'complex-effect') throw new Error('Effect name not preserved');
        if (result.effect.settings.color.__className !== 'ColorPicker') throw new Error('Nested ColorPicker not serialized');
        if (result.effect.settings.range.lower !== 10) throw new Error('Nested range not serialized');
        if (result.effect.settings.nested.deep.value !== 42) throw new Error('Deep nested value not preserved');
        if (result.effect.settings.nested.deep.method !== undefined) throw new Error('Deep nested method should be removed');

        console.log('✅ Complex nested objects serialized correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 8: Project serialization with effects
 */
export async function testProjectSerialization() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const project = {
            name: 'test-project',
            resolution: '1080p',
            effects: [
                {
                    id: 'effect-1',
                    type: 'blur',
                    config: {
                        intensity: 5,
                        color: {
                            getColor: () => '#ff0000',
                            selectionType: 'colorBucket',
                            colorValue: '#ff0000'
                        },
                        method: () => 'test'
                    }
                },
                {
                    id: 'effect-2',
                    type: 'glow',
                    config: {
                        radius: 10,
                        range: {
                            lower: () => 5,
                            upper: () => 15
                        }
                    },
                    secondaryEffects: [
                        {
                            id: 'secondary-1',
                            config: {
                                opacity: 0.5,
                                calculate: () => 42
                            }
                        }
                    ]
                }
            ]
        };

        const result = IPCSerializationService.serializeProjectForIPC(project);

        // Verify project structure
        if (result.name !== 'test-project') throw new Error('Project name not preserved');
        if (result.resolution !== '1080p') throw new Error('Project resolution not preserved');
        if (result.effects.length !== 2) throw new Error('Effects array length not preserved');

        // Verify first effect
        if (result.effects[0].config.intensity !== 5) throw new Error('Effect config not preserved');
        if (result.effects[0].config.color.__className !== 'ColorPicker') throw new Error('Effect ColorPicker not serialized');
        if (result.effects[0].config.method !== undefined) throw new Error('Effect method should be removed');

        // Verify second effect with secondary effects
        if (result.effects[1].config.range.lower !== 5) throw new Error('Effect range not serialized');
        if (result.effects[1].secondaryEffects[0].config.opacity !== 0.5) throw new Error('Secondary effect config not preserved');
        if (result.effects[1].secondaryEffects[0].config.calculate !== undefined) throw new Error('Secondary effect method should be removed');

        console.log('✅ Complete project serialized correctly with effects and secondary effects');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 9: Edge cases and error handling
 */
export async function testEdgeCasesAndErrorHandling() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Test null/undefined inputs
        if (IPCSerializationService.serializeConfigForIPC(null) !== null) {
            throw new Error('Null input should return null');
        }
        if (IPCSerializationService.serializeConfigForIPC(undefined) !== undefined) {
            throw new Error('Undefined input should return undefined');
        }
        if (IPCSerializationService.serializeConfigForIPC('string') !== 'string') {
            throw new Error('String input should return string');
        }
        if (IPCSerializationService.serializeConfigForIPC(42) !== 42) {
            throw new Error('Number input should return number');
        }

        // Test project without effects
        const projectWithoutEffects = { name: 'test' };
        const result1 = IPCSerializationService.serializeProjectForIPC(projectWithoutEffects);
        if (result1.name !== 'test') throw new Error('Project without effects should be preserved');

        // Test null project
        const result2 = IPCSerializationService.serializeProjectForIPC(null);
        if (result2 !== null) throw new Error('Null project should return null');

        // Test empty effects array
        const projectWithEmptyEffects = { name: 'test', effects: [] };
        const result3 = IPCSerializationService.serializeProjectForIPC(projectWithEmptyEffects);
        if (result3.effects.length !== 0) throw new Error('Empty effects array should be preserved');

        console.log('✅ Edge cases and error handling work correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}