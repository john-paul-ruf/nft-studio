/**
 * SINGLE SOURCE OF TRUTH: Resolution Key Generation and Management
 * ALL resolution key logic is centralized here to ensure consistency
 */

import CenterUtils from './CenterUtils.js';
import ResolutionMapper from './ResolutionMapper.js';

export class ResolutionKeyUtils {
    /**
     * UNIFIED RESOLUTION KEY GENERATOR: The one and only function for creating resolution keys
     * @param {Object} projectData - Project data containing resolution information
     * @returns {Object} Resolution key information
     */
    static createResolutionKey(projectData) {
        console.log('🔑 ResolutionKeyUtils.createResolutionKey called with:', projectData);

        if (!projectData) {
            console.log('⚠️ ResolutionKeyUtils: No project data provided, using fallback');
            return {
                key: '1920-1920x1080-h',
                resolution: 1920,
                isHorizontal: true,
                width: 1920,
                height: 1080,
                originalWidth: 1920,
                originalHeight: 1080
            };
        }

        // SINGLE SOURCE: Extract resolution from ProjectState only
        const resolution = projectData?.targetResolution || 1920;
        const isHorizontal = projectData?.isHorizontal ?? true;

        // Always use ResolutionMapper as single source of truth for dimensions
        let width = projectData?.width;
        let height = projectData?.height;

        // If direct dimensions not available, use ResolutionMapper - no fallbacks
        if (!width || !height) {
            const dimensions = ResolutionMapper.getDimensions(resolution, isHorizontal);
            width = dimensions.w || dimensions.width;
            height = dimensions.h || dimensions.height;
            console.log('🔧 ResolutionKeyUtils: Using ResolutionMapper dimensions:', { resolution, isHorizontal, dimensions });
        }

        // Validate that we have valid dimensions from ResolutionMapper
        if (!width || !height || width <= 0 || height <= 0) {
            console.error('❌ ResolutionKeyUtils: Invalid dimensions from ResolutionMapper:', { resolution, isHorizontal, width, height });
            // Use ResolutionMapper default as last resort
            const fallbackDimensions = ResolutionMapper.getDimensions(ResolutionMapper.getDefaultResolution(), true);
            width = fallbackDimensions.w || fallbackDimensions.width || 1920;
            height = fallbackDimensions.h || fallbackDimensions.height || 1080;
            console.log('🔧 ResolutionKeyUtils: Using default ResolutionMapper dimensions:', { width, height });
        }

        const safeWidth = width;
        const safeHeight = height;

        // Generate consistent key format
        const key = `${resolution}-${safeWidth}x${safeHeight}-${isHorizontal ? 'h' : 'v'}`;

        const result = {
            key,
            resolution,
            isHorizontal,
            width: safeWidth,
            height: safeHeight,
            originalWidth: width,
            originalHeight: height
        };

        console.log('🔑 ResolutionKeyUtils: Generated resolution key:', result);
        return result;
    }

    /**
     * RESOLUTION KEY PARSER: Parse resolution information from a resolution key
     * @param {string} resolutionKey - Resolution key to parse
     * @returns {Object|null} Parsed resolution information or null if invalid
     */
    static parseResolutionKey(resolutionKey) {
        console.log('🔧 ResolutionKeyUtils.parseResolutionKey:', resolutionKey);

        try {
            // Parse resolution key format: "resolution-WIDTHxHEIGHT-orientation"
            const parts = resolutionKey.split('-');
            console.log('🔧 Resolution key parts:', parts);

            if (parts.length < 3) {
                console.log('⚠️ Resolution key has insufficient parts:', parts.length);
                return null;
            }

            const dimensionString = parts[1];
            const orientation = parts[2];
            const dimensions = dimensionString.split('x');

            console.log('🔧 Dimension parsing:', { dimensionString, orientation, dimensions });

            if (dimensions.length !== 2) {
                console.log('⚠️ Dimension string format invalid:', dimensions);
                return null;
            }

            const width = parseInt(dimensions[0]);
            const height = parseInt(dimensions[1]);

            if (isNaN(width) || isNaN(height)) {
                console.log('⚠️ Width/height NaN:', { width, height, raw: dimensions });
                return null;
            }

            const result = {
                width,
                height,
                resolution: parts[0],
                isHorizontal: orientation === 'h'
            };

            console.log('✅ Parsed resolution info:', result);
            return result;
        } catch (error) {
            console.error('❌ Error parsing resolution key:', error);
            return null;
        }
    }

    /**
     * DIMENSION EXTRACTOR: Get safe width and height from project data
     * @param {Object} projectData - Project data
     * @returns {Object} Width and height dimensions
     */
    static getDimensions(projectData) {
        const resInfo = this.createResolutionKey(projectData);
        return {
            width: resInfo.width,
            height: resInfo.height
        };
    }

    /**
     * RESOLUTION COMPARISON: Check if two resolution keys represent the same resolution
     * @param {string} key1 - First resolution key
     * @param {string} key2 - Second resolution key
     * @returns {boolean} True if resolutions are the same
     */
    static areResolutionsEqual(key1, key2) {
        if (!key1 || !key2) return false;
        return key1 === key2;
    }

    /**
     * RESOLUTION VALIDATION: Check if resolution key is valid
     * @param {string} resolutionKey - Resolution key to validate
     * @returns {boolean} True if valid
     */
    static isValidResolutionKey(resolutionKey) {
        if (!resolutionKey || typeof resolutionKey !== 'string') return false;

        const parts = resolutionKey.split('-');
        if (parts.length < 3) return false;

        const dimensions = parts[1].split('x');
        if (dimensions.length !== 2) return false;

        const width = parseInt(dimensions[0]);
        const height = parseInt(dimensions[1]);
        const orientation = parts[2];

        return !isNaN(width) && !isNaN(height) && width > 0 && height > 0 &&
               (orientation === 'h' || orientation === 'v');
    }
}

export default ResolutionKeyUtils;