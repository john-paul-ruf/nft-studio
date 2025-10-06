#!/usr/bin/env node

/**
 * Test script for secure plugin loading
 * Creates a test plugin and verifies it loads correctly
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import SecurePluginLoader from '../src/main/services/SecurePluginLoader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Prevent Electron from starting normally
app.on('ready', async () => {
    console.log('🧪 Testing Secure Plugin Loader...');

    try {
        // Create a test plugin
        const testPluginDir = path.join(app.getPath('userData'), 'test-plugin');
        await fs.mkdir(testPluginDir, { recursive: true });

        const testPluginCode = `
// Test plugin
console.log('Test plugin loading...');

// Register a test effect
if (typeof registerEffect === 'function') {
    registerEffect('test-effect', function TestEffect() {
        this.apply = function(canvas, frame, config) {
            console.log('Test effect applied!');
            return canvas;
        };
    }, 'primary');
}

// Register a test config
if (typeof registerConfig === 'function') {
    registerConfig('test-config', function TestConfig() {
        this.getValue = function() {
            return 'test-value';
        };
    });
}

console.log('Test plugin loaded successfully!');
`;

        const pluginPath = path.join(testPluginDir, 'test-plugin.js');
        await fs.writeFile(pluginPath, testPluginCode, 'utf8');

        console.log('📝 Created test plugin at:', pluginPath);

        // Test the secure loader
        const loader = new SecurePluginLoader();
        console.log('🔒 Loading plugin in secure sandbox...');

        const result = await loader.loadPlugin(pluginPath);

        console.log('📊 Plugin load result:', {
            success: result.success,
            effects: result.effects.length,
            configs: result.configs.length,
            error: result.error
        });

        if (result.success) {
            console.log('✅ Secure plugin loader test PASSED!');
            console.log('   Registered effects:', result.effects.map(e => e.name).join(', '));
            console.log('   Registered configs:', result.configs.map(c => c.name).join(', '));
        } else {
            console.log('❌ Secure plugin loader test FAILED:', result.error);
        }

        // Cleanup
        loader.cleanup();
        await fs.rm(testPluginDir, { recursive: true, force: true });

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        app.quit();
    }
});

// Force app to not show windows
app.commandLine.appendSwitch('hidden');