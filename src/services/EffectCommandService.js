/**
 * Effect Command Service
 * Handles primary effect commands (Add, Update, Delete, Reorder)
 * Extracted from ProjectCommands.js as part of God Object Destruction Plan - Phase 6, Step 6.3
 * 
 * UPDATED: Phase 3 - POJO Evolution to Classes
 * - Commands now work with Effect class instances
 * - Backward compatible with POJOs via Effect.fromPOJO()
 */

import { Command } from './CommandService.js';
import EventBusService from './EventBusService.js';
import CommandDescriptionHelper from '../utils/CommandDescriptionHelper.js';
import { Effect } from '../models/Effect.js';

/**
 * Service for creating and managing primary effect commands
 */
class EffectCommandService {
    constructor() {
        console.log('🎨 EffectCommandService: Initialized - Primary effect command management');
    }

    /**
     * Create command to update effect properties/configuration
     * @param {Object} projectState - Project state instance
     * @param {number} effectIndex - Index of effect to update
     * @param {Object} updatedEffect - Updated effect data
     * @param {string} effectName - Name of effect for description
     * @returns {Command} UpdateEffectCommand instance
     */
    createUpdateCommand(projectState, effectIndex, updatedEffect, effectName) {
        return new UpdateEffectCommand(projectState, effectIndex, updatedEffect, effectName);
    }

    /**
     * Create command to add an effect to the project
     * @param {Object} projectState - Project state instance
     * @param {Object} effectData - Effect data to add
     * @param {string} effectName - Name of effect
     * @param {string} effectType - Type of effect
     * @returns {Command} AddEffectCommand instance
     */
    createAddCommand(projectState, effectData, effectName, effectType) {
        return new AddEffectCommand(projectState, effectData, effectName, effectType);
    }

    /**
     * Create command to delete an effect from the project
     * @param {Object} projectState - Project state instance
     * @param {number} effectIndex - Index of effect to delete
     * @returns {Command} DeleteEffectCommand instance
     */
    createDeleteCommand(projectState, effectIndex) {
        return new DeleteEffectCommand(projectState, effectIndex);
    }

    /**
     * Create command to reorder effects in the main effects list
     * @param {Object} projectState - Project state instance
     * @param {number} fromIndex - Source index
     * @param {number} toIndex - Destination index
     * @returns {Command} ReorderEffectsCommand instance
     */
    createReorderCommand(projectState, fromIndex, toIndex) {
        return new ReorderEffectsCommand(projectState, fromIndex, toIndex);
    }
}

/**
 * Command to update effect properties/configuration
 */
export class UpdateEffectCommand extends Command {
    constructor(projectState, effectIndex, updatedEffect, effectName) {
        let previousEffect = null;

        const executeAction = () => {
            const currentEffects = projectState.getState().effects || [];

            if (effectIndex < 0 || effectIndex >= currentEffects.length) {
                throw new Error(`Invalid effect index: ${effectIndex}`);
            }

            previousEffect = currentEffects[effectIndex];
            
            // Ensure updatedEffect is an Effect instance (backward compatibility)
            // If updatedEffect is a POJO without type, use the previous effect's type
            const effectInstance = updatedEffect instanceof Effect 
                ? updatedEffect 
                : Effect.fromPOJO({ 
                    ...updatedEffect, 
                    type: updatedEffect.type || previousEffect.type 
                });
            
            const newEffects = [...currentEffects];
            newEffects[effectIndex] = effectInstance;

            console.log('✏️ UpdateEffectCommand: Updating effect at index:', effectIndex);
            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('effect:updated', {
                effect: effectInstance,
                previousEffect,
                index: effectIndex
            }, { source: 'UpdateEffectCommand' });

            return { success: true, effect: effectInstance, index: effectIndex };
        };

        const undoAction = () => {
            if (!previousEffect) {
                throw new Error('No previous effect state to restore');
            }

            // Ensure previousEffect is an Effect instance (backward compatibility)
            // previousEffect should already have all required properties including type
            const effectInstance = previousEffect instanceof Effect 
                ? previousEffect 
                : Effect.fromPOJO(previousEffect);

            const currentEffects = projectState.getState().effects || [];
            const newEffects = [...currentEffects];
            newEffects[effectIndex] = effectInstance;

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('effect:updated', {
                effect: effectInstance,
                previousEffect: updatedEffect,
                index: effectIndex
            }, { source: 'UpdateEffectCommand' });

            return { success: true };
        };

        // Generate detailed description based on what changed
        const currentEffect = projectState.getState().effects?.[effectIndex];
        const description = currentEffect
            ? CommandDescriptionHelper.describePropertyChanges(currentEffect, updatedEffect, effectName || 'effect')
            : `Updated ${effectName || 'effect'} properties`;

        super('effect.update', executeAction, undoAction, description);
        this.effectIndex = effectIndex;
        this.isEffectCommand = true;
    }
}

/**
 * Command to add an effect to the project
 */
export class AddEffectCommand extends Command {
    constructor(projectState, effectData, effectName, effectType) {
        const executeAction = () => {
            const currentEffects = projectState.getState().effects || [];
            console.log('➕ AddEffectCommand: Adding effect to project');
            console.log('➕ AddEffectCommand: Current effects before add:', currentEffects.length, currentEffects.map(e => e.name || e.className));
            console.log('➕ AddEffectCommand: Effect being added:', effectData);

            // Ensure effectData is an Effect instance (backward compatibility)
            // If effectData is a POJO, merge in the effectType before converting
            const effectInstance = effectData instanceof Effect 
                ? effectData 
                : Effect.fromPOJO({ ...effectData, type: effectData.type || effectType });

            const newEffects = [...currentEffects, effectInstance];
            console.log('➕ AddEffectCommand: New effects array will have length:', newEffects.length);

            projectState.update({ effects: newEffects });

            // Verify the update actually happened
            const verifyEffects = projectState.getState().effects || [];
            console.log('✅ AddEffectCommand: Effects after update:', verifyEffects.length, verifyEffects.map(e => e.name || e.className));

            // Emit event for UI updates
            EventBusService.emit('effect:added', {
                effect: effectInstance,
                index: newEffects.length - 1,
                total: newEffects.length
            }, { source: 'AddEffectCommand' });

            return { success: true, effect: effectInstance, index: newEffects.length - 1 };
        };

        const undoAction = () => {
            const currentEffects = projectState.getState().effects || [];
            const newEffects = currentEffects.slice(0, -1); // Remove last effect

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('effect:removed', {
                index: currentEffects.length - 1,
                total: newEffects.length
            }, { source: 'AddEffectCommand' });

            return { success: true };
        };

        const currentEffects = projectState.getState().effects || [];
        const description = CommandDescriptionHelper.describeAdd(
            effectData,
            currentEffects.length,
            null
        );
        super('effect.add', executeAction, undoAction, description);
        this.effectData = effectData;
        this.effectName = effectName;
        this.effectType = effectType;
        this.isEffectCommand = true;
    }
}

/**
 * Command to delete an effect from the project
 */
export class DeleteEffectCommand extends Command {
    constructor(projectState, effectIndex) {
        let deletedEffect = null;

        const executeAction = () => {
            const currentEffects = projectState.getState().effects || [];
            console.log('🗑️ DeleteEffectCommand: Attempting to delete effect at index:', effectIndex);
            console.log('🗑️ DeleteEffectCommand: Current effects array length:', currentEffects.length);
            console.log('🗑️ DeleteEffectCommand: Current effects:', currentEffects.map((e, i) => `${i}: ${e.name || e.className}`));

            if (effectIndex < 0 || effectIndex >= currentEffects.length) {
                console.error('❌ DeleteEffectCommand: Invalid effect index!', {
                    effectIndex,
                    arrayLength: currentEffects.length,
                    validRange: `0 to ${currentEffects.length - 1}`
                });
                throw new Error(`Invalid effect index: ${effectIndex}. Valid range: 0 to ${currentEffects.length - 1}`);
            }

            deletedEffect = currentEffects[effectIndex];
            const newEffects = currentEffects.filter((_, index) => index !== effectIndex);

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('effect:removed', {
                effect: deletedEffect,
                index: effectIndex,
                total: newEffects.length
            }, { source: 'DeleteEffectCommand' });

            return { success: true, deletedEffect, index: effectIndex };
        };

        const undoAction = () => {
            if (!deletedEffect) {
                throw new Error('No effect to restore');
            }

            // Ensure deletedEffect is an Effect instance (backward compatibility)
            // deletedEffect should already have all required properties including type
            const effectInstance = deletedEffect instanceof Effect 
                ? deletedEffect 
                : Effect.fromPOJO(deletedEffect);

            const currentEffects = projectState.getState().effects || [];
            const newEffects = [...currentEffects];
            newEffects.splice(effectIndex, 0, effectInstance);

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('effect:added', {
                effect: effectInstance,
                index: effectIndex,
                total: newEffects.length
            }, { source: 'DeleteEffectCommand' });

            return { success: true };
        };

        // Get effect for detailed description
        const currentEffects = projectState.getState().effects || [];
        const effectToDelete = currentEffects[effectIndex];
        const description = effectToDelete
            ? CommandDescriptionHelper.describeDelete(effectToDelete, effectIndex)
            : 'Deleted effect';

        super('effect.delete', executeAction, undoAction, description);
        this.effectIndex = effectIndex;
        this.isEffectCommand = true;
    }
}

/**
 * Command to reorder effects in the main effects list
 */
export class ReorderEffectsCommand extends Command {
    constructor(projectState, fromIndex, toIndex) {
        let movedEffect = null;

        const executeAction = () => {
            const currentEffects = projectState.getState().effects || [];

            if (fromIndex < 0 || fromIndex >= currentEffects.length ||
                toIndex < 0 || toIndex >= currentEffects.length) {
                throw new Error(`Invalid indices for reorder: from ${fromIndex} to ${toIndex}`);
            }

            movedEffect = currentEffects[fromIndex];
            const newEffects = [...currentEffects];
            const [removed] = newEffects.splice(fromIndex, 1);
            newEffects.splice(toIndex, 0, removed);

            console.log('🔄 ReorderEffectsCommand: Reordering effects', {
                fromIndex,
                toIndex,
                movedEffect: movedEffect.name || movedEffect.className
            });

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('effects:reordered', {
                fromIndex,
                toIndex,
                effect: movedEffect,
                total: newEffects.length
            }, { source: 'ReorderEffectsCommand' });

            return { success: true, fromIndex, toIndex };
        };

        const undoAction = () => {
            const currentEffects = projectState.getState().effects || [];
            const newEffects = [...currentEffects];

            // Move back: remove from toIndex and insert at fromIndex
            const [removed] = newEffects.splice(toIndex, 1);
            newEffects.splice(fromIndex, 0, removed);

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('effects:reordered', {
                fromIndex: toIndex,
                toIndex: fromIndex,
                effect: movedEffect,
                total: newEffects.length
            }, { source: 'ReorderEffectsCommand' });

            return { success: true };
        };

        const currentEffects = projectState.getState().effects || [];
        const effect = currentEffects[fromIndex];
        const description = effect
            ? CommandDescriptionHelper.describeReorder(effect, fromIndex, toIndex)
            : `Moved effect from position ${fromIndex + 1} to ${toIndex + 1}`;

        super('effect.reorder', executeAction, undoAction, description);
        this.fromIndex = fromIndex;
        this.toIndex = toIndex;
        this.isEffectCommand = true;
    }
}

// Export singleton instance
const effectCommandService = new EffectCommandService();
export default effectCommandService;