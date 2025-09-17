#!/usr/bin/env node
/**
 * Debug script to inspect color picker values and prove the null colorValue issue
 */

const NftEffectsManager = require('../../src/main/implementations/NftEffectsManager');

async function debugColorPickers() {
    const effectsManager = new NftEffectsManager();

    console.log('🔍 DEBUGGING COLOR PICKER VALUES\n');

    try {
        const configResult = await effectsManager.introspectConfig({
            effectName: 'hex',
            projectData: {
                resolution: { width: 512, height: 512 },
                colorScheme: 'default'
            }
        });

        if (!configResult.success) {
            console.log('❌ Failed to get hex config:', configResult.error);
            return;
        }

        const config = configResult.defaultInstance;

        console.log('📋 HEX EFFECT CONFIG INSPECTION:');
        console.log('=' .repeat(50));

        // Deep inspection of color properties
        ['innerColor', 'outerColor'].forEach(colorProp => {
            console.log(`\n🎨 ${colorProp.toUpperCase()}:`);

            if (config[colorProp]) {
                const colorObj = config[colorProp];

                console.log(`   Type: ${typeof colorObj}`);
                console.log(`   Constructor: ${colorObj.constructor?.name}`);
                console.log(`   Keys: [${Object.keys(colorObj).join(', ')}]`);

                // Check each property
                Object.keys(colorObj).forEach(key => {
                    const value = colorObj[key];
                    if (typeof value === 'function') {
                        console.log(`   ${key}: [Function]`);
                    } else {
                        console.log(`   ${key}: ${JSON.stringify(value)}`);
                    }
                });

                // THE CRITICAL CHECK: colorValue
                console.log(`\n   🚨 CRITICAL: colorValue = ${JSON.stringify(colorObj.colorValue)}`);

                if (colorObj.colorValue === null) {
                    console.log(`   ❌ BUG CONFIRMED: ${colorProp}.colorValue is NULL!`);
                    console.log(`   💡 This is why effects render black screens!`);
                } else {
                    console.log(`   ✅ ${colorProp} has a valid color value`);
                }

                // Test getColor function
                if (typeof colorObj.getColor === 'function') {
                    try {
                        console.log(`\n   🔧 Testing getColor() function:`);
                        const colorResult = colorObj.getColor();
                        console.log(`   getColor() returned: ${JSON.stringify(colorResult)}`);

                        if (!colorResult || colorResult === null) {
                            console.log(`   ❌ getColor() also returns null/undefined!`);
                        } else {
                            console.log(`   ✅ getColor() returns valid color`);
                        }
                    } catch (error) {
                        console.log(`   ❌ getColor() threw error: ${error.message}`);
                    }
                }
            } else {
                console.log(`   ❌ ${colorProp} property doesn't exist!`);
            }
        });

        console.log('\n🔧 TESTING MANUAL COLOR OVERRIDE:');
        console.log('=' .repeat(50));

        // Test what happens when we manually set colors
        const fixedConfig = { ...config };

        if (fixedConfig.innerColor) {
            const originalInner = JSON.stringify(fixedConfig.innerColor.colorValue);
            fixedConfig.innerColor.colorValue = [255, 100, 100]; // Light red
            console.log(`✅ Fixed innerColor: ${originalInner} → [255, 100, 100]`);
        }

        if (fixedConfig.outerColor) {
            const originalOuter = JSON.stringify(fixedConfig.outerColor.colorValue);
            fixedConfig.outerColor.colorValue = [100, 255, 100]; // Light green
            console.log(`✅ Fixed outerColor: ${originalOuter} → [100, 255, 100]`);
        }

        console.log('\n💡 SOLUTION ANALYSIS:');
        console.log('=' .repeat(50));
        console.log('The black screen issue is caused by:');
        console.log('1. ColorPicker objects initialize with colorValue: null');
        console.log('2. Effects use these null values and render with no color');
        console.log('3. UI needs to either:');
        console.log('   a) Initialize color pickers with default colors from schemes');
        console.log('   b) Provide fallback colors when colorValue is null');
        console.log('   c) Force user to select colors before rendering');

        return { originalConfig: config, fixedConfig };

    } catch (error) {
        console.log('❌ Debug failed:', error.message);
        console.log('Stack:', error.stack);
    }
}

// Run the debug
if (require.main === module) {
    debugColorPickers().then(() => {
        console.log('\n✅ Color picker debug completed');
    }).catch(error => {
        console.error('❌ Debug execution failed:', error);
        process.exit(1);
    });
}

module.exports = debugColorPickers;