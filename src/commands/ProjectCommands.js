/**
 * Project Commands - Single Source of Truth for Project Actions
 * Implements Command Pattern for all project-related user actions
 */

import { Command } from '../services/CommandService.js';
import EventBusService from '../services/EventBusService.js';


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

        super(`Add Effect: ${effectName}`, executeAction, undoAction);
        this.effectData = effectData;
        this.effectName = effectName;
        this.effectType = effectType;
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

        super(`Delete Effect #${effectIndex}`, executeAction, undoAction);
        this.effectIndex = effectIndex;
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

        super(`Change Resolution: ${oldResolution} → ${newResolution}`, executeAction, undoAction);
        this.newResolution = newResolution;
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

        super('Toggle Orientation', executeAction, undoAction);
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

        super(`Change Frames: ${oldFrameCount} → ${newFrameCount}`, executeAction, undoAction);
        this.newFrameCount = newFrameCount;
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

        super(`Reorder Secondary Effects`, executeAction, undoAction);
        this.parentIndex = parentIndex;
        this.sourceIndex = sourceIndex;
        this.destinationIndex = destinationIndex;
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

        super(`Reorder Keyframe Effects`, executeAction, undoAction);
        this.parentIndex = parentIndex;
        this.sourceIndex = sourceIndex;
        this.destinationIndex = destinationIndex;
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

        super(`Delete Secondary Effect #${secondaryIndex}`, executeAction, undoAction);
        this.parentIndex = parentIndex;
        this.secondaryIndex = secondaryIndex;
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

        super(`Delete Keyframe Effect #${keyframeIndex}`, executeAction, undoAction);
        this.parentIndex = parentIndex;
        this.keyframeIndex = keyframeIndex;
    }
}