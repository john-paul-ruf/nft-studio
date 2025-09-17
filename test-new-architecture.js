#!/usr/bin/env node
/**
 * Test script to investigate the new my-nft-gen effect plugin architecture
 */

console.log('🔍 Investigating new my-nft-gen effect plugin architecture...\n');

async function testNewArchitecture() {
    try {
        // Test the EffectRegistryService
        const EffectRegistryService = require('./src/main/services/EffectRegistryService');
        const registryService = new EffectRegistryService();

        console.log('1️⃣ Testing EffectRegistryService...');

        // Get registries
        const EffectRegistry = await registryService.getEffectRegistry();
        const ConfigRegistry = await registryService.getConfigRegistry();

        console.log('✅ Got EffectRegistry:', typeof EffectRegistry);
        console.log('✅ Got ConfigRegistry:', typeof ConfigRegistry);

        // Test discovery
        console.log('\n2️⃣ Testing effect discovery...');
        const effects = await registryService.getAllEffects();
        console.log('🎯 Effects discovered:', Object.keys(effects));

        if (effects.primary && effects.primary.length > 0) {
            const firstEffect = effects.primary[0];
            console.log('📋 First effect structure:', {
                name: firstEffect.name,
                displayName: firstEffect.displayName,
                category: firstEffect.category,
                keys: Object.keys(firstEffect)
            });
        }

        console.log('\n3️⃣ Testing registry access...');
        if (effects.primary && effects.primary.length > 0) {
            const effectName = effects.primary[0].name;
            console.log(`🔍 Testing effect: ${effectName}`);

            // Test effect lookup
            const effectData = EffectRegistry.getGlobal(effectName);
            console.log('🎯 Effect data found:', !!effectData);
            if (effectData) {
                console.log('📋 Effect _name_:', effectData._name_);
                console.log('📋 Effect properties:', Object.keys(effectData).filter(k => !k.startsWith('_')));
            }

            // Test config lookup
            if (effectData && effectData._name_) {
                const configData = ConfigRegistry.getGlobal(effectData._name_);
                console.log('🔧 Config data found:', !!configData);
                if (configData) {
                    console.log('📋 Config properties:', Object.keys(configData));
                    if (configData.ConfigClass) {
                        console.log('✅ ConfigClass found:', configData.ConfigClass.name);
                    }
                }
            }
        }

        console.log('\n4️⃣ Testing new NftEffectsManager...');
        const NftEffectsManager = require('./src/main/implementations/NftEffectsManager');
        const manager = new NftEffectsManager();

        const discovery = await manager.discoverEffects();
        console.log('🎯 Manager discovery success:', discovery.success);
        if (discovery.success) {
            const totalEffects = Object.values(discovery.effects).flat().length;
            console.log('📊 Total effects discovered:', totalEffects);
        }

        // Test getEffectDefaults
        if (effects.primary && effects.primary.length > 0) {
            const effectName = effects.primary[0].name;
            try {
                console.log(`\n5️⃣ Testing getEffectDefaults for: ${effectName}`);
                const defaults = await manager.getEffectDefaults(effectName);
                console.log('✅ Defaults retrieved successfully');
                console.log('📋 Default properties count:', Object.keys(defaults).length);
                const hasRangeObjects = Object.values(defaults).some(v =>
                    v && typeof v === 'object' && v.hasOwnProperty('lower') && v.hasOwnProperty('upper')
                );
                console.log('🎯 Has range objects:', hasRangeObjects);
            } catch (error) {
                console.log('❌ getEffectDefaults failed:', error.message);
            }
        }

    } catch (error) {
        console.error('💥 Test failed:', error);
        console.error('Stack:', error.stack);
    }
}

testNewArchitecture().then(() => {
    console.log('\n🎉 Architecture test complete!');
}).catch(error => {
    console.error('\n💥 Architecture test failed:', error);
    process.exit(1);
});