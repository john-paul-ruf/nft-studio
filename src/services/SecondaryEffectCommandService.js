/**
 * Secondary Effect Command Service
 * Handles secondary effect commands (Add, Delete, Reorder)
 * Extracted from ProjectCommands.js as part of God Object Destruction Plan - Phase 6, Step 6.3
 */

import { Command } from './CommandService.js';
import EventBusService from './EventBusService.js';
import CommandDescriptionHelper from '../utils/CommandDescriptionHelper.js';

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

            const updatedParentEffect = {
                ...parentEffect,
                secondaryEffects: [
                    ...(parentEffect.secondaryEffects || []),
                    secondaryEffect
                ]
            };

            const newEffects = [...currentEffects];
            newEffects[parentIndex] = updatedParentEffect;
            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('secondary:added', {
                parentIndex,
                effect: secondaryEffect,
                total: updatedParentEffect.secondaryEffects.length
            }, { source: 'AddSecondaryEffectCommand' });

            return { success: true, effect: secondaryEffect };
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

        super('secondary.add', executeAction, undoAction, description);
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

            deletedSecondaryEffect = parentEffect.secondaryEffects[secondaryIndex];
            
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

            // Create new effects array with restored secondary effect
            const newEffects = [...currentEffects];
            const newSecondaryEffects = [...(parentEffect.secondaryEffects || [])];
            newSecondaryEffects.splice(secondaryIndex, 0, deletedSecondaryEffect);
            
            newEffects[parentIndex] = {
                ...parentEffect,
                secondaryEffects: newSecondaryEffects
            };

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('secondary:added', {
                parentIndex,
                secondaryIndex,
                effect: deletedSecondaryEffect,
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

        super('secondary.delete', executeAction, undoAction, description);
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

        super('secondary.reorder', executeAction, undoAction, description);
        this.parentIndex = parentIndex;
        this.sourceIndex = sourceIndex;
        this.destinationIndex = destinationIndex;
        this.isEffectCommand = true;
    }
}

// Export singleton instance
const secondaryEffectCommandService = new SecondaryEffectCommandService();
export default secondaryEffectCommandService;