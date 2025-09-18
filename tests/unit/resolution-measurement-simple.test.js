import ResolutionMapper from '../../src/utils/ResolutionMapper.js';

describe('Resolution Measurement - Simple Tests', () => {

    test('should identify lowest resolution correctly', () => {
        const allResolutions = ResolutionMapper.getAllResolutions();
        const widths = Object.keys(allResolutions).map(w => parseInt(w)).sort((a, b) => a - b);

        const lowestWidth = widths[0];
        const lowestResolution = ResolutionMapper.getByWidth(lowestWidth);

        console.log('🔍 All available widths:', widths);
        console.log('📏 Lowest resolution found:', {
            width: lowestWidth,
            resolution: lowestResolution
        });

        expect(lowestWidth).toBe(160);
        expect(lowestResolution.w).toBe(160);
        expect(lowestResolution.h).toBe(120);
        expect(lowestResolution.name).toBe("QQVGA");
    });

    test('should calculate dimensions correctly for lowest resolution', () => {
        const lowestWidth = 160;

        // Test horizontal orientation
        const horizontalDims = ResolutionMapper.getDimensions(lowestWidth, true);
        expect(horizontalDims.w).toBe(160);
        expect(horizontalDims.h).toBe(120);

        // Test vertical orientation
        const verticalDims = ResolutionMapper.getDimensions(lowestWidth, false);
        expect(verticalDims.w).toBe(120);
        expect(verticalDims.h).toBe(160);

        console.log('📐 Dimension calculations:', {
            horizontal: horizontalDims,
            vertical: verticalDims
        });
    });

    test('should validate resolution consistency across all available resolutions', () => {
        const allResolutions = ResolutionMapper.getAllResolutions();

        Object.entries(allResolutions).forEach(([width, resolution]) => {
            const parsedWidth = parseInt(width);

            // Test that ResolutionMapper.getDimensions matches the stored resolution
            const calculatedDims = ResolutionMapper.getDimensions(parsedWidth, true);

            expect(calculatedDims.w).toBe(resolution.w);
            expect(calculatedDims.h).toBe(resolution.h);

            // Test that isValidResolution works
            expect(ResolutionMapper.isValidResolution(parsedWidth)).toBe(true);
        });

        console.log('✅ Validated', Object.keys(allResolutions).length, 'resolutions');
    });

    test('should create proper render config for lowest resolution', () => {
        const lowestWidth = 160;
        const dimensions = ResolutionMapper.getDimensions(lowestWidth, true);

        // Simulate what Canvas.jsx would create
        const mockConfig = {
            targetResolution: lowestWidth,
            isHorizontal: true,
            numFrames: 10,
            effects: [],
            colorScheme: null
        };

        const renderConfig = {
            ...mockConfig,
            width: dimensions.w,
            height: dimensions.h,
            renderStartFrame: 0,
            renderJumpFrames: mockConfig.numFrames + 1,
            colorSchemeData: null
        };

        console.log('🚀 Mock render config for lowest resolution:', renderConfig);

        // Verify the render config has expected properties
        expect(renderConfig.targetResolution).toBe(160);
        expect(renderConfig.width).toBe(160);
        expect(renderConfig.height).toBe(120);
        expect(renderConfig.isHorizontal).toBe(true);

        // Verify consistency between targetResolution and width/height
        const resolutionFromTargetRes = ResolutionMapper.getDimensions(renderConfig.targetResolution, renderConfig.isHorizontal);
        expect(renderConfig.width).toBe(resolutionFromTargetRes.w);
        expect(renderConfig.height).toBe(resolutionFromTargetRes.h);
    });

    test('should test backend resolution parsing edge cases', () => {
        const NftProjectManager = require('../../src/main/implementations/NftProjectManager');
        const ConsoleLogger = require('../../src/main/implementations/ConsoleLogger');

        const logger = new ConsoleLogger();
        const projectManager = new NftProjectManager(null, logger);

        const testCases = [
            { input: 160, expected: { width: 160, height: 120 } },
            { input: "160", expected: { width: 160, height: 120 } },
            { input: 999999, expected: { width: 1920, height: 1080 } }, // Should fallback
            { input: "invalid", expected: { width: 1920, height: 1080 } }, // Should fallback
            { input: null, expected: { width: 1920, height: 1080 } }, // Should fallback
        ];

        testCases.forEach(({ input, expected }) => {
            const result = projectManager.getResolutionFromConfig(input);

            console.log('🔧 Backend parsing test:', {
                input,
                inputType: typeof input,
                result,
                expectedWidth: expected.width,
                matches: result.width === expected.width && result.height === expected.height
            });

            expect(result.width).toBe(expected.width);
            expect(result.height).toBe(expected.height);
        });
    });
});