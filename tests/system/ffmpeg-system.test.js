import TestEnvironment from '../setup/TestEnvironment.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * FFmpeg System Testing
 * End-to-end tests for FFmpeg integration across the entire application
 * 
 * Test Coverage:
 * - Complete FFmpeg integration flow
 * - FFmpegConfig persistence across operations
 * - Cross-platform compatibility
 * - Performance benchmarks
 * - Real-world usage scenarios
 * 
 * Note: These tests use real services and real FFmpeg binaries
 */

/**
 * Test: Complete FFmpeg Integration Flow
 * Tests the entire flow from FFmpegConfig creation to project usage
 */
export async function testCompleteFFmpegIntegrationFlow(env) {
    console.log('  🔄 Testing complete FFmpeg integration flow...');
    
    // Step 1: Import AsarFFmpegResolver
    console.log('    Step 1: Import AsarFFmpegResolver...');
    const { default: resolver } = await import('../../src/utils/AsarFFmpegResolver.js');
    console.log('    ✅ AsarFFmpegResolver imported');
    
    // Step 2: Get FFmpegConfig
    console.log('    Step 2: Get FFmpegConfig...');
    const ffmpegConfig = await resolver.getFFmpegConfig();
    
    if (!ffmpegConfig) {
        throw new Error('Failed to get FFmpegConfig');
    }
    console.log('    ✅ FFmpegConfig retrieved');
    
    // Step 3: Validate FFmpegConfig
    console.log('    Step 3: Validate FFmpegConfig...');
    const ffmpegPath = ffmpegConfig.getFfmpegPath();
    const ffprobePath = ffmpegConfig.getFfprobePath();
    
    if (!ffmpegPath || !ffprobePath) {
        throw new Error('FFmpegConfig has invalid paths');
    }
    console.log(`    📹 FFmpeg: ${ffmpegPath}`);
    console.log(`    🔍 FFprobe: ${ffprobePath}`);
    
    // Step 4: Verify binaries exist
    console.log('    Step 4: Verify binaries exist...');
    const ffmpegExists = await fs.access(ffmpegPath, fs.constants.F_OK).then(() => true).catch(() => false);
    const ffprobeExists = await fs.access(ffprobePath, fs.constants.F_OK).then(() => true).catch(() => false);
    
    if (!ffmpegExists || !ffprobeExists) {
        throw new Error('FFmpeg binaries not found');
    }
    console.log('    ✅ Binaries exist');
    
    // Step 5: Create project with FFmpegConfig
    console.log('    Step 5: Create project with FFmpegConfig...');
    const projectManager = env.getProjectManager();
    const projectPath = path.join(env.testDirectory, 'integration-test-project');
    await fs.mkdir(projectPath, { recursive: true });
    
    const projectConfig = {
        name: 'Integration Test Project',
        path: projectPath,
        layers: [],
        settings: {
            width: 1920,
            height: 1080,
            fps: 30
        },
        ffmpegConfig: ffmpegConfig
    };
    
    const project = await projectManager.createProject(projectConfig);
    
    if (!project) {
        throw new Error('Project creation failed');
    }
    console.log('    ✅ Project created');
    
    // Step 6: Verify project has FFmpegConfig
    console.log('    Step 6: Verify project has FFmpegConfig...');
    if (!project.ffmpegConfig) {
        throw new Error('Project missing ffmpegConfig');
    }
    
    if (project.ffmpegConfig.getFfmpegPath() !== ffmpegPath) {
        throw new Error('Project FFmpeg path differs from original');
    }
    console.log('    ✅ Project has correct FFmpegConfig');
    
    // Step 7: Serialize and deserialize config
    console.log('    Step 7: Test config serialization...');
    const json = ffmpegConfig.toJSON();
    const { FFmpegConfig } = await import('my-nft-gen/src/core/config/FFmpegConfig.js');
    const restoredConfig = FFmpegConfig.fromJSON(json);
    
    if (restoredConfig.getFfmpegPath() !== ffmpegPath) {
        throw new Error('Serialization/deserialization failed');
    }
    console.log('    ✅ Config serialization works');
    
    console.log('  ✅ Complete integration flow successful');
    
    return { success: true, project, ffmpegConfig };
}

/**
 * Test: FFmpegConfig Persistence Across Multiple Operations
 * Validates that FFmpegConfig remains consistent across multiple operations
 */
export async function testFFmpegConfigurationPersistence(env) {
    console.log('  💾 Testing FFmpegConfig persistence...');
    
    // Import resolver
    const { default: resolver } = await import('../../src/utils/AsarFFmpegResolver.js');
    
    // Get config multiple times
    const config1 = await resolver.getFFmpegConfig();
    const config2 = await resolver.getFFmpegConfig();
    const config3 = await resolver.getFFmpegConfig();
    
    // Verify all configs are the same instance
    if (config1 !== config2 || config2 !== config3) {
        throw new Error('FFmpegConfig not persisted (different instances)');
    }
    console.log('    ✅ Config instance persisted');
    
    // Verify paths remain consistent
    const path1 = config1.getFfmpegPath();
    const path2 = config2.getFfmpegPath();
    const path3 = config3.getFfmpegPath();
    
    if (path1 !== path2 || path2 !== path3) {
        throw new Error('FFmpeg paths not consistent');
    }
    console.log('    ✅ FFmpeg paths consistent');
    
    // Create multiple projects with the same config
    const projectManager = env.getProjectManager();
    
    for (let i = 0; i < 3; i++) {
        const projectPath = path.join(env.testDirectory, `persistence-test-${i}`);
        await fs.mkdir(projectPath, { recursive: true });
        
        const projectConfig = {
            name: `Persistence Test ${i}`,
            path: projectPath,
            layers: [],
            settings: { width: 1920, height: 1080, fps: 30 },
            ffmpegConfig: config1
        };
        
        const project = await projectManager.createProject(projectConfig);
        
        if (!project.ffmpegConfig) {
            throw new Error(`Project ${i} missing ffmpegConfig`);
        }
        
        if (project.ffmpegConfig.getFfmpegPath() !== path1) {
            throw new Error(`Project ${i} has different FFmpeg path`);
        }
        
        console.log(`    ✅ Project ${i} has correct config`);
    }
    
    console.log('  ✅ Config persistence verified across multiple operations');
    
    return { success: true };
}

/**
 * Test: FFmpegConfig Cross-Platform Compatibility
 * Validates that FFmpegConfig works correctly on the current platform
 */
export async function testFFmpegCrossPlatformCompatibility(env) {
    console.log('  🌍 Testing cross-platform compatibility...');
    
    const platform = process.platform;
    const arch = process.arch;
    
    console.log(`    ℹ️  Platform: ${platform}`);
    console.log(`    ℹ️  Architecture: ${arch}`);
    
    // Import resolver
    const { default: resolver } = await import('../../src/utils/AsarFFmpegResolver.js');
    
    // Get config
    const config = await resolver.getFFmpegConfig();
    const ffmpegPath = config.getFfmpegPath();
    const ffprobePath = config.getFfprobePath();
    
    // Platform-specific validations
    if (platform === 'win32') {
        // Windows: binaries should have .exe extension or be named correctly
        console.log('    ℹ️  Windows platform detected');
        console.log(`    📹 FFmpeg: ${ffmpegPath}`);
        console.log(`    🔍 FFprobe: ${ffprobePath}`);
    } else if (platform === 'darwin') {
        // macOS: binaries should not have .exe extension
        if (ffmpegPath.endsWith('.exe') || ffprobePath.endsWith('.exe')) {
            throw new Error('macOS binaries should not have .exe extension');
        }
        console.log('    ✅ macOS binary format correct');
    } else if (platform === 'linux') {
        // Linux: binaries should not have .exe extension
        if (ffmpegPath.endsWith('.exe') || ffprobePath.endsWith('.exe')) {
            throw new Error('Linux binaries should not have .exe extension');
        }
        console.log('    ✅ Linux binary format correct');
    }
    
    // Verify binaries exist and are executable
    const ffmpegAccessible = await fs.access(ffmpegPath, fs.constants.F_OK | fs.constants.X_OK)
        .then(() => true)
        .catch(() => false);
    
    if (!ffmpegAccessible) {
        throw new Error(`FFmpeg not accessible on ${platform}`);
    }
    console.log(`    ✅ FFmpeg accessible on ${platform}`);
    
    const ffprobeAccessible = await fs.access(ffprobePath, fs.constants.F_OK | fs.constants.X_OK)
        .then(() => true)
        .catch(() => false);
    
    if (!ffprobeAccessible) {
        throw new Error(`FFprobe not accessible on ${platform}`);
    }
    console.log(`    ✅ FFprobe accessible on ${platform}`);
    
    return { success: true, platform, arch };
}

/**
 * Test: FFmpegConfig Performance Benchmarks
 * Measures performance of FFmpegConfig operations
 */
export async function testFFmpegPerformanceBenchmarks(env) {
    console.log('  ⚡ Running performance benchmarks...');
    
    // Import resolver
    const { default: resolver } = await import('../../src/utils/AsarFFmpegResolver.js');
    
    // Benchmark 1: Config creation
    console.log('    📊 Benchmark 1: Config creation...');
    const start1 = Date.now();
    const config = await resolver.getFFmpegConfig();
    const duration1 = Date.now() - start1;
    console.log(`    ⏱️  Config creation: ${duration1}ms`);
    
    // Benchmark 2: Cached retrieval
    console.log('    📊 Benchmark 2: Cached retrieval...');
    const start2 = Date.now();
    for (let i = 0; i < 1000; i++) {
        await resolver.getFFmpegConfig();
    }
    const duration2 = Date.now() - start2;
    const avgCached = duration2 / 1000;
    console.log(`    ⏱️  1000 cached retrievals: ${duration2}ms (avg: ${avgCached.toFixed(3)}ms)`);
    
    // Benchmark 3: Path retrieval
    console.log('    📊 Benchmark 3: Path retrieval...');
    const start3 = Date.now();
    for (let i = 0; i < 10000; i++) {
        config.getFfmpegPath();
        config.getFfprobePath();
    }
    const duration3 = Date.now() - start3;
    const avgPath = duration3 / 10000;
    console.log(`    ⏱️  10000 path retrievals: ${duration3}ms (avg: ${avgPath.toFixed(3)}ms)`);
    
    // Benchmark 4: Serialization
    console.log('    📊 Benchmark 4: Serialization...');
    const start4 = Date.now();
    for (let i = 0; i < 1000; i++) {
        const json = config.toJSON();
    }
    const duration4 = Date.now() - start4;
    const avgSerial = duration4 / 1000;
    console.log(`    ⏱️  1000 serializations: ${duration4}ms (avg: ${avgSerial.toFixed(3)}ms)`);
    
    // Performance assertions
    if (duration1 > 1000) {
        console.log('    ⚠️  Warning: Initial config creation is slow');
    } else {
        console.log('    ✅ Initial config creation is performant');
    }
    
    if (avgCached > 1) {
        console.log('    ⚠️  Warning: Cached retrieval is slow');
    } else {
        console.log('    ✅ Cached retrieval is performant');
    }
    
    if (avgPath > 0.01) {
        console.log('    ⚠️  Warning: Path retrieval is slow');
    } else {
        console.log('    ✅ Path retrieval is performant');
    }
    
    if (avgSerial > 0.1) {
        console.log('    ⚠️  Warning: Serialization is slow');
    } else {
        console.log('    ✅ Serialization is performant');
    }
    
    return {
        success: true,
        benchmarks: {
            creation: duration1,
            cachedRetrieval: avgCached,
            pathRetrieval: avgPath,
            serialization: avgSerial
        }
    };
}

/**
 * Test: FFmpegConfig Real-World Usage Scenario
 * Simulates a real-world scenario of creating and using projects with FFmpeg
 */
export async function testFFmpegRealWorldUsageScenario(env) {
    console.log('  🎬 Testing real-world usage scenario...');
    
    // Scenario: User creates multiple projects and renders frames
    
    // Step 1: Initialize FFmpeg
    console.log('    Step 1: Initialize FFmpeg...');
    const { default: resolver } = await import('../../src/utils/AsarFFmpegResolver.js');
    const ffmpegConfig = await resolver.getFFmpegConfig();
    console.log('    ✅ FFmpeg initialized');
    
    // Step 2: Create first project
    console.log('    Step 2: Create first project...');
    const projectManager = env.getProjectManager();
    const project1Path = path.join(env.testDirectory, 'real-world-project-1');
    await fs.mkdir(project1Path, { recursive: true });
    
    const project1 = await projectManager.createProject({
        name: 'Real World Project 1',
        path: project1Path,
        layers: [],
        settings: { width: 1920, height: 1080, fps: 30 },
        ffmpegConfig: ffmpegConfig
    });
    
    if (!project1 || !project1.ffmpegConfig) {
        throw new Error('Project 1 creation failed');
    }
    console.log('    ✅ Project 1 created');
    
    // Step 3: Create second project
    console.log('    Step 3: Create second project...');
    const project2Path = path.join(env.testDirectory, 'real-world-project-2');
    await fs.mkdir(project2Path, { recursive: true });
    
    const project2 = await projectManager.createProject({
        name: 'Real World Project 2',
        path: project2Path,
        layers: [],
        settings: { width: 3840, height: 2160, fps: 60 },
        ffmpegConfig: ffmpegConfig
    });
    
    if (!project2 || !project2.ffmpegConfig) {
        throw new Error('Project 2 creation failed');
    }
    console.log('    ✅ Project 2 created');
    
    // Step 4: Verify both projects have same FFmpeg config
    console.log('    Step 4: Verify config consistency...');
    if (project1.ffmpegConfig.getFfmpegPath() !== project2.ffmpegConfig.getFfmpegPath()) {
        throw new Error('Projects have different FFmpeg paths');
    }
    console.log('    ✅ Both projects have consistent FFmpeg config');
    
    // Step 5: Simulate config persistence (save/load)
    console.log('    Step 5: Test config persistence...');
    const json1 = project1.ffmpegConfig.toJSON();
    const json2 = project2.ffmpegConfig.toJSON();
    
    if (json1.ffmpegPath !== json2.ffmpegPath) {
        throw new Error('Serialized configs differ');
    }
    console.log('    ✅ Config serialization consistent');
    
    // Step 6: Verify binaries are still accessible
    console.log('    Step 6: Verify binaries still accessible...');
    const ffmpegPath = project1.ffmpegConfig.getFfmpegPath();
    const ffmpegExists = await fs.access(ffmpegPath, fs.constants.F_OK | fs.constants.X_OK)
        .then(() => true)
        .catch(() => false);
    
    if (!ffmpegExists) {
        throw new Error('FFmpeg binary no longer accessible');
    }
    console.log('    ✅ Binaries still accessible');
    
    console.log('  ✅ Real-world scenario completed successfully');
    
    return { success: true, projects: [project1, project2] };
}