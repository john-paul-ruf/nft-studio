#!/usr/bin/env node
/**
 * Test strict color scheme implementation - no defaults, no fallbacks, no hidden errors
 * Tests that UI must provide complete colorSchemeData
 */

console.log('🚫 Strict Color Scheme Test - No Defaults, No Fallbacks\n');

async function testStrictColorSchemeImplementation() {
    try {
        console.log('🔍 Testing strict colorSchemeData requirements...\n');

        // Import the class without instantiating to avoid constructor issues
        const NftProjectManagerClass = require('../../src/main/implementations/NftProjectManager');
        const testInstance = Object.create(NftProjectManagerClass.prototype);

        // Test 1: No colorSchemeData provided - should fail hard
        console.log('📋 Test 1: Missing colorSchemeData - should FAIL...');
        try {
            await testInstance.buildColorSchemeInfo({});
            throw new Error('SHOULD HAVE FAILED - no colorSchemeData provided');
        } catch (error) {
            if (error.message.includes('MISSING colorSchemeData')) {
                console.log('   ✅ Correctly failed: ' + error.message);
            } else {
                throw error;
            }
        }

        // Test 2: Missing colors array - should fail hard
        console.log('\n📋 Test 2: Missing colors array - should FAIL...');
        try {
            await testInstance.buildColorSchemeInfo({
                colorSchemeData: {
                    lights: ['#FFFF00'],
                    neutrals: ['#FFFFFF'],
                    backgrounds: ['#000000']
                    // Missing colors
                }
            });
            throw new Error('SHOULD HAVE FAILED - no colors array');
        } catch (error) {
            if (error.message.includes('MISSING colorSchemeData.colors')) {
                console.log('   ✅ Correctly failed: ' + error.message);
            } else {
                throw error;
            }
        }

        // Test 3: Empty colors array - should fail hard
        console.log('\n📋 Test 3: Empty colors array - should FAIL...');
        try {
            await testInstance.buildColorSchemeInfo({
                colorSchemeData: {
                    colors: [],
                    lights: ['#FFFF00'],
                    neutrals: ['#FFFFFF'],
                    backgrounds: ['#000000']
                }
            });
            throw new Error('SHOULD HAVE FAILED - empty colors array');
        } catch (error) {
            if (error.message.includes('EMPTY colorSchemeData.colors')) {
                console.log('   ✅ Correctly failed: ' + error.message);
            } else {
                throw error;
            }
        }

        // Test 4: Missing lights - should fail hard
        console.log('\n📋 Test 4: Missing lights array - should FAIL...');
        try {
            await testInstance.buildColorSchemeInfo({
                colorSchemeData: {
                    colors: ['#FF0000'],
                    neutrals: ['#FFFFFF'],
                    backgrounds: ['#000000']
                    // Missing lights
                }
            });
            throw new Error('SHOULD HAVE FAILED - no lights array');
        } catch (error) {
            if (error.message.includes('MISSING colorSchemeData.lights')) {
                console.log('   ✅ Correctly failed: ' + error.message);
            } else {
                throw error;
            }
        }

        // Test 5: Missing neutrals - should fail hard
        console.log('\n📋 Test 5: Missing neutrals array - should FAIL...');
        try {
            await testInstance.buildColorSchemeInfo({
                colorSchemeData: {
                    colors: ['#FF0000'],
                    lights: ['#FFFF00'],
                    backgrounds: ['#000000']
                    // Missing neutrals
                }
            });
            throw new Error('SHOULD HAVE FAILED - no neutrals array');
        } catch (error) {
            if (error.message.includes('MISSING colorSchemeData.neutrals')) {
                console.log('   ✅ Correctly failed: ' + error.message);
            } else {
                throw error;
            }
        }

        // Test 6: Missing backgrounds - should fail hard
        console.log('\n📋 Test 6: Missing backgrounds array - should FAIL...');
        try {
            await testInstance.buildColorSchemeInfo({
                colorSchemeData: {
                    colors: ['#FF0000'],
                    lights: ['#FFFF00'],
                    neutrals: ['#FFFFFF']
                    // Missing backgrounds
                }
            });
            throw new Error('SHOULD HAVE FAILED - no backgrounds array');
        } catch (error) {
            if (error.message.includes('MISSING colorSchemeData.backgrounds')) {
                console.log('   ✅ Correctly failed: ' + error.message);
            } else {
                throw error;
            }
        }

        // Test 7: Complete valid data - should work
        console.log('\n📋 Test 7: Complete valid colorSchemeData - should WORK...');

        const validColorSchemeData = {
            colorSchemeData: {
                name: 'Custom User Scheme',
                colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'], // colorBucket for ColorPicker
                lights: ['#FFD700', '#FFA500', '#FF6347'], // separate lights array
                neutrals: ['#F8F9FA', '#E9ECEF', '#6C757D'],
                backgrounds: ['#212529', '#343A40']
            }
        };

        const result = await testInstance.buildColorSchemeInfo(validColorSchemeData);

        console.log('   ✅ Successfully created colorSchemeInfo!');
        console.log('   🔍 Result structure:');
        console.log(`      Has colorScheme object: ${!!result.colorScheme}`);
        console.log(`      Has getColorFromBucket: ${typeof result.colorScheme?.getColorFromBucket === 'function'}`);
        console.log(`      ColorBucket length: ${result.colorScheme?.colorBucket?.length}`);
        console.log(`      Neutrals: ${result.neutrals.length} colors`);
        console.log(`      Backgrounds: ${result.backgrounds.length} colors`);
        console.log(`      Lights: ${result.lights.length} colors`);

        // Validate structure
        if (!result.colorScheme) {
            throw new Error('Missing colorScheme object in result');
        }

        if (typeof result.colorScheme.getColorFromBucket !== 'function') {
            throw new Error('ColorScheme missing getColorFromBucket method');
        }

        if (result.lights.length !== 3) {
            throw new Error('Lights array not preserved correctly');
        }

        if (result.neutrals.length !== 3) {
            throw new Error('Neutrals array not preserved correctly');
        }

        if (result.backgrounds.length !== 2) {
            throw new Error('Backgrounds array not preserved correctly');
        }

        // Test that colorBucket uses the provided colors (not lights)
        if (result.colorScheme.colorBucket.length !== 3) {
            throw new Error('ColorBucket should use colors array');
        }

        if (result.colorScheme.colorBucket[0] !== '#FF6B6B') {
            throw new Error('ColorBucket should exactly match colors array');
        }

        // Test 8: colorSchemeInfo passthrough - should work
        console.log('\n📋 Test 8: colorSchemeInfo passthrough - should WORK...');

        const customColorSchemeInfo = {
            colorScheme: {
                colorBucket: ['#CUSTOM1', '#CUSTOM2'],
                getColorFromBucket: () => '#CUSTOM1'
            },
            neutrals: ['#NEUTRAL1'],
            backgrounds: ['#BG1'],
            lights: ['#LIGHT1']
        };

        const passthroughResult = await testInstance.buildColorSchemeInfo({
            colorSchemeInfo: customColorSchemeInfo
        });

        if (passthroughResult !== customColorSchemeInfo) {
            throw new Error('colorSchemeInfo passthrough failed');
        }

        console.log('   ✅ colorSchemeInfo passthrough works correctly');

        console.log('\n🎉 ALL STRICT COLOR SCHEME TESTS PASSED!');
        console.log('\n✨ Strict Implementation Verified:');
        console.log('   ❌ NO predefined schemes lookup');
        console.log('   ❌ NO default values');
        console.log('   ❌ NO fallback colors');
        console.log('   ❌ NO error hiding');
        console.log('   ✅ STRICT validation of all required fields');
        console.log('   ✅ FAIL FAST if any data missing');
        console.log('   ✅ UI MUST provide complete colorSchemeData');
        console.log('\n🎨 UI Responsibility:');
        console.log('   📱 UI must send: projectConfig.colorSchemeData');
        console.log('   📋 Must include: lights, neutrals, backgrounds arrays');
        console.log('   📋 Optional: name for the color scheme');
        console.log('   🚫 Backend provides: NO defaults, NO fallbacks');
        console.log('\n🚀 Either it works completely or it fails clearly!');

    } catch (error) {
        console.error('❌ Strict color scheme test failed:', error.message);
        console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
        process.exit(1);
    }
}

testStrictColorSchemeImplementation();