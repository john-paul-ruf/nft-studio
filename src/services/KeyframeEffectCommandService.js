/**
 * Keyframe Effect Command Service
 * Handles keyframe effect commands (Add, Delete, Reorder)
 * Extracted from ProjectCommands.js as part of God Object Destruction Plan - Phase 6, Step 6.3
 * 
 * UPDATED: Phase 3 - POJO Evolution to Classes
 * - Commands now work with Effect class instances
 * - Backward compatible with POJOs via Effect.fromPOJO()
 * - Uses new keyframeEffects property (backward compatible with attachedEffects.keyFrame)
 */

import { Command } from './CommandService.js';
import EventBusService from './EventBusService.js';
import CommandDescriptionHelper from '../utils/CommandDescriptionHelper.js';
import { Effect } from '../models/Effect.js';

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

    /**
     * Create command to update a keyframe effect
     * @param {Object} projectState - Project state instance
     * @param {number} parentIndex - Index of parent effect
     * @param {number} keyframeIndex - Index of keyframe effect to update
     * @param {Object} updates - Properties to update
     * @returns {Command} UpdateKeyframeEffectCommand instance
     */
    createUpdateCommand(projectState, parentIndex, keyframeIndex, updates) {
        return new UpdateKeyframeEffectCommand(projectState, parentIndex, keyframeIndex, updates);
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

            // Ensure keyframeEffect is an Effect instance (backward compatibility)
            // Keyframe effects should have type 'keyframe'
            // IMPORTANT: Preserve the frame parameter on the effect instance
            const effectInstance = keyframeEffect instanceof Effect 
                ? { ...keyframeEffect, frame }
                : Effect.fromPOJO({ ...keyframeEffect, type: keyframeEffect.type || 'keyframe', frame });

            // Ensure parent effect is an Effect instance
            const parentEffectInstance = parentEffect instanceof Effect 
                ? parentEffect 
                : Effect.fromPOJO(parentEffect);

            // Use new keyframeEffects property (backward compatible with attachedEffects.keyFrame)
            const currentKeyframeEffects = parentEffectInstance.keyframeEffects || 
                                          parentEffectInstance.attachedEffects?.keyFrame || [];
            
            const updatedParentEffect = {
                ...parentEffectInstance,
                keyframeEffects: [...currentKeyframeEffects, effectInstance]
            };

            const newEffects = [...currentEffects];
            newEffects[parentIndex] = updatedParentEffect;
            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('keyframe:added', {
                parentIndex,
                effect: effectInstance,
                frame,
                total: updatedParentEffect.keyframeEffects.length
            }, { source: 'AddKeyframeEffectCommand' });

            return { success: true, effect: effectInstance };
        };

        const undoAction = () => {
            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            // Ensure parent effect is an Effect instance
            const parentEffectInstance = parentEffect instanceof Effect 
                ? parentEffect 
                : Effect.fromPOJO(parentEffect);

            // Use new keyframeEffects property (backward compatible with attachedEffects.keyFrame)
            const keyframeEffects = parentEffectInstance.keyframeEffects || 
                                   parentEffectInstance.attachedEffects?.keyFrame || [];

            if (!parentEffect || keyframeEffects.length === 0) {
                throw new Error('Cannot undo - parent effect or keyframe effects not found');
            }

            const updatedParentEffect = {
                ...parentEffectInstance,
                keyframeEffects: keyframeEffects.slice(0, -1)
            };

            const newEffects = [...currentEffects];
            newEffects[parentIndex] = updatedParentEffect;
            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('keyframe:removed', {
                parentIndex,
                index: keyframeEffects.length - 1,
                total: updatedParentEffect.keyframeEffects.length
            }, { source: 'AddKeyframeEffectCommand' });

            return { success: true };
        };

        const parentEffect = projectState.getState().effects?.[parentIndex];
        const effectName = CommandDescriptionHelper.getEffectName(keyframeEffect);
        const parentName = CommandDescriptionHelper.getEffectName(parentEffect);
        const description = `Added ${effectName} keyframe at frame ${frame} to ${parentName}`;

        super('effect.keyframe.add', executeAction, undoAction, description);
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

            // Ensure parent effect is an Effect instance
            const parentEffectInstance = parentEffect instanceof Effect 
                ? parentEffect 
                : Effect.fromPOJO(parentEffect);

            // Use new keyframeEffects property (backward compatible with attachedEffects.keyFrame)
            const keyframeEffects = parentEffectInstance.keyframeEffects || 
                                   parentEffectInstance.attachedEffects?.keyFrame || [];

            if (keyframeEffects.length === 0) {
                throw new Error(`Cannot delete keyframe effect - parent effect at index ${parentIndex} has no keyframe effects`);
            }

            if (keyframeIndex < 0 || keyframeIndex >= keyframeEffects.length) {
                throw new Error(`Invalid keyframe effect index: ${keyframeIndex}. Valid range: 0 to ${keyframeEffects.length - 1}`);
            }

            console.log('🗑️ DeleteKeyframeEffectCommand: Deleting keyframe effect');
            console.log('🗑️ DeleteKeyframeEffectCommand: Parent index:', parentIndex, 'Keyframe index:', keyframeIndex);

            // 🔒 CRITICAL: Deep clone to prevent reference sharing bugs
            const effectToClone = keyframeEffects[keyframeIndex];
            deletedKeyframeEffect = effectToClone instanceof Effect 
                ? Effect.fromPOJO(JSON.parse(JSON.stringify(effectToClone.toPOJO())))
                : Effect.fromPOJO(JSON.parse(JSON.stringify(effectToClone)));
            
            // Create new effects array with updated parent effect
            const newEffects = [...currentEffects];
            const updatedKeyframeEffects = keyframeEffects.filter((_, index) => index !== keyframeIndex);
            newEffects[parentIndex] = {
                ...parentEffectInstance,
                keyframeEffects: updatedKeyframeEffects
            };

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('keyframe:removed', {
                parentIndex,
                keyframeIndex,
                deletedEffect: deletedKeyframeEffect,
                total: updatedKeyframeEffects.length
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

            // Ensure deletedKeyframeEffect is an Effect instance (backward compatibility)
            const effectInstance = deletedKeyframeEffect instanceof Effect 
                ? deletedKeyframeEffect 
                : Effect.fromPOJO(deletedKeyframeEffect);

            // Ensure parent effect is an Effect instance
            const parentEffectInstance = parentEffect instanceof Effect 
                ? parentEffect 
                : Effect.fromPOJO(parentEffect);

            // Use new keyframeEffects property (backward compatible with attachedEffects.keyFrame)
            const currentKeyframeEffects = parentEffectInstance.keyframeEffects || 
                                          parentEffectInstance.attachedEffects?.keyFrame || [];
            const newKeyframeEffects = [...currentKeyframeEffects];
            newKeyframeEffects.splice(keyframeIndex, 0, effectInstance);

            const newEffects = [...currentEffects];
            newEffects[parentIndex] = {
                ...parentEffectInstance,
                keyframeEffects: newKeyframeEffects
            };

            projectState.update({ effects: newEffects });

            // Get updated count for event
            const updatedKeyframeEffectsCount = newEffects[parentIndex].keyframeEffects?.length || 0;

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
        const keyframeEffect = parentEffect?.keyframeEffects?.[keyframeIndex];
        const description = CommandDescriptionHelper.describeDelete(
            keyframeEffect,
            keyframeIndex,
            parentEffect
        );

        super('effect.keyframe.delete', executeAction, undoAction, description);
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

            // Ensure parent effect is an Effect instance
            const parentEffectInstance = parentEffect instanceof Effect 
                ? parentEffect 
                : Effect.fromPOJO(parentEffect);

            // Use new keyframeEffects property (backward compatible with attachedEffects.keyFrame)
            const keyframeEffects = parentEffectInstance.keyframeEffects || 
                                   parentEffectInstance.attachedEffects?.keyFrame || [];
            
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
            
            // Ensure parent effect is an Effect instance
            const parentEffectInstance = parentEffect instanceof Effect 
                ? parentEffect 
                : Effect.fromPOJO(parentEffect);
            
            const keyframeEffects = parentEffectInstance.keyframeEffects || 
                                   parentEffectInstance.attachedEffects?.keyFrame || [];

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
        
        // Ensure parent effect is an Effect instance
        const parentEffectInstance = parentEffect instanceof Effect 
            ? parentEffect 
            : Effect.fromPOJO(parentEffect);
        
        const keyframeEffects = parentEffectInstance.keyframeEffects || 
                               parentEffectInstance.attachedEffects?.keyFrame || [];
        const keyframeEffect = keyframeEffects[sourceIndex];
        const parentName = CommandDescriptionHelper.getEffectName(parentEffectInstance);
        const description = `Reordered keyframes in ${parentName}`;

        super('effect.keyframe.reorder', executeAction, undoAction, description);
        this.parentIndex = parentIndex;
        this.sourceIndex = sourceIndex;
        this.destinationIndex = destinationIndex;
        this.isEffectCommand = true;
    }
}

/**
 * Command to update a keyframe effect
 */
export class UpdateKeyframeEffectCommand extends Command {
    constructor(projectState, parentIndex, keyframeIndex, updates) {
        let previousState = null;

        const executeAction = () => {
            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect) {
                throw new Error(`Cannot update keyframe effect - parent effect at index ${parentIndex} not found`);
            }

            // Ensure parent effect is an Effect instance
            const parentEffectInstance = parentEffect instanceof Effect 
                ? parentEffect 
                : Effect.fromPOJO(parentEffect);

            // Use new keyframeEffects property (backward compatible with attachedEffects.keyFrame)
            const keyframeEffects = parentEffectInstance.keyframeEffects || 
                                   parentEffectInstance.attachedEffects?.keyFrame || [];

            if (keyframeEffects.length === 0) {
                throw new Error(`Cannot update keyframe effect - parent effect at index ${parentIndex} has no keyframe effects`);
            }

            if (keyframeIndex < 0 || keyframeIndex >= keyframeEffects.length) {
                throw new Error(`Invalid keyframe effect index: ${keyframeIndex}. Valid range: 0 to ${keyframeEffects.length - 1}`);
            }

            console.log('✏️ UpdateKeyframeEffectCommand: Updating keyframe effect');
            console.log('✏️ UpdateKeyframeEffectCommand: Parent index:', parentIndex, 'Keyframe index:', keyframeIndex);
            console.log('✏️ UpdateKeyframeEffectCommand: Updates:', updates);

            const keyframeEffect = keyframeEffects[keyframeIndex];
            
            // 🔒 CRITICAL: Deep clone to prevent reference sharing bugs
            const effectToClone = keyframeEffect;
            previousState = effectToClone instanceof Effect 
                ? Effect.fromPOJO(JSON.parse(JSON.stringify(effectToClone.toPOJO())))
                : Effect.fromPOJO(JSON.parse(JSON.stringify(effectToClone)));

            // Create updated keyframe effect
            const updatedKeyframeEffect = {
                ...keyframeEffect,
                ...updates
            };

            // Create new effects array with updated keyframe effect
            const newEffects = [...currentEffects];
            const newKeyframeEffects = [...keyframeEffects];
            newKeyframeEffects[keyframeIndex] = updatedKeyframeEffect;
            
            newEffects[parentIndex] = {
                ...parentEffectInstance,
                keyframeEffects: newKeyframeEffects
            };

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('keyframe:updated', {
                parentIndex,
                keyframeIndex,
                updates,
                effect: updatedKeyframeEffect
            }, { source: 'UpdateKeyframeEffectCommand' });

            return { success: true, parentIndex, keyframeIndex, updates };
        };

        const undoAction = () => {
            if (!previousState) {
                throw new Error('No previous state to restore');
            }

            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect) {
                throw new Error(`Cannot restore keyframe effect - parent effect at index ${parentIndex} not found`);
            }

            console.log('↩️ UpdateKeyframeEffectCommand: Restoring previous state');

            // Ensure parent effect is an Effect instance
            const parentEffectInstance = parentEffect instanceof Effect 
                ? parentEffect 
                : Effect.fromPOJO(parentEffect);

            // Use new keyframeEffects property (backward compatible with attachedEffects.keyFrame)
            const keyframeEffects = parentEffectInstance.keyframeEffects || 
                                   parentEffectInstance.attachedEffects?.keyFrame || [];

            // Create new effects array with restored keyframe effect
            const newEffects = [...currentEffects];
            const newKeyframeEffects = [...keyframeEffects];
            newKeyframeEffects[keyframeIndex] = previousState;
            
            newEffects[parentIndex] = {
                ...parentEffectInstance,
                keyframeEffects: newKeyframeEffects
            };

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('keyframe:updated', {
                parentIndex,
                keyframeIndex,
                updates: previousState,
                effect: previousState
            }, { source: 'UpdateKeyframeEffectCommand' });

            return { success: true };
        };

        const currentEffects = projectState.getState().effects || [];
        const parentEffect = currentEffects[parentIndex];
        
        // Ensure parent effect is an Effect instance
        const parentEffectInstance = parentEffect instanceof Effect 
            ? parentEffect 
            : Effect.fromPOJO(parentEffect);
        
        const keyframeEffects = parentEffectInstance?.keyframeEffects || 
                               parentEffectInstance?.attachedEffects?.keyFrame || [];
        const keyframeEffect = keyframeEffects[keyframeIndex];
        const effectName = CommandDescriptionHelper.getEffectName(keyframeEffect);
        const updateKeys = Object.keys(updates).join(', ');
        const description = `Updated ${effectName} keyframe (${updateKeys})`;

        super('effect.keyframe.update', executeAction, undoAction, description);
        this.parentIndex = parentIndex;
        this.keyframeIndex = keyframeIndex;
        this.updates = updates;
        this.isEffectCommand = true;
    }
}

// Export singleton instance
const keyframeEffectCommandService = new KeyframeEffectCommandService();
export default keyframeEffectCommandService;