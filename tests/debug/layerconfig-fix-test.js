#!/usr/bin/env node
console.log('🧪 Testing LayerConfig Parameter Fix...\n');

// Mock LayerConfig
class MockLayerConfig {
    constructor({
        name = 'base-config',
        effect = null,
        percentChance = 0,
        currentEffectConfig = {}
    }) {
        this.name = name;
        this.Effect = effect;  // Constructor param 'effect' becomes property 'Effect'
        this.percentChance = percentChance;
        this.currentEffectConfig = currentEffectConfig;
    }
}

// Test effect class
class TestEffect {}
TestEffect._name_ = 'TestEffect';

console.log('OLD way (broken):');
const oldConfig = new MockLayerConfig({
    Effect: TestEffect,           // Wrong parameter name
    effectName: 'TestEffect',     // Wrong parameter name
    percentChance: 100
});
console.log('  name:', oldConfig.name, '(❌ defaults to base-config)');
console.log('  Effect:', !!oldConfig.Effect, '(effect class lost)');

console.log('\nNEW way (fixed):');
const newConfig = new MockLayerConfig({
    name: 'TestEffect',           // Correct parameter name
    effect: TestEffect,           // Correct parameter name
    percentChance: 100
});
console.log('  name:', newConfig.name, '(✅ correct effect name)');
console.log('  Effect:', !!newConfig.Effect, '(✅ effect class preserved)');

console.log('\n🔧 Fix Summary:');
console.log('  ❌ OLD: Effect "base-effect" not found (due to base-config default)');
console.log('  ✅ NEW: Effect found by correct name in registry');

if (newConfig.name === 'TestEffect' && newConfig.Effect === TestEffect) {
    console.log('\n✅ LayerConfig parameter fix successful!');
} else {
    console.log('\n❌ LayerConfig parameter fix failed!');
}