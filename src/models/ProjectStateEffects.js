/**
 * ProjectStateEffects - Effect Operations Management
 * 
 * Single Responsibility: Manage all effect-related operations
 * - Effect CRUD operations
 * - Effect reordering
 * - Secondary and keyframe effect operations
 * - Effect queries and filtering
 */

import { Effect } from '../models/Effect.js';

export default class ProjectStateEffects {
    constructor(stateCore) {
        this.stateCore = stateCore;
    }

    /**
     * Get effects array (immutable copy)
     * @returns {Array} Effects array
     */
    getEffects() {
        const effects = this.stateCore.getProperty('effects') || [];
        return [...effects];
    }

    /**
     * Set effects array
     * @param {Array} effects - New effects array
     */
    setEffects(effects) {
        this.stateCore.setProperty('effects', [...effects]);
    }

    /**
     * Add effect to the effects array
     * @param {Effect|Object} effect - Effect to add (Effect instance or POJO)
     */
    addEffect(effect) {
        const effects = this.getEffects();
        // Convert POJO to Effect instance if needed (backward compatibility)
        const effectInstance = effect instanceof Effect ? effect : Effect.fromPOJO(effect);
        effects.push(effectInstance);
        this.setEffects(effects);
    }

    /**
     * Update effect at specific index
     * @param {number} index - Index of effect to update
     * @param {Effect|Object} updates - Updates to apply to the effect (Effect instance or POJO)
     */
    updateEffect(index, updates) {
        const effects = this.getEffects();
        if (effects[index]) {
            // If updates is an Effect instance, use it directly
            // Otherwise, merge updates into existing effect
            if (updates instanceof Effect) {
                effects[index] = updates;
            } else {
                // Merge updates and recreate Effect instance
                const currentEffect = effects[index];
                const merged = { ...currentEffect, ...updates };
                effects[index] = merged instanceof Effect ? merged : Effect.fromPOJO(merged);
            }
            this.setEffects(effects);
        }
    }

    /**
     * Remove effect at specific index
     * @param {number} index - Index of effect to remove
     */
    removeEffect(index) {
        const effects = this.getEffects();
        const filteredEffects = effects.filter((_, i) => i !== index);
        this.setEffects(filteredEffects);
    }

    /**
     * Reorder effects
     * @param {number} sourceIndex - Source index
     * @param {number} destinationIndex - Destination index
     */
    reorderEffects(sourceIndex, destinationIndex) {
        const effects = this.getEffects();
        const [movedEffect] = effects.splice(sourceIndex, 1);
        effects.splice(destinationIndex, 0, movedEffect);
        this.setEffects(effects);
    }

    /**
     * Reorder secondary effects within a parent effect
     * @param {number} parentIndex - Index of the parent effect
     * @param {number} sourceIndex - Source index within secondaryEffects array
     * @param {number} destinationIndex - Destination index within secondaryEffects array
     */
    reorderSecondaryEffects(parentIndex, sourceIndex, destinationIndex) {
        const effects = this.getEffects();
        const parentEffect = effects[parentIndex];

        if (!parentEffect || !parentEffect.secondaryEffects || parentEffect.secondaryEffects.length === 0) {
            console.warn('ProjectStateEffects: Cannot reorder secondary effects - parent effect or secondaryEffects not found');
            return;
        }

        const secondaryEffects = [...parentEffect.secondaryEffects];
        const [movedSecondaryEffect] = secondaryEffects.splice(sourceIndex, 1);
        secondaryEffects.splice(destinationIndex, 0, movedSecondaryEffect);

        effects[parentIndex] = {
            ...parentEffect,
            secondaryEffects: secondaryEffects
        };

        this.setEffects(effects);
    }

    /**
     * Reorder keyframe effects within a parent effect
     * @param {number} parentIndex - Index of the parent effect
     * @param {number} sourceIndex - Source index within keyframeEffects array
     * @param {number} destinationIndex - Destination index within keyframeEffects array
     */
    reorderKeyframeEffects(parentIndex, sourceIndex, destinationIndex) {
        const effects = this.getEffects();
        const parentEffect = effects[parentIndex];

        if (!parentEffect) {
            console.warn('ProjectStateEffects: Cannot reorder keyframe effects - parent effect not found');
            return;
        }

        // Ensure parent effect is an Effect instance
        const Effect = require('./Effect.js').Effect;
        const parentEffectInstance = parentEffect instanceof Effect 
            ? parentEffect 
            : Effect.fromPOJO(parentEffect);

        // Use new keyframeEffects property (backward compatible with attachedEffects.keyFrame)
        const keyframeEffects = parentEffectInstance.keyframeEffects || 
                               parentEffectInstance.attachedEffects?.keyFrame || [];

        if (keyframeEffects.length === 0) {
            console.warn('ProjectStateEffects: Cannot reorder keyframe effects - no keyframe effects found');
            return;
        }

        const reorderedKeyframeEffects = [...keyframeEffects];
        const [movedKeyframeEffect] = reorderedKeyframeEffects.splice(sourceIndex, 1);
        reorderedKeyframeEffects.splice(destinationIndex, 0, movedKeyframeEffect);

        // Update using new keyframeEffects property
        effects[parentIndex] = {
            ...parentEffectInstance,
            keyframeEffects: reorderedKeyframeEffects
        };

        this.setEffects(effects);
    }

    /**
     * Check if project has any effects
     * @returns {boolean} True if effects exist
     */
    hasEffects() {
        const effects = this.getEffects();
        return effects.length > 0;
    }

    /**
     * Get effects by type
     * @param {string} type - Effect type to filter by
     * @returns {Array} Filtered effects array
     */
    getEffectsByType(type) {
        const effects = this.getEffects();
        return effects.filter(effect => effect.type === type);
    }

    /**
     * Get effect by ID
     * @param {string} id - Effect ID
     * @returns {Object|null} Effect object or null if not found
     */
    getEffectById(id) {
        const effects = this.getEffects();
        return effects.find(effect => effect.id === id) || null;
    }

    /**
     * Get effect index by ID
     * @param {string} id - Effect ID
     * @returns {number} Effect index or -1 if not found
     */
    getEffectIndexById(id) {
        const effects = this.getEffects();
        return effects.findIndex(effect => effect.id === id);
    }

    /**
     * Update effect by ID
     * @param {string} id - Effect ID
     * @param {Object} updates - Updates to apply
     * @returns {boolean} True if effect was found and updated
     */
    updateEffectById(id, updates) {
        const index = this.getEffectIndexById(id);
        if (index !== -1) {
            this.updateEffect(index, updates);
            return true;
        }
        return false;
    }

    /**
     * Remove effect by ID
     * @param {string} id - Effect ID
     * @returns {boolean} True if effect was found and removed
     */
    removeEffectById(id) {
        const index = this.getEffectIndexById(id);
        if (index !== -1) {
            this.removeEffect(index);
            return true;
        }
        return false;
    }

    /**
     * Get effects count
     * @returns {number} Number of effects
     */
    getEffectsCount() {
        const effects = this.getEffects();
        return effects.length;
    }

    /**
     * Clear all effects
     */
    clearEffects() {
        this.setEffects([]);
    }

    /**
     * Get effects by name pattern
     * @param {string} pattern - Name pattern to match
     * @returns {Array} Matching effects
     */
    getEffectsByName(pattern) {
        const effects = this.getEffects();
        const regex = new RegExp(pattern, 'i');
        return effects.filter(effect => regex.test(effect.name || ''));
    }

    /**
     * Get effects by class name
     * @param {string} className - Class name to match
     * @returns {Array} Matching effects
     */
    getEffectsByClassName(className) {
        const effects = this.getEffects();
        return effects.filter(effect => effect.className === className);
    }

    /**
     * Duplicate effect at index
     * @param {number} index - Index of effect to duplicate
     * @returns {boolean} True if effect was duplicated
     */
    duplicateEffect(index) {
        const effects = this.getEffects();
        if (effects[index]) {
            const duplicatedEffect = {
                ...effects[index],
                id: `${effects[index].id}_copy_${Date.now()}`,
                name: `${effects[index].name} Copy`
            };
            effects.splice(index + 1, 0, duplicatedEffect);
            this.setEffects(effects);
            return true;
        }
        return false;
    }

    /**
     * Move effect to specific position
     * @param {number} fromIndex - Current index
     * @param {number} toIndex - Target index
     */
    moveEffect(fromIndex, toIndex) {
        if (fromIndex !== toIndex) {
            this.reorderEffects(fromIndex, toIndex);
        }
    }

    /**
     * Swap two effects
     * @param {number} index1 - First effect index
     * @param {number} index2 - Second effect index
     */
    swapEffects(index1, index2) {
        const effects = this.getEffects();
        if (effects[index1] && effects[index2]) {
            [effects[index1], effects[index2]] = [effects[index2], effects[index1]];
            this.setEffects(effects);
        }
    }
}