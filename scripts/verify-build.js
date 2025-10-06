#!/usr/bin/env node

/**
 * Build verification script for NFT Studio
 * Checks that all necessary files are in place for distribution builds
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const requiredFiles = {
    // Core application files
    'main.js': 'Main process entry point',
    'preload.js': 'Preload script for renderer',
    'package.json': 'Package manifest',
    'index.template.html': 'HTML template',
    
    // Icons for each platform
    'icons/icon.icns': 'macOS icon',
    'icons/icon.ico': 'Windows icon',
    'icons/icon.png': 'Linux icon',
    
    // Distribution files (after build)
    'dist/bundle.js': 'Webpack bundle',
    'dist/index.html': 'Main HTML file'
};

const recommendedFiles = {
    // Additional icon sizes
    'icons/icon-16.png': '16x16 icon',
    'icons/icon-32.png': '32x32 icon',
    'icons/icon-64.png': '64x64 icon',
    'icons/icon-128.png': '128x128 icon',
    'icons/icon-256.png': '256x256 icon',
    'icons/icon-512.png': '512x512 icon'
};

async function fileExists(filePath) {
    try {
        await fs.stat(filePath);
        return true;
    } catch {
        return false;
    }
}

async function verifyBuild() {
    console.log('🔍 Verifying NFT Studio build configuration...\n');
    
    let hasErrors = false;
    let hasWarnings = false;
    
    // Check required files
    console.log('📋 Checking required files:');
    for (const [file, description] of Object.entries(requiredFiles)) {
        const filePath = path.join(rootDir, file);
        const exists = await fileExists(filePath);
        
        if (exists) {
            console.log(`  ✅ ${file} - ${description}`);
        } else {
            console.log(`  ❌ ${file} - ${description} [MISSING]`);
            hasErrors = true;
        }
    }
    
    console.log('\n📋 Checking recommended files:');
    for (const [file, description] of Object.entries(recommendedFiles)) {
        const filePath = path.join(rootDir, file);
        const exists = await fileExists(filePath);
        
        if (exists) {
            console.log(`  ✅ ${file} - ${description}`);
        } else {
            console.log(`  ⚠️  ${file} - ${description} [OPTIONAL]`);
            hasWarnings = true;
        }
    }
    
    // Check package.json configuration
    console.log('\n📦 Checking package.json configuration:');
    try {
        const packageJson = JSON.parse(await fs.readFile(path.join(rootDir, 'package.json'), 'utf-8'));
        
        // Check essential fields
        const checks = [
            { field: 'name', value: packageJson.name },
            { field: 'version', value: packageJson.version },
            { field: 'main', value: packageJson.main },
            { field: 'build.appId', value: packageJson.build?.appId },
            { field: 'build.productName', value: packageJson.build?.productName },
            { field: 'build.mac', value: packageJson.build?.mac },
            { field: 'build.win', value: packageJson.build?.win },
            { field: 'build.linux', value: packageJson.build?.linux }
        ];
        
        for (const check of checks) {
            if (check.value) {
                console.log(`  ✅ ${check.field}: ${typeof check.value === 'object' ? 'configured' : check.value}`);
            } else {
                console.log(`  ⚠️  ${check.field}: not configured`);
                hasWarnings = true;
            }
        }
    } catch (error) {
        console.log(`  ❌ Failed to read package.json: ${error.message}`);
        hasErrors = true;
    }
    
    // Platform-specific checks
    console.log('\n🖥️  Platform-specific checks:');
    const platform = process.platform;
    console.log(`  Current platform: ${platform}`);
    
    if (platform === 'darwin') {
        console.log('  ✅ macOS: Can build for all platforms');
    } else if (platform === 'win32') {
        console.log('  ⚠️  Windows: Cannot build macOS DMG (can build .zip)');
    } else if (platform === 'linux') {
        console.log('  ⚠️  Linux: Cannot build macOS DMG or Windows installers');
    }
    
    // Summary
    console.log('\n📊 Summary:');
    if (!hasErrors && !hasWarnings) {
        console.log('  ✅ All checks passed! Ready to build for all platforms.');
    } else if (!hasErrors) {
        console.log('  ⚠️  Build configuration has warnings but should work.');
    } else {
        console.log('  ❌ Build configuration has errors. Please fix before packaging.');
        process.exit(1);
    }
    
    // Build commands
    console.log('\n🚀 Available build commands:');
    console.log('  npm run package        # Build for all platforms');
    console.log('  npm run package:mac    # Build for macOS');
    console.log('  npm run package:win    # Build for Windows');
    console.log('  npm run package:linux  # Build for Linux');
    console.log('  npm run dist           # Build without publishing');
}

verifyBuild().catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
});