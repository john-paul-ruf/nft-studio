#!/usr/bin/env node

/**
 * Test script to verify production FFmpeg path resolution
 * This simulates the production environment path checking logic
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simulate production paths
const productionAppPath = '/Applications/NFT Studio.app/Contents/Resources/app.asar.unpacked';

function testPathResolution() {
    console.log('🔍 Testing Production FFmpeg Path Resolution\n');
    console.log('Production app path:', productionAppPath);
    console.log('');

    const platform = process.platform;
    const ffmpegBinary = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    const ffprobeBinary = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';

    // Test FFmpeg paths
    console.log('📹 Testing FFmpeg paths:');
    
    const ffmpegHoisted = path.join(productionAppPath, 'node_modules', 'ffmpeg-ffprobe-static', ffmpegBinary);
    const ffmpegNested = path.join(productionAppPath, 'node_modules', 'my-nft-gen', 'node_modules', 'ffmpeg-ffprobe-static', ffmpegBinary);
    
    console.log('  Hoisted path:', ffmpegHoisted);
    console.log('  Exists:', fs.existsSync(ffmpegHoisted) ? '✅' : '❌');
    console.log('');
    console.log('  Nested path:', ffmpegNested);
    console.log('  Exists:', fs.existsSync(ffmpegNested) ? '✅' : '❌');
    console.log('');

    // Test FFprobe paths
    console.log('🔍 Testing FFprobe paths:');
    
    const ffprobeHoisted = path.join(productionAppPath, 'node_modules', 'ffmpeg-ffprobe-static', ffprobeBinary);
    const ffprobeNested = path.join(productionAppPath, 'node_modules', 'my-nft-gen', 'node_modules', 'ffmpeg-ffprobe-static', ffprobeBinary);
    
    console.log('  Hoisted path:', ffprobeHoisted);
    console.log('  Exists:', fs.existsSync(ffprobeHoisted) ? '✅' : '❌');
    console.log('');
    console.log('  Nested path:', ffprobeNested);
    console.log('  Exists:', fs.existsSync(ffprobeNested) ? '✅' : '❌');
    console.log('');

    // Determine which paths would be used
    const ffmpegPath = fs.existsSync(ffmpegHoisted) ? ffmpegHoisted : ffmpegNested;
    const ffprobePath = fs.existsSync(ffprobeHoisted) ? ffprobeHoisted : ffprobeNested;

    console.log('✅ Resolution Results:');
    console.log('  FFmpeg will use:', ffmpegPath);
    console.log('  FFprobe will use:', ffprobePath);
    console.log('');

    // Verify both exist
    const ffmpegExists = fs.existsSync(ffmpegPath);
    const ffprobeExists = fs.existsSync(ffprobePath);

    if (ffmpegExists && ffprobeExists) {
        console.log('✅ SUCCESS: Both binaries found and accessible!');
        
        // Check if they're executable
        try {
            fs.accessSync(ffmpegPath, fs.constants.X_OK);
            fs.accessSync(ffprobePath, fs.constants.X_OK);
            console.log('✅ Both binaries are executable!');
        } catch (err) {
            console.log('⚠️  Warning: Binaries may not be executable:', err.message);
        }
        
        return true;
    } else {
        console.log('❌ FAILURE: Binaries not found!');
        if (!ffmpegExists) console.log('  - FFmpeg missing');
        if (!ffprobeExists) console.log('  - FFprobe missing');
        return false;
    }
}

// Run the test
try {
    const success = testPathResolution();
    process.exit(success ? 0 : 1);
} catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
}