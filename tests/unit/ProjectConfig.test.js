/**
 * ProjectConfig Class Tests
 * Tests for the ProjectConfig model class
 * 
 * Test Categories:
 * - Constructor validation
 * - Serialization (fromPOJO/toPOJO)
 * - Effect management
 * - Validation
 * - Utility methods
 */

import { ProjectConfig } from '../../src/models/ProjectConfig.js';
import { Effect } from '../../src/models/Effect.js';

// Test Suite

// ============================================================================
// Constructor Tests
// ============================================================================

// Test 1: Constructor - Create with defaults
export function test_constructor_defaults() {
    const config = new ProjectConfig();

    if (config.projectName !== '') throw new Error('Default projectName should be empty string');
    if (config.artist !== '') throw new Error('Default artist should be empty string');
    if (typeof config.targetResolution !== 'number') throw new Error('targetResolution should be number');
    if (config.isHorizontal !== false) throw new Error('Default isHorizontal should be false');
    if (config.numFrames !== 100) throw new Error('Default numFrames should be 100');
    if (!Array.isArray(config.effects)) throw new Error('effects should be array');
    if (config.effects.length !== 0) throw new Error('Default effects should be empty');
    if (config.colorScheme !== 'vapor-dreams') throw new Error('Default colorScheme should be vapor-dreams');

    console.log('✅ Constructor with defaults works');
}

// Test 2: Constructor - Create with custom values
export function test_constructor_custom() {
    const config = new ProjectConfig({
        projectName: 'Test Project',
        artist: 'Test Artist',
        targetResolution: 1080,
        isHorizontal: true,
        numFrames: 50,
        colorScheme: 'custom-scheme'
    });

    if (config.projectName !== 'Test Project') throw new Error('projectName not set');
    if (config.artist !== 'Test Artist') throw new Error('artist not set');
    if (config.targetResolution !== 1080) throw new Error('targetResolution not set');
    if (config.isHorizontal !== true) throw new Error('isHorizontal not set');
    if (config.numFrames !== 50) throw new Error('numFrames not set');
    if (config.colorScheme !== 'custom-scheme') throw new Error('colorScheme not set');

    console.log('✅ Constructor with custom values works');
}

// Test 3: Constructor - Invalid numFrames throws error
export function test_constructor_invalid_numframes() {
    try {
        new ProjectConfig({ numFrames: 0 });
        throw new Error('Should have thrown error for numFrames = 0');
    } catch (error) {
        if (!error.message.includes('numFrames')) {
            throw new Error('Wrong error message: ' + error.message);
        }
    }

    try {
        new ProjectConfig({ numFrames: -1 });
        throw new Error('Should have thrown error for negative numFrames');
    } catch (error) {
        if (!error.message.includes('numFrames')) {
            throw new Error('Wrong error message: ' + error.message);
        }
    }

    console.log('✅ Constructor validates numFrames');
}

// Test 4: Constructor - Invalid effects throws error
export function test_constructor_invalid_effects() {
    try {
        new ProjectConfig({ effects: 'not an array' });
        throw new Error('Should have thrown error for non-array effects');
    } catch (error) {
        if (!error.message.includes('effects must be an array')) {
            throw new Error('Wrong error message: ' + error.message);
        }
    }

    console.log('✅ Constructor validates effects type');
}

// ============================================================================
// fromPOJO Tests
// ============================================================================

// Test 5: fromPOJO - Create ProjectConfig from plain object
export function test_frompojo_basic() {
    const pojo = {
        projectName: 'Test Project',
        artist: 'Test Artist',
        targetResolution: 1080,
        isHorizontal: false,
        numFrames: 50,
        effects: [],
        colorScheme: 'vapor-dreams',
        colorSchemeData: null,
        outputDirectory: null,
        renderStartFrame: 0,
        renderJumpFrames: 1
    };

    const config = ProjectConfig.fromPOJO(pojo);

    if (!(config instanceof ProjectConfig)) throw new Error('Should be ProjectConfig instance');
    if (config.projectName !== 'Test Project') throw new Error('projectName not restored');
    if (config.artist !== 'Test Artist') throw new Error('artist not restored');
    if (config.numFrames !== 50) throw new Error('numFrames not restored');

    console.log('✅ fromPOJO creates ProjectConfig from plain object');
}

// Test 6: fromPOJO - Convert effects to Effect instances
export function test_frompojo_with_effects() {
    const pojo = {
        projectName: 'Test',
        effects: [
            {
                id: 'effect_123',
                name: 'amp',
                config: {},
                type: 'primary'
            }
        ]
    };

    const config = ProjectConfig.fromPOJO(pojo);

    if (config.effects.length !== 1) throw new Error('Effect not restored');
    if (!(config.effects[0] instanceof Effect)) throw new Error('Effect should be Effect instance');
    if (config.effects[0].name !== 'amp') throw new Error('Effect name not restored');

    console.log('✅ fromPOJO converts effects to Effect instances');
}

// Test 7: fromPOJO - Null/undefined throws error
export function test_frompojo_null() {
    try {
        ProjectConfig.fromPOJO(null);
        throw new Error('Should have thrown error for null');
    } catch (error) {
        if (!error.message.includes('null/undefined')) {
            throw new Error('Wrong error message: ' + error.message);
        }
    }

    console.log('✅ fromPOJO validates null/undefined');
}

// ============================================================================
// toPOJO Tests
// ============================================================================

// Test 8: toPOJO - Convert ProjectConfig to plain object
export function test_topojo_basic() {
    const config = new ProjectConfig({
        projectName: 'Test Project',
        artist: 'Test Artist',
        numFrames: 50
    });

    const pojo = config.toPOJO();

    if (pojo.projectName !== 'Test Project') throw new Error('projectName not in POJO');
    if (pojo.artist !== 'Test Artist') throw new Error('artist not in POJO');
    if (pojo.numFrames !== 50) throw new Error('numFrames not in POJO');
    if (!Array.isArray(pojo.effects)) throw new Error('effects should be array');

    console.log('✅ toPOJO converts ProjectConfig to plain object');
}

// Test 9: toPOJO - Convert effects to POJOs
export function test_topojo_with_effects() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    const config = new ProjectConfig({
        projectName: 'Test',
        effects: [effect]
    });

    const pojo = config.toPOJO();

    if (pojo.effects.length !== 1) throw new Error('Effect not in POJO');
    if (pojo.effects[0].id !== 'effect_123') throw new Error('Effect ID not in POJO');
    if (pojo.effects[0].name !== 'amp') throw new Error('Effect name not in POJO');

    console.log('✅ toPOJO converts effects to POJOs');
}

// ============================================================================
// Validate Tests
// ============================================================================

// Test 10: validate - Valid config passes
export function test_validate_valid() {
    const config = new ProjectConfig({
        projectName: 'Test',
        numFrames: 50
    });

    const result = config.validate();

    if (!result.valid) throw new Error('Valid config should pass validation');
    if (result.errors.length !== 0) throw new Error('Valid config should have no errors');

    console.log('✅ validate passes for valid config');
}

// Test 11: validate - Detects invalid numFrames
export function test_validate_invalid_numframes() {
    const config = new ProjectConfig();
    config.numFrames = -1;

    const result = config.validate();

    if (result.valid) throw new Error('Invalid config should fail validation');
    if (!result.errors.some(e => e.includes('numFrames'))) {
        throw new Error('Should detect invalid numFrames');
    }

    console.log('✅ validate detects invalid numFrames');
}

// ============================================================================
// Effect Management Tests
// ============================================================================

// Test 12: addEffect - Add effect to project
export function test_addeffect() {
    const config = new ProjectConfig();
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    config.addEffect(effect);

    if (config.effects.length !== 1) throw new Error('Effect not added');
    if (config.effects[0] !== effect) throw new Error('Wrong effect added');

    console.log('✅ addEffect adds effect to project');
}

// Test 13: addEffect - Returns config for chaining
export function test_addeffect_chaining() {
    const config = new ProjectConfig();
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    const result = config.addEffect(effect);

    if (result !== config) throw new Error('Should return config instance');

    console.log('✅ addEffect supports chaining');
}

// Test 14: addEffect - Throws error for non-Effect
export function test_addeffect_invalid() {
    const config = new ProjectConfig();

    try {
        config.addEffect({ name: 'test' });
        throw new Error('Should have thrown error for non-Effect');
    } catch (error) {
        if (!error.message.includes('instance of Effect')) {
            throw new Error('Wrong error message: ' + error.message);
        }
    }

    console.log('✅ addEffect validates Effect instance');
}

// Test 15: removeEffect - Remove effect from project
export function test_removeeffect() {
    const effect1 = new Effect({
        id: 'effect_1',
        name: 'amp',
        config: {},
        type: 'primary'
    });
    const effect2 = new Effect({
        id: 'effect_2',
        name: 'glow',
        config: {},
        type: 'primary'
    });

    const config = new ProjectConfig({
        effects: [effect1, effect2]
    });

    config.removeEffect(0);

    if (config.effects.length !== 1) throw new Error('Effect not removed');
    if (config.effects[0].name !== 'glow') throw new Error('Wrong effect removed');

    console.log('✅ removeEffect removes effect from project');
}

// Test 16: removeEffect - Throws error for invalid index
export function test_removeeffect_invalid() {
    const config = new ProjectConfig();

    try {
        config.removeEffect(0);
        throw new Error('Should have thrown error for invalid index');
    } catch (error) {
        if (!error.message.includes('Invalid effect index')) {
            throw new Error('Wrong error message: ' + error.message);
        }
    }

    console.log('✅ removeEffect validates index');
}

// Test 17: getEffects - Returns immutable copy
export function test_geteffects() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    const config = new ProjectConfig({
        effects: [effect]
    });

    const effects = config.getEffects();

    if (effects.length !== 1) throw new Error('Effects not returned');
    if (effects === config.effects) throw new Error('Should return copy, not reference');

    console.log('✅ getEffects returns immutable copy');
}

// Test 18: getEffect - Get effect at index
export function test_geteffect() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    const config = new ProjectConfig({
        effects: [effect]
    });

    const retrieved = config.getEffect(0);

    if (retrieved !== effect) throw new Error('Wrong effect returned');

    console.log('✅ getEffect returns effect at index');
}

// Test 19: getEffect - Returns null for invalid index
export function test_geteffect_invalid() {
    const config = new ProjectConfig();

    const result = config.getEffect(0);

    if (result !== null) throw new Error('Should return null for invalid index');

    console.log('✅ getEffect returns null for invalid index');
}

// Test 20: updateEffect - Update effect at index
export function test_updateeffect() {
    const effect1 = new Effect({
        id: 'effect_1',
        name: 'amp',
        config: {},
        type: 'primary'
    });
    const effect2 = new Effect({
        id: 'effect_2',
        name: 'glow',
        config: {},
        type: 'primary'
    });

    const config = new ProjectConfig({
        effects: [effect1]
    });

    config.updateEffect(0, effect2);

    if (config.effects[0] !== effect2) throw new Error('Effect not updated');

    console.log('✅ updateEffect updates effect at index');
}

// Test 21: getEffectCount - Returns number of effects
export function test_geteffectcount() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    const config = new ProjectConfig({
        effects: [effect]
    });

    if (config.getEffectCount() !== 1) throw new Error('Wrong effect count');

    console.log('✅ getEffectCount returns number of effects');
}

// Test 22: hasEffects - Returns true when effects exist
export function test_haseffects_true() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    const config = new ProjectConfig({
        effects: [effect]
    });

    if (!config.hasEffects()) throw new Error('Should return true');

    console.log('✅ hasEffects returns true when effects exist');
}

// Test 23: hasEffects - Returns false when no effects
export function test_haseffects_false() {
    const config = new ProjectConfig();

    if (config.hasEffects()) throw new Error('Should return false');

    console.log('✅ hasEffects returns false when no effects');
}

// Test 24: clearEffects - Clear all effects
export function test_cleareffects() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: {},
        type: 'primary'
    });

    const config = new ProjectConfig({
        effects: [effect]
    });

    config.clearEffects();

    if (config.effects.length !== 0) throw new Error('Effects not cleared');

    console.log('✅ clearEffects clears all effects');
}

// ============================================================================
// Clone Tests
// ============================================================================

// Test 25: clone - Create deep clone
export function test_clone() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: { intensity: 50 },
        type: 'primary'
    });

    const original = new ProjectConfig({
        projectName: 'Test',
        effects: [effect]
    });

    const cloned = original.clone();

    if (!(cloned instanceof ProjectConfig)) throw new Error('Clone should be ProjectConfig instance');
    if (cloned.projectName !== 'Test') throw new Error('projectName not cloned');
    if (cloned.effects.length !== 1) throw new Error('Effects not cloned');

    // Verify deep clone
    cloned.projectName = 'Modified';
    if (original.projectName === 'Modified') throw new Error('Should be deep clone');

    console.log('✅ clone creates deep clone');
}

// ============================================================================
// String Representation Tests
// ============================================================================

// Test 26: toString - Returns readable string
export function test_tostring() {
    const config = new ProjectConfig({
        projectName: 'Test Project',
        numFrames: 50
    });

    const str = config.toString();

    if (!str.includes('ProjectConfig')) throw new Error('Should contain "ProjectConfig"');
    if (!str.includes('Test Project')) throw new Error('Should contain project name');
    if (!str.includes('50')) throw new Error('Should contain numFrames');

    console.log('✅ toString returns readable string');
}

// Test 27: toJSON - Returns JSON string
export function test_tojson() {
    const config = new ProjectConfig({
        projectName: 'Test Project',
        numFrames: 50
    });

    const json = config.toJSON();
    const parsed = JSON.parse(json);

    if (parsed.projectName !== 'Test Project') throw new Error('projectName not in JSON');
    if (parsed.numFrames !== 50) throw new Error('numFrames not in JSON');

    console.log('✅ toJSON returns JSON string');
}

// ============================================================================
// Round-trip Serialization Tests
// ============================================================================

// Test 28: Round-trip - Maintain data through POJO conversion
export function test_roundtrip_serialization() {
    const effect = new Effect({
        id: 'effect_123',
        name: 'amp',
        config: { intensity: 50 },
        type: 'primary'
    });

    const original = new ProjectConfig({
        projectName: 'Test Project',
        artist: 'Test Artist',
        targetResolution: 1080,
        isHorizontal: true,
        numFrames: 50,
        effects: [effect],
        colorScheme: 'custom'
    });

    const pojo = original.toPOJO();
    const restored = ProjectConfig.fromPOJO(pojo);

    if (restored.projectName !== original.projectName) throw new Error('projectName not preserved');
    if (restored.artist !== original.artist) throw new Error('artist not preserved');
    if (restored.targetResolution !== original.targetResolution) throw new Error('targetResolution not preserved');
    if (restored.isHorizontal !== original.isHorizontal) throw new Error('isHorizontal not preserved');
    if (restored.numFrames !== original.numFrames) throw new Error('numFrames not preserved');
    if (restored.effects.length !== 1) throw new Error('Effects not preserved');
    if (restored.effects[0].name !== 'amp') throw new Error('Effect name not preserved');
    if (restored.colorScheme !== original.colorScheme) throw new Error('colorScheme not preserved');

    console.log('✅ Round-trip serialization maintains data');
}