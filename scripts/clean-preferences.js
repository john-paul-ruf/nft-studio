#!/usr/bin/env node

/**
 * Cross-platform preferences cleaner for NFT Studio
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

async function cleanPreferences() {
    const platform = process.platform;
    let prefsPath;
    
    // Determine preferences file location based on platform
    switch(platform) {
        case 'darwin': // macOS
            prefsPath = path.join(
                os.homedir(),
                'Library',
                'Application Support',
                'nft-studio',
                'user-preferences.json'
            );
            break;
            
        case 'win32': // Windows
            prefsPath = path.join(
                process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
                'nft-studio',
                'user-preferences.json'
            );
            break;
            
        case 'linux': // Linux
            prefsPath = path.join(
                process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
                'nft-studio',
                'user-preferences.json'
            );
            break;
            
        default:
            console.error(`❌ Unsupported platform: ${platform}`);
            process.exit(1);
    }
    
    try {
        await fs.unlink(prefsPath);
        console.log(`✅ Preferences cleared successfully from: ${prefsPath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('ℹ️ No preferences file found - already clean');
        } else {
            console.error(`❌ Error cleaning preferences: ${error.message}`);
            process.exit(1);
        }
    }
}

cleanPreferences().catch(console.error);