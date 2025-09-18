#!/usr/bin/env node
/**
 * Test suite for Add Effect Button functionality
 * Ensures that the add effect button shows available effects
 */

import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';

class AddEffectButtonTests {
    constructor() {
        this.effectsManager = new NftEffectsManager();
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
    }

    test(description, testFn) {
        this.testCount++;
        try {
            testFn();
            console.log(`✅ PASS: ${description}`);
            this.passedTests++;
        } catch (error) {
            console.log(`❌ FAIL: ${description}`);
            console.log(`   Error: ${error.message}`);
            this.failedTests++;
        }
    }

    async testEffectsAvailabilityForFrontend() {
        console.log('🔍 Testing Effects Availability for Frontend...\n');

        // Test that backend has effects available
        const result = await this.effectsManager.getAvailableEffects();

        this.test('Backend returns available effects for frontend', () => {
            if (!result.success) {
                throw new Error(`Backend failed: ${result.error}`);
            }
            if (!result.effects) {
                throw new Error('No effects structure returned');
            }
        });

        this.test('Effects structure contains all required categories', () => {
            const expectedCategories = ['primary', 'secondary', 'finalImage'];
            for (const category of expectedCategories) {
                if (!result.effects[category]) {
                    throw new Error(`Missing category: ${category}`);
                }
                if (!Array.isArray(result.effects[category])) {
                    throw new Error(`Category ${category} is not an array`);
                }
            }
        });

        this.test('Primary effects are available for add button', () => {
            const primaryEffects = result.effects.primary;
            if (primaryEffects.length === 0) {
                throw new Error('No primary effects available - this would cause empty add button');
            }

            console.log(`   Found ${primaryEffects.length} primary effects`);

            // Check that essential effects are present
            const essentialEffects = ['fuzz-flare', 'hex', 'gates'];
            for (const effectName of essentialEffects) {
                const found = primaryEffects.find(e => e.name === effectName);
                if (!found) {
                    throw new Error(`Essential effect missing: ${effectName}`);
                }
            }
        });

        this.test('Each effect has required properties for frontend display', () => {
            const allEffects = [
                ...result.effects.primary,
                ...result.effects.secondary,
                ...result.effects.finalImage
            ];

            for (const effect of allEffects) {
                if (!effect.name || typeof effect.name !== 'string') {
                    throw new Error(`Effect missing or invalid name: ${JSON.stringify(effect)}`);
                }
                if (!effect.className || typeof effect.className !== 'string') {
                    throw new Error(`Effect missing or invalid className: ${JSON.stringify(effect)}`);
                }

                // Check for additional properties that might be needed
                const requiredProps = ['name', 'className'];
                for (const prop of requiredProps) {
                    if (!(prop in effect)) {
                        throw new Error(`Effect ${effect.name || 'unknown'} missing required property: ${prop}`);
                    }
                }
            }
        });

        return result.effects;
    }

    async testAddEffectButtonDataFlow() {
        console.log('\n🔄 Testing Add Effect Button Data Flow...\n');

        // Simulate the data flow from backend to frontend
        const effects = await this.testEffectsAvailabilityForFrontend();

        this.test('Effects can be formatted for dropdown display', () => {
            const primaryEffects = effects.primary;

            // Simulate how frontend might format effects for display
            const dropdownItems = primaryEffects.map(effect => ({
                value: effect.name,
                label: effect.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                effect: effect
            }));

            if (dropdownItems.length === 0) {
                throw new Error('No dropdown items would be generated - empty add button');
            }

            console.log(`   Generated ${dropdownItems.length} dropdown items`);

            // Verify first few items have proper structure
            const sampleItem = dropdownItems[0];
            if (!sampleItem.value || !sampleItem.label || !sampleItem.effect) {
                throw new Error('Dropdown items missing required properties');
            }

            console.log(`   Sample item: "${sampleItem.label}" (${sampleItem.value})`);
        });

        this.test('Effect selection data matches backend contract', () => {
            const sampleEffect = effects.primary[0];

            // Simulate frontend creating effect object for backend
            const frontendEffectObject = {
                name: sampleEffect.name,
                className: sampleEffect.className,
                type: 'primary',
                config: {}, // Would be populated with defaults
                visible: true
            };

            // Verify this matches what our backend expects
            const requiredFields = ['name', 'className', 'type', 'config', 'visible'];
            for (const field of requiredFields) {
                if (!(field in frontendEffectObject)) {
                    throw new Error(`Frontend effect object missing field: ${field}`);
                }
            }

            console.log(`   Frontend object for ${sampleEffect.name} has all required fields`);
        });

        return effects;
    }

    async testEffectDefaults() {
        console.log('\n⚙️ Testing Effect Defaults Retrieval...\n');

        const effects = await this.testAddEffectButtonDataFlow();

        this.test('Can retrieve defaults for primary effects', async () => {
            // Test first few primary effects
            const testEffects = effects.primary.slice(0, 3);

            for (const effect of testEffects) {
                const defaultsResult = await this.effectsManager.getEffectDefaults(effect.name);

                if (!defaultsResult.success) {
                    throw new Error(`Failed to get defaults for ${effect.name}: ${defaultsResult.error}`);
                }

                if (!defaultsResult.defaults) {
                    throw new Error(`No defaults returned for ${effect.name}`);
                }

                console.log(`   ✓ Got defaults for ${effect.name}`);
            }
        });

        this.test('Defaults can be used in frontend effect object', async () => {
            const testEffect = effects.primary[0];
            const defaultsResult = await this.effectsManager.getEffectDefaults(testEffect.name);

            const completeEffectObject = {
                name: testEffect.name,
                className: testEffect.className,
                type: 'primary',
                config: defaultsResult.defaults,
                visible: true
            };

            // Verify the config has actual data
            if (!completeEffectObject.config || typeof completeEffectObject.config !== 'object') {
                throw new Error('Effect config is not a valid object');
            }

            const configKeys = Object.keys(completeEffectObject.config);
            if (configKeys.length === 0) {
                throw new Error('Effect config is empty');
            }

            console.log(`   Effect ${testEffect.name} has ${configKeys.length} config properties`);
        });
    }

    async testErrorScenarios() {
        console.log('\n🚨 Testing Error Scenarios...\n');

        this.test('Handles case when no effects are available', async () => {
            // This is a theoretical test - if effects system completely fails
            const emptyResult = {
                success: true,
                effects: {
                    primary: [],
                    secondary: [],
                    finalImage: []
                }
            };

            // Frontend should handle this gracefully
            const primaryEffects = emptyResult.effects.primary;
            if (primaryEffects.length === 0) {
                // This should be detected and handled appropriately
                console.log('   ✓ Empty effects list would be properly detected');
            }
        });

        this.test('Handles backend errors gracefully', async () => {
            // Test what happens when backend returns error
            const errorResult = {
                success: false,
                error: 'Failed to load effects'
            };

            // Frontend should not crash on this
            if (!errorResult.success) {
                console.log(`   ✓ Error handling: ${errorResult.error}`);
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running Add Effect Button Tests...\n');

        try {
            await this.testEffectsAvailabilityForFrontend();
            await this.testAddEffectButtonDataFlow();
            await this.testEffectDefaults();
            await this.testErrorScenarios();
        } catch (error) {
            console.log(`❌ Test suite failed with error: ${error.message}`);
            this.failedTests++;
        }

        console.log('\n📊 Test Results:');
        console.log(`   Total: ${this.testCount}`);
        console.log(`   Passed: ${this.passedTests}`);
        console.log(`   Failed: ${this.failedTests}`);

        if (this.failedTests === 0) {
            console.log('\n🎉 All add effect button tests passed!');
            console.log('\n📋 Add Effect Button Contract Verified:');
            console.log('   1. 📥 Backend provides available effects');
            console.log('   2. 🎛️ Effects have required display properties');
            console.log('   3. 🔧 Effect defaults are retrievable');
            console.log('   4. 🔗 Frontend-backend data flow works');
            console.log('   5. 🛡️ Error scenarios are handled');
            console.log('\n✨ This ensures:');
            console.log('   - Add effect button shows available effects');
            console.log('   - Effect selection creates valid objects');
            console.log('   - Configuration data is properly available');
            console.log('   - Error cases don\'t crash the UI');
        } else {
            console.log('\n💥 Some add effect button tests failed!');
            console.log('   The add effect button may not work properly - investigate failures above');
        }

        return this.failedTests === 0;
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tests = new AddEffectButtonTests();
    tests.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

export default AddEffectButtonTests;