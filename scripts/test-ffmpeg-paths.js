/**
 * Test script to verify FFmpeg paths exist
 * This runs in Node.js (not Electron) to verify the file structure
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testFFmpegPaths() {
    console.log('\n=== FFmpeg Paths Verification ===\n');
    
    const projectRoot = path.resolve(__dirname, '..');
    const platform = process.platform;
    
    console.log(`Platform: ${platform}`);
    console.log(`Architecture: ${process.arch}`);
    console.log(`Project Root: ${projectRoot}\n`);
    
    // Test 1: Check ffmpeg-ffprobe-static in my-nft-gen
    console.log('📦 Checking ffmpeg-ffprobe-static in my-nft-gen...');
    
    const myNftGenPath = path.join(projectRoot, '..', 'my-nft-gen');
    const ffmpegStaticPath = path.join(myNftGenPath, 'node_modules', 'ffmpeg-ffprobe-static');
    
    console.log(`   my-nft-gen path: ${myNftGenPath}`);
    console.log(`   ffmpeg-ffprobe-static path: ${ffmpegStaticPath}`);
    
    if (fs.existsSync(ffmpegStaticPath)) {
        console.log('   ✅ ffmpeg-ffprobe-static directory exists');
        
        const ffmpegBinary = path.join(ffmpegStaticPath, platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
        const ffprobeBinary = path.join(ffmpegStaticPath, platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
        
        console.log(`   FFmpeg binary: ${ffmpegBinary}`);
        console.log(`   FFmpeg exists: ${fs.existsSync(ffmpegBinary) ? '✅' : '❌'}`);
        
        console.log(`   FFprobe binary: ${ffprobeBinary}`);
        console.log(`   FFprobe exists: ${fs.existsSync(ffprobeBinary) ? '✅' : '❌'}`);
        
        // List contents
        const contents = fs.readdirSync(ffmpegStaticPath);
        console.log(`   Contents: ${contents.join(', ')}`);
    } else {
        console.log('   ❌ ffmpeg-ffprobe-static directory not found');
    }
    
    // Test 2: Load ffmpeg-ffprobe-static module
    console.log('\n📦 Loading ffmpeg-ffprobe-static module...');
    
    try {
        const ffmpegStatic = await import('ffmpeg-ffprobe-static');
        console.log('   ✅ Module loaded successfully');
        console.log(`   FFmpeg path: ${ffmpegStatic.ffmpegPath}`);
        console.log(`   FFprobe path: ${ffmpegStatic.ffprobePath}`);
        console.log(`   FFmpeg exists: ${fs.existsSync(ffmpegStatic.ffmpegPath) ? '✅' : '❌'}`);
        console.log(`   FFprobe exists: ${fs.existsSync(ffmpegStatic.ffprobePath) ? '✅' : '❌'}`);
    } catch (error) {
        console.log('   ❌ Error loading module:', error.message);
    }
    
    // Test 3: Load FFmpegConfig
    console.log('\n📦 Testing FFmpegConfig...');
    
    try {
        const { FFmpegConfig } = await import('my-nft-gen/src/core/config/FFmpegConfig.js');
        console.log('   ✅ FFmpegConfig loaded');
        
        const config = await FFmpegConfig.createDefault();
        console.log('   ✅ Default config created');
        console.log(`   FFmpeg path: ${config.ffmpegPath}`);
        console.log(`   FFprobe path: ${config.ffprobePath}`);
        console.log(`   FFmpeg exists: ${fs.existsSync(config.ffmpegPath) ? '✅' : '❌'}`);
        console.log(`   FFprobe exists: ${fs.existsSync(config.ffprobePath) ? '✅' : '❌'}`);
    } catch (error) {
        console.log('   ❌ Error:', error.message);
    }
    
    // Test 4: Simulate production paths
    console.log('\n📦 Simulating production ASAR unpacked paths...');
    
    // In production, the structure would be:
    // app.asar.unpacked/node_modules/my-nft-gen/node_modules/ffmpeg-ffprobe-static/ffmpeg
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
    
    console.log(`   Expected FFmpeg: ${prodFFmpegPath}`);
    console.log(`   FFmpeg exists: ${fs.existsSync(prodFFmpegPath) ? '✅' : '❌'}`);
    
    console.log(`   Expected FFprobe: ${prodFFprobePath}`);
    console.log(`   FFprobe exists: ${fs.existsSync(prodFFprobePath) ? '✅' : '❌'}`);
    
    // Check if my-nft-gen is a symlink (file: dependency)
    const myNftGenInNodeModules = path.join(projectRoot, 'node_modules', 'my-nft-gen');
    if (fs.existsSync(myNftGenInNodeModules)) {
        const stats = fs.lstatSync(myNftGenInNodeModules);
        if (stats.isSymbolicLink()) {
            const target = fs.readlinkSync(myNftGenInNodeModules);
            console.log(`\n   ℹ️  my-nft-gen is a symlink to: ${target}`);
            console.log(`   This is expected for 'file:' dependencies in development`);
        }
    }
    
    console.log('\n=== Verification Complete ===\n');
}

// Run the test
testFFmpegPaths().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});