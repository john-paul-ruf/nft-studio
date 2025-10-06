#!/usr/bin/env node

/**
 * Test script for verifying plugin loading in production
 * Run this script to diagnose plugin loading issues
 */

import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

// Mock app.isPackaged for testing
if (!app) {
    global.app = {
        isPackaged: process.argv.includes('--production'),
        getPath: (type) => {
            if (type === 'userData') {
                return process.platform === 'darwin' 
                    ? path.join(process.env.HOME, 'Library', 'Application Support', 'NFT Studio')
                    : path.join(process.env.APPDATA || process.env.HOME, 'NFT Studio');
            }
        }
    };
}

async function testPluginLoading() {
    console.log('🧪 Plugin Loading Test Script');
    console.log('================================');
    console.log(`Mode: ${app.isPackaged ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Node Version: ${process.version}`);
    console.log('');

    try {
        // Check for plugins config
        const appDataPath = app.getPath('userData');
        const pluginsConfigPath = path.join(appDataPath, 'plugins-config.json');
        
        console.log(`📁 Checking plugins config at: ${pluginsConfigPath}`);
        
        // Read plugins config
        const configData = await fs.readFile(pluginsConfigPath, 'utf8');
        const plugins = JSON.parse(configData);
        
        console.log(`✅ Found ${plugins.length} plugin(s) configured`);
        console.log('');
        
        // Test loading each plugin
        for (const plugin of plugins) {
            console.log(`📦 Testing plugin: ${plugin.name}`);
            console.log(`   Path: ${plugin.path}`);
            console.log(`   Enabled: ${plugin.enabled}`);
            
            if (!plugin.enabled) {
                console.log('   ⏭️  Skipping (disabled)');
                continue;
            }
            
            try {
                // Check if plugin path exists
                const stats = await fs.stat(plugin.path);
                console.log(`   ✅ Plugin path exists (${stats.isDirectory() ? 'directory' : 'file'})`);
                
                // Determine actual plugin file
                let pluginFile = plugin.path;
                if (stats.isDirectory()) {
                    // Try to find the main file
                    const possibleFiles = ['plugin.js', 'index.js'];
                    for (const file of possibleFiles) {
                        const testPath = path.join(plugin.path, file);
                        try {
                            await fs.access(testPath);
                            pluginFile = testPath;
                            console.log(`   ✅ Found main file: ${file}`);
                            break;
                        } catch (e) {
                            // Continue to next file
                        }
                    }
                }
                
                // Test direct import
                console.log('   🔄 Testing direct import...');
                const pluginUrl = pathToFileURL(pluginFile).href;
                console.log(`   URL: ${pluginUrl}`);
                
                const pluginModule = await import(pluginUrl);
                
                // Check for register function
                if (pluginModule.register && typeof pluginModule.register === 'function') {
                    console.log('   ✅ Plugin has register() function');
                    
                    // Check what the plugin exports
                    const exports = Object.keys(pluginModule);
                    console.log(`   📋 Plugin exports: ${exports.join(', ')}`);
                } else {
                    console.log('   ⚠️  Plugin missing register() function');
                }
                
                console.log('   ✅ Plugin can be loaded successfully');
                
            } catch (error) {
                console.log(`   ❌ Failed to load plugin: ${error.message}`);
                if (error.stack) {
                    console.log(`   Stack trace:\n${error.stack.split('\n').map(l => '      ' + l).join('\n')}`);
                }
            }
            
            console.log('');
        }
        
        console.log('✅ Plugin loading test complete');
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('❌ No plugins configured (plugins-config.json not found)');
        } else {
            console.log(`❌ Test failed: ${error.message}`);
            if (error.stack) {
                console.log(error.stack);
            }
        }
    }
}

// Run the test
testPluginLoading().catch(console.error);