/**
 * Project Commands - Single Source of Truth for Project Actions
 * Implements Command Pattern for all project-related user actions
 */

import { Command } from '../services/CommandService.js';
import EventBusService from '../services/EventBusService.js';
import CommandDescriptionHelper from '../utils/CommandDescriptionHelper.js';

// Mark effect-related commands
const EFFECT_COMMAND_TYPES = [
    'effect.add',
    'effect.delete',
    'effect.update',
    'effect.reorder',
    'effect.toggle-visibility',
    'secondary.add',
    'secondary.delete',
    'secondary.reorder',
    'keyframe.add',
    'keyframe.delete',
    'keyframe.reorder'
];


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
            const newEffects = [...currentEffects];
            newEffects[effectIndex] = updatedEffect;

            console.log('✏️ UpdateEffectCommand: Updating effect at index:', effectIndex);
            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('effect:updated', {
                effect: updatedEffect,
                previousEffect,
                index: effectIndex
            }, { source: 'UpdateEffectCommand' });

            return { success: true, effect: updatedEffect, index: effectIndex };
        };

        const undoAction = () => {
            if (!previousEffect) {
                throw new Error('No previous effect state to restore');
            }

            const currentEffects = projectState.getState().effects || [];
            const newEffects = [...currentEffects];
            newEffects[effectIndex] = previousEffect;

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('effect:updated', {
                effect: previousEffect,
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

            const newEffects = [...currentEffects, effectData];
            console.log('➕ AddEffectCommand: New effects array will have length:', newEffects.length);

            projectState.update({ effects: newEffects });

            // Verify the update actually happened
            const verifyEffects = projectState.getState().effects || [];
            console.log('✅ AddEffectCommand: Effects after update:', verifyEffects.length, verifyEffects.map(e => e.name || e.className));

            // Emit event for UI updates
            EventBusService.emit('effect:added', {
                effect: effectData,
                index: newEffects.length - 1,
                total: newEffects.length
            }, { source: 'AddEffectCommand' });

            return { success: true, effect: effectData, index: newEffects.length - 1 };
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

            const currentEffects = projectState.getState().effects || [];
            const newEffects = [...currentEffects];
            newEffects.splice(effectIndex, 0, deletedEffect);

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('effect:added', {
                effect: deletedEffect,
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
 * Command to change project resolution
 */
export class ChangeResolutionCommand extends Command {
    constructor(projectState, newResolution) {
        let oldResolution = null;

        const executeAction = () => {
            const currentState = projectState.getState();
            oldResolution = currentState.targetResolution || currentState.resolution;

            // Use ProjectState method to trigger auto-scaling
            projectState.setTargetResolution(newResolution);

            // Emit event for UI updates
            EventBusService.emit('resolution:changed', {
                oldResolution,
                newResolution,
                projectData: projectState.getState()
            }, { source: 'ChangeResolutionCommand' });

            return { success: true, oldResolution, newResolution };
        };

        const undoAction = () => {
            if (oldResolution === null) {
                throw new Error('No previous resolution to restore');
            }

            // Use ProjectState method to trigger auto-scaling
            projectState.setTargetResolution(oldResolution);

            // Emit event for UI updates
            EventBusService.emit('resolution:changed', {
                oldResolution: newResolution,
                newResolution: oldResolution,
                projectData: projectState.getState()
            }, { source: 'ChangeResolutionCommand' });

            return { success: true };
        };

        const description = `Changed resolution to ${newResolution}`;
        super('project.resolution', executeAction, undoAction, description);
        this.newResolution = newResolution;
        this.isEffectCommand = false; // Not an effect command
    }
}

/**
 * Command to toggle orientation
 */
export class ToggleOrientationCommand extends Command {
    constructor(projectState) {
        const executeAction = () => {
            const currentState = projectState.getState();
            const newOrientation = !currentState.isHorizontal;

            // Use ProjectState method to trigger auto-scaling
            projectState.setIsHorizontal(newOrientation);

            // Emit event for UI updates
            EventBusService.emit('orientation:toggled', {
                isHorizontal: newOrientation,
                projectData: projectState.getState()
            }, { source: 'ToggleOrientationCommand' });

            return { success: true, isHorizontal: newOrientation };
        };

        const undoAction = () => {
            // Toggling is its own undo
            return executeAction();
        };

        const currentState = projectState.getState();
        const description = currentState.isHorizontal ? 'Changed to vertical orientation' : 'Changed to horizontal orientation';
        super('project.orientation', executeAction, undoAction, description);
        this.isEffectCommand = false; // Not an effect command
    }
}

/**
 * Command to change number of frames
 */
export class ChangeFramesCommand extends Command {
    constructor(projectState, newFrameCount) {
        let oldFrameCount = null;

        const executeAction = () => {
            const currentState = projectState.getState();
            oldFrameCount = currentState.numFrames;

            projectState.update({ numFrames: newFrameCount });

            // Emit event for UI updates
            EventBusService.emit('frames:changed', {
                oldFrameCount,
                newFrameCount,
                projectData: projectState.getState()
            }, { source: 'ChangeFramesCommand' });

            return { success: true, oldFrameCount, newFrameCount };
        };

        const undoAction = () => {
            if (oldFrameCount === null) {
                throw new Error('No previous frame count to restore');
            }

            projectState.update({ numFrames: oldFrameCount });

            // Emit event for UI updates
            EventBusService.emit('frames:changed', {
                oldFrameCount: newFrameCount,
                newFrameCount: oldFrameCount,
                projectData: projectState.getState()
            }, { source: 'ChangeFramesCommand' });

            return { success: true };
        };

        const description = `Changed frame count to ${newFrameCount}`;
        super('project.frames', executeAction, undoAction, description);
        this.newFrameCount = newFrameCount;
        this.isEffectCommand = false; // Not an effect command
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