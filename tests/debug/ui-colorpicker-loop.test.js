#!/usr/bin/env node
/**
 * Test to identify the ColorPicker initialization loop in the UI
 * Based on the massive spam of ColorPicker initialization messages
 */

console.log('🔍 UI ColorPicker Loop Detection Test\n');

// Mock the UI flow that leads to ColorPicker creation
class MockUIColorPickerTest {
    constructor() {
        this.colorPickerCreationCount = 0;
        this.introspectionCallCount = 0;
    }

    // Mock window.api.introspectConfig to track calls
    async mockIntrospectConfig(options) {
        this.introspectionCallCount++;
        console.log(`📞 window.api.introspectConfig called #${this.introspectionCallCount}:`, {
            effectName: options.effectName,
            hasProjectData: !!options.projectData
        });

        // This simulates calling EffectProcessingService.createConfigInstance
        return this.simulateCreateConfigInstance(options.effectName);
    }

    // Simulate the backend createConfigInstance that creates ColorPickers
    async simulateCreateConfigInstance(effectName) {
        console.log(`⚙️  Simulating createConfigInstance for ${effectName}...`);

        // This simulates the ColorPicker creation in EffectProcessingService
        const mockColorPicker = () => {
            this.colorPickerCreationCount++;
            console.log(`🎨 Initialized ColorPicker #${this.colorPickerCreationCount}`);
            return { getColor: () => '#ff0000' };
        };

        // Simulate config creation with ColorPickers
        const defaultConfig = {
            innerColor: mockColorPicker(),
            outerColor: mockColorPicker(),
            numberOfHex: 8,
            strategy: ['rotate']
        };

        return {
            success: true,
            defaultInstance: defaultConfig
        };
    }

    // Simulate ConfigIntrospector.analyzeConfigClass
    async simulateConfigIntrospection(effectMetadata, projectData) {
        console.log(`\n🔬 Simulating ConfigIntrospector.analyzeConfigClass:`, {
            effectName: effectMetadata.name,
            hasProjectData: !!projectData
        });

        const result = await this.mockIntrospectConfig({
            effectName: effectMetadata.name,
            projectData: projectData
        });

        if (result.success) {
            console.log('   ✓ Config introspection successful');
            return {
                fields: [
                    { name: 'innerColor', type: 'ColorPicker' },
                    { name: 'outerColor', type: 'ColorPicker' },
                    { name: 'numberOfHex', type: 'number' }
                ],
                defaultInstance: result.defaultInstance
            };
        }

        return { fields: [] };
    }

    // Simulate EffectConfigurer useEffect
    async simulateEffectConfigurerUseEffect(selectedEffect, projectData, initialConfig) {
        console.log(`\n📱 Simulating EffectConfigurer useEffect:`, {
            selectedEffect: selectedEffect?.name,
            hasProjectData: !!projectData,
            hasInitialConfig: !!initialConfig
        });

        if (selectedEffect) {
            console.log('   Calling loadConfigSchema...');
            const schema = await this.simulateConfigIntrospection(selectedEffect, projectData);

            console.log('   Schema loaded, setting effectConfig...');

            // This is where the config change callback would be called
            console.log('   Calling onConfigChange...');

            return schema;
        }
    }

    // Test scenarios that might cause loops
    async testLoopScenarios() {
        console.log('🧪 Testing potential loop scenarios...\n');

        const mockEffect = { name: 'HexEffect' };
        const mockProjectData = { resolution: 'hd' };

        // Scenario 1: Normal single call
        console.log('📋 Scenario 1: Normal single effect configuration');
        await this.simulateEffectConfigurerUseEffect(mockEffect, mockProjectData, null);

        console.log(`\n📊 After Scenario 1:
   - Introspection calls: ${this.introspectionCallCount}
   - ColorPicker creations: ${this.colorPickerCreationCount}`);

        // Scenario 2: Multiple effects (simulating effects panel)
        console.log('\n📋 Scenario 2: Multiple effects configuration');
        const effects = [
            { name: 'HexEffect' },
            { name: 'FuzzFlareEffect' },
            { name: 'ColorShiftEffect' }
        ];

        for (const effect of effects) {
            await this.simulateEffectConfigurerUseEffect(effect, mockProjectData, null);
        }

        console.log(`\n📊 After Scenario 2:
   - Introspection calls: ${this.introspectionCallCount}
   - ColorPicker creations: ${this.colorPickerCreationCount}`);

        // Scenario 3: Repeated configuration (simulating re-renders)
        console.log('\n📋 Scenario 3: Repeated effect configuration (re-renders)');

        for (let i = 0; i < 5; i++) {
            console.log(`   Re-render ${i + 1}:`);
            await this.simulateEffectConfigurerUseEffect(mockEffect, mockProjectData, null);
        }

        console.log(`\n📊 After Scenario 3:
   - Introspection calls: ${this.introspectionCallCount}
   - ColorPicker creations: ${this.colorPickerCreationCount}`);

        // Scenario 4: Rapid project data changes
        console.log('\n📋 Scenario 4: Rapid project data changes');

        const projectDataVariations = [
            { resolution: 'hd' },
            { resolution: '4k' },
            { resolution: 'hd', isHoz: true },
            { resolution: '4k', isHoz: false }
        ];

        for (const projectData of projectDataVariations) {
            console.log(`   Project data change:`, projectData);
            await this.simulateEffectConfigurerUseEffect(mockEffect, projectData, null);
        }

        console.log(`\n📊 Final Results:
   - Total introspection calls: ${this.introspectionCallCount}
   - Total ColorPicker creations: ${this.colorPickerCreationCount}`);

        // Analyze if we have a loop
        if (this.colorPickerCreationCount > 20) {
            console.log('\n❌ LOOP DETECTED!');
            console.log('   Excessive ColorPicker creation suggests a configuration loop');
            console.log('   Likely causes:');
            console.log('   1. useEffect dependency causing re-renders');
            console.log('   2. onConfigChange callback triggering parent re-renders');
            console.log('   3. Project data changes causing repeated introspection');
            console.log('   4. Multiple instances of EffectConfigurer running simultaneously');
        } else {
            console.log('\n✅ No excessive loop detected in simulation');
        }
    }
}

// Run the test
const tester = new MockUIColorPickerTest();
tester.testLoopScenarios();