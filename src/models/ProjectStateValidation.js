/**
 * ProjectStateValidation - State Validation Management
 * 
 * Single Responsibility: Validate project state and configuration
 * - State validation rules
 * - Readiness checks
 * - Error reporting
 * - Configuration validation
 */

export default class ProjectStateValidation {
    constructor(stateCore, effectsManager) {
        this.stateCore = stateCore;
        this.effectsManager = effectsManager;
    }

    /**
     * Validate complete project configuration
     * @returns {Object} Validation result with isValid and errors
     */
    validate() {
        const errors = [];

        // Validate project name
        const projectNameError = this.validateProjectName();
        if (projectNameError) errors.push(projectNameError);

        // Validate target resolution
        const resolutionError = this.validateTargetResolution();
        if (resolutionError) errors.push(resolutionError);

        // Validate color scheme
        const colorSchemeError = this.validateColorScheme();
        if (colorSchemeError) errors.push(colorSchemeError);

        // Validate number of frames
        const framesError = this.validateNumFrames();
        if (framesError) errors.push(framesError);

        // Validate render settings
        const renderError = this.validateRenderSettings();
        if (renderError) errors.push(renderError);

        // Validate effects
        const effectsError = this.validateEffects();
        if (effectsError) errors.push(effectsError);

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate project name
     * @returns {string|null} Error message or null if valid
     */
    validateProjectName() {
        const projectName = this.stateCore.getProperty('projectName');
        
        if (!projectName || projectName.trim() === '') {
            return 'Project name is required';
        }

        if (projectName.length > 100) {
            return 'Project name must be 100 characters or less';
        }

        // Check for invalid characters
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(projectName)) {
            return 'Project name contains invalid characters';
        }

        return null;
    }

    /**
     * Validate target resolution
     * @returns {string|null} Error message or null if valid
     */
    validateTargetResolution() {
        const targetResolution = this.stateCore.getProperty('targetResolution');
        
        if (!targetResolution) {
            return 'Target resolution is required';
        }

        // Validate numeric resolutions
        if (typeof targetResolution === 'number') {
            if (targetResolution <= 0) {
                return 'Target resolution must be greater than 0';
            }
            if (targetResolution > 8192) {
                return 'Target resolution cannot exceed 8192';
            }
        }

        return null;
    }

    /**
     * Validate color scheme
     * @returns {string|null} Error message or null if valid
     */
    validateColorScheme() {
        const colorSchemeData = this.stateCore.getProperty('colorSchemeData');
        
        if (!colorSchemeData) {
            return 'Color scheme is required';
        }

        if (typeof colorSchemeData !== 'object') {
            return 'Color scheme data must be an object';
        }

        return null;
    }

    /**
     * Validate number of frames
     * @returns {string|null} Error message or null if valid
     */
    validateNumFrames() {
        const numFrames = this.stateCore.getProperty('numFrames');
        
        if (typeof numFrames !== 'number') {
            return 'Number of frames must be a number';
        }

        if (numFrames <= 0) {
            return 'Number of frames must be greater than 0';
        }

        if (numFrames > 10000) {
            return 'Number of frames cannot exceed 10,000';
        }

        return null;
    }

    /**
     * Validate render settings
     * @returns {string|null} Error message or null if valid
     */
    validateRenderSettings() {
        const renderStartFrame = this.stateCore.getProperty('renderStartFrame');
        const renderJumpFrames = this.stateCore.getProperty('renderJumpFrames');
        const numFrames = this.stateCore.getProperty('numFrames');

        if (typeof renderStartFrame !== 'number' || renderStartFrame < 0) {
            return 'Render start frame must be a non-negative number';
        }

        if (renderStartFrame >= numFrames) {
            return 'Render start frame must be less than total frames';
        }

        if (typeof renderJumpFrames !== 'number' || renderJumpFrames <= 0) {
            return 'Render jump frames must be a positive number';
        }

        return null;
    }

    /**
     * Validate effects configuration
     * @returns {string|null} Error message or null if valid
     */
    validateEffects() {
        const effects = this.effectsManager.getEffects();

        // Check if effects array is valid
        if (!Array.isArray(effects)) {
            return 'Effects must be an array';
        }

        // Validate individual effects
        for (let i = 0; i < effects.length; i++) {
            const effect = effects[i];
            const effectError = this.validateSingleEffect(effect, i);
            if (effectError) {
                return effectError;
            }
        }

        return null;
    }

    /**
     * Validate a single effect
     * @param {Object} effect - Effect to validate
     * @param {number} index - Effect index for error reporting
     * @returns {string|null} Error message or null if valid
     */
    validateSingleEffect(effect, index) {
        if (!effect || typeof effect !== 'object') {
            return `Effect at index ${index} is not a valid object`;
        }

        if (!effect.id) {
            return `Effect at index ${index} is missing required ID`;
        }

        if (!effect.className) {
            return `Effect at index ${index} is missing required className`;
        }

        if (effect.config && typeof effect.config !== 'object') {
            return `Effect at index ${index} has invalid config (must be object)`;
        }

        return null;
    }

    /**
     * Check if project is ready for rendering
     * @returns {boolean} True if ready for render
     */
    isReadyForRender() {
        const validation = this.validate();
        if (!validation.isValid) {
            return false;
        }

        // Additional render readiness checks
        const hasEffects = this.effectsManager.hasEffects();
        const hasOutputDirectory = this.stateCore.getProperty('outputDirectory');

        return hasEffects && hasOutputDirectory;
    }

    /**
     * Get render readiness status
     * @returns {Object} Readiness status with details
     */
    getRenderReadiness() {
        const validation = this.validate();
        const hasEffects = this.effectsManager.hasEffects();
        const hasOutputDirectory = this.stateCore.getProperty('outputDirectory');

        const issues = [];
        
        if (!validation.isValid) {
            issues.push(...validation.errors);
        }

        if (!hasEffects) {
            issues.push('At least one effect is required for rendering');
        }

        if (!hasOutputDirectory) {
            issues.push('Output directory must be specified');
        }

        return {
            isReady: issues.length === 0,
            issues,
            hasValidConfig: validation.isValid,
            hasEffects,
            hasOutputDirectory
        };
    }

    /**
     * Validate artist name
     * @returns {string|null} Error message or null if valid
     */
    validateArtist() {
        const artist = this.stateCore.getProperty('artist');
        
        if (artist && artist.length > 100) {
            return 'Artist name must be 100 characters or less';
        }

        return null;
    }

    /**
     * Validate output directory
     * @returns {string|null} Error message or null if valid
     */
    validateOutputDirectory() {
        const outputDirectory = this.stateCore.getProperty('outputDirectory');
        
        if (outputDirectory && typeof outputDirectory !== 'string') {
            return 'Output directory must be a string';
        }

        return null;
    }

    /**
     * Get validation summary
     * @returns {Object} Complete validation summary
     */
    getValidationSummary() {
        const validation = this.validate();
        const renderReadiness = this.getRenderReadiness();

        return {
            ...validation,
            renderReadiness,
            effectsCount: this.effectsManager.getEffectsCount(),
            hasRequiredFields: this.hasRequiredFields(),
            configurationComplete: this.isConfigurationComplete()
        };
    }

    /**
     * Check if all required fields are present
     * @returns {boolean} True if all required fields present
     */
    hasRequiredFields() {
        const projectName = this.stateCore.getProperty('projectName');
        const targetResolution = this.stateCore.getProperty('targetResolution');
        const colorSchemeData = this.stateCore.getProperty('colorSchemeData');
        const numFrames = this.stateCore.getProperty('numFrames');

        return !!(projectName && targetResolution && colorSchemeData && numFrames);
    }

    /**
     * Check if configuration is complete
     * @returns {boolean} True if configuration is complete
     */
    isConfigurationComplete() {
        const validation = this.validate();
        const hasEffects = this.effectsManager.hasEffects();
        
        return validation.isValid && hasEffects;
    }

    /**
     * Get missing required fields
     * @returns {string[]} Array of missing field names
     */
    getMissingRequiredFields() {
        const missing = [];
        
        if (!this.stateCore.getProperty('projectName')) {
            missing.push('projectName');
        }
        
        if (!this.stateCore.getProperty('targetResolution')) {
            missing.push('targetResolution');
        }
        
        if (!this.stateCore.getProperty('colorSchemeData')) {
            missing.push('colorSchemeData');
        }
        
        if (!this.stateCore.getProperty('numFrames')) {
            missing.push('numFrames');
        }

        return missing;
    }
}