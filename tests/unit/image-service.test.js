import TestEnvironment from '../setup/TestEnvironment.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * ImageService Method Testing - Phase 2.2
 * Real Objects Testing: All 4 ImageService methods with actual image files
 * 
 * Methods Under Test:
 * 1. readImageAsBase64(imagePath) - Image to base64 conversion with real images
 * 2. getMimeTypeFromPath(filePath) - MIME type detection for various formats  
 * 3. isValidImageExtension(filePath) - Image extension validation
 * 4. extractFrameNumber(filename) - Frame number extraction from filenames
 */

/**
 * Test 1: readImageAsBase64() - Valid Image Reading
 * Tests successful image reading and base64 conversion with real image files
 */
async function testReadImageAsBase64ValidImages() {
    const env = await new TestEnvironment().setup();
    
    try {
        const imageService = env.getService('imageService');
        const tempDir = env.tempManager.tempDirectories[0];
        
        // Create a simple 1x1 PNG image (smallest valid PNG)
        const pngData = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc.
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
            0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, // compressed data
            0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // more data
            0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00, // IEND chunk
            0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);
        
        const imagePath = path.join(tempDir, 'test-image.png');
        await fs.writeFile(imagePath, pngData);

        const result = await imageService.readImageAsBase64(imagePath);

        if (!result.success) {
            throw new Error(`PNG image read failed: ${result.error}`);
        }
        if (!result.data.startsWith('data:image/png;base64,')) {
            throw new Error('PNG image data URL format incorrect');
        }
        if (result.data.length <= 50) {
            throw new Error('PNG base64 data too short');
        }
        
        // Test JPEG image
        const jpegData = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, // JPEG header with JFIF
            0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
            0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, // Quantization table
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
            0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
            0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
            0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
            0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
            0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
            0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01, // Start of frame
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11,
            0x01, 0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14, // Huffman table
            0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x08, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, // Start of scan
            0x00, 0x00, 0x3F, 0x00, 0xD2, 0xFF, 0xD9        // End of image
        ]);
        
        const jpegPath = path.join(tempDir, 'test-image.jpg');
        await fs.writeFile(jpegPath, jpegData);

        const jpegResult = await imageService.readImageAsBase64(jpegPath);

        if (!jpegResult.success) {
            throw new Error(`JPEG image read failed: ${jpegResult.error}`);
        }
        if (!jpegResult.data.startsWith('data:image/jpeg;base64,')) {
            throw new Error('JPEG image data URL format incorrect');
        }
        
        // Test relative path handling
        const relativePath = path.relative(process.cwd(), imagePath);
        const relativeResult = await imageService.readImageAsBase64(relativePath);
        if (!relativeResult.success) {
            throw new Error(`Relative path read failed: ${relativeResult.error}`);
        }
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test 2: readImageAsBase64() - Error Conditions
 * Tests error handling for invalid files and paths
 */
async function testReadImageAsBase64ErrorConditions() {
    const env = await new TestEnvironment().setup();
    
    try {
        const imageService = env.getService('imageService');
        const tempDir = env.tempManager.tempDirectories[0];
        
        // Test non-existent file
        const nonExistentPath = path.join(tempDir, 'does-not-exist.png');
        const result = await imageService.readImageAsBase64(nonExistentPath);

        if (result.success) {
            throw new Error('Non-existent file should fail');
        }
        if (!result.error || !result.error.match(/ENOENT|no such file/i)) {
            throw new Error('Non-existent file should return ENOENT error');
        }
        
        // Test invalid image file (should still succeed in reading as base64)
        const invalidImagePath = path.join(tempDir, 'invalid-image.png');
        await fs.writeFile(invalidImagePath, 'This is not an image file');

        const invalidResult = await imageService.readImageAsBase64(invalidImagePath);
        if (!invalidResult.success) {
            throw new Error('Invalid image file should still be readable as base64');
        }
        if (!invalidResult.data.includes('VGhpcyBpcyBub3QgYW4gaW1hZ2UgZmlsZQ==')) {
            throw new Error('Invalid image base64 content incorrect');
        }
        
        // Test empty file
        const emptyImagePath = path.join(tempDir, 'empty.png');
        await fs.writeFile(emptyImagePath, '');

        const emptyResult = await imageService.readImageAsBase64(emptyImagePath);
        if (!emptyResult.success) {
            throw new Error('Empty file should be readable as base64');
        }
        if (emptyResult.data !== 'data:image/png;base64,') {
            throw new Error('Empty file base64 format incorrect');
        }
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test 3: getMimeTypeFromPath() - MIME Type Detection
 * Tests MIME type detection for all supported image formats
 */
async function testGetMimeTypeFromPath() {
    const env = await new TestEnvironment().setup();
    
    try {
        const imageService = env.getService('imageService');
        
        // Test all supported formats
        const testCases = [
            { path: 'image.png', expected: 'image/png' },
            { path: 'image.jpg', expected: 'image/jpeg' },
            { path: 'image.jpeg', expected: 'image/jpeg' },
            { path: 'image.gif', expected: 'image/gif' },
            { path: 'image.webp', expected: 'image/webp' },
            { path: 'image.bmp', expected: 'image/bmp' },
            { path: 'image.svg', expected: 'image/svg+xml' }
        ];

        for (const { path, expected } of testCases) {
            const result = imageService.getMimeTypeFromPath(path);
            if (result !== expected) {
                throw new Error(`MIME type for ${path} expected ${expected}, got ${result}`);
            }
        }
        
        // Test case insensitive extensions
        const caseTestCases = [
            { path: 'image.PNG', expected: 'image/png' },
            { path: 'image.JPG', expected: 'image/jpeg' },
            { path: 'image.JPEG', expected: 'image/jpeg' },
            { path: 'image.GIF', expected: 'image/gif' },
            { path: 'image.WebP', expected: 'image/webp' },
            { path: 'image.BMP', expected: 'image/bmp' },
            { path: 'image.SVG', expected: 'image/svg+xml' }
        ];

        for (const { path, expected } of caseTestCases) {
            const result = imageService.getMimeTypeFromPath(path);
            if (result !== expected) {
                throw new Error(`Case insensitive MIME type for ${path} expected ${expected}, got ${result}`);
            }
        }
        
        // Test unknown extensions
        const unknownExtensions = ['file.txt', 'file.doc', 'file.unknown', 'file', 'file.', '.hidden'];
        for (const path of unknownExtensions) {
            const result = imageService.getMimeTypeFromPath(path);
            if (result !== 'application/octet-stream') {
                throw new Error(`Unknown extension ${path} should return application/octet-stream, got ${result}`);
            }
        }
        
        // Test complex file paths
        const complexPaths = [
            { path: '/path/to/image.png', expected: 'image/png' },
            { path: 'C:\\Windows\\image.jpg', expected: 'image/jpeg' },
            { path: './relative/path/image.gif', expected: 'image/gif' },
            { path: '../parent/image.webp', expected: 'image/webp' },
            { path: 'image.with.dots.png', expected: 'image/png' }
        ];

        for (const { path, expected } of complexPaths) {
            const result = imageService.getMimeTypeFromPath(path);
            if (result !== expected) {
                throw new Error(`Complex path ${path} expected ${expected}, got ${result}`);
            }
        }
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test 4: isValidImageExtension() - Extension Validation
 * Tests image extension validation for supported and unsupported formats
 */
async function testIsValidImageExtension() {
    const env = await new TestEnvironment().setup();
    
    try {
        const imageService = env.getService('imageService');
        
        // Test valid extensions
        const validExtensions = [
            'image.png', 'image.jpg', 'image.jpeg', 'image.gif',
            'image.webp', 'image.bmp', 'image.svg'
        ];

        for (const path of validExtensions) {
            const result = imageService.isValidImageExtension(path);
            if (!result) {
                throw new Error(`Valid extension ${path} should return true`);
            }
        }
        
        // Test case insensitive validation
        const caseInsensitiveExtensions = [
            'image.PNG', 'image.JPG', 'image.JPEG', 'image.GIF',
            'image.WEBP', 'image.BMP', 'image.SVG', 'image.Png', 'image.JpG'
        ];

        for (const path of caseInsensitiveExtensions) {
            const result = imageService.isValidImageExtension(path);
            if (!result) {
                throw new Error(`Case insensitive extension ${path} should return true`);
            }
        }
        
        // Test invalid extensions
        const invalidExtensions = [
            'file.txt', 'file.doc', 'file.pdf', 'file.mp4', 'file.mp3',
            'file.zip', 'file.exe', 'file.unknown', 'file', 'file.', '.hidden'
        ];

        for (const path of invalidExtensions) {
            const result = imageService.isValidImageExtension(path);
            if (result) {
                throw new Error(`Invalid extension ${path} should return false`);
            }
        }
        
        // Test complex file paths
        const complexTestCases = [
            { path: '/path/to/image.png', expected: true },
            { path: 'C:\\Windows\\image.jpg', expected: true },
            { path: './relative/path/image.gif', expected: true },
            { path: '../parent/document.txt', expected: false },
            { path: 'image.with.dots.png', expected: true },
            { path: 'image.png.backup', expected: false }
        ];

        for (const { path, expected } of complexTestCases) {
            const result = imageService.isValidImageExtension(path);
            if (result !== expected) {
                throw new Error(`Complex path ${path} expected ${expected}, got ${result}`);
            }
        }
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test 5: extractFrameNumber() - Frame Number Extraction
 * Tests frame number extraction from various filename patterns
 */
async function testExtractFrameNumber() {
    const env = await new TestEnvironment().setup();
    
    try {
        const imageService = env.getService('imageService');
        
        // Test standard patterns
        const standardTestCases = [
            { filename: 'frame001.png', expected: 1 },
            { filename: 'frame123.jpg', expected: 123 },
            { filename: 'image_042.gif', expected: 42 },
            { filename: '999.webp', expected: 999 },
            { filename: 'frame-0001.png', expected: 1 },
            { filename: 'sequence_00050.jpg', expected: 50 }
        ];

        for (const { filename, expected } of standardTestCases) {
            const result = imageService.extractFrameNumber(filename);
            if (result !== expected) {
                throw new Error(`Frame number for ${filename} expected ${expected}, got ${result}`);
            }
        }
        
        // Test files without numbers
        const noNumberFiles = [
            'image.png', 'background.jpg', 'logo.gif', 'icon.webp', 'texture.bmp', 'vector.svg'
        ];

        for (const filename of noNumberFiles) {
            const result = imageService.extractFrameNumber(filename);
            if (result !== 0) {
                throw new Error(`File without numbers ${filename} should return 0, got ${result}`);
            }
        }
        
        // Test multiple numbers (should extract first)
        const multipleNumberTestCases = [
            { filename: 'frame123_version456.png', expected: 123 },
            { filename: '001_backup_999.jpg', expected: 1 },
            { filename: 'project2024_frame042.gif', expected: 2024 },
            { filename: '5_of_10_frames.webp', expected: 5 }
        ];

        for (const { filename, expected } of multipleNumberTestCases) {
            const result = imageService.extractFrameNumber(filename);
            if (result !== expected) {
                throw new Error(`Multiple numbers ${filename} expected ${expected}, got ${result}`);
            }
        }
        
        // Test edge cases
        const edgeTestCases = [
            { filename: '0.png', expected: 0 },
            { filename: '00000.jpg', expected: 0 },
            { filename: '000001.gif', expected: 1 },
            { filename: 'frame0000000123.webp', expected: 123 },
            { filename: '', expected: 0 },
            { filename: 'no-numbers-here.png', expected: 0 }
        ];

        for (const { filename, expected } of edgeTestCases) {
            const result = imageService.extractFrameNumber(filename);
            if (result !== expected) {
                throw new Error(`Edge case ${filename} expected ${expected}, got ${result}`);
            }
        }
        
        // Test complex filename patterns
        const complexTestCases = [
            { filename: 'animation_v2_frame_001_final.png', expected: 2 },
            { filename: 'project-2024-12-19-frame-042.jpg', expected: 2024 },
            { filename: 'render_1920x1080_frame_123.gif', expected: 1920 },
            { filename: 'sequence.001.exr', expected: 1 },
            { filename: 'shot_010_take_005.png', expected: 10 }
        ];

        for (const { filename, expected } of complexTestCases) {
            const result = imageService.extractFrameNumber(filename);
            if (result !== expected) {
                throw new Error(`Complex pattern ${filename} expected ${expected}, got ${result}`);
            }
        }
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Integration Test: Complete ImageService Workflow
 * Tests multiple ImageService methods working together in realistic scenarios
 */
async function testImageServiceIntegrationWorkflow() {
    const env = await new TestEnvironment().setup();
    
    try {
        const imageService = env.getService('imageService');
        const tempDir = env.tempManager.tempDirectories[0];
        
        // Create test images of different formats
        const pngData = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
            0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
            0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00,
            0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);

        const testFiles = [
            { name: 'frame001.png', data: pngData },
            { name: 'frame002.jpg', data: Buffer.from('fake-jpeg-data') },
            { name: 'background.gif', data: Buffer.from('fake-gif-data') },
            { name: 'invalid.txt', data: Buffer.from('not-an-image') }
        ];

        // Create test files
        for (const file of testFiles) {
            await fs.writeFile(path.join(tempDir, file.name), file.data);
        }

        // Process each file through complete workflow
        const results = [];
        for (const file of testFiles) {
            const filePath = path.join(tempDir, file.name);
            
            // Step 1: Validate extension
            const isValidExtension = imageService.isValidImageExtension(filePath);
            
            // Step 2: Get MIME type
            const mimeType = imageService.getMimeTypeFromPath(filePath);
            
            // Step 3: Extract frame number
            const frameNumber = imageService.extractFrameNumber(file.name);
            
            // Step 4: Read as base64 (only for valid image extensions)
            let base64Result = null;
            if (isValidExtension) {
                base64Result = await imageService.readImageAsBase64(filePath);
            }

            results.push({
                filename: file.name,
                isValidExtension,
                mimeType,
                frameNumber,
                base64Success: base64Result?.success || false
            });
        }

        // Verify results
        if (results.length !== 4) {
            throw new Error(`Expected 4 results, got ${results.length}`);
        }
        
        // PNG file
        const pngResult = results.find(r => r.filename === 'frame001.png');
        if (!pngResult.isValidExtension) throw new Error('PNG should be valid extension');
        if (pngResult.mimeType !== 'image/png') throw new Error('PNG MIME type incorrect');
        if (pngResult.frameNumber !== 1) throw new Error('PNG frame number incorrect');
        if (!pngResult.base64Success) throw new Error('PNG base64 should succeed');
        
        // JPG file
        const jpgResult = results.find(r => r.filename === 'frame002.jpg');
        if (!jpgResult.isValidExtension) throw new Error('JPG should be valid extension');
        if (jpgResult.mimeType !== 'image/jpeg') throw new Error('JPG MIME type incorrect');
        if (jpgResult.frameNumber !== 2) throw new Error('JPG frame number incorrect');
        if (!jpgResult.base64Success) throw new Error('JPG base64 should succeed');
        
        // GIF file
        const gifResult = results.find(r => r.filename === 'background.gif');
        if (!gifResult.isValidExtension) throw new Error('GIF should be valid extension');
        if (gifResult.mimeType !== 'image/gif') throw new Error('GIF MIME type incorrect');
        if (gifResult.frameNumber !== 0) throw new Error('GIF frame number incorrect');
        if (!gifResult.base64Success) throw new Error('GIF base64 should succeed');
        
        // Invalid file
        const invalidResult = results.find(r => r.filename === 'invalid.txt');
        if (invalidResult.isValidExtension) throw new Error('TXT should not be valid extension');
        if (invalidResult.mimeType !== 'application/octet-stream') throw new Error('TXT MIME type incorrect');
        if (invalidResult.frameNumber !== 0) throw new Error('TXT frame number incorrect');
        if (invalidResult.base64Success) throw new Error('TXT base64 should not succeed');
        
    } finally {
        await env.cleanup();
    }
}

// Export test functions for the test runner
export {
    testReadImageAsBase64ValidImages,
    testReadImageAsBase64ErrorConditions,
    testGetMimeTypeFromPath,
    testIsValidImageExtension,
    testExtractFrameNumber,
    testImageServiceIntegrationWorkflow
};