/**
 * Secondary Effect Command Service
 * Handles secondary effect commands (Add, Delete, Reorder)
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
 * Service for creating and managing secondary effect commands
 */
class SecondaryEffectCommandService {
    constructor() {
        console.log('🎨 SecondaryEffectCommandService: Initialized - Secondary effect command management');
    }

    /**
     * Create command to add a secondary effect to a parent effect
     * @param {Object} projectState - Project state instance
     * @param {number} parentIndex - Index of parent effect
     * @param {Object} secondaryEffect - Secondary effect data
     * @param {string} secondaryEffectName - Name of secondary effect
     * @returns {Command} AddSecondaryEffectCommand instance
     */
    createAddCommand(projectState, parentIndex, secondaryEffect, secondaryEffectName) {
        return new AddSecondaryEffectCommand(projectState, parentIndex, secondaryEffect, secondaryEffectName);
    }

    /**
     * Create command to delete a secondary effect from a parent effect
     * @param {Object} projectState - Project state instance
     * @param {number} parentIndex - Index of parent effect
     * @param {number} secondaryIndex - Index of secondary effect to delete
     * @returns {Command} DeleteSecondaryEffectCommand instance
     */
    createDeleteCommand(projectState, parentIndex, secondaryIndex) {
        return new DeleteSecondaryEffectCommand(projectState, parentIndex, secondaryIndex);
    }

    /**
     * Create command to reorder secondary effects within a parent effect
     * @param {Object} projectState - Project state instance
     * @param {number} parentIndex - Index of parent effect
     * @param {number} sourceIndex - Source index
     * @param {number} destinationIndex - Destination index
     * @returns {Command} ReorderSecondaryEffectsCommand instance
     */
    createReorderCommand(projectState, parentIndex, sourceIndex, destinationIndex) {
        return new ReorderSecondaryEffectsCommand(projectState, parentIndex, sourceIndex, destinationIndex);
    }

    // Alias methods for backward compatibility with tests
    createAddSecondaryCommand(projectState, parentIndex, secondaryEffect, secondaryEffectName) {
        return this.createAddCommand(projectState, parentIndex, secondaryEffect, secondaryEffectName);
    }

    createDeleteSecondaryCommand(projectState, parentIndex, secondaryIndex) {
        return this.createDeleteCommand(projectState, parentIndex, secondaryIndex);
    }

    createReorderSecondaryCommand(projectState, parentIndex, sourceIndex, destinationIndex) {
        return this.createReorderCommand(projectState, parentIndex, sourceIndex, destinationIndex);
    }

    /**
     * Create command to update a secondary effect
     * @param {Object} projectState - Project state instance
     * @param {number} parentIndex - Index of parent effect
     * @param {number} secondaryIndex - Index of secondary effect to update
     * @param {Object} updates - Properties to update
     * @returns {Command} UpdateSecondaryEffectCommand instance
     */
    createUpdateCommand(projectState, parentIndex, secondaryIndex, updates) {
        return new UpdateSecondaryEffectCommand(projectState, parentIndex, secondaryIndex, updates);
    }
}

/**
 * Command to add a secondary effect to a parent effect
 */
export class AddSecondaryEffectCommand extends Command {
    constructor(projectState, parentIndex, secondaryEffect, secondaryEffectName) {
        const executeAction = () => {
            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect) {
                throw new Error(`Cannot add secondary effect - parent effect at index ${parentIndex} not found`);
            }

            console.log('➕ AddSecondaryEffectCommand: Adding secondary effect to parent at index:', parentIndex);

            // Ensure secondaryEffect is an Effect instance (backward compatibility)
            // Secondary effects should have type 'secondary'
            const effectInstance = secondaryEffect instanceof Effect 
                ? secondaryEffect 
                : Effect.fromPOJO({ ...secondaryEffect, type: secondaryEffect.type || 'secondary' });

            // Ensure parent effect is an Effect instance
            const parentEffectInstance = parentEffect instanceof Effect 
                ? parentEffect 
                : Effect.fromPOJO(parentEffect);

            const updatedParentEffect = {
                ...parentEffectInstance,
                secondaryEffects: [
                    ...(parentEffectInstance.secondaryEffects || []),
                    effectInstance
                ]
            };

            const newEffects = [...currentEffects];
            newEffects[parentIndex] = updatedParentEffect;
            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('secondary:added', {
                parentIndex,
                effect: effectInstance,
                total: updatedParentEffect.secondaryEffects.length
            }, { source: 'AddSecondaryEffectCommand' });

            return { success: true, effect: effectInstance };
        };

        const undoAction = () => {
            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect || !parentEffect.secondaryEffects) {
                throw new Error('Cannot undo - parent effect or secondary effects not found');
            }

            const updatedParentEffect = {
                ...parentEffect,
                secondaryEffects: parentEffect.secondaryEffects.slice(0, -1)
            };

            const newEffects = [...currentEffects];
            newEffects[parentIndex] = updatedParentEffect;
            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('secondary:removed', {
                parentIndex,
                index: parentEffect.secondaryEffects.length - 1,
                total: updatedParentEffect.secondaryEffects.length
            }, { source: 'AddSecondaryEffectCommand' });

            return { success: true };
        };

        const parentEffect = projectState.getState().effects?.[parentIndex];
        const description = CommandDescriptionHelper.describeAdd(
            secondaryEffect,
            parentEffect?.secondaryEffects?.length || 0,
            parentEffect
        );

        super('effect.secondary.add', executeAction, undoAction, description);
        this.parentIndex = parentIndex;
        this.isEffectCommand = true;
    }
}

/**
 * Command to delete a secondary effect from a parent effect
 */
export class DeleteSecondaryEffectCommand extends Command {
    constructor(projectState, parentIndex, secondaryIndex) {
        let deletedSecondaryEffect = null;

        const executeAction = () => {
            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect || !parentEffect.secondaryEffects || parentEffect.secondaryEffects.length === 0) {
                throw new Error(`Cannot delete secondary effect - parent effect at index ${parentIndex} not found or has no secondary effects`);
            }

            if (secondaryIndex < 0 || secondaryIndex >= parentEffect.secondaryEffects.length) {
                throw new Error(`Invalid secondary effect index: ${secondaryIndex}. Valid range: 0 to ${parentEffect.secondaryEffects.length - 1}`);
            }

            console.log('🗑️ DeleteSecondaryEffectCommand: Deleting secondary effect');
            console.log('🗑️ DeleteSecondaryEffectCommand: Parent index:', parentIndex, 'Secondary index:', secondaryIndex);

            // 🔒 CRITICAL: Deep clone to prevent reference sharing bugs
            const effectToClone = parentEffect.secondaryEffects[secondaryIndex];
            deletedSecondaryEffect = effectToClone instanceof Effect 
                ? Effect.fromPOJO(JSON.parse(JSON.stringify(effectToClone.toPOJO())))
                : Effect.fromPOJO(JSON.parse(JSON.stringify(effectToClone)));
            
            // Create new effects array with updated parent effect
            const newEffects = [...currentEffects];
            newEffects[parentIndex] = {
                ...parentEffect,
                secondaryEffects: parentEffect.secondaryEffects.filter((_, index) => index !== secondaryIndex)
            };

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('secondary:removed', {
                parentIndex,
                secondaryIndex,
                deletedEffect: deletedSecondaryEffect,
                total: newEffects[parentIndex].secondaryEffects.length
            }, { source: 'DeleteSecondaryEffectCommand' });

            return { success: true, deletedSecondaryEffect, parentIndex, secondaryIndex };
        };

        const undoAction = () => {
            if (!deletedSecondaryEffect) {
                throw new Error('No secondary effect to restore');
            }

            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect) {
                throw new Error(`Cannot restore secondary effect - parent effect at index ${parentIndex} not found`);
            }

            console.log('↩️ DeleteSecondaryEffectCommand: Restoring secondary effect');

            // Ensure deletedSecondaryEffect is an Effect instance (backward compatibility)
            const effectInstance = deletedSecondaryEffect instanceof Effect 
                ? deletedSecondaryEffect 
                : Effect.fromPOJO(deletedSecondaryEffect);

            // Ensure parent effect is an Effect instance
            const parentEffectInstance = parentEffect instanceof Effect 
                ? parentEffect 
                : Effect.fromPOJO(parentEffect);

            // Create new effects array with restored secondary effect
            const newEffects = [...currentEffects];
            const newSecondaryEffects = [...(parentEffectInstance.secondaryEffects || [])];
            newSecondaryEffects.splice(secondaryIndex, 0, effectInstance);
            
            newEffects[parentIndex] = {
                ...parentEffectInstance,
                secondaryEffects: newSecondaryEffects
            };

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('secondary:added', {
                parentIndex,
                secondaryIndex,
                effect: effectInstance,
                total: newEffects[parentIndex].secondaryEffects.length
            }, { source: 'DeleteSecondaryEffectCommand' });

            return { success: true };
        };

        // Get parent and secondary effect for description
        const currentEffects = projectState.getState().effects || [];
        const parentEffect = currentEffects[parentIndex];
        const secondaryEffect = parentEffect?.secondaryEffects?.[secondaryIndex];
        const description = CommandDescriptionHelper.describeDelete(
            secondaryEffect,
            secondaryIndex,
            parentEffect
        );

        super('effect.secondary.delete', executeAction, undoAction, description);
        this.parentIndex = parentIndex;
        this.secondaryIndex = secondaryIndex;
        this.isEffectCommand = true;
    }
}

/**
 * Command to reorder secondary effects within a parent effect
 */
export class ReorderSecondaryEffectsCommand extends Command {
    constructor(projectState, parentIndex, sourceIndex, destinationIndex) {
        const executeAction = () => {
            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect || !parentEffect.secondaryEffects || parentEffect.secondaryEffects.length === 0) {
                throw new Error(`Cannot reorder secondary effects - parent effect at index ${parentIndex} not found or has no secondary effects`);
            }

            console.log('🔄 ReorderSecondaryEffectsCommand: Reordering secondary effects');
            console.log('🔄 ReorderSecondaryEffectsCommand: Parent index:', parentIndex);
            console.log('🔄 ReorderSecondaryEffectsCommand: Source index:', sourceIndex, 'Destination index:', destinationIndex);

            projectState.reorderSecondaryEffects(parentIndex, sourceIndex, destinationIndex);

            // Emit event for UI updates
            EventBusService.emit('secondary:reordered', {
                parentIndex,
                sourceIndex,
                destinationIndex,
                total: parentEffect.secondaryEffects.length
            }, { source: 'ReorderSecondaryEffectsCommand' });

            return { success: true, parentIndex, sourceIndex, destinationIndex };
        };

        const undoAction = () => {
            console.log('↩️ ReorderSecondaryEffectsCommand: Undoing secondary effects reorder');

            // To undo, we swap the destination back to source
            projectState.reorderSecondaryEffects(parentIndex, destinationIndex, sourceIndex);

            // Emit event for UI updates
            EventBusService.emit('secondary:reordered', {
                parentIndex,
                sourceIndex: destinationIndex,
                destinationIndex: sourceIndex,
                total: projectState.getState().effects[parentIndex].secondaryEffects.length
            }, { source: 'ReorderSecondaryEffectsCommand' });

            return { success: true };
        };

        const currentEffects = projectState.getState().effects || [];
        const parentEffect = currentEffects[parentIndex];
        const secondaryEffect = parentEffect?.secondaryEffects?.[sourceIndex];
        const parentName = CommandDescriptionHelper.getEffectName(parentEffect);
        const effectName = CommandDescriptionHelper.getEffectName(secondaryEffect);
        const description = sourceIndex < destinationIndex
            ? `Moved ${effectName} down in ${parentName}`
            : `Moved ${effectName} up in ${parentName}`;

        super('effect.secondary.reorder', executeAction, undoAction, description);
        this.parentIndex = parentIndex;
        this.sourceIndex = sourceIndex;
        this.destinationIndex = destinationIndex;
        this.isEffectCommand = true;
    }
}

/**
 * Command to update a secondary effect
 */
export class UpdateSecondaryEffectCommand extends Command {
    constructor(projectState, parentIndex, secondaryIndex, updates) {
        let previousState = null;

        const executeAction = () => {
            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect || !parentEffect.secondaryEffects || parentEffect.secondaryEffects.length === 0) {
                throw new Error(`Cannot update secondary effect - parent effect at index ${parentIndex} not found or has no secondary effects`);
            }

            if (secondaryIndex < 0 || secondaryIndex >= parentEffect.secondaryEffects.length) {
                throw new Error(`Invalid secondary effect index: ${secondaryIndex}. Valid range: 0 to ${parentEffect.secondaryEffects.length - 1}`);
            }

            console.log('✏️ UpdateSecondaryEffectCommand: Updating secondary effect');
            console.log('✏️ UpdateSecondaryEffectCommand: Parent index:', parentIndex, 'Secondary index:', secondaryIndex);
            console.log('✏️ UpdateSecondaryEffectCommand: Updates:', updates);

            const secondaryEffect = parentEffect.secondaryEffects[secondaryIndex];
            
            // 🔒 CRITICAL: Deep clone to prevent reference sharing bugs
            const effectToClone = secondaryEffect;
            previousState = effectToClone instanceof Effect 
                ? Effect.fromPOJO(JSON.parse(JSON.stringify(effectToClone.toPOJO())))
                : Effect.fromPOJO(JSON.parse(JSON.stringify(effectToClone)));

            // Create updated secondary effect
            const updatedSecondaryEffect = {
                ...secondaryEffect,
                ...updates
            };

            // Create new effects array with updated secondary effect
            const newEffects = [...currentEffects];
            const newSecondaryEffects = [...parentEffect.secondaryEffects];
            newSecondaryEffects[secondaryIndex] = updatedSecondaryEffect;
            
            newEffects[parentIndex] = {
                ...parentEffect,
                secondaryEffects: newSecondaryEffects
            };

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('secondary:updated', {
                parentIndex,
                secondaryIndex,
                updates,
                effect: updatedSecondaryEffect
            }, { source: 'UpdateSecondaryEffectCommand' });

            return { success: true, parentIndex, secondaryIndex, updates };
        };

        const undoAction = () => {
            if (!previousState) {
                throw new Error('No previous state to restore');
            }

            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect) {
                throw new Error(`Cannot restore secondary effect - parent effect at index ${parentIndex} not found`);
            }

            console.log('↩️ UpdateSecondaryEffectCommand: Restoring previous state');

            // Create new effects array with restored secondary effect
            const newEffects = [...currentEffects];
            const newSecondaryEffects = [...parentEffect.secondaryEffects];
            newSecondaryEffects[secondaryIndex] = previousState;
            
            newEffects[parentIndex] = {
                ...parentEffect,
                secondaryEffects: newSecondaryEffects
            };

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('secondary:updated', {
                parentIndex,
                secondaryIndex,
                updates: previousState,
                effect: previousState
            }, { source: 'UpdateSecondaryEffectCommand' });

            return { success: true };
        };

        const currentEffects = projectState.getState().effects || [];
        const parentEffect = currentEffects[parentIndex];
        const secondaryEffect = parentEffect?.secondaryEffects?.[secondaryIndex];
        const effectName = CommandDescriptionHelper.getEffectName(secondaryEffect);
        const updateKeys = Object.keys(updates).join(', ');
        const description = `Updated ${effectName} (${updateKeys})`;

        super('effect.secondary.update', executeAction, undoAction, description);
        this.parentIndex = parentIndex;
        this.secondaryIndex = secondaryIndex;
        this.updates = updates;
        this.isEffectCommand = true;
    }
}

// Export singleton instance
const secondaryEffectCommandService = new SecondaryEffectCommandService();
export default secondaryEffectCommandService;