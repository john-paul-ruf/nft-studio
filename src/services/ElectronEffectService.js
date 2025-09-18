/**
 * Electron-specific implementation of effect service
 * Follows Open/Closed Principle - open for extension, closed for modification
 */
class ElectronEffectService {
    constructor() {
        // Use the exposed API from preload script
        this.effectsCache = new Map();
        this.schemaCache = new Map();
    }

    /**
     * Discover available effects
     * @returns {Promise<Object>} Effects discovery result
     */
    async discoverEffects() {
        try {
            // Check cache first
            if (this.effectsCache.has('all-effects')) {
                return {
                    success: true,
                    effects: this.effectsCache.get('all-effects')
                };
            }

            const result = await window.api.discoverEffects();

            if (result.success) {
                this.effectsCache.set('all-effects', result.effects);
            }

            return result;
        } catch (error) {
            console.error('Error discovering effects:', error);
            return {
                success: false,
                error: error.message,
                effects: null
            };
        }
    }

    /**
     * Get effect defaults
     * @param {string} effectName - Name of effect
     * @returns {Promise<Object>} Effect defaults
     */
    async getEffectDefaults(effectName) {
        try {
            if (!effectName || typeof effectName !== 'string') {
                throw new Error('Effect name is required');
            }

            // Check cache first
            const cacheKey = `defaults-${effectName}`;
            if (this.effectsCache.has(cacheKey)) {
                return this.effectsCache.get(cacheKey);
            }

            const defaults = await window.api.getEffectDefaults(effectName);

            // Cache the result
            this.effectsCache.set(cacheKey, defaults);

            return defaults;
        } catch (error) {
            console.error('Error getting effect defaults:', error);
            return {};
        }
    }

    /**
     * Get effect schema
     * @param {string} effectName - Name of effect
     * @returns {Promise<Object>} Effect schema
     */
    async getEffectSchema(effectName) {
        try {
            if (!effectName || typeof effectName !== 'string') {
                throw new Error('Effect name is required');
            }

            // Check cache first
            const cacheKey = `schema-${effectName}`;
            if (this.schemaCache.has(cacheKey)) {
                return this.schemaCache.get(cacheKey);
            }

            const schema = await window.api.getEffectSchema(effectName);

            // Cache the result
            this.schemaCache.set(cacheKey, schema);

            return schema;
        } catch (error) {
            console.error('Error getting effect schema:', error);
            return { fields: [] };
        }
    }

    /**
     * Validate effect configuration
     * @param {Object} effectConfig - Effect configuration
     * @returns {Promise<Object>} Validation result
     */
    async validateEffect(effectConfig) {
        try {
            if (!effectConfig || typeof effectConfig !== 'object') {
                return {
                    valid: false,
                    errors: ['Effect configuration is required']
                };
            }

            if (!effectConfig.className) {
                return {
                    valid: false,
                    errors: ['Effect class name is required']
                };
            }

            const result = await window.api.validateEffect(effectConfig);
            return result;
        } catch (error) {
            console.error('Error validating effect:', error);
            return {
                valid: false,
                errors: [error.message]
            };
        }
    }

    /**
     * Preview effect
     * @param {Object} previewConfig - Preview configuration
     * @returns {Promise<Object>} Preview result
     */
    async previewEffect(previewConfig) {
        try {
            const validation = this.validatePreviewConfig(previewConfig);
            if (!validation.valid) {
                return {
                    success: false,
                    errors: validation.errors
                };
            }

            const result = await window.api.previewEffect(previewConfig);
            return result;
        } catch (error) {
            console.error('Error previewing effect:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate effect thumbnail
     * @param {Object} thumbnailConfig - Thumbnail configuration
     * @returns {Promise<Object>} Thumbnail result
     */
    async generateThumbnail(thumbnailConfig) {
        try {
            const result = await window.api.previewEffectThumbnail(thumbnailConfig);
            return result;
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate preview configuration
     * @param {Object} previewConfig - Preview configuration
     * @returns {Object} Validation result
     */
    validatePreviewConfig(previewConfig) {
        const errors = [];

        if (!previewConfig) {
            errors.push('Preview configuration is required');
            return { valid: false, errors };
        }

        if (!previewConfig.effectClass) {
            errors.push('Effect class is required');
        }

        if (!previewConfig.effectConfig) {
            errors.push('Effect configuration is required');
        }

        if (previewConfig.frameNumber !== undefined &&
            (previewConfig.frameNumber < 0 || !Number.isInteger(previewConfig.frameNumber))) {
            errors.push('Frame number must be a non-negative integer');
        }

        if (previewConfig.totalFrames !== undefined &&
            (previewConfig.totalFrames < 1 || !Number.isInteger(previewConfig.totalFrames))) {
            errors.push('Total frames must be a positive integer');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Clear caches
     */
    clearCache() {
        this.effectsCache.clear();
        this.schemaCache.clear();
    }

    /**
     * Get effect metadata
     * @param {Object} params - Effect parameters
     * @returns {Promise<Object>} Effect metadata
     */
    async getEffectMetadata(params) {
        try {
            const result = await window.api.getEffectMetadata(params);
            return result;
        } catch (error) {
            console.error('Error getting effect metadata:', error);
            throw error;
        }
    }
}

export default ElectronEffectService;