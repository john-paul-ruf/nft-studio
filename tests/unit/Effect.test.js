/**
 * Effect Class Tests
 * Tests for the Effect model class
 * 
 * Test Categories:
 * - Constructor validation
 * - Serialization (fromPOJO/toPOJO)
 * - Cloning and validation
 * - Utility methods
 * - Type checking
 * - Nested effects handling
 */

import { Effect } from '../../src/models/Effect.js';

// ============================================================================
// Constructor Tests
// ============================================================================

// Test 1: Constructor - Create effect with all required parameters
export function test_constructor_with_required_params() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: { intensity: 50 },
        type: 'primary'
    });

    if (effect.id !== 'effect_123') throw new Error('ID not set correctly');
    if (effect.name !== 'amp') throw new Error('Name not set correctly');
    if (effect.config.intensity !== 50) throw new Error('Config not set correctly');
    if (effect.type !== 'primary') throw new Error('Type not set correctly');

    console.log('✅ Constructor with required params works');
}

// Test 2: Constructor - Default values
export function test_constructor_default_values() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    if (effect.percentChance !== 100) throw new Error('Default percentChance should be 100');
    if (effect.visible !== true) throw new Error('Default visible should be true');
    if (!Array.isArray(effect.secondaryEffects)) throw new Error('secondaryEffects should be array');
    if (effect.secondaryEffects.length !== 0) throw new Error('secondaryEffects should be empty');
    if (!Array.isArray(effect.keyframeEffects)) throw new Error('keyframeEffects should be array');
    if (effect.keyframeEffects.length !== 0) throw new Error('keyframeEffects should be empty');

    console.log('✅ Constructor default values work');
}

// Test 3: Constructor - className and registryKey defaults
export function test_constructor_classname_defaults() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    if (effect.className !== 'amp') throw new Error('className should default to name');
    if (effect.registryKey !== 'amp') throw new Error('registryKey should default to name');

    console.log('✅ Constructor className/registryKey defaults work');
}

// Test 4: Constructor - Custom className and registryKey
export function test_constructor_custom_classname() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        className: 'AmpEffect',
        registryKey: 'amp-effect',
        config: {},
        type: 'primary'
    });

    if (effect.className !== 'AmpEffect') throw new Error('Custom className not set');
    if (effect.registryKey !== 'amp-effect') throw new Error('Custom registryKey not set');

    console.log('✅ Constructor custom className/registryKey work');
}

// Test 5: Constructor - Missing id throws error
export function test_constructor_missing_id() {
    try {
        new Effect({
            name: 'amp',
            config: {},
            type: 'primary'
        });
        throw new Error('Should have thrown error for missing id');
    } catch (error) {
        if (!error.message.includes('requires an id')) {
            throw new Error('Wrong error message: ' + error.message);
        }
    }

    console.log('✅ Constructor validates missing id');
}

// Test 6: Constructor - Missing name throws error
export function test_constructor_missing_name() {
    try {
        new Effect({
            id: 'effect_123',
            config: {},
            type: 'primary'
        });
        throw new Error('Should have thrown error for missing name');
    } catch (error) {
        if (!error.message.includes('requires a name')) {
            throw new Error('Wrong error message: ' + error.message);
        }
    }

    console.log('✅ Constructor validates missing name');
}

// Test 7: Constructor - Missing type throws error
export function test_constructor_missing_type() {
    try {
        new Effect({
            id: 'effect_123',
            name: 'amp',
            config: {}
        });
        throw new Error('Should have thrown error for missing type');
    } catch (error) {
        if (!error.message.includes('requires a type')) {
            throw new Error('Wrong error message: ' + error.message);
        }
    }

    console.log('✅ Constructor validates missing type');
}

// Test 8: Constructor - Missing config throws error
export function test_constructor_missing_config() {
    try {
        new Effect({
            id: 'effect_123',
            name: 'amp',
            type: 'primary'
        });
        throw new Error('Should have thrown error for missing config');
    } catch (error) {
        if (!error.message.includes('requires a config')) {
            throw new Error('Wrong error message: ' + error.message);
        }
    }

    console.log('✅ Constructor validates missing config');
}

// Test 9: Constructor - Invalid type throws error
export function test_constructor_invalid_type() {
    try {
        new Effect({
            id: 'effect_123',
            name: 'amp',
            config: {},
            type: 'invalid'
        });
        throw new Error('Should have thrown error for invalid type');
    } catch (error) {
        if (!error.message.includes('Invalid effect type')) {
            throw new Error('Wrong error message: ' + error.message);
        }
    }

    console.log('✅ Constructor validates invalid type');
}

// Test 10: Constructor - All valid types accepted
export function test_constructor_valid_types() {
    const validTypes = ['primary', 'secondary', 'finalImage', 'specialty', 'keyframe'];

    validTypes.forEach(type => {
        const effect = new Effect({
            id: 'effect_123',
            name: 'test',
            config: {},
            type
        });
        if (effect.type !== type) throw new Error(`Type ${type} not set correctly`);
    });

    console.log('✅ Constructor accepts all valid types');
}

// Test 11: Constructor - Invalid percentChance throws error
export function test_constructor_invalid_percentchance() {
    try {
        new Effect({
            id: 'effect_123',
            name: 'amp',
            config: {},
            type: 'primary',
            percentChance: -1
        });
        throw new Error('Should have thrown error for negative percentChance');
    } catch (error) {
        if (!error.message.includes('percentChance')) {
            throw new Error('Wrong error message: ' + error.message);
        }
    }

    try {
        new Effect({
            id: 'effect_123',
            name: 'amp',
            config: {},
            type: 'primary',
            percentChance: 101
        });
        throw new Error('Should have thrown error for percentChance > 100');
    } catch (error) {
        if (!error.message.includes('percentChance')) {
            throw new Error('Wrong error message: ' + error.message);
        }
    }

    console.log('✅ Constructor validates percentChance range');
}

// ============================================================================
// fromPOJO Tests
// ============================================================================

// Test 12: fromPOJO - Create Effect from plain object
export function test_frompojo_basic() {
    const pojo = {
        id: 'effect_123',
        name: 'amp',
        className: 'AmpEffect',
        registryKey: 'amp',
        config: { intensity: 50 },
        type: 'primary',
        percentChance: 75,
        visible: false,
        secondaryEffects: [],
        keyframeEffects: []
    };

    const effect = Effect.fromPOJO(pojo);

    if (!(effect instanceof Effect)) throw new Error('Should be Effect instance');
    if (effect.id !== 'effect_123') throw new Error('ID not restored');
    if (effect.name !== 'amp') throw new Error('Name not restored');
    if (effect.percentChance !== 75) throw new Error('percentChance not restored');
    if (effect.visible !== false) throw new Error('visible not restored');

    console.log('✅ fromPOJO creates Effect from plain object');
}

// Test 13: fromPOJO - Handle nested secondary effects
export function test_frompojo_nested_secondary() {
    const pojo = {
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary',
        secondaryEffects: [
            {
                id: 'effect_456',
                name: 'glow',
                config: {},
                type: 'secondary'
            }
        ],
        keyframeEffects: []
    };

    const effect = Effect.fromPOJO(pojo);

    if (effect.secondaryEffects.length !== 1) throw new Error('Secondary effect not restored');
    if (!(effect.secondaryEffects[0] instanceof Effect)) throw new Error('Secondary should be Effect instance');
    if (effect.secondaryEffects[0].name !== 'glow') throw new Error('Secondary name not restored');

    console.log('✅ fromPOJO handles nested secondary effects');
}

// Test 14: fromPOJO - Handle nested keyframe effects
export function test_frompojo_nested_keyframe() {
    const pojo = {
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary',
        secondaryEffects: [],
        keyframeEffects: [
            {
                id: 'effect_789',
                name: 'rotate',
                config: {},
                type: 'keyframe'
            }
        ]
    };

    const effect = Effect.fromPOJO(pojo);

    if (effect.keyframeEffects.length !== 1) throw new Error('Keyframe effect not restored');
    if (!(effect.keyframeEffects[0] instanceof Effect)) throw new Error('Keyframe should be Effect instance');
    if (effect.keyframeEffects[0].name !== 'rotate') throw new Error('Keyframe name not restored');

    console.log('✅ fromPOJO handles nested keyframe effects');
}

// Test 15: fromPOJO - Null/undefined throws error
export function test_frompojo_null() {
    try {
        Effect.fromPOJO(null);
        throw new Error('Should have thrown error for null');
    } catch (error) {
        if (!error.message.includes('null/undefined')) {
            throw new Error('Wrong error message: ' + error.message);
        }
    }

    console.log('✅ fromPOJO validates null/undefined');
}

// Test 15b: fromPOJO - Property migration (prefer new keyframeEffects over old attachedEffects.keyFrame)
export function test_frompojo_property_migration() {
    // Test case 1: Both properties exist - should prefer new property
    const pojoWithBoth = {
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary',
        keyframeEffects: [
            { id: 'kf_new', name: 'rotate-new', config: {}, type: 'keyframe' }
        ],
        attachedEffects: {
            keyFrame: [
                { id: 'kf_old', name: 'rotate-old', config: {}, type: 'keyframe' }
            ]
        }
    };

    const effect1 = Effect.fromPOJO(pojoWithBoth);
    if (effect1.keyframeEffects.length !== 1) throw new Error('Should have 1 keyframe effect');
    if (effect1.keyframeEffects[0].name !== 'rotate-new') throw new Error('Should prefer new keyframeEffects property');

    // Test case 2: Only new property exists
    const pojoNewOnly = {
        id: 'effect_456',
        name: 'amp',
        config: {},
        type: 'primary',
        keyframeEffects: [
            { id: 'kf_new2', name: 'scale', config: {}, type: 'keyframe' }
        ]
    };

    const effect2 = Effect.fromPOJO(pojoNewOnly);
    if (effect2.keyframeEffects.length !== 1) throw new Error('Should have 1 keyframe effect from new property');
    if (effect2.keyframeEffects[0].name !== 'scale') throw new Error('Should read from new property');

    // Test case 3: Only old property exists (backward compatibility)
    const pojoOldOnly = {
        id: 'effect_789',
        name: 'amp',
        config: {},
        type: 'primary',
        attachedEffects: {
            keyFrame: [
                { id: 'kf_old2', name: 'fade', config: {}, type: 'keyframe' }
            ]
        }
    };

    const effect3 = Effect.fromPOJO(pojoOldOnly);
    if (effect3.keyframeEffects.length !== 1) throw new Error('Should have 1 keyframe effect from old property');
    if (effect3.keyframeEffects[0].name !== 'fade') throw new Error('Should fallback to old property');

    console.log('✅ fromPOJO property migration works correctly (prefers new, falls back to old)');
}

// ============================================================================
// toPOJO Tests
// ============================================================================

// Test 16: toPOJO - Convert Effect to plain object
export function test_topojo_basic() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        className: 'AmpEffect',
        registryKey: 'amp',
        config: { intensity: 50 },
        type: 'primary',
        percentChance: 75,
        visible: false
    });

    const pojo = effect.toPOJO();

    if (pojo.id !== 'effect_123') throw new Error('ID not in POJO');
    if (pojo.name !== 'amp') throw new Error('Name not in POJO');
    if (pojo.className !== 'AmpEffect') throw new Error('className not in POJO');
    if (pojo.config.intensity !== 50) throw new Error('Config not in POJO');
    if (pojo.percentChance !== 75) throw new Error('percentChance not in POJO');
    if (pojo.visible !== false) throw new Error('visible not in POJO');

    console.log('✅ toPOJO converts Effect to plain object');
}

// Test 17: toPOJO - Convert nested effects
export function test_topojo_nested() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary',
        secondaryEffects: [
            new Effect({
                id: 'effect_456',
                name: 'glow',
                config: {},
                type: 'secondary'
            })
        ]
    });

    const pojo = effect.toPOJO();

    if (pojo.secondaryEffects.length !== 1) throw new Error('Secondary not in POJO');
    if (pojo.secondaryEffects[0].id !== 'effect_456') throw new Error('Secondary ID not in POJO');
    if (pojo.secondaryEffects[0].name !== 'glow') throw new Error('Secondary name not in POJO');

    console.log('✅ toPOJO converts nested effects');
}

// ============================================================================
// Clone Tests
// ============================================================================

// Test 18: clone - Create deep clone with new ID
export function test_clone_basic() {
    const original = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: { intensity: 50 },
        type: 'primary'
    });

    const cloned = original.clone();

    if (!(cloned instanceof Effect)) throw new Error('Clone should be Effect instance');
    if (cloned.id === original.id) throw new Error('Clone should have new ID');
    if (cloned.name !== original.name) throw new Error('Clone name should match');
    if (cloned.config.intensity !== 50) throw new Error('Clone config should match');

    // Verify deep clone
    cloned.config.intensity = 75;
    if (original.config.intensity !== 50) throw new Error('Should be deep clone');

    console.log('✅ clone creates deep clone with new ID');
}

// Test 19: clone - Clone nested effects
export function test_clone_nested() {
    const original = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary',
        secondaryEffects: [
            new Effect({
                id: 'effect_456',
                name: 'glow',
                config: {},
                type: 'secondary'
            })
        ]
    });

    const cloned = original.clone();

    if (cloned.secondaryEffects.length !== 1) throw new Error('Secondary not cloned');
    if (cloned.secondaryEffects[0].id === original.secondaryEffects[0].id) {
        throw new Error('Nested effect should have new ID');
    }
    if (cloned.secondaryEffects[0].name !== 'glow') throw new Error('Nested name should match');

    console.log('✅ clone handles nested effects');
}

// ============================================================================
// Validate Tests
// ============================================================================

// Test 20: validate - Valid effect passes
export function test_validate_valid() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    const result = effect.validate();

    if (!result.valid) throw new Error('Valid effect should pass validation');
    if (result.errors.length !== 0) throw new Error('Valid effect should have no errors');

    console.log('✅ validate passes for valid effect');
}

// Test 21: validate - Detects missing fields
export function test_validate_missing_fields() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    // Manually break the effect
    effect.id = null;
    effect.name = null;

    const result = effect.validate();

    if (result.valid) throw new Error('Invalid effect should fail validation');
    if (!result.errors.some(e => e.includes('id'))) throw new Error('Should detect missing id');
    if (!result.errors.some(e => e.includes('name'))) throw new Error('Should detect missing name');

    console.log('✅ validate detects missing fields');
}

// ============================================================================
// updateConfig Tests
// ============================================================================

// Test 22: updateConfig - Merge config updates
export function test_updateconfig_merge() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: { intensity: 50, color: 'red' },
        type: 'primary'
    });

    effect.updateConfig({ intensity: 75 });

    if (effect.config.intensity !== 75) throw new Error('intensity not updated');
    if (effect.config.color !== 'red') throw new Error('color should be preserved');

    console.log('✅ updateConfig merges updates');
}

// Test 23: updateConfig - Returns effect for chaining
export function test_updateconfig_chaining() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    const result = effect.updateConfig({ intensity: 50 });

    if (result !== effect) throw new Error('Should return effect instance');

    console.log('✅ updateConfig supports chaining');
}

// ============================================================================
// Utility Method Tests
// ============================================================================

// Test 24: hasSecondaryEffects - Returns true when effects exist
export function test_hassecondaryeffects_true() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary',
        secondaryEffects: [
            new Effect({
                id: 'effect_456',
                name: 'glow',
                config: {},
                type: 'secondary'
            })
        ]
    });

    if (!effect.hasSecondaryEffects()) throw new Error('Should return true');

    console.log('✅ hasSecondaryEffects returns true when effects exist');
}

// Test 25: hasSecondaryEffects - Returns false when no effects
export function test_hassecondaryeffects_false() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    if (effect.hasSecondaryEffects()) throw new Error('Should return false');

    console.log('✅ hasSecondaryEffects returns false when no effects');
}

// Test 26: hasKeyframeEffects - Returns true when effects exist
export function test_haskeyframeeffects_true() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary',
        keyframeEffects: [
            new Effect({
                id: 'effect_789',
                name: 'rotate',
                config: {},
                type: 'keyframe'
            })
        ]
    });

    if (!effect.hasKeyframeEffects()) throw new Error('Should return true');

    console.log('✅ hasKeyframeEffects returns true when effects exist');
}

// Test 27: getAllNestedEffects - Returns all nested effects
export function test_getallnestedeffects() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary',
        secondaryEffects: [
            new Effect({
                id: 'effect_456',
                name: 'glow',
                config: {},
                type: 'secondary'
            })
        ],
        keyframeEffects: [
            new Effect({
                id: 'effect_789',
                name: 'rotate',
                config: {},
                type: 'keyframe'
            })
        ]
    });

    const nested = effect.getAllNestedEffects();

    if (nested.length !== 2) throw new Error('Should return 2 effects');
    if (nested[0].name !== 'glow') throw new Error('First should be glow');
    if (nested[1].name !== 'rotate') throw new Error('Second should be rotate');

    console.log('✅ getAllNestedEffects returns all nested effects');
}

// ============================================================================
// Type Checking Tests
// ============================================================================

// Test 28: isType - Check effect type
export function test_istype() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    if (!effect.isType('primary')) throw new Error('Should return true for primary');
    if (effect.isType('secondary')) throw new Error('Should return false for secondary');

    console.log('✅ isType checks effect type');
}

// Test 29: isPrimary - Returns true for primary effects
export function test_isprimary() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    if (!effect.isPrimary()) throw new Error('Should return true');

    console.log('✅ isPrimary returns true for primary effects');
}

// Test 30: isSecondary - Returns true for secondary effects
export function test_issecondary() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'glow',
        config: {},
        type: 'secondary'
    });

    if (!effect.isSecondary()) throw new Error('Should return true');

    console.log('✅ isSecondary returns true for secondary effects');
}

// Test 31: isFinalImage - Returns true for finalImage effects
export function test_isfinalimage() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'filter',
        config: {},
        type: 'finalImage'
    });

    if (!effect.isFinalImage()) throw new Error('Should return true');

    console.log('✅ isFinalImage returns true for finalImage effects');
}

// ============================================================================
// String Representation Tests
// ============================================================================

// Test 32: toString - Returns readable string
export function test_tostring() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    const str = effect.toString();

    if (!str.includes('Effect')) throw new Error('Should contain "Effect"');
    if (!str.includes('amp')) throw new Error('Should contain name');
    if (!str.includes('primary')) throw new Error('Should contain type');
    if (!str.includes('effect_123')) throw new Error('Should contain id');

    console.log('✅ toString returns readable string');
}

// Test 33: toJSON - Returns JSON string
export function test_tojson() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: { intensity: 50 },
        type: 'primary'
    });

    const json = effect.toJSON();
    const parsed = JSON.parse(json);

    if (parsed.id !== 'effect_123') throw new Error('ID not in JSON');
    if (parsed.name !== 'amp') throw new Error('Name not in JSON');
    if (parsed.config.intensity !== 50) throw new Error('Config not in JSON');

    console.log('✅ toJSON returns JSON string');
}

// ============================================================================
// Round-trip Serialization Tests
// ============================================================================

// Test 34: Round-trip - Maintain data through POJO conversion
export function test_roundtrip_serialization() {
    const original = new Effect({
        id: 'effect_123',
        name: 'amp',
        className: 'AmpEffect',
        registryKey: 'amp',
        config: { intensity: 50, color: 'red' },
        type: 'primary',
        percentChance: 75,
        visible: false,
        secondaryEffects: [
            new Effect({
                id: 'effect_456',
                name: 'glow',
                config: { radius: 10 },
                type: 'secondary'
            })
        ]
    });

    const pojo = original.toPOJO();
    const restored = Effect.fromPOJO(pojo);

    if (restored.id !== original.id) throw new Error('ID not preserved');
    if (restored.name !== original.name) throw new Error('Name not preserved');
    if (restored.className !== original.className) throw new Error('className not preserved');
    if (restored.config.intensity !== 50) throw new Error('Config not preserved');
    if (restored.percentChance !== 75) throw new Error('percentChance not preserved');
    if (restored.visible !== false) throw new Error('visible not preserved');
    if (restored.secondaryEffects.length !== 1) throw new Error('Secondary effects not preserved');
    if (restored.secondaryEffects[0].name !== 'glow') throw new Error('Secondary name not preserved');

    console.log('✅ Round-trip serialization maintains data');
}