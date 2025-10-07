/**
 * Test script to verify FFmpeg configuration in development mode
 * This simulates what happens when AsarFFmpegResolver is used
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock app.isPackaged for testing
let mockIsPackaged = false;

async function testFFmpegConfig() {
    console.log('\n=== FFmpeg Configuration Test ===\n');
    
    // Test 1: Development Mode
    console.log('📦 Testing DEVELOPMENT mode...');
    mockIsPackaged = false;
    
    try {
        // Import ffmpeg-ffprobe-static from my-nft-gen
        const ffmpegStatic = await import('ffmpeg-ffprobe-static');
        console.log('✅ ffmpeg-ffprobe-static loaded successfully');
        console.log(`   FFmpeg path: ${ffmpegStatic.ffmpegPath}`);
        console.log(`   FFprobe path: ${ffmpegStatic.ffprobePath}`);
        
        // Check if files exist
        const ffmpegExists = fs.existsSync(ffmpegStatic.ffmpegPath);
        const ffprobeExists = fs.existsSync(ffmpegStatic.ffprobePath);
        
        console.log(`   FFmpeg exists: ${ffmpegExists ? '✅' : '❌'}`);
        console.log(`   FFprobe exists: ${ffprobeExists ? '✅' : '❌'}`);
        
        if (!ffmpegExists || !ffprobeExists) {
            console.log('⚠️  Warning: FFmpeg binaries not found in development mode');
        }
    } catch (error) {
        console.log('❌ Error loading ffmpeg-ffprobe-static:', error.message);
    }
    
    // Test 2: Production Mode Paths
    console.log('\n📦 Testing PRODUCTION mode paths...');
    console.log('   (Simulating ASAR unpacked structure)');
    
    const projectRoot = path.resolve(__dirname, '..');
    const platform = process.platform;
    
    // Simulate production paths
    const prodFFmpegPath = path.join(
        projectRoot,
        'node_modules',
        'my-nft-gen',
        'node_modules',
        'ffmpeg-ffprobe-static',
        platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
    );
    
    const prodFFprobePath = path.join(
        projectRoot,
        'node_modules',
        'my-nft-gen',
        'node_modules',
        'ffmpeg-ffprobe-static',
        platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'
    );
    
    console.log(`   Expected FFmpeg path: ${prodFFmpegPath}`);
    console.log(`   Expected FFprobe path: ${prodFFprobePath}`);
    
    const prodFfmpegExists = fs.existsSync(prodFFmpegPath);
    const prodFfprobeExists = fs.existsSync(prodFFprobePath);
    
    console.log(`   FFmpeg exists: ${prodFfmpegExists ? '✅' : '❌'}`);
    console.log(`   FFprobe exists: ${prodFfprobeExists ? '✅' : '❌'}`);
    
    // Test 3: Load FFmpegConfig
    console.log('\n📦 Testing FFmpegConfig integration...');
    
    try {
        const { FFmpegConfig } = await import('my-nft-gen/src/core/config/FFmpegConfig.js');
        console.log('✅ FFmpegConfig loaded successfully');
        
        // Create default config
        const defaultConfig = await FFmpegConfig.createDefault();
        console.log('✅ Default FFmpegConfig created');
        console.log(`   FFmpeg path: ${defaultConfig.ffmpegPath}`);
        console.log(`   FFprobe path: ${defaultConfig.ffprobePath}`);
        
        // Test custom paths (production simulation)
        if (prodFfmpegExists && prodFfprobeExists) {
            const customConfig = FFmpegConfig.fromPaths(prodFFmpegPath, prodFFprobePath);
            console.log('✅ Custom FFmpegConfig created (production simulation)');
            console.log(`   FFmpeg path: ${customConfig.ffmpegPath}`);
            console.log(`   FFprobe path: ${customConfig.ffprobePath}`);
        }
    } catch (error) {
        console.log('❌ Error loading FFmpegConfig:', error.message);
    }
    
    // Test 4: AsarFFmpegResolver
    console.log('\n📦 Testing AsarFFmpegResolver...');
    
    try {
        const AsarFFmpegResolverModule = await import('../src/utils/AsarFFmpegResolver.js');
        const AsarFFmpegResolver = AsarFFmpegResolverModule.default;
        console.log('✅ AsarFFmpegResolver loaded successfully');
        
        // Get diagnostics
        const diagnostics = AsarFFmpegResolver.getDiagnostics();
        console.log('\n   Diagnostics:');
        console.log(`   - Is Production: ${diagnostics.isProduction}`);
        console.log(`   - Platform: ${diagnostics.platform}`);
        console.log(`   - Architecture: ${diagnostics.arch}`);
        console.log(`   - App Path: ${diagnostics.appPath}`);
        console.log(`   - Unpacked Base: ${diagnostics.unpackedBasePath}`);
        console.log(`   - FFmpeg Path: ${diagnostics.ffmpegPath}`);
        console.log(`   - FFprobe Path: ${diagnostics.ffprobePath}`);
        console.log(`   - FFmpeg Exists: ${diagnostics.ffmpegExists ? '✅' : '❌'}`);
        console.log(`   - FFprobe Exists: ${diagnostics.ffprobeExists ? '✅' : '❌'}`);
        
        // Try to get config
        const config = await AsarFFmpegResolver.getFFmpegConfig();
        console.log('\n✅ FFmpegConfig obtained from AsarFFmpegResolver');
        console.log(`   FFmpeg path: ${config.ffmpegPath}`);
        console.log(`   FFprobe path: ${config.ffprobePath}`);
        
    } catch (error) {
        console.log('❌ Error with AsarFFmpegResolver:', error.message);
        console.log(error.stack);
    }
    
    console.log('\n=== Test Complete ===\n');
}

// Run the test
testFFmpegConfig().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});