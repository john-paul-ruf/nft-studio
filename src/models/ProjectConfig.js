/**
 * ProjectConfig - Project Configuration Model
 * 
 * Represents the complete configuration for an NFT Studio project.
 * Provides validation, serialization, and utility methods for project management.
 * 
 * @class
 */

import { Effect } from './Effect.js';
import ResolutionMapper from '../utils/ResolutionMapper.js';

export class ProjectConfig {
    /**
     * Create a ProjectConfig instance
     * 
     * @param {Object} params - Project configuration parameters
     * @param {string} [params.projectName=''] - Project name
     * @param {string} [params.artist=''] - Artist name
     * @param {number} [params.targetResolution] - Target resolution (height in pixels)
     * @param {boolean} [params.isHorizontal=false] - Orientation flag
     * @param {number} [params.numFrames=100] - Number of frames
     * @param {Array<Effect>} [params.effects=[]] - Effects array
     * @param {string} [params.colorScheme='vapor-dreams'] - Color scheme name
     * @param {Object} [params.colorSchemeData=null] - Color scheme data
     * @param {string} [params.outputDirectory=null] - Output directory path
     * @param {number} [params.renderStartFrame=0] - Render start frame
     * @param {number} [params.renderJumpFrames=1] - Render jump frames
     */
    constructor({
        projectName = '',
        artist = '',
        targetResolution = null,
        isHorizontal = false,
        numFrames = 100,
        effects = [],
        colorScheme = 'vapor-dreams',
        colorSchemeData = null,
        outputDirectory = null,
        renderStartFrame = 0,
        renderJumpFrames = 1
    } = {}) {
        // Validate types
        if (typeof projectName !== 'string') {
            throw new Error('projectName must be a string');
        }
        if (typeof artist !== 'string') {
            throw new Error('artist must be a string');
        }
        if (typeof isHorizontal !== 'boolean') {
            throw new Error('isHorizontal must be a boolean');
        }
        if (typeof numFrames !== 'number' || numFrames < 1) {
            throw new Error('numFrames must be a positive number');
        }
        if (!Array.isArray(effects)) {
            throw new Error('effects must be an array');
        }
        if (typeof colorScheme !== 'string') {
            throw new Error('colorScheme must be a string');
        }
        if (typeof renderStartFrame !== 'number' || renderStartFrame < 0) {
            throw new Error('renderStartFrame must be a non-negative number');
        }
        if (typeof renderJumpFrames !== 'number' || renderJumpFrames < 1) {
            throw new Error('renderJumpFrames must be a positive number');
        }

        // Assign properties
        this.projectName = projectName;
        this.artist = artist;
        this.targetResolution = targetResolution || ResolutionMapper.getDefaultResolution();
        this.isHorizontal = isHorizontal;
        this.numFrames = numFrames;
        this.effects = effects;
        this.colorScheme = colorScheme;
        this.colorSchemeData = colorSchemeData;
        this.outputDirectory = outputDirectory;
        this.renderStartFrame = renderStartFrame;
        this.renderJumpFrames = renderJumpFrames;
    }

    /**
     * Create ProjectConfig instance from plain object (POJO)
     * 
     * @param {Object} pojo - Plain object representation of project config
     * @returns {ProjectConfig} ProjectConfig instance
     * @throws {Error} If pojo is null/undefined or invalid
     * @static
     */
    static fromPOJO(pojo) {
        if (!pojo) {
            throw new Error('Cannot create ProjectConfig from null/undefined');
        }

        // Convert effects array to Effect instances
        const effects = (pojo.effects || []).map(e => 
            e instanceof Effect ? e : Effect.fromPOJO(e)
        );

        return new ProjectConfig({
            projectName: pojo.projectName,
            artist: pojo.artist,
            targetResolution: pojo.targetResolution,
            isHorizontal: pojo.isHorizontal,
            numFrames: pojo.numFrames,
            effects,
            colorScheme: pojo.colorScheme,
            colorSchemeData: pojo.colorSchemeData,
            outputDirectory: pojo.outputDirectory,
            renderStartFrame: pojo.renderStartFrame,
            renderJumpFrames: pojo.renderJumpFrames
        });
    }

    /**
     * Convert ProjectConfig instance to plain object (POJO)
     * 
     * Used for serialization (IPC, file persistence, etc.)
     * 
     * @returns {Object} Plain object representation
     */
    toPOJO() {
        return {
            projectName: this.projectName,
            artist: this.artist,
            targetResolution: this.targetResolution,
            isHorizontal: this.isHorizontal,
            numFrames: this.numFrames,
            effects: this.effects.map(e => 
                e instanceof Effect ? e.toPOJO() : e
            ),
            colorScheme: this.colorScheme,
            colorSchemeData: this.colorSchemeData,
            outputDirectory: this.outputDirectory,
            renderStartFrame: this.renderStartFrame,
            renderJumpFrames: this.renderJumpFrames
        };
    }

    /**
     * Validate project configuration
     * 
     * @returns {Object} Validation result { valid: boolean, errors: string[] }
     */
    validate() {
        const errors = [];

        // Validate project name
        if (typeof this.projectName !== 'string') {
            errors.push('projectName must be a string');
        }

        // Validate artist
        if (typeof this.artist !== 'string') {
            errors.push('artist must be a string');
        }

        // Validate targetResolution
        if (typeof this.targetResolution !== 'number' || this.targetResolution < 1) {
            errors.push('targetResolution must be a positive number');
        }

        // Validate isHorizontal
        if (typeof this.isHorizontal !== 'boolean') {
            errors.push('isHorizontal must be a boolean');
        }

        // Validate numFrames
        if (typeof this.numFrames !== 'number' || this.numFrames < 1) {
            errors.push('numFrames must be a positive number');
        }

        // Validate effects array
        if (!Array.isArray(this.effects)) {
            errors.push('effects must be an array');
        } else {
            this.effects.forEach((effect, index) => {
                if (effect instanceof Effect) {
                    const effectValidation = effect.validate();
                    if (!effectValidation.valid) {
                        errors.push(`Effect ${index}: ${effectValidation.errors.join(', ')}`);
                    }
                }
            });
        }

        // Validate colorScheme
        if (typeof this.colorScheme !== 'string') {
            errors.push('colorScheme must be a string');
        }

        // Validate renderStartFrame
        if (typeof this.renderStartFrame !== 'number' || this.renderStartFrame < 0) {
            errors.push('renderStartFrame must be a non-negative number');
        }

        // Validate renderJumpFrames
        if (typeof this.renderJumpFrames !== 'number' || this.renderJumpFrames < 1) {
            errors.push('renderJumpFrames must be a positive number');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Add an effect to the project
     * 
     * @param {Effect} effect - Effect to add
     * @returns {ProjectConfig} This instance (for chaining)
     */
    addEffect(effect) {
        if (!(effect instanceof Effect)) {
            throw new Error('Effect must be an instance of Effect class');
        }

        this.effects = [...this.effects, effect];
        return this;
    }

    /**
     * Remove an effect from the project
     * 
     * @param {number} index - Index of effect to remove
     * @returns {ProjectConfig} This instance (for chaining)
     */
    removeEffect(index) {
        if (typeof index !== 'number' || index < 0 || index >= this.effects.length) {
            throw new Error('Invalid effect index');
        }

        this.effects = this.effects.filter((_, i) => i !== index);
        return this;
    }

    /**
     * Get effects array (immutable copy)
     * 
     * @returns {Array<Effect>} Effects array
     */
    getEffects() {
        return [...this.effects];
    }

    /**
     * Get effect at index
     * 
     * @param {number} index - Effect index
     * @returns {Effect|null} Effect or null if not found
     */
    getEffect(index) {
        if (typeof index !== 'number' || index < 0 || index >= this.effects.length) {
            return null;
        }
        return this.effects[index];
    }

    /**
     * Update effect at index
     * 
     * @param {number} index - Effect index
     * @param {Effect} effect - New effect
     * @returns {ProjectConfig} This instance (for chaining)
     */
    updateEffect(index, effect) {
        if (typeof index !== 'number' || index < 0 || index >= this.effects.length) {
            throw new Error('Invalid effect index');
        }
        if (!(effect instanceof Effect)) {
            throw new Error('Effect must be an instance of Effect class');
        }

        this.effects = this.effects.map((e, i) => i === index ? effect : e);
        return this;
    }

    /**
     * Get number of effects
     * 
     * @returns {number} Number of effects
     */
    getEffectCount() {
        return this.effects.length;
    }

    /**
     * Check if project has effects
     * 
     * @returns {boolean} True if project has effects
     */
    hasEffects() {
        return this.effects.length > 0;
    }

    /**
     * Clear all effects
     * 
     * @returns {ProjectConfig} This instance (for chaining)
     */
    clearEffects() {
        this.effects = [];
        return this;
    }

    /**
     * Create a deep clone of this project config
     * 
     * @returns {ProjectConfig} Cloned project config
     */
    clone() {
        const pojo = JSON.parse(JSON.stringify(this.toPOJO()));
        return ProjectConfig.fromPOJO(pojo);
    }

    /**
     * Get a string representation of the project config
     * 
     * @returns {string} String representation
     */
    toString() {
        return `ProjectConfig(${this.projectName}, ${this.effects.length} effects, ${this.numFrames} frames)`;
    }

    /**
     * Get a JSON representation of the project config
     * 
     * @returns {string} JSON string
     */
    toJSON() {
        return JSON.stringify(this.toPOJO(), null, 2);
    }
}