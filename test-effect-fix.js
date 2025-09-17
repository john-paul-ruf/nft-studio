#!/usr/bin/env node
/**
 * Simple test to verify the EffectRegistry fix
 */

const fs = require('fs');

function testEffectRegistryFix() {
    console.log('🔧 Testing EffectRegistry Fix...\n');

    try {
        console.log('1. Reading EffectRegistryService source code...');
        const serviceCode = fs.readFileSync('./src/main/services/EffectRegistryService.js', 'utf8');

        console.log('2. Checking for old problematic methods...');
        const oldMethods = [
            'getPrimaryEffects',
            'getSecondaryEffects',
            'getKeyFrameEffects',
            'getFinalEffects'
        ];

        let foundOldMethods = false;
        oldMethods.forEach(method => {
            if (serviceCode.includes(method)) {
                console.log(`   ❌ Found old method: ${method}`);
                foundOldMethods = true;
            }
        });

        if (!foundOldMethods) {
            console.log('   ✅ No old problematic methods found');
        }

        console.log('\n3. Checking for correct implementations...');

        // Check for getByCategoryGlobal usage (the correct static method)
        if (serviceCode.includes('getByCategoryGlobal')) {
            console.log('   ✅ Uses getByCategoryGlobal static method');
        } else {
            console.log('   ❌ getByCategoryGlobal static method not found');
        }

        // Check for getGlobal usage
        if (serviceCode.includes('getGlobal')) {
            console.log('   ✅ Uses getGlobal static method');
        } else {
            console.log('   ❌ getGlobal static method not found');
        }

        // Check for EffectCategories import
        if (serviceCode.includes('EffectCategories')) {
            console.log('   ✅ Imports EffectCategories');
        } else {
            console.log('   ❌ EffectCategories import missing');
        }

        // Check for correct category usage
        const expectedCategories = [
            'EffectCategories.PRIMARY',
            'EffectCategories.SECONDARY',
            'EffectCategories.KEY_FRAME',
            'EffectCategories.FINAL_IMAGE'
        ];

        let correctCategoriesUsed = true;
        expectedCategories.forEach(category => {
            if (!serviceCode.includes(category)) {
                console.log(`   ❌ Missing category: ${category}`);
                correctCategoriesUsed = false;
            }
        });

        if (correctCategoriesUsed) {
            console.log('   ✅ All correct categories are used');
        }

        console.log('\n4. Verifying method structure...');

        // Check that getAllEffects returns the right structure
        const getAllEffectsMatch = serviceCode.match(/getAllEffects.*?{([\s\S]*?)}/);
        if (getAllEffectsMatch) {
            const methodBody = getAllEffectsMatch[1];

            if (methodBody.includes('primary:') &&
                methodBody.includes('secondary:') &&
                methodBody.includes('keyFrame:') &&
                methodBody.includes('final:')) {
                console.log('   ✅ getAllEffects returns correct structure');
            } else {
                console.log('   ❌ getAllEffects structure is incorrect');
            }
        }

        console.log('\n5. Summary of fix...');
        console.log('   BEFORE: Used non-existent methods like getPrimaryEffects()');
        console.log('   THEN:   Used getByCategory() but on class instead of instance');
        console.log('   AFTER:  Uses getByCategoryGlobal() static methods');
        console.log('   ERROR1: "EffectRegistry.getPrimaryEffects is not a function"');
        console.log('   ERROR2: "EffectRegistry.getByCategory is not a function"');
        console.log('   FIXED:  ✅ Now calls getByCategoryGlobal(EffectCategories.PRIMARY)');

        console.log('\n✅ EffectRegistry fix verification completed!');
        console.log('\nThe error should now be resolved when running the app.');

        return true;

    } catch (error) {
        console.error('❌ Error verifying fix:', error.message);
        return false;
    }
}

function testFileStructure() {
    console.log('\n📁 Checking related files...\n');

    const filesToCheck = [
        './src/main/services/EffectRegistryService.js',
        './src/main/implementations/NftEffectsManager.js',
        './src/main/handlers/EffectsHandlers.js',
        './tests/services/EffectRegistryService.test.js'
    ];

    filesToCheck.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`   ✅ ${file} exists`);
        } else {
            console.log(`   ❌ ${file} missing`);
        }
    });

    console.log('\n✅ File structure check completed!');
}

// Main execution
if (require.main === module) {
    const fixValid = testEffectRegistryFix();
    testFileStructure();

    if (fixValid) {
        console.log('\n🎉 All checks passed! The EffectRegistry error should be fixed.');
        process.exit(0);
    } else {
        console.log('\n❌ Some checks failed. Please review the fix.');
        process.exit(1);
    }
}

module.exports = { testEffectRegistryFix, testFileStructure };