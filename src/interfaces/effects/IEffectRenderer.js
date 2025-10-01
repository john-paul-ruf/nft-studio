/**
 * Interface for Effect Rendering Operations
 * 
 * This interface defines the contract for rendering effects,
 * including frame processing, animation handling, and output generation.
 * 
 * @interface IEffectRenderer
 */
export class IEffectRenderer {
    /**
     * Renders a single frame with the applied effects
     * 
     * @param {Object} frameData - Input frame data
     * @param {Array<Object>} effects - Array of effect instances to apply
     * @param {Object} [options] - Rendering options
     * @param {number} [options.quality] - Render quality (0-100)
     * @param {string} [options.format] - Output format
     * @returns {Promise<Object>} Rendered frame data
     * @throws {RenderError} When rendering fails
     */
    async renderFrame(frameData, effects, options = {}) {
        throw new Error('IEffectRenderer.renderFrame() must be implemented');
    }

    /**
     * Renders multiple frames for animation
     * 
     * @param {Array<Object>} frames - Array of input frame data
     * @param {Array<Object>} effects - Array of effect instances to apply
     * @param {Object} [options] - Rendering options
     * @returns {Promise<Array<Object>>} Array of rendered frame data
     * @throws {RenderError} When rendering fails
     */
    async renderFrames(frames, effects, options = {}) {
        throw new Error('IEffectRenderer.renderFrames() must be implemented');
    }

    /**
     * Renders an animation sequence
     * 
     * @param {Object} animationData - Animation configuration
     * @param {Array<Object>} effects - Array of effect instances to apply
     * @param {Object} [options] - Rendering options
     * @returns {Promise<Object>} Rendered animation data
     * @throws {RenderError} When rendering fails
     */
    async renderAnimation(animationData, effects, options = {}) {
        throw new Error('IEffectRenderer.renderAnimation() must be implemented');
    }

    /**
     * Generates a preview of the effect application
     * 
     * @param {Object} inputData - Input data for preview
     * @param {Array<Object>} effects - Array of effect instances
     * @param {Object} [options] - Preview options
     * @param {boolean} [options.lowQuality] - Use low quality for faster preview
     * @param {number} [options.maxDimensions] - Maximum preview dimensions
     * @returns {Promise<Object>} Preview data
     */
    async generatePreview(inputData, effects, options = {}) {
        throw new Error('IEffectRenderer.generatePreview() must be implemented');
    }

    /**
     * Processes effects in a specific order
     * 
     * @param {Object} inputData - Input data to process
     * @param {Array<Object>} orderedEffects - Effects in processing order
     * @param {Object} [options] - Processing options
     * @returns {Promise<Object>} Processed data
     */
    async processEffectChain(inputData, orderedEffects, options = {}) {
        throw new Error('IEffectRenderer.processEffectChain() must be implemented');
    }

    /**
     * Optimizes effect rendering for performance
     * 
     * @param {Array<Object>} effects - Effects to optimize
     * @returns {Promise<Array<Object>>} Optimized effect chain
     */
    async optimizeEffectChain(effects) {
        throw new Error('IEffectRenderer.optimizeEffectChain() must be implemented');
    }

    /**
     * Validates that effects can be rendered together
     * 
     * @param {Array<Object>} effects - Effects to validate
     * @returns {Promise<EffectCompatibilityResult>} Compatibility result
     */
    async validateEffectCompatibility(effects) {
        throw new Error('IEffectRenderer.validateEffectCompatibility() must be implemented');
    }

    /**
     * Gets rendering capabilities and limitations
     * 
     * @returns {Object} Renderer capabilities
     */
    getRendererCapabilities() {
        throw new Error('IEffectRenderer.getRendererCapabilities() must be implemented');
    }

    /**
     * Sets rendering progress callback
     * 
     * @param {Function} callback - Progress callback function
     * @param {number} callback.progress - Progress percentage (0-100)
     * @param {string} callback.operation - Current operation description
     */
    setProgressCallback(callback) {
        throw new Error('IEffectRenderer.setProgressCallback() must be implemented');
    }

    /**
     * Cancels current rendering operation
     * 
     * @returns {Promise<void>}
     */
    async cancelRendering() {
        throw new Error('IEffectRenderer.cancelRendering() must be implemented');
    }
}

/**
 * Effect compatibility result structure
 * @typedef {Object} EffectCompatibilityResult
 * @property {boolean} compatible - Whether effects are compatible
 * @property {Array<string>} conflicts - List of compatibility conflicts
 * @property {Array<string>} warnings - List of compatibility warnings
 * @property {Object} recommendations - Recommended optimizations
 */