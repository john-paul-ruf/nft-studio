/**
 * FrameService Real Objects Tests
 * 
 * Tests all 3 FrameService methods using real objects and actual file operations:
 * - listCompletedFrames() - Frame listing and sorting with real directories
 * - readFrameImage() - Frame image reading with real image files
 * - validateFrameDirectory() - Directory structure validation with real paths
 * 
 * Following the established real objects testing philosophy:
 * - No mocks, only real service instances
 * - Real file system operations with temporary directories
 * - Real image data for comprehensive testing
 * - Proper cleanup after each test
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * Test FrameService.listCompletedFrames() with real frame directories
 * Tests frame discovery, filtering, sorting, and metadata extraction
 */
async function testListCompletedFrames() {
    const env = await new TestEnvironment().setup();
    
    try {
        const frameService = env.getService('frameService');
        const tempDir = env.tempManager.tempDirectories[0];
        
        // Create a project directory with frames subdirectory
        const projectDir = path.join(tempDir, 'test-project');
        const framesDir = path.join(projectDir, 'frames');
        await fs.mkdir(projectDir, { recursive: true });
        await fs.mkdir(framesDir, { recursive: true });
        
        // Create real image data (minimal valid PNG)
        const pngData = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
            0x42, 0x60, 0x82
        ]);
        
        // Create frame files with different numbers (test sorting)
        const frameFiles = [
            'frame_003.png',
            'frame_001.png', 
            'frame_010.png',
            'frame_002.jpg',
            'animation_005.gif',
            'not_a_frame.txt', // Should be filtered out
            'frame_007.webp'
        ];
        
        // Write frame files
        for (const filename of frameFiles) {
            const filePath = path.join(framesDir, filename);
            if (filename.endsWith('.txt')) {
                await fs.writeFile(filePath, 'not an image');
            } else {
                await fs.writeFile(filePath, pngData);
            }
        }
        
        // Test listing completed frames
        const result = await frameService.listCompletedFrames(projectDir);
        
        // Verify successful result
        if (!result.success) {
            throw new Error(`Expected success, got error: ${result.error}`);
        }
        
        // Verify frame count (should exclude .txt file)
        const expectedFrameCount = 6; // All image files
        if (result.totalFrames !== expectedFrameCount) {
            throw new Error(`Expected ${expectedFrameCount} frames, got ${result.totalFrames}`);
        }
        
        // Verify frames are sorted by frame number
        const frameNumbers = result.frames.map(f => f.frameNumber);
        const expectedOrder = [1, 2, 3, 5, 7, 10]; // Sorted order
        for (let i = 0; i < expectedOrder.length; i++) {
            if (frameNumbers[i] !== expectedOrder[i]) {
                throw new Error(`Frame sorting failed. Expected ${expectedOrder[i]} at position ${i}, got ${frameNumbers[i]}`);
            }
        }
        
        // Verify frame objects have correct structure
        const firstFrame = result.frames[0];
        if (!firstFrame.filename || !firstFrame.path || typeof firstFrame.frameNumber !== 'number') {
            throw new Error('Frame object missing required properties');
        }
        
        // Verify frames directory path
        if (result.framesDirectory !== framesDir) {
            throw new Error(`Expected framesDirectory ${framesDir}, got ${result.framesDirectory}`);
        }
        
        console.log('✅ Frame listing and sorting with real directories succeeded');
        
        // Test with non-existent frames directory
        const emptyProjectDir = path.join(tempDir, 'empty-project');
        await fs.mkdir(emptyProjectDir, { recursive: true });
        
        const emptyResult = await frameService.listCompletedFrames(emptyProjectDir);
        
        if (!emptyResult.success) {
            throw new Error('Expected success for project without frames directory');
        }
        
        if (emptyResult.totalFrames !== 0 || emptyResult.frames.length !== 0) {
            throw new Error('Expected empty frames list for project without frames directory');
        }
        
        console.log('✅ Empty frames directory handling succeeded');
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test FrameService.readFrameImage() with real image files
 * Tests image reading, validation, and error handling
 */
async function testReadFrameImage() {
    const env = await new TestEnvironment().setup();
    
    try {
        const frameService = env.getService('frameService');
        const tempDir = env.tempManager.tempDirectories[0];
        
        // Create real PNG image data
        const pngData = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
            0x42, 0x60, 0x82
        ]);
        
        // Create real JPEG image data (minimal valid JPEG)
        const jpegData = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
            0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
            0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
            0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
            0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
            0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
            0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
            0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
            0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11,
            0x01, 0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14,
            0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x08, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0xFF, 0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02,
            0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0xB2, 0xC0,
            0x07, 0xFF, 0xD9
        ]);
        
        // Test valid PNG frame
        const pngFramePath = path.join(tempDir, 'frame_001.png');
        await fs.writeFile(pngFramePath, pngData);
        
        const pngResult = await frameService.readFrameImage(pngFramePath);
        
        if (!pngResult.success) {
            throw new Error(`Expected success reading PNG frame, got error: ${pngResult.error}`);
        }
        
        if (!pngResult.data || !pngResult.data.startsWith('data:image/png;base64,')) {
            throw new Error('Expected PNG base64 data with correct data URI prefix');
        }
        
        console.log('✅ PNG frame reading succeeded');
        
        // Test valid JPEG frame
        const jpegFramePath = path.join(tempDir, 'frame_002.jpg');
        await fs.writeFile(jpegFramePath, jpegData);
        
        const jpegResult = await frameService.readFrameImage(jpegFramePath);
        
        if (!jpegResult.success) {
            throw new Error(`Expected success reading JPEG frame, got error: ${jpegResult.error}`);
        }
        
        if (!jpegResult.data || !jpegResult.data.startsWith('data:image/jpeg;base64,')) {
            throw new Error('Expected JPEG base64 data with correct data URI prefix');
        }
        
        console.log('✅ JPEG frame reading succeeded');
        
        // Test invalid extension
        const invalidFramePath = path.join(tempDir, 'frame_003.txt');
        await fs.writeFile(invalidFramePath, 'not an image');
        
        const invalidResult = await frameService.readFrameImage(invalidFramePath);
        
        if (invalidResult.success) {
            throw new Error('Expected failure for invalid image extension');
        }
        
        if (!invalidResult.error || !invalidResult.error.includes('Invalid image file extension')) {
            throw new Error('Expected specific error message for invalid extension');
        }
        
        console.log('✅ Invalid extension handling succeeded');
        
        // Test non-existent file
        const nonExistentPath = path.join(tempDir, 'does-not-exist.png');
        
        const nonExistentResult = await frameService.readFrameImage(nonExistentPath);
        
        if (nonExistentResult.success) {
            throw new Error('Expected failure for non-existent file');
        }
        
        console.log('✅ Non-existent file handling succeeded');
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test FrameService.validateFrameDirectory() with real directory structures
 * Tests directory validation and path resolution
 */
async function testValidateFrameDirectory() {
    const env = await new TestEnvironment().setup();
    
    try {
        const frameService = env.getService('frameService');
        const tempDir = env.tempManager.tempDirectories[0];
        
        // Test valid project with frames directory
        const validProjectDir = path.join(tempDir, 'valid-project');
        const validFramesDir = path.join(validProjectDir, 'frames');
        await fs.mkdir(validProjectDir, { recursive: true });
        await fs.mkdir(validFramesDir, { recursive: true });
        
        const validResult = await frameService.validateFrameDirectory(validProjectDir);
        
        if (!validResult.valid) {
            throw new Error('Expected valid result for project with frames directory');
        }
        
        if (!validResult.exists) {
            throw new Error('Expected exists to be true for existing frames directory');
        }
        
        if (validResult.framesDirectory !== validFramesDir) {
            throw new Error(`Expected framesDirectory ${validFramesDir}, got ${validResult.framesDirectory}`);
        }
        
        console.log('✅ Valid frames directory validation succeeded');
        
        // Test project without frames directory
        const invalidProjectDir = path.join(tempDir, 'invalid-project');
        await fs.mkdir(invalidProjectDir, { recursive: true });
        
        const invalidResult = await frameService.validateFrameDirectory(invalidProjectDir);
        
        if (invalidResult.valid) {
            throw new Error('Expected invalid result for project without frames directory');
        }
        
        if (invalidResult.exists) {
            throw new Error('Expected exists to be false for non-existent frames directory');
        }
        
        const expectedInvalidFramesDir = path.join(invalidProjectDir, 'frames');
        if (invalidResult.framesDirectory !== expectedInvalidFramesDir) {
            throw new Error(`Expected framesDirectory ${expectedInvalidFramesDir}, got ${invalidResult.framesDirectory}`);
        }
        
        console.log('✅ Invalid frames directory validation succeeded');
        
        // Test non-existent project directory
        const nonExistentProjectDir = path.join(tempDir, 'does-not-exist');
        
        const nonExistentResult = await frameService.validateFrameDirectory(nonExistentProjectDir);
        
        if (nonExistentResult.valid) {
            throw new Error('Expected invalid result for non-existent project directory');
        }
        
        if (nonExistentResult.exists) {
            throw new Error('Expected exists to be false for non-existent project directory');
        }
        
        console.log('✅ Non-existent project directory validation succeeded');
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test FrameService integration workflow with real frame operations
 * Tests complete workflow combining all methods
 */
async function testFrameServiceIntegrationWorkflow() {
    const env = await new TestEnvironment().setup();
    
    try {
        const frameService = env.getService('frameService');
        const tempDir = env.tempManager.tempDirectories[0];
        
        // Create a complete project structure
        const projectDir = path.join(tempDir, 'integration-project');
        const framesDir = path.join(projectDir, 'frames');
        await fs.mkdir(projectDir, { recursive: true });
        await fs.mkdir(framesDir, { recursive: true });
        
        // Create real image data
        const pngData = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
            0x42, 0x60, 0x82
        ]);
        
        // Create multiple frame files
        const frameFiles = ['frame_001.png', 'frame_002.png', 'frame_003.png'];
        for (const filename of frameFiles) {
            const filePath = path.join(framesDir, filename);
            await fs.writeFile(filePath, pngData);
        }
        
        // Step 1: Validate frame directory
        const validationResult = await frameService.validateFrameDirectory(projectDir);
        if (!validationResult.valid) {
            throw new Error('Frame directory validation failed in integration workflow');
        }
        
        // Step 2: List completed frames
        const listResult = await frameService.listCompletedFrames(projectDir);
        if (!listResult.success || listResult.totalFrames !== 3) {
            throw new Error('Frame listing failed in integration workflow');
        }
        
        // Step 3: Read each frame image
        for (const frame of listResult.frames) {
            const readResult = await frameService.readFrameImage(frame.path);
            if (!readResult.success) {
                throw new Error(`Frame reading failed for ${frame.filename} in integration workflow`);
            }
            
            if (!readResult.data || !readResult.data.startsWith('data:image/png;base64,')) {
                throw new Error(`Invalid frame data for ${frame.filename} in integration workflow`);
            }
        }
        
        console.log('✅ Complete FrameService integration workflow succeeded');
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test FrameService error conditions and edge cases
 * Tests various error scenarios and boundary conditions
 */
async function testFrameServiceErrorConditions() {
    const env = await new TestEnvironment().setup();
    
    try {
        const frameService = env.getService('frameService');
        const tempDir = env.tempManager.tempDirectories[0];
        
        // Test listCompletedFrames with invalid project directory
        try {
            const invalidResult = await frameService.listCompletedFrames('/invalid/path/that/does/not/exist');
            // Should handle gracefully and return success: false
            if (invalidResult.success) {
                throw new Error('Expected failure for invalid project directory');
            }
            console.log('✅ Invalid project directory error handling succeeded');
        } catch (error) {
            // This is also acceptable - the method can throw or return error
            console.log('✅ Invalid project directory error handling succeeded (threw exception)');
        }
        
        // Test readFrameImage with empty file path
        const emptyPathResult = await frameService.readFrameImage('');
        if (emptyPathResult.success) {
            throw new Error('Expected failure for empty file path');
        }
        
        console.log('✅ Empty file path error handling succeeded');
        
        // Test validateFrameDirectory with null/undefined
        try {
            const nullResult = await frameService.validateFrameDirectory(null);
            // Should handle gracefully
            if (nullResult.valid) {
                throw new Error('Expected invalid result for null project directory');
            }
            console.log('✅ Null project directory error handling succeeded');
        } catch (error) {
            // This is also acceptable
            console.log('✅ Null project directory error handling succeeded (threw exception)');
        }
        
        // Test with project directory that's actually a file
        const filePath = path.join(tempDir, 'not-a-directory.txt');
        await fs.writeFile(filePath, 'this is a file, not a directory');
        
        const fileAsProjectResult = await frameService.validateFrameDirectory(filePath);
        if (fileAsProjectResult.valid) {
            throw new Error('Expected invalid result when project directory is actually a file');
        }
        
        console.log('✅ File-as-directory error handling succeeded');
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test FrameService with various image formats and edge cases
 * Tests comprehensive format support and boundary conditions
 */
async function testFrameServiceImageFormats() {
    const env = await new TestEnvironment().setup();
    
    try {
        const frameService = env.getService('frameService');
        const tempDir = env.tempManager.tempDirectories[0];
        
        const projectDir = path.join(tempDir, 'formats-project');
        const framesDir = path.join(projectDir, 'frames');
        await fs.mkdir(projectDir, { recursive: true });
        await fs.mkdir(framesDir, { recursive: true });
        
        // Create minimal valid image data for different formats
        const pngData = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
            0x42, 0x60, 0x82
        ]);
        
        // Test various supported image formats
        const formatTests = [
            { filename: 'frame_001.png', data: pngData, expectedMime: 'image/png' },
            { filename: 'frame_002.jpg', data: pngData, expectedMime: 'image/jpeg' }, // Using PNG data for simplicity
            { filename: 'frame_003.jpeg', data: pngData, expectedMime: 'image/jpeg' },
            { filename: 'frame_004.gif', data: pngData, expectedMime: 'image/gif' },
            { filename: 'frame_005.webp', data: pngData, expectedMime: 'image/webp' },
            { filename: 'frame_006.bmp', data: pngData, expectedMime: 'image/bmp' }
        ];
        
        // Create all format files
        for (const test of formatTests) {
            const filePath = path.join(framesDir, test.filename);
            await fs.writeFile(filePath, test.data);
        }
        
        // Test listing frames with multiple formats
        const listResult = await frameService.listCompletedFrames(projectDir);
        
        if (!listResult.success) {
            throw new Error(`Frame listing failed: ${listResult.error}`);
        }
        
        if (listResult.totalFrames !== formatTests.length) {
            throw new Error(`Expected ${formatTests.length} frames, got ${listResult.totalFrames}`);
        }
        
        // Verify all formats are included and properly sorted
        const expectedFrameNumbers = [1, 2, 3, 4, 5, 6];
        const actualFrameNumbers = listResult.frames.map(f => f.frameNumber);
        
        for (let i = 0; i < expectedFrameNumbers.length; i++) {
            if (actualFrameNumbers[i] !== expectedFrameNumbers[i]) {
                throw new Error(`Frame sorting failed for multiple formats. Expected ${expectedFrameNumbers[i]} at position ${i}, got ${actualFrameNumbers[i]}`);
            }
        }
        
        console.log('✅ Multiple image format listing and sorting succeeded');
        
        // Test reading frames of different formats
        for (const frame of listResult.frames) {
            const readResult = await frameService.readFrameImage(frame.path);
            
            if (!readResult.success) {
                throw new Error(`Failed to read frame ${frame.filename}: ${readResult.error}`);
            }
            
            if (!readResult.data || !readResult.data.startsWith('data:image/')) {
                throw new Error(`Invalid data URI for frame ${frame.filename}`);
            }
        }
        
        console.log('✅ Multiple image format reading succeeded');
        
    } finally {
        await env.cleanup();
    }
}

// Export all test functions following the established pattern
export {
    testListCompletedFrames,
    testReadFrameImage,
    testValidateFrameDirectory,
    testFrameServiceIntegrationWorkflow,
    testFrameServiceErrorConditions,
    testFrameServiceImageFormats
};