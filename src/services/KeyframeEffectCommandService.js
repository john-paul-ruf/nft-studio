/**
 * Keyframe Effect Command Service
 * Handles keyframe effect commands (Add, Delete, Reorder)
 * Extracted from ProjectCommands.js as part of God Object Destruction Plan - Phase 6, Step 6.3
 */

import { Command } from './CommandService.js';
import EventBusService from './EventBusService.js';
import CommandDescriptionHelper from '../utils/CommandDescriptionHelper.js';

/**
 * Service for creating and managing keyframe effect commands
 */
class KeyframeEffectCommandService {
    constructor() {
        console.log('🎨 KeyframeEffectCommandService: Initialized - Keyframe effect command management');
    }

    /**
     * Create command to add a keyframe effect to a parent effect
     * @param {Object} projectState - Project state instance
     * @param {number} parentIndex - Index of parent effect
     * @param {Object} keyframeEffect - Keyframe effect data
     * @param {string} keyframeEffectName - Name of keyframe effect
     * @param {number} frame - Frame number
     * @returns {Command} AddKeyframeEffectCommand instance
     */
    createAddCommand(projectState, parentIndex, keyframeEffect, keyframeEffectName, frame) {
        return new AddKeyframeEffectCommand(projectState, parentIndex, keyframeEffect, keyframeEffectName, frame);
    }

    /**
     * Create command to delete a keyframe effect from a parent effect
     * @param {Object} projectState - Project state instance
     * @param {number} parentIndex - Index of parent effect
     * @param {number} keyframeIndex - Index of keyframe effect to delete
     * @returns {Command} DeleteKeyframeEffectCommand instance
     */
    createDeleteCommand(projectState, parentIndex, keyframeIndex) {
        return new DeleteKeyframeEffectCommand(projectState, parentIndex, keyframeIndex);
    }

    /**
     * Create command to reorder keyframe effects within a parent effect
     * @param {Object} projectState - Project state instance
     * @param {number} parentIndex - Index of parent effect
     * @param {number} sourceIndex - Source index
     * @param {number} destinationIndex - Destination index
     * @returns {Command} ReorderKeyframeEffectsCommand instance
     */
    createReorderCommand(projectState, parentIndex, sourceIndex, destinationIndex) {
        return new ReorderKeyframeEffectsCommand(projectState, parentIndex, sourceIndex, destinationIndex);
    }
}

/**
 * Command to add a keyframe effect to a parent effect
 */
export class AddKeyframeEffectCommand extends Command {
    constructor(projectState, parentIndex, keyframeEffect, keyframeEffectName, frame) {
        const executeAction = () => {
            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect) {
                throw new Error(`Cannot add keyframe effect - parent effect at index ${parentIndex} not found`);
            }

            console.log('➕ AddKeyframeEffectCommand: Adding keyframe effect to parent at index:', parentIndex);

            const currentKeyframeEffects = parentEffect.attachedEffects?.keyFrame || [];
            const updatedParentEffect = {
                ...parentEffect,
                attachedEffects: {
                    ...parentEffect.attachedEffects,
                    keyFrame: [...currentKeyframeEffects, keyframeEffect]
                }
            };

            const newEffects = [...currentEffects];
            newEffects[parentIndex] = updatedParentEffect;
            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('keyframe:added', {
                parentIndex,
                effect: keyframeEffect,
                frame,
                total: updatedParentEffect.attachedEffects.keyFrame.length
            }, { source: 'AddKeyframeEffectCommand' });

            return { success: true, effect: keyframeEffect };
        };

        const undoAction = () => {
            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect || !parentEffect.attachedEffects?.keyFrame) {
                throw new Error('Cannot undo - parent effect or keyframe effects not found');
            }

            const keyframeEffects = parentEffect.attachedEffects.keyFrame;
            const updatedParentEffect = {
                ...parentEffect,
                attachedEffects: {
                    ...parentEffect.attachedEffects,
                    keyFrame: keyframeEffects.slice(0, -1)
                }
            };

            const newEffects = [...currentEffects];
            newEffects[parentIndex] = updatedParentEffect;
            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('keyframe:removed', {
                parentIndex,
                index: keyframeEffects.length - 1,
                total: updatedParentEffect.attachedEffects.keyFrame.length
            }, { source: 'AddKeyframeEffectCommand' });

            return { success: true };
        };

        const parentEffect = projectState.getState().effects?.[parentIndex];
        const effectName = CommandDescriptionHelper.getEffectName(keyframeEffect);
        const parentName = CommandDescriptionHelper.getEffectName(parentEffect);
        const description = `Added ${effectName} keyframe at frame ${frame} to ${parentName}`;

        super('keyframe.add', executeAction, undoAction, description);
        this.parentIndex = parentIndex;
        this.frame = frame;
        this.isEffectCommand = true;
    }
}

/**
 * Command to delete a keyframe effect from a parent effect
 */
export class DeleteKeyframeEffectCommand extends Command {
    constructor(projectState, parentIndex, keyframeIndex) {
        let deletedKeyframeEffect = null;

        const executeAction = () => {
            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect) {
                throw new Error(`Cannot delete keyframe effect - parent effect at index ${parentIndex} not found`);
            }

            // Use single source of truth for keyframe effects
            const keyframeEffects = parentEffect.attachedEffects?.keyFrame || [];

            if (keyframeEffects.length === 0) {
                throw new Error(`Cannot delete keyframe effect - parent effect at index ${parentIndex} has no keyframe effects`);
            }

            if (keyframeIndex < 0 || keyframeIndex >= keyframeEffects.length) {
                throw new Error(`Invalid keyframe effect index: ${keyframeIndex}. Valid range: 0 to ${keyframeEffects.length - 1}`);
            }

            console.log('🗑️ DeleteKeyframeEffectCommand: Deleting keyframe effect');
            console.log('🗑️ DeleteKeyframeEffectCommand: Parent index:', parentIndex, 'Keyframe index:', keyframeIndex);

            deletedKeyframeEffect = keyframeEffects[keyframeIndex];
            
            // Create new effects array with updated parent effect using single source of truth
            const newEffects = [...currentEffects];
            const updatedKeyframeEffects = keyframeEffects.filter((_, index) => index !== keyframeIndex);
            newEffects[parentIndex] = {
                ...parentEffect,
                attachedEffects: {
                    ...parentEffect.attachedEffects,
                    keyFrame: updatedKeyframeEffects
                }
            };

            projectState.update({ effects: newEffects });

            // Get updated count for event
            const updatedKeyframeEffectsCount = newEffects[parentIndex].attachedEffects?.keyFrame?.length || 0;

            // Emit event for UI updates
            EventBusService.emit('keyframe:removed', {
                parentIndex,
                keyframeIndex,
                deletedEffect: deletedKeyframeEffect,
                total: updatedKeyframeEffectsCount
            }, { source: 'DeleteKeyframeEffectCommand' });

            return { success: true, deletedKeyframeEffect, parentIndex, keyframeIndex };
        };

        const undoAction = () => {
            if (!deletedKeyframeEffect) {
                throw new Error('No keyframe effect to restore');
            }

            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect) {
                throw new Error(`Cannot restore keyframe effect - parent effect at index ${parentIndex} not found`);
            }

            console.log('↩️ DeleteKeyframeEffectCommand: Restoring keyframe effect');

            // Restore using single source of truth format
            const currentKeyframeEffects = parentEffect.attachedEffects?.keyFrame || [];
            const newKeyframeEffects = [...currentKeyframeEffects];
            newKeyframeEffects.splice(keyframeIndex, 0, deletedKeyframeEffect);

            const newEffects = [...currentEffects];
            newEffects[parentIndex] = {
                ...parentEffect,
                attachedEffects: {
                    ...parentEffect.attachedEffects,
                    keyFrame: newKeyframeEffects
                }
            };

            projectState.update({ effects: newEffects });

            // Get updated count for event
            const updatedKeyframeEffectsCount = newEffects[parentIndex].attachedEffects?.keyFrame?.length || 0;

            // Emit event for UI updates
            EventBusService.emit('keyframe:added', {
                parentIndex,
                keyframeIndex,
                effect: deletedKeyframeEffect,
                total: updatedKeyframeEffectsCount
            }, { source: 'DeleteKeyframeEffectCommand' });

            return { success: true };
        };

        // Get parent and keyframe effect for description
        const currentEffects = projectState.getState().effects || [];
        const parentEffect = currentEffects[parentIndex];
        const keyframeEffect = parentEffect?.attachedEffects?.keyFrame?.[keyframeIndex];
        const description = CommandDescriptionHelper.describeDelete(
            keyframeEffect,
            keyframeIndex,
            parentEffect
        );

        super('keyframe.delete', executeAction, undoAction, description);
        this.parentIndex = parentIndex;
        this.keyframeIndex = keyframeIndex;
        this.isEffectCommand = true;
    }
}

/**
 * Command to reorder keyframe effects within a parent effect
 */
export class ReorderKeyframeEffectsCommand extends Command {
    constructor(projectState, parentIndex, sourceIndex, destinationIndex) {
        const executeAction = () => {
            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect) {
                throw new Error(`Cannot reorder keyframe effects - parent effect at index ${parentIndex} not found`);
            }

            // Use single source of truth for keyframe effects
            const keyframeEffects = parentEffect.attachedEffects?.keyFrame || [];
            
            if (keyframeEffects.length === 0) {
                throw new Error(`Cannot reorder keyframe effects - parent effect at index ${parentIndex} has no keyframe effects`);
            }

            console.log('🔄 ReorderKeyframeEffectsCommand: Reordering keyframe effects');
            console.log('🔄 ReorderKeyframeEffectsCommand: Parent index:', parentIndex);
            console.log('🔄 ReorderKeyframeEffectsCommand: Source index:', sourceIndex, 'Destination index:', destinationIndex);

            projectState.reorderKeyframeEffects(parentIndex, sourceIndex, destinationIndex);

            // Emit event for UI updates
            EventBusService.emit('keyframe:reordered', {
                parentIndex,
                sourceIndex,
                destinationIndex,
                total: keyframeEffects.length
            }, { source: 'ReorderKeyframeEffectsCommand' });

            return { success: true, parentIndex, sourceIndex, destinationIndex };
        };

        const undoAction = () => {
            console.log('↩️ ReorderKeyframeEffectsCommand: Undoing keyframe effects reorder');

            // To undo, we swap the destination back to source
            projectState.reorderKeyframeEffects(parentIndex, destinationIndex, sourceIndex);

            // Get updated keyframe effects count for event
            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];
            const keyframeEffects = parentEffect?.attachedEffects?.keyFrame || [];

            // Emit event for UI updates
            EventBusService.emit('keyframe:reordered', {
                parentIndex,
                sourceIndex: destinationIndex,
                destinationIndex: sourceIndex,
                total: keyframeEffects.length
            }, { source: 'ReorderKeyframeEffectsCommand' });

            return { success: true };
        };

        const currentEffects = projectState.getState().effects || [];
        const parentEffect = currentEffects[parentIndex];
        const keyframeEffect = parentEffect?.attachedEffects?.keyFrame?.[sourceIndex];
        const parentName = CommandDescriptionHelper.getEffectName(parentEffect);
        const description = `Reordered keyframes in ${parentName}`;

        super('keyframe.reorder', executeAction, undoAction, description);
        this.parentIndex = parentIndex;
        this.sourceIndex = sourceIndex;
        this.destinationIndex = destinationIndex;
        this.isEffectCommand = true;
    }
}

// Export singleton instance
const keyframeEffectCommandService = new KeyframeEffectCommandService();
export default keyframeEffectCommandService;