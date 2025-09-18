import path from 'path';
import { createCanvas, loadImage } from 'canvas';

// Import the project manager to test
import NftProjectManager from '../../src/main/implementations/NftProjectManager.js';
import ConsoleLogger from '../../src/main/implementations/ConsoleLogger.js';
const ResolutionMapper = require('../../src/utils/ResolutionMapper').default;

describe('Lowest Resolution Frame Measurement', () => {
    let projectManager;

    beforeAll(() => {
        const logger = new ConsoleLogger();
        projectManager = new NftProjectManager(null, logger);
    });

    test('should render frame at lowest resolution (160x120) and measure actual output dimensions', async () => {
        // Get the lowest resolution
        const lowestWidth = 160; // QQVGA
        const expectedDimensions = ResolutionMapper.getDimensions(lowestWidth, true);

        console.log('🔍 Testing lowest resolution:', {
            targetWidth: lowestWidth,
            expectedDimensions
        });

        // Create minimal project config with lowest resolution
        const testConfig = {
            targetResolution: lowestWidth,
            isHorizontal: true,
            numFrames: 10,
            effects: [
                {
                    className: 'SolidColorEffect', // Simple effect for testing
                    config: {
                        color: '#FF0000' // Red
                    }
                }
            ],
            colorScheme: null,
            width: expectedDimensions.w,
            height: expectedDimensions.h,
            renderStartFrame: 0,
            renderJumpFrames: 11
        };

        console.log('🚀 Rendering frame with config:', {
            targetResolution: testConfig.targetResolution,
            configWidth: testConfig.width,
            configHeight: testConfig.height,
            effects: testConfig.effects.length
        });

        // Render frame 0
        const result = await projectManager.renderFrame(testConfig, 0);

        // Verify render was successful
        expect(result.success).toBe(true);
        expect(result.frameBuffer).toBeDefined();
        expect(Buffer.isBuffer(result.frameBuffer)).toBe(true);

        console.log('✅ Frame rendered successfully:', {
            success: result.success,
            bufferSize: result.frameBuffer.length,
            frameNumber: result.frameNumber
        });

        // Measure actual dimensions of the returned buffer
        // The buffer should be a PNG, so we can load it and check dimensions
        const actualDimensions = await measureImageDimensions(result.frameBuffer);

        console.log('📏 Dimension comparison:', {
            expected: expectedDimensions,
            actual: actualDimensions,
            widthMatch: actualDimensions.width === expectedDimensions.w,
            heightMatch: actualDimensions.height === expectedDimensions.h
        });

        // Assert that actual dimensions match expected dimensions
        expect(actualDimensions.width).toBe(expectedDimensions.w);
        expect(actualDimensions.height).toBe(expectedDimensions.h);

        // Additional validation: aspect ratio should be correct
        const expectedAspectRatio = expectedDimensions.w / expectedDimensions.h;
        const actualAspectRatio = actualDimensions.width / actualDimensions.height;

        expect(Math.abs(actualAspectRatio - expectedAspectRatio)).toBeLessThan(0.01);

        console.log('🎯 Resolution test PASSED:', {
            expectedResolution: `${expectedDimensions.w}x${expectedDimensions.h}`,
            actualResolution: `${actualDimensions.width}x${actualDimensions.height}`,
            aspectRatioMatch: Math.abs(actualAspectRatio - expectedAspectRatio) < 0.01
        });

    }, 30000); // 30 second timeout for render

    test('should verify ResolutionMapper consistency for lowest resolution', () => {
        const lowestWidth = 160;
        const resolution = ResolutionMapper.getByWidth(lowestWidth);

        expect(resolution).toBeDefined();
        expect(resolution.w).toBe(160);
        expect(resolution.h).toBe(120);
        expect(resolution.name).toBe("QQVGA");

        console.log('📋 ResolutionMapper verification:', {
            width: lowestWidth,
            resolution,
            isValid: ResolutionMapper.isValidResolution(lowestWidth)
        });
    });

    test('should test backend resolution parsing for lowest resolution', () => {
        // Test the getResolutionFromConfig method directly
        const testResolutions = [
            160,           // number
            "160",         // string
            'qqvga'        // legacy string (should fallback)
        ];

        testResolutions.forEach(resolutionInput => {
            const result = projectManager.getResolutionFromConfig(resolutionInput);

            console.log('🔧 Backend resolution parsing:', {
                input: resolutionInput,
                inputType: typeof resolutionInput,
                output: result
            });

            if (typeof resolutionInput === 'number' || !isNaN(parseInt(resolutionInput))) {
                // Should parse correctly for valid numbers
                if (resolutionInput == 160) {
                    expect(result.width).toBe(160);
                    expect(result.height).toBe(120);
                }
            }
        });
    });
});

/**
 * Helper function to measure image dimensions from buffer
 * @param {Buffer} imageBuffer - PNG image buffer
 * @returns {Promise<{width: number, height: number}>} Image dimensions
 */
async function measureImageDimensions(imageBuffer) {
    try {
        // Try to load the image using node-canvas
        const img = await loadImage(imageBuffer);
        return {
            width: img.width,
            height: img.height
        };
    } catch (error) {
        console.error('Failed to load image with canvas:', error);

        // Fallback: Parse PNG header manually
        // PNG format: width is at bytes 16-19, height at bytes 20-23
        if (imageBuffer.length >= 24 &&
            imageBuffer[0] === 0x89 &&
            imageBuffer[1] === 0x50 &&
            imageBuffer[2] === 0x4E &&
            imageBuffer[3] === 0x47) {

            const width = imageBuffer.readUInt32BE(16);
            const height = imageBuffer.readUInt32BE(20);

            console.log('📐 Parsed PNG header dimensions:', { width, height });
            return { width, height };
        }

        throw new Error('Unable to determine image dimensions');
    }
}