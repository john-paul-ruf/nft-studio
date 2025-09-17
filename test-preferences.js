#!/usr/bin/env node
/**
 * Test script to verify preference loading works correctly
 */

// Mock the window.api for testing
global.window = {
    api: {
        readFile: async (filePath) => {
            const fs = require('fs');
            try {
                const content = fs.readFileSync(filePath.replace('userData://', '/Users/the.phoenix/Library/Application Support/nft-studio/'), 'utf8');
                return { success: true, content };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },
        writeFile: async (filePath, content) => {
            return { success: true };
        }
    }
};

const PreferencesService = require('./src/services/PreferencesService').default;

async function testPreferences() {
    console.log('🧪 Testing Preference Loading...\n');

    try {
        console.log('1. Loading current preferences...');
        const prefs = await PreferencesService.getPreferences();
        console.log('   Current structure:', JSON.stringify(prefs, null, 2));

        console.log('\n2. Testing getter methods...');
        const lastArtist = await PreferencesService.getLastArtist();
        const lastProjectName = await PreferencesService.getLastProjectName();
        const lastDirectory = await PreferencesService.getLastProjectDirectory();

        console.log(`   Last Artist: "${lastArtist}"`);
        console.log(`   Last Project: "${lastProjectName}"`);
        console.log(`   Last Directory: "${lastDirectory}"`);

        console.log('\n3. Cleaning up preferences...');
        const cleanupResult = await PreferencesService.cleanupPreferences();
        console.log(`   Cleanup successful: ${cleanupResult}`);

        if (cleanupResult) {
            console.log('\n4. Testing after cleanup...');
            const cleanedPrefs = await PreferencesService.getPreferences();
            console.log('   Cleaned structure:', JSON.stringify(cleanedPrefs, null, 2));

            const newLastArtist = await PreferencesService.getLastArtist();
            const newLastProjectName = await PreferencesService.getLastProjectName();
            const newLastDirectory = await PreferencesService.getLastProjectDirectory();

            console.log(`   Last Artist: "${newLastArtist}"`);
            console.log(`   Last Project: "${newLastProjectName}"`);
            console.log(`   Last Directory: "${newLastDirectory}"`);
        }

        console.log('\n✅ Preference testing completed successfully!');

    } catch (error) {
        console.error('\n❌ Error testing preferences:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    testPreferences();
}