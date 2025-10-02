/**
 * ProjectStateResolution - Resolution and Scaling Management
 * 
 * Single Responsibility: Manage resolution, dimensions, and scaling operations
 * - Resolution management
 * - Dimension calculations
 * - Auto-scaling when resolution changes
 * - Orientation handling
 */

import ResolutionMapper from '../utils/ResolutionMapper.js';
import PositionScaler from '../utils/PositionScaler.js';

export default class ProjectStateResolution {
    constructor(stateCore, effectsManager) {
        this.stateCore = stateCore;
        this.effectsManager = effectsManager;
    }

    /**
     * Get target resolution
     * @returns {number|string} Current resolution
     */
    getTargetResolution() {
        return this.stateCore.getProperty('targetResolution');
    }

    /**
     * Set target resolution and trigger auto-scaling
     * @param {number|string} resolution - New resolution
     */
    setTargetResolution(resolution) {
        // Get current dimensions before changing resolution
        const oldDimensions = this.getResolutionDimensions();

        // Update the resolution
        this.stateCore.setProperty('targetResolution', resolution);

        // Get new dimensions after resolution change
        const newDimensions = this.getResolutionDimensions();

        // Auto-scale all positions if dimensions changed
        if (oldDimensions.w !== newDimensions.w || oldDimensions.h !== newDimensions.h) {
            console.log('🎯 ProjectStateResolution: Resolution changed, auto-scaling positions');
            this.scaleAllPositions(oldDimensions.w, oldDimensions.h, newDimensions.w, newDimensions.h);
        }
    }

    /**
     * Get resolution dimensions
     * @returns {Object} Object with width and height
     */
    getResolutionDimensions() {
        const resolution = this.getTargetResolution();
        const isHorizontal = this.getIsHorizontal();
        return ResolutionMapper.getDimensions(resolution, isHorizontal);
    }

    /**
     * Get orientation
     * @returns {boolean} True if horizontal
     */
    getIsHorizontal() {
        return this.stateCore.getProperty('isHorizontal');
    }

    /**
     * Set orientation and trigger auto-scaling
     * @param {boolean} isHorizontal - New orientation
     */
    setIsHorizontal(isHorizontal) {
        // Get current dimensions before changing orientation
        const oldDimensions = this.getResolutionDimensions();

        console.log('🎯 ProjectStateResolution: Setting orientation to', isHorizontal ? 'horizontal' : 'vertical');
        console.log('🎯 ProjectStateResolution: Old dimensions:', oldDimensions);

        // Update the orientation
        this.stateCore.setProperty('isHorizontal', isHorizontal);

        // Get new dimensions after orientation change
        const newDimensions = this.getResolutionDimensions();
        console.log('🎯 ProjectStateResolution: New dimensions:', newDimensions);

        // Auto-scale all positions if dimensions changed (they swap when orientation changes)
        if (oldDimensions.w !== newDimensions.w || oldDimensions.h !== newDimensions.h) {
            console.log('🎯 ProjectStateResolution: Orientation changed, auto-scaling positions');
            this.scaleAllPositions(oldDimensions.w, oldDimensions.h, newDimensions.w, newDimensions.h);
        } else {
            console.log('🎯 ProjectStateResolution: No position scaling needed - dimensions unchanged');
        }
    }

    /**
     * Scale all effect positions based on resolution change
     * @param {number} oldWidth - Previous canvas width
     * @param {number} oldHeight - Previous canvas height
     * @param {number} newWidth - New canvas width
     * @param {number} newHeight - New canvas height
     */
    scaleAllPositions(oldWidth, oldHeight, newWidth, newHeight) {
        console.log('🔄 ProjectStateResolution: Scaling all positions...');

        // Get current effects
        const effects = this.effectsManager.getEffects();

        // Use PositionScaler to scale all effects
        const scaledEffects = PositionScaler.scaleEffectsPositions(
            effects,
            oldWidth,
            oldHeight,
            newWidth,
            newHeight
        );

        // Update effects with scaled positions
        this.effectsManager.setEffects(scaledEffects);

        console.log('✅ ProjectStateResolution: All positions scaled successfully');
    }

    /**
     * Get canvas dimensions for current resolution and orientation
     * @returns {Object} Canvas dimensions {width, height}
     */
    getCanvasDimensions() {
        const dimensions = this.getResolutionDimensions();
        return {
            width: dimensions.w,
            height: dimensions.h
        };
    }

    /**
     * Get aspect ratio for current resolution
     * @returns {number} Aspect ratio (width/height)
     */
    getAspectRatio() {
        const dimensions = this.getResolutionDimensions();
        return dimensions.w / dimensions.h;
    }

    /**
     * Check if current resolution is landscape
     * @returns {boolean} True if landscape (width > height)
     */
    isLandscape() {
        const dimensions = this.getResolutionDimensions();
        return dimensions.w > dimensions.h;
    }

    /**
     * Check if current resolution is portrait
     * @returns {boolean} True if portrait (height > width)
     */
    isPortrait() {
        const dimensions = this.getResolutionDimensions();
        return dimensions.h > dimensions.w;
    }

    /**
     * Check if current resolution is square
     * @returns {boolean} True if square (width === height)
     */
    isSquare() {
        const dimensions = this.getResolutionDimensions();
        return dimensions.w === dimensions.h;
    }

    /**
     * Get available resolutions
     * @returns {Array} Array of available resolution options
     */
    getAvailableResolutions() {
        return ResolutionMapper.getAvailableResolutions();
    }

    /**
     * Get resolution display name
     * @param {number|string} resolution - Resolution value
     * @returns {string} Display name for resolution
     */
    getResolutionDisplayName(resolution = null) {
        const targetResolution = resolution || this.getTargetResolution();
        return ResolutionMapper.getDisplayName(targetResolution);
    }

    /**
     * Validate resolution value
     * @param {number|string} resolution - Resolution to validate
     * @returns {boolean} True if valid resolution
     */
    isValidResolution(resolution) {
        return ResolutionMapper.isValidResolution(resolution);
    }

    /**
     * Get default resolution
     * @returns {number|string} Default resolution value
     */
    getDefaultResolution() {
        return ResolutionMapper.getDefaultResolution();
    }

    /**
     * Scale position from one resolution to another
     * @param {Object} position - Position object {x, y}
     * @param {number|string} fromResolution - Source resolution
     * @param {number|string} toResolution - Target resolution
     * @param {boolean} fromHorizontal - Source orientation
     * @param {boolean} toHorizontal - Target orientation
     * @returns {Object} Scaled position {x, y}
     */
    scalePosition(position, fromResolution, toResolution, fromHorizontal = false, toHorizontal = false) {
        const fromDimensions = ResolutionMapper.getDimensions(fromResolution, fromHorizontal);
        const toDimensions = ResolutionMapper.getDimensions(toResolution, toHorizontal);

        return PositionScaler.scalePosition(
            position,
            fromDimensions.w,
            fromDimensions.h,
            toDimensions.w,
            toDimensions.h
        );
    }

    /**
     * Get resolution info object
     * @returns {Object} Complete resolution information
     */
    getResolutionInfo() {
        const resolution = this.getTargetResolution();
        const isHorizontal = this.getIsHorizontal();
        const dimensions = this.getResolutionDimensions();
        
        return {
            resolution,
            isHorizontal,
            dimensions,
            aspectRatio: this.getAspectRatio(),
            isLandscape: this.isLandscape(),
            isPortrait: this.isPortrait(),
            isSquare: this.isSquare(),
            displayName: this.getResolutionDisplayName()
        };
    }

    /**
     * Apply resolution preset
     * @param {string} presetName - Name of resolution preset
     * @returns {boolean} True if preset was applied
     */
    applyResolutionPreset(presetName) {
        const preset = ResolutionMapper.getPreset(presetName);
        if (preset) {
            this.setTargetResolution(preset.resolution);
            if (preset.orientation !== undefined) {
                this.setIsHorizontal(preset.orientation === 'horizontal');
            }
            return true;
        }
        return false;
    }
}