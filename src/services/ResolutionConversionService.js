/**
 * ResolutionConversionService
 * 
 * Extracted from SettingsToProjectConverter as part of God Object Destruction Plan - Phase 6, Step 6.4
 * 
 * Responsibilities:
 * - Convert resolution from settings format to project format
 * - Determine orientation (horizontal/vertical) from resolution
 * - Handle explicit longestSide/shortestSide parameters
 * - Map custom resolutions to standard resolutions
 * 
 * Single Responsibility: Resolution and orientation conversion
 */

import ResolutionMapper from '../utils/ResolutionMapper.js';

class ResolutionConversionService {
    /**
     * Convert resolution from settings format to project format
     * Settings file resolution is the source of truth
     * @param {Object} settings - Settings file with finalSize
     * @returns {number} Resolution key for ResolutionMapper
     */
    convertResolution(settings) {
        if (!settings.finalSize) {
            console.warn('⚠️ No finalSize found in settings, using default resolution');
            return ResolutionMapper.getDefaultResolution();
        }

        const {width, height} = settings.finalSize;
        console.log(`📐 Settings resolution: ${width}x${height}`);

        // Try to find matching resolution in ResolutionMapper
        const resolutions = ResolutionMapper.getAllResolutions();

        // Convert object to array for searching
        const resolutionEntries = Object.entries(resolutions).map(([key, res]) => ({
            key: parseInt(key),
            width: res.w,
            height: res.h,
            name: res.name,
            ...res
        }));

        // Find all matching resolutions (there might be duplicates with different keys)
        const matchingResolutions = resolutionEntries.filter(res =>
            res.width === width && res.height === height
        );

        if (matchingResolutions.length > 0) {
            // Prefer resolution key that matches the longest side for consistency
            let preferredKey = width;

            // Use explicit longestSide if available in settings
            const explicitLongest = settings.fileConfig?.finalImageSize?.longestSide ||
                                   settings.longestSideInPixels ||
                                   settings.longestSide;
            if (explicitLongest) {
                preferredKey = explicitLongest;
                console.log(`📐 Using explicit longestSide (${preferredKey}) as preferred resolution key`);
            }

            const preferredMatch = matchingResolutions.find(res => res.key === preferredKey);
            if (preferredMatch) {
                console.log('📐 Found preferred matching resolution:', preferredMatch.name);
                return preferredMatch.key;
            }

            // Fall back to width-based match
            const widthBasedMatch = matchingResolutions.find(res => res.key === width);
            if (widthBasedMatch) {
                console.log('📐 Found width-based matching resolution:', widthBasedMatch.name);
                return widthBasedMatch.key;
            }

            // Fall back to first match if no preferred key found
            const firstMatch = matchingResolutions[0];
            console.log('📐 Found matching resolution:', firstMatch.name);
            return firstMatch.key;
        }

        // Settings file resolution is truth - find closest standard resolution
        // Use explicit longestSide if available, otherwise fall back to width
        const explicitLongest = settings.fileConfig?.finalImageSize?.longestSide ||
                               settings.longestSideInPixels ||
                               settings.longestSide;
        const targetWidth = explicitLongest || width;
        const closestWidth = ResolutionMapper.getClosestResolution(targetWidth);
        const closestResolution = ResolutionMapper.getByWidth(closestWidth);

        console.log(`📐 Custom resolution ${width}x${height} mapped to closest standard: ${closestResolution.w}x${closestResolution.h} (${closestResolution.name})`);

        // Return the width key for the closest resolution to ensure proper scaling
        return closestWidth;
    }

    /**
     * Determine if the project is horizontal based on resolution
     * Uses longest/shortest side analysis to correctly infer original orientation intent
     * @param {Object} settings - Settings file with finalSize
     * @returns {boolean} True if horizontal, false if vertical
     */
    determineOrientation(settings) {
        // FIRST: Check if settings already has isHorizontal flag (from newer exports)
        if (typeof settings.isHorizontal === 'boolean') {
            console.log(`📐 Using explicit isHorizontal from settings: ${settings.isHorizontal}`);
            return settings.isHorizontal;
        }

        if (!settings.finalSize) return true; // Default to horizontal

        const { width, height } = settings.finalSize;

        // Handle square resolutions first
        if (width === height) {
            // For square resolutions, default to horizontal orientation
            return true;
        }

        // PRIORITY: Use explicit longestSide and shortestSide to determine orientation
        const explicitLongest = settings.fileConfig?.finalImageSize?.longestSide ||
                               settings.longestSideInPixels ||
                               settings.longestSide;
        const explicitShortest = settings.fileConfig?.finalImageSize?.shortestSide ||
                                settings.shortestSideInPixels ||
                                settings.shortestSide;

        if (explicitLongest && explicitShortest) {
            console.log(`📐 Using explicit longest/shortest sides from settings: ${explicitLongest}x${explicitShortest}`);
            console.log(`📐 Actual dimensions: ${width}x${height}`);

            // Determine orientation based on whether width or height matches longestSide
            if (width === explicitLongest && height === explicitShortest) {
                // Width is the long side = horizontal/landscape
                console.log(`📐 Orientation: horizontal (width=${width} matches longestSide=${explicitLongest})`);
                return true;
            } else if (height === explicitLongest && width === explicitShortest) {
                // Height is the long side = vertical/portrait
                console.log(`📐 Orientation: vertical (height=${height} matches longestSide=${explicitLongest})`);
                return false;
            } else {
                // Dimensions don't exactly match - could be due to scaling or custom resolution
                console.warn(`📐 Warning: Dimensions ${width}x${height} don't exactly match longest/shortest ${explicitLongest}x${explicitShortest}`);
                // Fall back to comparing which dimension is closer to longest
                return width >= height;
            }
        }

        // No explicit longest/shortest - fallback to simple comparison
        console.log(`📐 No explicit longest/shortest sides found, using simple comparison: ${width}x${height}`);
        return width > height;
    }
}

// Export singleton instance
export default new ResolutionConversionService();