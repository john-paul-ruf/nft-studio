import TestEnvironment from '../setup/TestEnvironment.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * FFmpeg Integration Testing
 * Tests FFmpeg configuration and path resolution in development mode
 * 
 * Components Under Test:
 * 1. AsarFFmpegResolver - FFmpegConfig creation
 * 2. FFmpegConfig - Configuration validation
 * 3. ProjectLifecycleManager - FFmpeg config integration
 * 
 * Test Coverage:
 * - FFmpegConfig creation in development mode
 * - FFmpegConfig method validation
 * - Binary path validation
 * - Project integration with FFmpegConfig
 * - Error handling
 * 
 * Note: Production mode tests require Electron environment and are tested separately
 */

/**
 * Test: FFmpegConfig Creation and Validation
 * Validates that FFmpegConfig can be created and has correct methods
 */
export async function testFFmpegConfigCreation(env) {
    console.log('  📦 Testing FFmpegConfig creation...');
    
    // Import AsarFFmpegResolver
    const { default: resolver } = await import('../../src/utils/AsarFFmpegResolver.js');
    
    // Get FFmpegConfig instance
    console.log('    ℹ️  Getting FFmpegConfig from resolver...');
    const config = await resolver.getFFmpegConfig();
    
    // Test 1: Verify config is an object
    if (!config || typeof config !== 'object') {
        throw new Error('FFmpegConfig is not an object');
    }
    console.log('    ✅ FFmpegConfig is an object');
    
    // Test 2: Verify config has required methods
    if (typeof config.getFfmpegPath !== 'function') {
        throw new Error('FFmpegConfig missing getFfmpegPath method');
    }
    console.log('    ✅ FFmpegConfig has getFfmpegPath method');
    
    if (typeof config.getFfprobePath !== 'function') {
        throw new Error('FFmpegConfig missing getFfprobePath method');
    }
    console.log('    ✅ FFmpegConfig has getFfprobePath method');
    
    // Test 3: Verify paths are returned
    const ffmpegPath = config.getFfmpegPath();
    const ffprobePath = config.getFfprobePath();
    
    if (!ffmpegPath || typeof ffmpegPath !== 'string') {
        throw new Error('FFmpeg path is invalid');
    }
    console.log(`    📹 FFmpeg path: ${ffmpegPath}`);
    
    if (!ffprobePath || typeof ffprobePath !== 'string') {
        throw new Error('FFprobe path is invalid');
    }
    console.log(`    🔍 FFprobe path: ${ffprobePath}`);
    
    // Test 4: Verify binaries exist
    const ffmpegExists = await fs.access(ffmpegPath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
    
    if (!ffmpegExists) {
        throw new Error(`FFmpeg binary not found at: ${ffmpegPath}`);
    }
    console.log('    ✅ FFmpeg binary exists');
    
    const ffprobeExists = await fs.access(ffprobePath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
    
    if (!ffprobeExists) {
        throw new Error(`FFprobe binary not found at: ${ffprobePath}`);
    }
    console.log('    ✅ FFprobe binary exists');
    
    // Test 5: Verify binaries are executable
    const ffmpegExecutable = await fs.access(ffmpegPath, fs.constants.X_OK)
        .then(() => true)
        .catch(() => false);
    
    if (!ffmpegExecutable) {
        throw new Error(`FFmpeg binary not executable at: ${ffmpegPath}`);
    }
    console.log('    ✅ FFmpeg binary is executable');
    
    const ffprobeExecutable = await fs.access(ffprobePath, fs.constants.X_OK)
        .then(() => true)
        .catch(() => false);
    
    if (!ffprobeExecutable) {
        throw new Error(`FFprobe binary not executable at: ${ffprobePath}`);
    }
    console.log('    ✅ FFprobe binary is executable');
    
    return { success: true, config };
}

/**
 * Test: FFmpegConfig Caching
 * Validates that FFmpegConfig is properly cached
 */
export async function testFFmpegConfigCaching(env) {
    console.log('  🔄 Testing FFmpegConfig caching...');
    
    // Import AsarFFmpegResolver
    const { default: resolver } = await import('../../src/utils/AsarFFmpegResolver.js');
    
    // Get config first time
    const config1 = await resolver.getFFmpegConfig();
    console.log('    ✅ First config retrieved');
    
    // Get config second time
    const config2 = await resolver.getFFmpegConfig();
    console.log('    ✅ Second config retrieved');
    
    // Test: Verify same instance is returned (caching works)
    if (config1 !== config2) {
        throw new Error('FFmpegConfig is not cached (different instances returned)');
    }
    console.log('    ✅ FFmpegConfig is properly cached');
    
    // Test: Verify paths are identical
    if (config1.getFfmpegPath() !== config2.getFfmpegPath()) {
        throw new Error('FFmpeg paths differ between cached instances');
    }
    console.log('    ✅ FFmpeg paths are identical');
    
    if (config1.getFfprobePath() !== config2.getFfprobePath()) {
        throw new Error('FFprobe paths differ between cached instances');
    }
    console.log('    ✅ FFprobe paths are identical');
    
    return { success: true };
}

/**
 * Test: FFmpegConfig Serialization
 * Validates that FFmpegConfig can be serialized and deserialized
 */
export async function testFFmpegConfigSerialization(env) {
    console.log('  💾 Testing FFmpegConfig serialization...');
    
    // Import AsarFFmpegResolver and FFmpegConfig
    const { default: resolver } = await import('../../src/utils/AsarFFmpegResolver.js');
    const { FFmpegConfig } = await import('my-nft-gen/src/core/config/FFmpegConfig.js');
    
    // Get config
    const config = await resolver.getFFmpegConfig();
    console.log('    ✅ Config retrieved');
    
    // Test 1: Verify toJSON method exists
    if (typeof config.toJSON !== 'function') {
        throw new Error('FFmpegConfig missing toJSON method');
    }
    console.log('    ✅ toJSON method exists');
    
    // Test 2: Serialize config
    const json = config.toJSON();
    console.log('    ✅ Config serialized');
    
    // Test 3: Verify JSON structure
    if (!json.ffmpegPath || !json.ffprobePath) {
        throw new Error('Serialized config missing required fields');
    }
    console.log(`    📹 Serialized FFmpeg path: ${json.ffmpegPath}`);
    console.log(`    🔍 Serialized FFprobe path: ${json.ffprobePath}`);
    
    // Test 4: Deserialize config
    const restoredConfig = FFmpegConfig.fromJSON(json);
    console.log('    ✅ Config deserialized');
    
    // Test 5: Verify restored config has same paths
    if (restoredConfig.getFfmpegPath() !== config.getFfmpegPath()) {
        throw new Error('Restored FFmpeg path differs from original');
    }
    console.log('    ✅ Restored FFmpeg path matches original');
    
    if (restoredConfig.getFfprobePath() !== config.getFfprobePath()) {
        throw new Error('Restored FFprobe path differs from original');
    }
    console.log('    ✅ Restored FFprobe path matches original');
    
    return { success: true, json };
}

/**
 * Test: FFmpegConfig with ProjectLifecycleManager
 * Validates that FFmpegConfig integrates correctly with ProjectLifecycleManager
 */
export async function testFFmpegConfigWithProjectLifecycle(env) {
    console.log('  🔗 Testing FFmpegConfig with ProjectLifecycleManager...');
    
    // Import AsarFFmpegResolver
    const { default: resolver } = await import('../../src/utils/AsarFFmpegResolver.js');
    
    // Get FFmpegConfig
    const ffmpegConfig = await resolver.getFFmpegConfig();
    console.log('    ✅ FFmpegConfig retrieved');
    
    // Get ProjectLifecycleManager from test environment
    const projectManager = env.getProjectManager();
    
    if (!projectManager) {
        throw new Error('ProjectLifecycleManager not available in test environment');
    }
    console.log('    ✅ ProjectLifecycleManager available');
    
    // Create a test project with FFmpegConfig
    const projectPath = path.join(env.testDirectory, 'test-ffmpeg-project');
    await fs.mkdir(projectPath, { recursive: true });
    
    // Create project config
    const projectConfig = {
        name: 'FFmpeg Test Project',
        path: projectPath,
        layers: [],
        settings: {
            width: 1920,
            height: 1080,
            fps: 30
        },
        ffmpegConfig: ffmpegConfig // Pass FFmpegConfig
    };
    
    // Initialize project
    console.log('    ℹ️  Creating project with FFmpegConfig...');
    const project = await projectManager.createProject(projectConfig);
    
    if (!project) {
        throw new Error('Project creation failed');
    }
    console.log('    ✅ Project created successfully');
    
    // Verify project has FFmpegConfig
    if (!project.ffmpegConfig) {
        throw new Error('Project missing ffmpegConfig');
    }
    console.log('    ✅ Project has ffmpegConfig');
    
    // Verify FFmpegConfig methods are available
    if (typeof project.ffmpegConfig.getFfmpegPath !== 'function') {
        throw new Error('Project ffmpegConfig missing getFfmpegPath method');
    }
    console.log('    ✅ Project ffmpegConfig has getFfmpegPath method');
    
    // Verify paths match
    const projectFfmpegPath = project.ffmpegConfig.getFfmpegPath();
    const originalFfmpegPath = ffmpegConfig.getFfmpegPath();
    
    if (projectFfmpegPath !== originalFfmpegPath) {
        throw new Error('Project FFmpeg path differs from original config');
    }
    console.log('    ✅ Project FFmpeg path matches original config');
    
    return { success: true, project };
}

/**
 * Test: FFmpegConfig Error Handling
 * Validates error handling when creating FFmpegConfig with invalid paths
 */
export async function testFFmpegConfigErrorHandling(env) {
    console.log('  ⚠️  Testing FFmpegConfig error handling...');
    
    // Import FFmpegConfig
    const { FFmpegConfig } = await import('my-nft-gen/src/core/config/FFmpegConfig.js');
    
    // Test 1: Missing ffmpegPath
    try {
        new FFmpegConfig({ ffprobePath: '/path/to/ffprobe' });
        throw new Error('Should have thrown error for missing ffmpegPath');
    } catch (error) {
        if (error.message.includes('requires both')) {
            console.log('    ✅ Correctly throws error for missing ffmpegPath');
        } else {
            throw error;
        }
    }
    
    // Test 2: Missing ffprobePath
    try {
        new FFmpegConfig({ ffmpegPath: '/path/to/ffmpeg' });
        throw new Error('Should have thrown error for missing ffprobePath');
    } catch (error) {
        if (error.message.includes('requires both')) {
            console.log('    ✅ Correctly throws error for missing ffprobePath');
        } else {
            throw error;
        }
    }
    
    // Test 3: Missing both paths
    try {
        new FFmpegConfig({});
        throw new Error('Should have thrown error for missing both paths');
    } catch (error) {
        if (error.message.includes('requires both')) {
            console.log('    ✅ Correctly throws error for missing both paths');
        } else {
            throw error;
        }
    }
    
    // Test 4: Valid config creation
    const validConfig = new FFmpegConfig({
        ffmpegPath: '/valid/path/to/ffmpeg',
        ffprobePath: '/valid/path/to/ffprobe'
    });
    
    if (!validConfig) {
        throw new Error('Failed to create valid config');
    }
    console.log('    ✅ Valid config created successfully');
    
    return { success: true };
}

/**
 * Test: FFmpegConfig Platform Compatibility
 * Validates that FFmpegConfig works across different platforms
 */
export async function testFFmpegConfigPlatformCompatibility(env) {
    console.log('  🌍 Testing FFmpegConfig platform compatibility...');
    
    // Import AsarFFmpegResolver
    const { default: resolver } = await import('../../src/utils/AsarFFmpegResolver.js');
    
    // Get config
    const config = await resolver.getFFmpegConfig();
    
    // Get platform info
    const platform = process.platform;
    const arch = process.arch;
    
    console.log(`    ℹ️  Platform: ${platform}`);
    console.log(`    ℹ️  Architecture: ${arch}`);
    
    // Get paths
    const ffmpegPath = config.getFfmpegPath();
    const ffprobePath = config.getFfprobePath();
    
    // Test 1: Verify paths are platform-appropriate
    if (platform === 'win32') {
        if (!ffmpegPath.endsWith('.exe') && !ffmpegPath.endsWith('ffmpeg')) {
            console.log('    ⚠️  Warning: Windows FFmpeg path may be incorrect');
        } else {
            console.log('    ✅ Windows FFmpeg path format correct');
        }
    } else {
        if (ffmpegPath.endsWith('.exe')) {
            throw new Error('Non-Windows platform has .exe extension');
        }
        console.log('    ✅ Unix FFmpeg path format correct');
    }
    
    // Test 2: Verify binaries exist and are executable
    const ffmpegExists = await fs.access(ffmpegPath, fs.constants.F_OK | fs.constants.X_OK)
        .then(() => true)
        .catch(() => false);
    
    if (!ffmpegExists) {
        throw new Error(`FFmpeg binary not accessible on ${platform}`);
    }
    console.log(`    ✅ FFmpeg binary accessible on ${platform}`);
    
    const ffprobeExists = await fs.access(ffprobePath, fs.constants.F_OK | fs.constants.X_OK)
        .then(() => true)
        .catch(() => false);
    
    if (!ffprobeExists) {
        throw new Error(`FFprobe binary not accessible on ${platform}`);
    }
    console.log(`    ✅ FFprobe binary accessible on ${platform}`);
    
    return { success: true, platform, arch };
}

/**
 * Test: FFmpegConfig Performance
 * Validates that FFmpegConfig creation and caching is performant
 */
export async function testFFmpegConfigPerformance(env) {
    console.log('  ⚡ Testing FFmpegConfig performance...');
    
    // Import AsarFFmpegResolver
    const { default: resolver } = await import('../../src/utils/AsarFFmpegResolver.js');
    
    // Test 1: First config creation (uncached)
    const start1 = Date.now();
    const config1 = await resolver.getFFmpegConfig();
    const duration1 = Date.now() - start1;
    
    console.log(`    ⏱️  First config creation: ${duration1}ms`);
    
    if (duration1 > 1000) {
        console.log('    ⚠️  Warning: Config creation took longer than 1 second');
    } else {
        console.log('    ✅ Config creation is performant');
    }
    
    // Test 2: Cached config retrieval
    const start2 = Date.now();
    const config2 = await resolver.getFFmpegConfig();
    const duration2 = Date.now() - start2;
    
    console.log(`    ⏱️  Cached config retrieval: ${duration2}ms`);
    
    if (duration2 > 10) {
        console.log('    ⚠️  Warning: Cached retrieval took longer than 10ms');
    } else {
        console.log('    ✅ Cached retrieval is performant');
    }
    
    // Test 3: Multiple rapid retrievals
    const start3 = Date.now();
    for (let i = 0; i < 100; i++) {
        await resolver.getFFmpegConfig();
    }
    const duration3 = Date.now() - start3;
    const avgDuration = duration3 / 100;
    
    console.log(`    ⏱️  100 retrievals: ${duration3}ms (avg: ${avgDuration.toFixed(2)}ms)`);
    
    if (avgDuration > 1) {
        console.log('    ⚠️  Warning: Average retrieval time exceeds 1ms');
    } else {
        console.log('    ✅ Rapid retrievals are performant');
    }
    
    return { success: true, timings: { first: duration1, cached: duration2, average: avgDuration } };
}

/**
 * Test: FFmpegConfig Singleton Behavior
 * Validates that AsarFFmpegResolver properly implements singleton pattern
 */
export async function testFFmpegConfigSingletonBehavior(env) {
    console.log('  🔒 Testing FFmpegConfig singleton behavior...');
    
    // Import AsarFFmpegResolver multiple times
    const { default: resolver1 } = await import('../../src/utils/AsarFFmpegResolver.js');
    const { default: resolver2 } = await import('../../src/utils/AsarFFmpegResolver.js');
    
    // Test 1: Verify same instance
    if (resolver1 !== resolver2) {
        throw new Error('AsarFFmpegResolver is not a singleton');
    }
    console.log('    ✅ AsarFFmpegResolver is a singleton');
    
    // Test 2: Verify getInstance method
    const AsarFFmpegResolverClass = (await import('../../src/utils/AsarFFmpegResolver.js')).AsarFFmpegResolver;
    
    if (!AsarFFmpegResolverClass || typeof AsarFFmpegResolverClass.getInstance !== 'function') {
        throw new Error('AsarFFmpegResolver missing getInstance method');
    }
    console.log('    ✅ getInstance method exists');
    
    const resolver3 = AsarFFmpegResolverClass.getInstance();
    
    if (resolver3 !== resolver1) {
        throw new Error('getInstance returns different instance');
    }
    console.log('    ✅ getInstance returns same instance');
    
    // Test 3: Verify config caching across instances
    const config1 = await resolver1.getFFmpegConfig();
    const config2 = await resolver2.getFFmpegConfig();
    const config3 = await resolver3.getFFmpegConfig();
    
    if (config1 !== config2 || config2 !== config3) {
        throw new Error('Config not properly cached across singleton instances');
    }
    console.log('    ✅ Config properly cached across singleton instances');
    
    return { success: true };
}