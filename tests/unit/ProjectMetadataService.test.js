/**
 * ProjectMetadataService Tests
 * 
 * Tests for project metadata extraction service that handles extracting
 * project information from various settings file formats and sources.
 * 
 * REAL OBJECTS ONLY - NO MOCKS
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import ProjectMetadataService from '../../src/services/ProjectMetadataService.js';

/**
 * Test 1: Service initialization and method availability
 */
export async function testProjectMetadataServiceInitialization() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Verify service exists and has expected methods
        if (!ProjectMetadataService) {
            throw new Error('ProjectMetadataService should be defined');
        }
        if (typeof ProjectMetadataService.extractProjectName !== 'function') {
            throw new Error('extractProjectName method should exist');
        }
        if (typeof ProjectMetadataService.extractOutputDirectory !== 'function') {
            throw new Error('extractOutputDirectory method should exist');
        }
        if (typeof ProjectMetadataService.extractArtist !== 'function') {
            throw new Error('extractArtist method should exist');
        }
        if (typeof ProjectMetadataService.extractFrameCount !== 'function') {
            throw new Error('extractFrameCount method should exist');
        }
        if (typeof ProjectMetadataService.extractRenderSettings !== 'function') {
            throw new Error('extractRenderSettings method should exist');
        }

        console.log('✅ ProjectMetadataService initialized with all expected methods');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 2: Project name extraction from various sources with priority
 */
export async function testProjectNameExtraction() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Test finalFileName priority (highest)
        const settings1 = {
            config: {
                finalFileName: 'final-project-name',
                runName: 'run-name',
                fileOut: '/path/to/file-out-name.mp4'
            }
        };
        const result1 = ProjectMetadataService.extractProjectName(settings1);
        if (result1 !== 'final-project-name') {
            throw new Error(`Expected 'final-project-name', got '${result1}'`);
        }

        // Test runName priority (second)
        const settings2 = {
            config: {
                runName: 'run-project-name',
                fileOut: '/path/to/file-out-name.mp4'
            }
        };
        const result2 = ProjectMetadataService.extractProjectName(settings2);
        if (result2 !== 'run-project-name') {
            throw new Error(`Expected 'run-project-name', got '${result2}'`);
        }

        // Test fileOut extraction (third)
        const settings3 = {
            config: {
                fileOut: '/path/to/extracted-name.mp4'
            }
        };
        const result3 = ProjectMetadataService.extractProjectName(settings3);
        if (result3 !== 'extracted-name.mp4') {
            throw new Error(`Expected 'extracted-name.mp4', got '${result3}'`);
        }

        // Test fallback to default
        const settings4 = {};
        const result4 = ProjectMetadataService.extractProjectName(settings4);
        if (result4 !== 'Converted Project') {
            throw new Error(`Expected 'Converted Project', got '${result4}'`);
        }

        console.log('✅ Project name extraction works with correct priority');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 3: Project name extraction with whitespace handling
 */
export async function testProjectNameWhitespaceHandling() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const settings = {
            config: {
                finalFileName: '  whitespace-project  ',
                runName: '',
                fileOut: null
            }
        };
        const result = ProjectMetadataService.extractProjectName(settings);
        if (result !== 'whitespace-project') {
            throw new Error(`Expected 'whitespace-project', got '${result}'`);
        }

        // Test empty strings fallback
        const settingsEmpty = {
            config: {
                finalFileName: '   ',
                runName: '',
                fileOut: ''
            }
        };
        const resultEmpty = ProjectMetadataService.extractProjectName(settingsEmpty);
        if (resultEmpty !== 'Converted Project') {
            throw new Error(`Expected 'Converted Project', got '${resultEmpty}'`);
        }

        console.log('✅ Project name whitespace handling works correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 4: Output directory extraction from explicit outputDirectory
 */
export async function testOutputDirectoryExplicit() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const settings = {
            outputDirectory: '/explicit/output/path/',
            config: {
                fileOut: '/different/path/file.mp4'
            },
            workingDirectory: '/working/dir'
        };

        const result = ProjectMetadataService.extractOutputDirectory(settings);
        if (result !== '/explicit/output/path/') {
            throw new Error(`Expected '/explicit/output/path/', got '${result}'`);
        }

        console.log('✅ Output directory extraction from explicit outputDirectory works');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 5: Output directory extraction from absolute fileOut path
 */
export async function testOutputDirectoryFromAbsolutePath() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Unix-style absolute path
        const settings1 = {
            config: {
                fileOut: '/home/user/projects/output/video.mp4'
            }
        };
        const result1 = ProjectMetadataService.extractOutputDirectory(settings1);
        if (result1 !== '/home/user/projects/output/') {
            throw new Error(`Expected '/home/user/projects/output/', got '${result1}'`);
        }

        // Windows-style absolute path
        const settings2 = {
            config: {
                fileOut: 'C:\\Users\\User\\Projects\\output\\video.mp4'
            }
        };
        const result2 = ProjectMetadataService.extractOutputDirectory(settings2);
        if (result2 !== 'C:\\Users\\User\\Projects\\output\\') {
            throw new Error(`Expected 'C:\\Users\\User\\Projects\\output\\', got '${result2}'`);
        }

        console.log('✅ Output directory extraction from absolute paths works');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 6: Output directory extraction from relative fileOut with workingDirectory
 */
export async function testOutputDirectoryFromRelativePath() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const settings = {
            config: {
                fileOut: 'subfolder/output/video.mp4'
            },
            workingDirectory: '/base/working/dir'
        };

        const result = ProjectMetadataService.extractOutputDirectory(settings);
        if (result !== '/base/working/dir/subfolder/output') {
            throw new Error(`Expected '/base/working/dir/subfolder/output', got '${result}'`);
        }

        console.log('✅ Output directory extraction from relative path with workingDirectory works');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 7: Output directory fallback scenarios
 */
export async function testOutputDirectoryFallbacks() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Test fallback to workingDirectory when fileOut has no directory
        const settings1 = {
            config: {
                fileOut: 'video.mp4'  // No directory part
            },
            workingDirectory: '/fallback/working/dir'
        };
        const result1 = ProjectMetadataService.extractOutputDirectory(settings1);
        if (result1 !== '/fallback/working/dir') {
            throw new Error(`Expected '/fallback/working/dir', got '${result1}'`);
        }

        // Test null when no valid sources
        const settings2 = {
            config: {
                fileOut: 'video.mp4'  // No directory part
            }
            // No workingDirectory, no outputDirectory
        };
        const result2 = ProjectMetadataService.extractOutputDirectory(settings2);
        if (result2 !== null) {
            throw new Error(`Expected null, got '${result2}'`);
        }

        // Test completely empty settings
        const emptySettings = {};
        const result3 = ProjectMetadataService.extractOutputDirectory(emptySettings);
        if (result3 !== null) {
            throw new Error(`Expected null, got '${result3}'`);
        }

        console.log('✅ Output directory fallback scenarios work correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 8: Artist extraction
 */
export async function testArtistExtraction() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const settings1 = {
            config: {
                _INVOKER_: 'John Artist'
            }
        };
        const result1 = ProjectMetadataService.extractArtist(settings1);
        if (result1 !== 'John Artist') {
            throw new Error(`Expected 'John Artist', got '${result1}'`);
        }

        // Test missing artist
        const settings2 = {};
        const result2 = ProjectMetadataService.extractArtist(settings2);
        if (result2 !== '') {
            throw new Error(`Expected empty string, got '${result2}'`);
        }

        // Test empty artist
        const settings3 = {
            config: {
                _INVOKER_: ''
            }
        };
        const result3 = ProjectMetadataService.extractArtist(settings3);
        if (result3 !== '') {
            throw new Error(`Expected empty string, got '${result3}'`);
        }

        console.log('✅ Artist extraction works correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 9: Frame count extraction
 */
export async function testFrameCountExtraction() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const settings1 = {
            config: {
                numberOfFrame: 250
            }
        };
        const result1 = ProjectMetadataService.extractFrameCount(settings1);
        if (result1 !== 250) {
            throw new Error(`Expected 250, got ${result1}`);
        }

        // Test fallback to default
        const settings2 = {};
        const result2 = ProjectMetadataService.extractFrameCount(settings2);
        if (result2 !== 100) {
            throw new Error(`Expected 100, got ${result2}`);
        }

        // Test zero frames
        const settings3 = {
            config: {
                numberOfFrame: 0
            }
        };
        const result3 = ProjectMetadataService.extractFrameCount(settings3);
        if (result3 !== 0) {
            throw new Error(`Expected 0, got ${result3}`);
        }

        console.log('✅ Frame count extraction works correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 10: Render settings extraction
 */
export async function testRenderSettingsExtraction() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const settings1 = {
            frameStart: 10,
            config: {
                frameInc: 2
            }
        };

        const result1 = ProjectMetadataService.extractRenderSettings(settings1);
        if (result1.renderStartFrame !== 10) {
            throw new Error(`Expected renderStartFrame 10, got ${result1.renderStartFrame}`);
        }
        if (result1.renderJumpFrames !== 2) {
            throw new Error(`Expected renderJumpFrames 2, got ${result1.renderJumpFrames}`);
        }

        // Test with defaults
        const settings2 = {};
        const result2 = ProjectMetadataService.extractRenderSettings(settings2);
        if (result2.renderStartFrame !== 0) {
            throw new Error(`Expected renderStartFrame 0, got ${result2.renderStartFrame}`);
        }
        if (result2.renderJumpFrames !== 1) {
            throw new Error(`Expected renderJumpFrames 1, got ${result2.renderJumpFrames}`);
        }

        console.log('✅ Render settings extraction works correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 11: Complex real-world settings extraction
 */
export async function testComplexRealWorldSettings() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const complexSettings = {
            outputDirectory: '/Users/artist/NFT-Projects/Collection-1/',
            workingDirectory: '/Users/artist/temp/',
            frameStart: 1,
            config: {
                finalFileName: 'Mystic-Collection-#001',
                _INVOKER_: 'Digital Artist Pro',
                numberOfFrame: 300,
                frameInc: 1,
                fileOut: 'renders/final/Mystic-Collection-#001.mp4'
            }
        };

        const projectName = ProjectMetadataService.extractProjectName(complexSettings);
        if (projectName !== 'Mystic-Collection-#001') {
            throw new Error(`Expected 'Mystic-Collection-#001', got '${projectName}'`);
        }

        const outputDir = ProjectMetadataService.extractOutputDirectory(complexSettings);
        if (outputDir !== '/Users/artist/NFT-Projects/Collection-1/') {
            throw new Error(`Expected '/Users/artist/NFT-Projects/Collection-1/', got '${outputDir}'`);
        }

        const artist = ProjectMetadataService.extractArtist(complexSettings);
        if (artist !== 'Digital Artist Pro') {
            throw new Error(`Expected 'Digital Artist Pro', got '${artist}'`);
        }

        const frameCount = ProjectMetadataService.extractFrameCount(complexSettings);
        if (frameCount !== 300) {
            throw new Error(`Expected 300, got ${frameCount}`);
        }

        const renderSettings = ProjectMetadataService.extractRenderSettings(complexSettings);
        if (renderSettings.renderStartFrame !== 1) {
            throw new Error(`Expected renderStartFrame 1, got ${renderSettings.renderStartFrame}`);
        }
        if (renderSettings.renderJumpFrames !== 1) {
            throw new Error(`Expected renderJumpFrames 1, got ${renderSettings.renderJumpFrames}`);
        }

        console.log('✅ Complex real-world settings extraction works correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 12: Edge cases and error handling
 */
export async function testEdgeCasesAndErrorHandling() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Test null/undefined settings
        const result1 = ProjectMetadataService.extractProjectName(null);
        if (result1 !== 'Converted Project') {
            throw new Error(`Expected 'Converted Project' for null, got '${result1}'`);
        }

        const result2 = ProjectMetadataService.extractOutputDirectory(undefined);
        if (result2 !== null) {
            throw new Error(`Expected null for undefined, got '${result2}'`);
        }

        const result3 = ProjectMetadataService.extractArtist(null);
        if (result3 !== '') {
            throw new Error(`Expected empty string for null, got '${result3}'`);
        }

        const result4 = ProjectMetadataService.extractFrameCount(undefined);
        if (result4 !== 100) {
            throw new Error(`Expected 100 for undefined, got ${result4}`);
        }

        // Test malformed config
        const malformedSettings = {
            config: null,
            outputDirectory: undefined,
            workingDirectory: '',
            frameStart: 'invalid'
        };

        const result5 = ProjectMetadataService.extractProjectName(malformedSettings);
        if (result5 !== 'Converted Project') {
            throw new Error(`Expected 'Converted Project' for malformed, got '${result5}'`);
        }

        const result6 = ProjectMetadataService.extractOutputDirectory(malformedSettings);
        if (result6 !== null) {
            throw new Error(`Expected null for malformed, got '${result6}'`);
        }

        const result7 = ProjectMetadataService.extractRenderSettings(malformedSettings);
        if (result7.renderStartFrame !== 'invalid') {
            throw new Error(`Expected 'invalid' for malformed frameStart, got ${result7.renderStartFrame}`);
        }
        if (result7.renderJumpFrames !== 1) {
            throw new Error(`Expected 1 for malformed frameInc, got ${result7.renderJumpFrames}`);
        }

        console.log('✅ Edge cases and error handling work correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}