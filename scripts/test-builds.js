#!/usr/bin/env node

/**
 * Test build script for NFT Studio
 * Attempts to build for available platforms based on current OS
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const buildDir = path.join(rootDir, 'build');

function runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔧 Running: ${command} ${args.join(' ')}`);
        const child = spawn(command, args, { 
            stdio: 'inherit',
            shell: true,
            cwd: rootDir
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });
        
        child.on('error', reject);
    });
}

async function cleanBuildDirectory() {
    console.log('🧹 Cleaning build directory...');
    try {
        await fs.rm(buildDir, { recursive: true, force: true });
        console.log('✅ Build directory cleaned');
    } catch (error) {
        console.log('ℹ️ Build directory already clean');
    }
}

async function testBuilds() {
    const platform = process.platform;
    console.log(`\n🖥️  Platform: ${platform}`);
    console.log('📦 Starting NFT Studio build tests...\n');
    
    const builds = [];
    const results = {
        success: [],
        failed: []
    };
    
    // Determine which builds to attempt based on platform
    if (platform === 'darwin') {
        builds.push(
            { name: 'macOS', command: 'npm', args: ['run', 'package:mac', '--', '--dir'] },
            { name: 'Windows', command: 'npm', args: ['run', 'package:win', '--', '--dir'] },
            { name: 'Linux', command: 'npm', args: ['run', 'package:linux', '--', '--dir'] }
        );
    } else if (platform === 'win32') {
        builds.push(
            { name: 'Windows', command: 'npm', args: ['run', 'package:win', '--', '--dir'] },
            { name: 'macOS (ZIP only)', command: 'npm', args: ['run', 'package:mac', '--', '--dir', '--mac.target=zip'] }
        );
        console.log('⚠️  Note: Cannot build Linux packages on Windows');
    } else if (platform === 'linux') {
        builds.push(
            { name: 'Linux', command: 'npm', args: ['run', 'package:linux', '--', '--dir'] }
        );
        console.log('⚠️  Note: Cannot build macOS or Windows packages on Linux');
    }
    
    // Clean before starting
    await cleanBuildDirectory();
    
    // Run each build
    for (const build of builds) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📦 Testing ${build.name} build...`);
        console.log('='.repeat(60));
        
        try {
            const startTime = Date.now();
            await runCommand(build.command, build.args);
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            console.log(`✅ ${build.name} build successful (${duration}s)`);
            results.success.push({ name: build.name, duration });
            
            // Check output
            try {
                const files = await fs.readdir(buildDir);
                console.log(`📁 Build output in 'build/' directory:`);
                files.forEach(file => console.log(`   - ${file}`));
            } catch {
                console.log('ℹ️ No build output to list');
            }
            
        } catch (error) {
            console.error(`❌ ${build.name} build failed:`, error.message);
            results.failed.push({ name: build.name, error: error.message });
        }
        
        // Clean between builds
        if (builds.indexOf(build) < builds.length - 1) {
            await cleanBuildDirectory();
        }
    }
    
    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 Build Test Summary');
    console.log('='.repeat(60));
    
    if (results.success.length > 0) {
        console.log('\n✅ Successful builds:');
        results.success.forEach(r => {
            console.log(`   - ${r.name} (${r.duration}s)`);
        });
    }
    
    if (results.failed.length > 0) {
        console.log('\n❌ Failed builds:');
        results.failed.forEach(r => {
            console.log(`   - ${r.name}: ${r.error}`);
        });
    }
    
    if (results.failed.length === 0) {
        console.log('\n🎉 All available platform builds completed successfully!');
    } else {
        console.log('\n⚠️  Some builds failed. Check the errors above.');
        process.exit(1);
    }
    
    console.log('\n📝 Next steps:');
    console.log('   1. Test the built applications on their target platforms');
    console.log('   2. Replace placeholder icons with production icons');
    console.log('   3. Consider code signing for distribution');
}

// Run tests
testBuilds().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});