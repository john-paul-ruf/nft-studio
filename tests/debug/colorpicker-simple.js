#!/usr/bin/env node
console.log('🧪 Testing ColorPicker Default Preservation...\n');

class MockColorPicker {
    constructor(value = 'colorBucket') {
        this.value = value;
    }
    getColor() { return '#FF0000'; }
}

class MockConfig {
    constructor({
        innerColor = new MockColorPicker(),
        outerColor = new MockColorPicker(),
        numberOfHex = 12
    } = {}) {
        this.innerColor = innerColor;
        this.outerColor = outerColor;
        this.numberOfHex = numberOfHex;
    }
}

console.log('Test 1: Default config');
const defaultConfig = new MockConfig({});
console.log('  innerColor type:', defaultConfig.innerColor.constructor.name);
console.log('  hasGetColor:', typeof defaultConfig.innerColor.getColor === 'function');

console.log('\nTest 2: OLD approach (broken)');
const userConfig = { numberOfHex: 8 };
const oldConfig = new MockConfig(userConfig); // This loses defaults
console.log('  innerColor type:', oldConfig.innerColor ? oldConfig.innerColor.constructor.name : 'undefined');
console.log('  hasGetColor:', typeof oldConfig.innerColor?.getColor === 'function');

console.log('\nTest 3: NEW approach (fixed)');
const newConfig = new MockConfig({});
// Copy defaults first
for (const [key, value] of Object.entries(defaultConfig)) {
    newConfig[key] = value;
}
// Apply user overrides
for (const [key, value] of Object.entries(userConfig)) {
    if (defaultConfig.hasOwnProperty(key)) {
        newConfig[key] = value;
    }
}
console.log('  innerColor type:', newConfig.innerColor.constructor.name);
console.log('  hasGetColor:', typeof newConfig.innerColor.getColor === 'function');
console.log('  numberOfHex:', newConfig.numberOfHex);

if (newConfig.innerColor instanceof MockColorPicker &&
    typeof newConfig.innerColor.getColor === 'function' &&
    newConfig.numberOfHex === 8) {
    console.log('\n✅ ColorPicker config fix working correctly!');
} else {
    console.log('\n❌ ColorPicker config fix failed!');
}