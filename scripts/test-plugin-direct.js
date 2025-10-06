#!/usr/bin/env node

/**
 * Direct test for plugin loading without Electron
 */

import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs/promises';

// Mock registries for testing
const mockEffectRegistry = {
    hasGlobal: (name) => {
        console.log(`  - Checking if effect '${name}' is registered`);
        return false;
    },
    registerGlobal: (effect, category, metadata) => {
        console.log(`  ✅ Registered effect: ${effect._name_} as ${category}`);
    }
};

const mockPluginRegistry = {
    register: (plugin) => {
        console.log(`  ✅ Plugin registry notified`);
    }
};

async function testPluginDirect() {
    console.log('🧪 Direct Plugin Loading Test');
    console.log('================================');
    
    const pluginPath = '/Users/the.phoenix/WebstormProjects/my-nft-zencoder-generated-effects-plugin/plugin.js';
    
    try {
        // Check if plugin file exists
        console.log(`\n📁 Checking plugin file: ${pluginPath}`);
        const stats = await fs.stat(pluginPath);
        console.log(`  ✅ Plugin file exists (${stats.size} bytes)`);
        
        // Import the plugin
        console.log('\n📦 Importing plugin module...');
        const pluginUrl = pathToFileURL(pluginPath).href;
        const pluginModule = await import(pluginUrl);
        
        console.log(`  ✅ Plugin imported successfully`);
        console.log(`  - Name: ${pluginModule.name}`);
        console.log(`  - Version: ${pluginModule.version}`);
        console.log(`  - Has register function: ${typeof pluginModule.register === 'function'}`);
        
        // Test the register function
        if (pluginModule.register && typeof pluginModule.register === 'function') {
            console.log('\n🔄 Testing plugin registration...');
            console.log('  - Calling register(EffectRegistry, PluginRegistry)...');
            
            try {
                await pluginModule.register(mockEffectRegistry, mockPluginRegistry);
                console.log('\n✅ Plugin registration successful!');
            } catch (regError) {
                console.error('\n❌ Plugin registration failed:', regError.message);
                console.error('Stack:', regError.stack);
            }
        } else {
            console.log('\n⚠️ Plugin has no register() function');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
testPluginDirect().catch(console.error);