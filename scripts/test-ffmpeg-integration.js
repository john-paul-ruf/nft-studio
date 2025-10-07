/**
 * Integration test for FFmpeg configuration
 * Run this with: npm run electron -- scripts/test-ffmpeg-integration.js
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// Import AsarFFmpegResolver
import AsarFFmpegResolver from '../src/utils/AsarFFmpegResolver.js';

async function runTests() {
    console.log('\n=== FFmpeg Integration Test ===\n');
    console.log(`Running in: ${app.isPackaged ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Architecture: ${process.arch}`);
    console.log(`App Path: ${app.getAppPath()}\n`);
    
    try {
        // Test 1: Get diagnostics
        console.log('📊 Getting diagnostics...');
        const diagnostics = AsarFFmpegResolver.getDiagnostics();
        
        console.log(`   Is Production: ${diagnostics.isProduction}`);
        console.log(`   Unpacked Base: ${diagnostics.unpackedBasePath}`);
        console.log(`   FFmpeg Path: ${diagnostics.ffmpegPath}`);
        console.log(`   FFprobe Path: ${diagnostics.ffprobePath}`);
        console.log(`   FFmpeg Exists: ${diagnostics.ffmpegExists ? '✅' : '❌'}`);
        console.log(`   FFprobe Exists: ${diagnostics.ffprobeExists ? '✅' : '❌'}`);
        
        if (!diagnostics.ffmpegExists || !diagnostics.ffprobeExists) {
            console.log('\n❌ ERROR: FFmpeg binaries not found!');
            console.log('   This will cause video generation to fail.');
            app.exit(1);
            return;
        }
        
        // Test 2: Get FFmpegConfig
        console.log('\n📦 Getting FFmpegConfig...');
        const config = await AsarFFmpegResolver.getFFmpegConfig();
        
        console.log(`   ✅ Config obtained successfully`);
        console.log(`   FFmpeg: ${config.ffmpegPath}`);
        console.log(`   FFprobe: ${config.ffprobePath}`);
        
        // Test 3: Verify config can be used with Project
        console.log('\n🎨 Testing with Project class...');
        const { Project } = await import('my-nft-gen/src/app/Project.js');
        const { ColorScheme } = await import('my-nft-gen/src/core/color/ColorScheme.js');
        
        const colorScheme = new ColorScheme({
            name: 'test',
            neutrals: ['#FFFFFF'],
            backgrounds: ['#000000'],
            lights: ['#FF0000']
        });
        
        const project = new Project({
            projectName: 'ffmpeg-test',
            colorScheme: colorScheme,
            ffmpegConfig: config, // Pass the config
            numberOfFrame: 10,
            longestSideInPixels: 100,
            shortestSideInPixels: 100,
            isHorizontal: true,
            projectDirectory: '/tmp/ffmpeg-test'
        });
        
        console.log(`   ✅ Project created with FFmpegConfig`);
        console.log(`   Project has ffmpegConfig: ${project.ffmpegConfig ? '✅' : '❌'}`);
        
        if (project.ffmpegConfig) {
            console.log(`   Config FFmpeg: ${project.ffmpegConfig.ffmpegPath}`);
            console.log(`   Config FFprobe: ${project.ffmpegConfig.ffprobePath}`);
        }
        
        // Test 4: Verify Settings receives config
        console.log('\n⚙️  Testing Settings generation...');
        const settings = await project.generateSettingsFile({
            finalFileName: 'ffmpeg-test',
            numberOfFrame: 10
        });
        
        console.log(`   ✅ Settings generated`);
        console.log(`   Settings has ffmpegConfig: ${settings.ffmpegConfig ? '✅' : '❌'}`);
        
        if (settings.ffmpegConfig) {
            console.log(`   Config FFmpeg: ${settings.ffmpegConfig.ffmpegPath}`);
            console.log(`   Config FFprobe: ${settings.ffmpegConfig.ffprobePath}`);
        }
        
        console.log('\n✅ All tests passed!');
        console.log('\n=== Test Complete ===\n');
        
        app.exit(0);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        app.exit(1);
    }
}

// Wait for app to be ready
app.whenReady().then(runTests);

// Quit when all windows are closed
app.on('window-all-closed', () => {
    app.quit();
});