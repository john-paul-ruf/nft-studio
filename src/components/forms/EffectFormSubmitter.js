/**
 * EffectFormSubmitter
 * 
 * Handles form submission logic for effect configurations.
 * Extracted from EffectConfigurer as part of god object decomposition.
 * 
 * Responsibilities:
 * - Prepare configuration data for submission
 * - Serialize special field types (positions, etc.)
 * - Emit events for config changes
 * - Handle effect addition and attachment
 */

import PositionSerializer from '../../utils/PositionSerializer.js';

/**
 * Prepares configuration data for submission by serializing special types
 * 
 * @param {Object} config - The raw configuration object
 * @returns {Object} The serialized configuration ready for submission
 */
export function prepareConfigForSubmission(config) {
    const serializedConfig = {};

    for (const [key, value] of Object.entries(config)) {
        // Serialize position objects
        if (value && typeof value === 'object' && value.name &&
            (value.name === 'position' || value.name === 'arc-path')) {
            serializedConfig[key] = PositionSerializer.serialize(value);
        } else {
            serializedConfig[key] = value;
        }
    }

    return serializedConfig;
}

/**
 * Serializes a single field value if needed
 * 
 * @param {*} value - The field value
 * @returns {*} The serialized value
 */
export function serializeFieldValue(value) {
    // Serialize position objects
    if (value && typeof value === 'object' && value.name &&
        (value.name === 'position' || value.name === 'arc-path')) {
        return PositionSerializer.serialize(value);
    }
    return value;
}

/**
 * Creates an effect data object for submission
 * 
 * @param {Object} selectedEffect - The selected effect class
 * @param {Object} config - The effect configuration
 * @param {number} percentChance - The percent chance value
 * @returns {Object} The effect data object
 */
export function createEffectData(selectedEffect, config, percentChance) {
    return {
        effectClass: selectedEffect,
        config: prepareConfigForSubmission(config),
        percentChance: percentChance || 100
    };
}

/**
 * Creates an effect context object for event emission
 * 
 * @param {Object} selectedEffect - The selected effect
 * @param {Object} config - The effect configuration
 * @returns {Object} The effect context object
 */
export function createEffectContext(selectedEffect, config) {
    return {
        effectIndex: selectedEffect?.effectIndex,
        effectType: selectedEffect?.effectType || 'primary',
        subEffectIndex: selectedEffect?.subEffectIndex,
        config: prepareConfigForSubmission(config)
    };
}

/**
 * Creates an attachment data object for effect attachment
 * 
 * @param {Object} effectData - The effect data
 * @param {string} attachmentType - The attachment type ('secondary' or 'keyframe')
 * @param {Object} parentEffect - The parent effect
 * @param {boolean} isEditing - Whether this is an edit operation
 * @returns {Object} The attachment data object
 */
export function createAttachmentData(effectData, attachmentType, parentEffect, isEditing = false) {
    return {
        effectData,
        attachmentType,
        isEditing,
        parentEffect
    };
}

export default {
    prepareConfigForSubmission,
    serializeFieldValue,
    createEffectData,
    createEffectContext,
    createAttachmentData
};