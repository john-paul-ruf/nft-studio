#!/usr/bin/env node

/**
 * Test script to verify config linking is working
 * Run this to check if EffectRegistryService properly initializes configs
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { app } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock Electron app for testing
const mockApp = {
    getName: () => 'NFT Studio',
    getPath: (name) => {
        if (name === 'userData') {
            return path.join(__dirname, '../test-data');
        }
        return __dirname;
    }
};

// Set up environment
process.env.NODE_ENV = 'test';
process.env.NODE_PATH = path.join(__dirname, '../node_modules');

// Import EffectRegistryService
const { EffectRegistryService } = await import('../src/main/services/EffectRegistryService.js');

async function testConfigLinking() {
    console.log('🧪 Starting config linking test...\n');
    
    try {
        const registry = new EffectRegistryService(null);
        
        console.log('1️⃣  Calling ensureCoreEffectsRegistered()...');
        await registry.ensureCoreEffectsRegistered();
        
        console.log('\n2️⃣  Checking ConfigRegistry...');
        const configRegistry = await registry.getConfigRegistry();
        
        if (configRegistry) {
            const getAllGlobal = configRegistry.getAllGlobal?.() || {};
            const allConfigs = Object.keys(getAllGlobal);
            
            console.log(`\n✅ ConfigRegistry populated with ${allConfigs.length} configs`);
            
            if (allConfigs.length > 0) {
                console.log('\n📋 Sample configs:');
                allConfigs.slice(0, 5).forEach(configName => {
                    console.log(`   • ${configName}`);
                });
                
                console.log('\n✨ SUCCESS! Configs are properly linked!');
                process.exit(0);
            } else {
                console.log('\n❌ FAILURE! ConfigRegistry is still empty');
                process.exit(1);
            }
        } else {
            console.log('\n❌ FAILURE! Could not access ConfigRegistry');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ ERROR during test:');
        console.error('  Message:', error.message);
        console.error('  Stack:', error.stack);
        process.exit(1);
    }
}

testConfigLinking();