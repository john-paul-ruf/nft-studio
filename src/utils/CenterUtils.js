/**
 * SINGLE SOURCE OF TRUTH for Center Detection and Position Utilities
 * ALL center handling logic is centralized here to ensure consistency
 */

import ResolutionMapper from './ResolutionMapper.js';

export class CenterUtils {
    /**
     * MAIN ENTRY POINT: Process any field value for center handling
     * This is the single method all components should use
     * @param {string} fieldName - Name of the field
     * @param {*} fieldValue - Current field value (or default)
     * @param {Object} resolutionInfo - Resolution information {resolution, isHorizontal, width?, height?}
     * @returns {*} Processed field value with center applied if applicable
     */
    static processFieldValue(fieldName, fieldValue, resolutionInfo) {
        console.log('🎯 CenterUtils.processFieldValue:', { fieldName, fieldValue, resolutionInfo });

        if (!resolutionInfo) {
            console.log('⚠️ CenterUtils: No resolution info provided, returning original value');
            return fieldValue;
        }

        // Check if this field should have center logic applied
        if (!this.shouldApplyCenter(fieldName, fieldValue, resolutionInfo)) {
            console.log('⏸️ CenterUtils: Not a center field, returning original value');
            return fieldValue;
        }

        // Get target dimensions
        const dimensions = this.getResolutionDimensions(resolutionInfo);
        const center = this.getCenterPosition(dimensions.width, dimensions.height);

        console.log('🎯 CenterUtils: Applying center to field', fieldName, 'center:', center);

        // Apply center to the value
        return this.applyCenterToValue(fieldValue, center);
    }

    /**
     * UNIFIED CONFIG PROCESSOR: Process entire config objects
     * @param {Object} config - Configuration object to process
     * @param {Object} resolutionInfo - Resolution information
     * @returns {Object} Configuration with centers applied
     */
    static detectAndApplyCenter(config, resolutionInfo) {
        console.log('🎯 CenterUtils.detectAndApplyCenter:', { config, resolutionInfo });

        if (!config || typeof config !== 'object') {
            return config;
        }

        if (!resolutionInfo) {
            console.log('⚠️ CenterUtils: No resolution info for config processing');
            return config;
        }

        const dimensions = this.getResolutionDimensions(resolutionInfo);
        return this.applyCenterOverride(config, dimensions.width, dimensions.height, resolutionInfo);
    }

    /**
     * PROPORTIONAL SCALING: Scale field values proportionally between resolutions
     * @param {*} fieldValue - Field value to scale
     * @param {Object} oldResolutionInfo - Previous resolution information
     * @param {Object} newResolutionInfo - New resolution information
     * @returns {*} Scaled field value
     */
    static scaleFieldValue(fieldValue, oldResolutionInfo, newResolutionInfo) {
        console.log('📐 CenterUtils.scaleFieldValue:', { fieldValue, oldResolutionInfo, newResolutionInfo });

        if (!fieldValue || !oldResolutionInfo || !newResolutionInfo) {
            console.log('⚠️ CenterUtils: Missing data for scaling, returning original value');
            return fieldValue;
        }

        // Get dimensions for both resolutions
        const oldDimensions = this.getResolutionDimensions(oldResolutionInfo);
        const newDimensions = this.getResolutionDimensions(newResolutionInfo);

        // Calculate scale factors
        const scaleX = newDimensions.width / oldDimensions.width;
        const scaleY = newDimensions.height / oldDimensions.height;
        const avgScale = (scaleX + scaleY) / 2;

        console.log('📐 CenterUtils: Scale factors:', {
            scaleX: scaleX.toFixed(3),
            scaleY: scaleY.toFixed(3),
            avgScale: avgScale.toFixed(3),
            oldDims: oldDimensions,
            newDims: newDimensions
        });

        // Only scale if there's a significant difference (avoid minor rounding)
        if (Math.abs(scaleX - 1) < 0.05 && Math.abs(scaleY - 1) < 0.05) {
            console.log('⏸️ CenterUtils: Scale factors too small, returning original value');
            return fieldValue;
        }

        return this.applyProportionalScale(fieldValue, scaleX, scaleY, avgScale, newDimensions);
    }

    /**
     * Apply proportional scaling to different field value types
     * @param {*} fieldValue - Field value to scale
     * @param {number} scaleX - X-axis scale factor
     * @param {number} scaleY - Y-axis scale factor
     * @param {number} avgScale - Average scale factor
     * @param {Object} newDimensions - New canvas dimensions for clamping
     * @returns {*} Scaled field value
     */
    static applyProportionalScale(fieldValue, scaleX, scaleY, avgScale, newDimensions) {
        // Handle point2d format (legacy)
        if (typeof fieldValue.x === 'number' && typeof fieldValue.y === 'number' && !fieldValue.name) {
            const newX = Math.round(fieldValue.x * scaleX);
            const newY = Math.round(fieldValue.y * scaleY);

            return {
                ...fieldValue,
                x: Math.min(Math.max(newX, 0), newDimensions.width - 1),
                y: Math.min(Math.max(newY, 0), newDimensions.height - 1),
                __proportionallyScaled: true
            };
        }

        // Handle Position objects
        if (fieldValue.name === 'position') {
            const newX = Math.round(fieldValue.x * scaleX);
            const newY = Math.round(fieldValue.y * scaleY);

            return {
                ...fieldValue,
                x: Math.min(Math.max(newX, 0), newDimensions.width - 1),
                y: Math.min(Math.max(newY, 0), newDimensions.height - 1),
                __proportionallyScaled: true
            };
        }

        // Handle ArcPath objects
        if (fieldValue.name === 'arc-path' && fieldValue.center) {
            const newCenterX = Math.round(fieldValue.center.x * scaleX);
            const newCenterY = Math.round(fieldValue.center.y * scaleY);
            const newRadius = Math.round(fieldValue.radius * avgScale);

            // Calculate max radius to ensure arc stays within bounds
            const maxRadius = Math.min(newDimensions.width, newDimensions.height) / 2;

            return {
                ...fieldValue,
                center: {
                    x: Math.min(Math.max(newCenterX, 0), newDimensions.width - 1),
                    y: Math.min(Math.max(newCenterY, 0), newDimensions.height - 1)
                },
                radius: Math.min(Math.max(newRadius, 10), maxRadius),
                __proportionallyScaled: true
            };
        }

        // For other types, return as-is
        console.log('⏸️ CenterUtils: Unknown field value type for scaling:', fieldValue);
        return fieldValue;
    }

    /**
     * UNIFIED CENTER DETECTION: Single logic for determining if center should be applied
     * @param {string} fieldName - Name of the field
     * @param {*} fieldValue - Field value to check
     * @param {Object} resolutionInfo - Current resolution information for accurate center detection
     * @returns {boolean} True if center should be applied
     */
    static shouldApplyCenter(fieldName, fieldValue, resolutionInfo = null) {
        // Use existing detection logic with resolution context
        return this.isCenterField(fieldName, fieldValue, resolutionInfo);
    }

    /**
     * UNIFIED RESOLUTION PROCESSOR: Convert any resolution format to dimensions
     * @param {Object|string|number} resolutionInfo - Resolution in any format
     * @returns {Object} Standardized dimensions {width, height}
     */
    static getResolutionDimensions(resolutionInfo) {
        // Handle direct dimensions
        if (resolutionInfo && typeof resolutionInfo === 'object' && resolutionInfo.width && resolutionInfo.height) {
            return {
                width: resolutionInfo.width,
                height: resolutionInfo.height
            };
        }

        // Handle resolution object with resolution property
        let resolution = resolutionInfo?.resolution || resolutionInfo?.targetResolution || resolutionInfo;
        let isHorizontal = resolutionInfo?.isHorizontal ?? resolutionInfo?.isHoz ?? true;

        // Convert string resolutions to numeric
        const stringToNumericMap = {
            'qvga': 320, 'vga': 640, 'svga': 800, 'xga': 1024,
            'hd720': 1280, 'hd': 1920, 'square_small': 720, 'square': 1081,
            'wqhd': 2560, '4k': 3840, '5k': 5120, '8k': 7680
        };

        if (typeof resolution === 'string') {
            resolution = stringToNumericMap[resolution] || parseInt(resolution) || 1920;
        } else if (typeof resolution !== 'number') {
            resolution = 1920; // Default fallback
        }

        const dimensions = ResolutionMapper.getDimensions(resolution, isHorizontal);
        return {
            width: dimensions.w || dimensions.width || 1920,
            height: dimensions.h || dimensions.height || 1080
        };
    }

    /**
     * Detect if a field represents a center position
     * @param {string} fieldName - Name of the field
     * @param {Object} defaultValue - Default value of the field (if any)
     * @param {Object} resolutionInfo - Current resolution information for accurate center detection
     * @returns {boolean} True if field appears to be a center field
     */
    static isCenterField(fieldName, defaultValue = null, resolutionInfo = null) {
        // Check field name
        const name = (fieldName || '').toLowerCase();
        if (name.includes('center') || name === 'center') {
            return true;
        }

        // Check if default value appears to be a center position
        if (defaultValue && typeof defaultValue === 'object') {
            // Convert resolutionInfo to currentResolutionInfo format if provided
            let currentResolutionInfo = null;
            if (resolutionInfo) {
                const dimensions = this.getResolutionDimensions(resolutionInfo);
                currentResolutionInfo = {
                    width: dimensions.width,
                    height: dimensions.height
                };
            }

            // For point2d format
            if (typeof defaultValue.x === 'number' && typeof defaultValue.y === 'number') {
                return this.isCenterPosition(defaultValue.x, defaultValue.y, currentResolutionInfo);
            }

            // For position objects
            if (defaultValue.name === 'position' &&
                typeof defaultValue.x === 'number' && typeof defaultValue.y === 'number') {
                return this.isCenterPosition(defaultValue.x, defaultValue.y, currentResolutionInfo);
            }

            // For arc-path objects (check center property)
            if (defaultValue.name === 'arc-path' && defaultValue.center &&
                typeof defaultValue.center.x === 'number' && typeof defaultValue.center.y === 'number') {
                return this.isCenterPosition(defaultValue.center.x, defaultValue.center.y, currentResolutionInfo);
            }
        }

        return false;
    }

    /**
     * Check if given coordinates represent a center position for any common resolution or current context
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} currentResolutionInfo - Optional current resolution context {width, height}
     * @returns {boolean} True if coordinates appear to be center of some resolution
     */
    static isCenterPosition(x, y, currentResolutionInfo = null) {
        // FIRST: Check against current resolution context if provided (most accurate)
        if (currentResolutionInfo && currentResolutionInfo.width && currentResolutionInfo.height) {
            const currentCenterX = currentResolutionInfo.width / 2;
            const currentCenterY = currentResolutionInfo.height / 2;

            // Use tighter tolerance for current resolution (1%)
            const tolerance = 0.01;
            const xTolerance = currentResolutionInfo.width * tolerance;
            const yTolerance = currentResolutionInfo.height * tolerance;

            if (Math.abs(x - currentCenterX) <= xTolerance && Math.abs(y - currentCenterY) <= yTolerance) {
                console.log(`🎯 CenterUtils: Detected center position (${x}, ${y}) as center of CURRENT resolution ${currentResolutionInfo.width}x${currentResolutionInfo.height}`);
                return true;
            }
        }

        // SECOND: Fallback to check against common resolutions (for backward compatibility)
        const commonResolutions = [
            { w: 1080, h: 1920 }, // Portrait HD
            { w: 1920, h: 1080 }, // Landscape HD
            { w: 720, h: 720 },   // Square small
            { w: 1080, h: 1080 }, // Square
            { w: 800, h: 600 },   // SVGA
            { w: 1280, h: 720 },  // HD720
            { w: 2560, h: 1440 }, // WQHD
            { w: 3840, h: 2160 }, // 4K
            { w: 640, h: 480 },   // VGA
            { w: 320, h: 240 }    // QVGA
        ];

        for (const res of commonResolutions) {
            const centerX = res.w / 2;
            const centerY = res.h / 2;

            // Check if the coordinates are within 5% of the center for this resolution
            const tolerance = 0.05;
            const xTolerance = res.w * tolerance;
            const yTolerance = res.h * tolerance;

            if (Math.abs(x - centerX) <= xTolerance && Math.abs(y - centerY) <= yTolerance) {
                console.log(`🎯 CenterUtils: Detected center position (${x}, ${y}) as center of ${res.w}x${res.h} (fallback)`);
                return true;
            }
        }
        return false;
    }

    /**
     * Get center coordinates for given dimensions
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @returns {Object} Center coordinates {x, y}
     */
    static getCenterPosition(width, height) {
        return {
            x: Math.round(width / 2),
            y: Math.round(height / 2)
        };
    }

    /**
     * Apply center position overrides to a config object
     * @param {Object} config - Configuration object to process
     * @param {number} width - Target canvas width
     * @param {number} height - Target canvas height
     * @param {Object} resolutionInfo - Current resolution information for accurate center detection
     * @returns {Object} Updated configuration with center positions applied
     */
    static applyCenterOverride(config, width, height, resolutionInfo = null) {
        if (!config || typeof config !== 'object') {
            return config;
        }

        const center = this.getCenterPosition(width, height);
        const updatedConfig = { ...config };

        // Recursively process all properties
        Object.keys(updatedConfig).forEach(key => {
            const value = updatedConfig[key];

            if (value === null || value === undefined) return;

            // Check if this property is a center field
            if (this.isCenterField(key, value, resolutionInfo)) {
                updatedConfig[key] = this.applyCenterToValue(value, center);
                console.log(`🎯 CenterUtils: Applied center override to field '${key}':`, updatedConfig[key]);
            }
            // Recursively check nested objects
            else if (typeof value === 'object' && !Array.isArray(value)) {
                updatedConfig[key] = this.applyCenterOverride(value, width, height, resolutionInfo);
            }
            // Handle arrays of objects
            else if (Array.isArray(value)) {
                updatedConfig[key] = value.map(item => {
                    if (typeof item === 'object') {
                        return this.applyCenterOverride(item, width, height, resolutionInfo);
                    }
                    return item;
                });
            }
        });

        return updatedConfig;
    }

    /**
     * Apply center coordinates to a specific value based on its type
     * @param {*} value - Value to update
     * @param {Object} center - Center coordinates {x, y}
     * @returns {*} Updated value with center applied
     */
    static applyCenterToValue(value, center) {
        if (!value || typeof value !== 'object') {
            return value;
        }

        // Handle point2d format (legacy)
        if (typeof value.x === 'number' && typeof value.y === 'number' && !value.name) {
            return {
                ...value,
                x: center.x,
                y: center.y,
                __centerOverrideApplied: true
            };
        }

        // Handle Position objects
        if (value.name === 'position') {
            return {
                ...value,
                x: center.x,
                y: center.y,
                __centerOverrideApplied: true
            };
        }

        // Handle ArcPath objects (update center property)
        if (value.name === 'arc-path' && value.center) {
            return {
                ...value,
                center: {
                    x: center.x,
                    y: center.y
                },
                __centerOverrideApplied: true
            };
        }

        return value;
    }

}

export default CenterUtils;