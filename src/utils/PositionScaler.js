/**
 * Position Scaling Utility
 * Handles automatic scaling of all position types when resolution changes
 * Supports Position objects, ArcPath objects, and legacy point2d format
 */

import ResolutionMapper from './ResolutionMapper.js';
import { Effect } from '../models/Effect.js';

export class PositionScaler {
    /**
     * Scale all positions in an array of effects based on resolution change
     * @param {Array} effects - Array of effect configurations
     * @param {number} oldWidth - Previous canvas width
     * @param {number} oldHeight - Previous canvas height
     * @param {number} newWidth - New canvas width
     * @param {number} newHeight - New canvas height
     * @returns {Array} Updated effects with scaled positions
     */
    static scaleEffectsPositions(effects, oldWidth, oldHeight, newWidth, newHeight) {
        console.log('🎯 PositionScaler.scaleEffectsPositions CALLED:', {
            effectsExists: !!effects,
            effectsIsArray: Array.isArray(effects),
            effectsLength: effects ? effects.length : 'N/A',
            dimensions: { oldWidth, oldHeight, newWidth, newHeight }
        });

        if (!effects || !Array.isArray(effects)) {
            console.log('❌ No effects or not array, returning unchanged');
            return effects;
        }

        // Validate dimensions
        if (!this.validateDimensions(oldWidth, oldHeight, 'old') ||
            !this.validateDimensions(newWidth, newHeight, 'new')) {
            console.warn('❌ Invalid dimensions provided to scaleEffectsPositions, skipping scaling');
            return effects;
        }

        // Calculate scale factors
        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;

        console.log('📐 PositionScaler: Starting position scaling with:', {
            oldDimensions: { width: oldWidth, height: oldHeight },
            newDimensions: { width: newWidth, height: newHeight },
            scaleFactors: { x: scaleX, y: scaleY },
            effectCount: effects.length,
            needsScaling: scaleX !== 1 || scaleY !== 1
        });

        // If no scaling needed, return original
        if (scaleX === 1 && scaleY === 1) {
            console.log('✅ No scaling needed (scale factors are 1:1), returning original effects');
            return effects;
        }

        // Deep clone effects to avoid mutating original
        // Handle both Effect instances and POJOs
        const scaledEffects = effects.map(effect => {
            if (effect instanceof Effect) {
                // Convert to POJO for deep cloning
                return JSON.parse(JSON.stringify(effect.toPOJO()));
            } else {
                // Plain object - just deep clone
                return JSON.parse(JSON.stringify(effect));
            }
        });

        let positionsFound = 0;
        let positionsScaled = 0;

        // Scale each effect
        scaledEffects.forEach((effect, index) => {
            console.log(`🔍 Examining effect ${index} (${effect.name || effect.className || 'unnamed'}):`);
            // Get the underlying object to scale (POJO for Effect instances, or the object itself)
            const effectToScale = effect instanceof Effect ? effect : effect;
            const result = this.scaleEffectPositions(effectToScale, scaleX, scaleY, newWidth, newHeight);
            positionsFound += result.found;
            positionsScaled += result.scaled;
        });

        console.log('✅ PositionScaler: Position scaling complete:', {
            totalPositionsFound: positionsFound,
            totalPositionsScaled: positionsScaled,
            effectsProcessed: scaledEffects.length
        });

        // Convert POJOs back to Effect instances to maintain proper type
        const effectInstances = scaledEffects.map(effect => {
            // If it's already an Effect instance, return as-is
            if (effect instanceof Effect) {
                return effect;
            }
            // Otherwise, convert POJO to Effect instance
            return Effect.fromPOJO(effect);
        });

        console.log('✅ PositionScaler: Converted scaled effects back to Effect instances');
        return effectInstances;
    }

    /**
     * Recursively scale all position-like properties in an effect
     * @param {Object} effect - Effect configuration object
     * @param {number} scaleX - X-axis scale factor
     * @param {number} scaleY - Y-axis scale factor
     * @param {number} maxWidth - Maximum width (for boundary validation)
     * @param {number} maxHeight - Maximum height (for boundary validation)
     * @returns {Object} Object with found and scaled counts
     */
    static scaleEffectPositions(effect, scaleX, scaleY, maxWidth, maxHeight) {
        const counters = { found: 0, scaled: 0 };

        if (!effect || typeof effect !== 'object') {
            console.log('  ⚠️ Effect is null or not an object');
            return counters;
        }

        console.log('  📋 Effect properties:', Object.keys(effect).join(', '));

        // Iterate through all properties
        Object.keys(effect).forEach(key => {
            const value = effect[key];

            // Skip null/undefined values
            if (value === null || value === undefined) return;

            // Check if this property is a position-like object
            if (this.isPositionLike(value)) {
                counters.found++;
                const originalValue = JSON.stringify(value);
                effect[key] = this.scalePosition(value, scaleX, scaleY, maxWidth, maxHeight);
                const newValue = JSON.stringify(effect[key]);

                console.log(`    ✓ Found and scaled position '${key}':`);
                console.log(`      Before: ${originalValue}`);
                console.log(`      After:  ${newValue}`);
                counters.scaled++;
            }
            // Recursively check nested objects
            else if (typeof value === 'object' && !Array.isArray(value)) {
                console.log(`    🔍 Recursing into nested object '${key}'`);
                const subResult = this.scaleEffectPositions(value, scaleX, scaleY, maxWidth, maxHeight);
                counters.found += subResult.found;
                counters.scaled += subResult.scaled;
            }
            // Handle arrays of objects
            else if (Array.isArray(value)) {
                console.log(`    📋 Checking array '${key}' with ${value.length} items`);
                value.forEach((item, index) => {
                    if (typeof item === 'object') {
                        console.log(`      🔍 Recursing into array item ${index}`);
                        const subResult = this.scaleEffectPositions(item, scaleX, scaleY, maxWidth, maxHeight);
                        counters.found += subResult.found;
                        counters.scaled += subResult.scaled;
                    }
                });
            } else {
                console.log(`    ⏭️ Skipping primitive property '${key}': ${typeof value}`);
            }
        });

        console.log(`  📊 Effect summary: ${counters.found} positions found, ${counters.scaled} scaled`);
        return counters;
    }

    /**
     * Check if an object looks like a position (has x,y coordinates)
     * @param {*} obj - Object to check
     * @returns {boolean} True if object appears to be a position
     */
    static isPositionLike(obj) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }

        const result = {
            isPosition: false,
            type: 'unknown',
            reason: '',
            obj: JSON.stringify(obj).substring(0, 200) // Limit length for logging
        };

        // Legacy point2d format (like curved red eye center)
        if (typeof obj.x === 'number' && typeof obj.y === 'number' && !obj.name) {
            result.isPosition = true;
            result.type = 'legacy-point2d';
            result.reason = `x=${obj.x}, y=${obj.y}, no name`;
            console.log(`      🎯 Position detected: ${result.type} - ${result.reason}`);
            return true;
        }

        // Position object
        if (obj.name === 'position' && typeof obj.x === 'number' && typeof obj.y === 'number') {
            result.isPosition = true;
            result.type = 'position-object';
            result.reason = `name="position", x=${obj.x}, y=${obj.y}`;
            console.log(`      🎯 Position detected: ${result.type} - ${result.reason}`);
            return true;
        }

        // ArcPath object
        if (obj.name === 'arc-path' && obj.center &&
            typeof obj.center.x === 'number' && typeof obj.center.y === 'number') {
            result.isPosition = true;
            result.type = 'arc-path';
            result.reason = `name="arc-path", center.x=${obj.center.x}, center.y=${obj.center.y}`;
            console.log(`      🎯 Position detected: ${result.type} - ${result.reason}`);
            return true;
        }

        // Log what was checked but didn't match
        if (obj.name || obj.x !== undefined || obj.y !== undefined || obj.center) {
            console.log(`      ❌ Not a position: ${result.obj} - Missing required properties`);
        }

        return false;
    }

    /**
     * Scale a single position object
     * @param {Object} position - Position object to scale
     * @param {number} scaleX - X-axis scale factor
     * @param {number} scaleY - Y-axis scale factor
     * @param {number} maxWidth - Maximum width for boundary validation
     * @param {number} maxHeight - Maximum height for boundary validation
     * @returns {Object} Scaled position object
     */
    static scalePosition(position, scaleX, scaleY, maxWidth, maxHeight) {
        if (!position) return position;

        // Handle legacy point2d format (e.g., curved red eye center)
        if (typeof position.x === 'number' && typeof position.y === 'number' && !position.name) {
            const scaledX = Math.round(position.x * scaleX);
            const scaledY = Math.round(position.y * scaleY);

            // Clamp to valid coordinate bounds (0 to width-1, 0 to height-1)
            const clampedX = Math.min(Math.max(scaledX, 0), maxWidth - 1);
            const clampedY = Math.min(Math.max(scaledY, 0), maxHeight - 1);

            // Log if clamping occurred
            if (clampedX !== scaledX || clampedY !== scaledY) {
                console.log(`📌 Clamped legacy point2d: (${scaledX}, ${scaledY}) → (${clampedX}, ${clampedY})`);
            }

            return {
                ...position, // Preserve any additional properties
                x: clampedX,
                y: clampedY
            };
        }

        // Handle Position objects
        if (position.name === 'position') {
            const scaledX = Math.round(position.x * scaleX);
            const scaledY = Math.round(position.y * scaleY);

            // Clamp to valid coordinate bounds (0 to width-1, 0 to height-1)
            const clampedX = Math.min(Math.max(scaledX, 0), maxWidth - 1);
            const clampedY = Math.min(Math.max(scaledY, 0), maxHeight - 1);

            // Log if clamping occurred
            if (clampedX !== scaledX || clampedY !== scaledY) {
                console.log(`📌 Clamped position object: (${scaledX}, ${scaledY}) → (${clampedX}, ${clampedY})`);
            }

            return {
                ...position, // Preserve metadata like __userSet, __autoScaled, etc.
                x: clampedX,
                y: clampedY,
                __autoScaled: true,
                __scaledAt: new Date().toISOString()
            };
        }

        // Handle ArcPath objects
        if (position.name === 'arc-path' && position.center) {
            const avgScale = (scaleX + scaleY) / 2; // Use average scale for radius
            const scaledCenterX = Math.round(position.center.x * scaleX);
            const scaledCenterY = Math.round(position.center.y * scaleY);
            const scaledRadius = Math.round(position.radius * avgScale);

            // Clamp center to valid coordinate bounds (0 to width-1, 0 to height-1)
            const clampedCenterX = Math.min(Math.max(scaledCenterX, 0), maxWidth - 1);
            const clampedCenterY = Math.min(Math.max(scaledCenterY, 0), maxHeight - 1);

            // Calculate max radius to ensure arc stays within bounds
            const maxRadius = Math.min(maxWidth, maxHeight) / 2;
            const clampedRadius = Math.min(Math.max(scaledRadius, 10), maxRadius);

            // Log if clamping occurred
            if (clampedCenterX !== scaledCenterX || clampedCenterY !== scaledCenterY) {
                console.log(`📌 Clamped arc-path center: (${scaledCenterX}, ${scaledCenterY}) → (${clampedCenterX}, ${clampedCenterY})`);
            }
            if (clampedRadius !== scaledRadius) {
                console.log(`📌 Clamped arc-path radius: ${scaledRadius} → ${clampedRadius}`);
            }

            return {
                ...position,
                center: {
                    x: clampedCenterX,
                    y: clampedCenterY
                },
                radius: clampedRadius,
                __autoScaled: true,
                __scaledAt: new Date().toISOString()
            };
        }

        // Return unchanged if not a recognized position type
        return position;
    }

    /**
     * Validate dimension values
     * @param {number} width - Width value to validate
     * @param {number} height - Height value to validate
     * @param {string} label - Label for debugging (e.g., 'old', 'new')
     * @returns {boolean} True if dimensions are valid
     */
    static validateDimensions(width, height, label = '') {
        if (typeof width !== 'number' || typeof height !== 'number') {
            console.error(`Invalid dimension types for ${label}:`, { width: typeof width, height: typeof height, values: { width, height } });
            return false;
        }

        if (isNaN(width) || isNaN(height)) {
            console.error(`NaN dimensions for ${label}:`, { width, height });
            return false;
        }

        if (width <= 0 || height <= 0) {
            console.error(`Non-positive dimensions for ${label}:`, { width, height });
            return false;
        }

        return true;
    }

    /**
     * Calculate dimensions from resolution and orientation
     * Uses ResolutionMapper for consistency across the application
     * @param {string|number} resolution - Resolution key or width value
     * @param {boolean} isHorizontal - Orientation flag
     * @returns {Object} Object with width and height
     */
    static getResolutionDimensions(resolution, isHorizontal) {
        // Use ResolutionMapper for consistency - no fallbacks allowed
        const dimensions = ResolutionMapper.getDimensions(resolution, isHorizontal);

        // Validate dimensions (should always be valid from ResolutionMapper)
        const width = dimensions.w || dimensions.width;
        const height = dimensions.h || dimensions.height;

        if (!this.validateDimensions(width, height, `resolution ${resolution}`)) {
            throw new Error(`Invalid dimensions from ResolutionMapper for ${resolution}: ${width}x${height}`);
        }

        return { width, height };
    }
}

export default PositionScaler;