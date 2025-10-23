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
 * 🔒 CRITICAL: Accepts effect ID (not index) to prevent stale reference bugs after reordering
 */
export class UpdateEffectCommand extends Command {
    constructor(projectState, effectIdOrIndex, updatedEffect, effectName) {
        let previousEffect = null;
        let resolvedIndex = null; // Store resolved index for undo

        const executeAction = () => {
            const currentEffects = projectState.getState().effects || [];

            // 🔒 CRITICAL: Resolve effect ID to current index at execution time (not construction time)
            // This prevents stale index bugs when effects are reordered between command creation and execution
            let effectIndex;
            
            if (typeof effectIdOrIndex === 'string') {
                // ID-based resolution (preferred, stable across reorders)
                effectIndex = currentEffects.findIndex(e => e.id === effectIdOrIndex);
                if (effectIndex === -1) {
                    throw new Error(`Effect with ID ${effectIdOrIndex} not found (may have been deleted)`);
                }
                console.log('✏️ UpdateEffectCommand: Resolved effect ID to index:', {
                    effectId: effectIdOrIndex,
                    resolvedIndex: effectIndex
                });
            } else {
                // Index-based resolution (legacy, may be stale)
                effectIndex = effectIdOrIndex;
                console.warn('⚠️ UpdateEffectCommand: Using index-based resolution (may be unreliable after reorders)');
            }

            if (effectIndex < 0 || effectIndex >= currentEffects.length) {
                throw new Error(`Invalid effect index: ${effectIndex}`);
            }

            // Store resolved index for undo operation
            resolvedIndex = effectIndex;
            // 🔒 CRITICAL: Deep clone to prevent reference sharing bugs after reorders
            const effectToClone = currentEffects[effectIndex];
            previousEffect = effectToClone instanceof Effect 
                ? Effect.fromPOJO(JSON.parse(JSON.stringify(effectToClone.toPOJO())))
                : Effect.fromPOJO(JSON.parse(JSON.stringify(effectToClone)));

            // Harden update: deep-merge patch into previous effect to avoid lossy updates
            const toPOJO = (e) => (e instanceof Effect ? e.toPOJO() : (e || {}));

            // Small, focused deep merge for plain objects. Arrays replace only when provided.
            const deepMerge = (base, patch) => {
                if (patch === undefined) return base;
                if (base === undefined) return patch;
                if (patch === null) return base; // ignore null patches to avoid wiping required objects
                if (Array.isArray(base) || Array.isArray(patch)) return patch !== undefined ? patch : base;
                if (typeof base !== 'object' || typeof patch !== 'object') return patch;
                const out = { ...base };
                for (const [k, v] of Object.entries(patch)) {
                    if (v === undefined) continue; // don't erase with undefined
                    out[k] = deepMerge(base[k], v);
                }
                return out;
            };

            const prevPOJO = toPOJO(previousEffect);
            const patchPOJO = toPOJO(updatedEffect);

            // Merge root fields conservatively; always preserve id unless explicitly changed (we do not allow id changes)
            const mergedRoot = {
                ...prevPOJO,
                ...patchPOJO,
                id: prevPOJO.id,
                type: patchPOJO.type ?? prevPOJO.type,
                name: patchPOJO.name ?? prevPOJO.name,
                className: patchPOJO.className ?? prevPOJO.className,
                registryKey: patchPOJO.registryKey ?? prevPOJO.registryKey,
                percentChance: patchPOJO.percentChance ?? prevPOJO.percentChance,
                visible: patchPOJO.visible ?? prevPOJO.visible
            };

            // Deep-merge config specifically; ignore null to prevent constructor errors
            mergedRoot.config = deepMerge(prevPOJO.config || {}, patchPOJO.config || {});

            // Preserve nested arrays if patch omits them
            if (!('secondaryEffects' in patchPOJO)) mergedRoot.secondaryEffects = prevPOJO.secondaryEffects || [];
            if (!('keyframeEffects' in patchPOJO)) mergedRoot.keyframeEffects = prevPOJO.keyframeEffects || [];

            const effectInstance = Effect.fromPOJO(mergedRoot);

            const newEffects = [...currentEffects];
            newEffects[effectIndex] = effectInstance;

            console.log('✏️ UpdateEffectCommand: Updating effect at index:', effectIndex);
            console.log('✏️ UpdateEffectCommand: Effect config being saved:', {
                effectId: effectInstance.id,
                effectName: effectInstance.name || effectInstance.className,
                config: effectInstance.config,
                configKeys: Object.keys(effectInstance.config || {})
            });
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

            if (resolvedIndex === null) {
                throw new Error('Cannot undo: effect index was never resolved (command may not have executed)');
            }

            // Ensure previousEffect is an Effect instance (backward compatibility)
            // previousEffect should already have all required properties including type
            const effectInstance = previousEffect instanceof Effect 
                ? previousEffect 
                : Effect.fromPOJO(previousEffect);

            const currentEffects = projectState.getState().effects || [];
            const newEffects = [...currentEffects];
            newEffects[resolvedIndex] = effectInstance;

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('effect:updated', {
                effect: effectInstance,
                previousEffect: updatedEffect,
                index: resolvedIndex
            }, { source: 'UpdateEffectCommand' });

            return { success: true };
        };

        // Generate detailed description based on what changed
        // 🔒 CRITICAL: Resolve effectIdOrIndex to actual index for description generation
        const currentEffects = projectState.getState().effects || [];
        let descriptionIndex;
        
        if (typeof effectIdOrIndex === 'string') {
            // ID-based resolution
            descriptionIndex = currentEffects.findIndex(e => e.id === effectIdOrIndex);
        } else {
            // Index-based resolution
            descriptionIndex = effectIdOrIndex;
        }
        
        const currentEffect = descriptionIndex >= 0 && descriptionIndex < currentEffects.length 
            ? currentEffects[descriptionIndex] 
            : null;
            
        const description = currentEffect
            ? CommandDescriptionHelper.describePropertyChanges(currentEffect, updatedEffect, effectName || 'effect')
            : `Updated ${effectName || 'effect'} properties`;

        super('effect.update', executeAction, undoAction, description);
        this.effectIdOrIndex = effectIdOrIndex; // Store the ID or index for reference
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

            // 🔒 CRITICAL: Deep clone to prevent reference sharing bugs
            const effectToClone = currentEffects[effectIndex];
            deletedEffect = effectToClone instanceof Effect 
                ? Effect.fromPOJO(JSON.parse(JSON.stringify(effectToClone.toPOJO())))
                : Effect.fromPOJO(JSON.parse(JSON.stringify(effectToClone)));
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
 * 🔒 CRITICAL: Uses effect IDs (not indices) to prevent stale reference bugs after reordering
 */
export class ReorderEffectsCommand extends Command {
    constructor(projectState, fromIdOrIndex, toIdOrIndex) {
        let movedEffect = null;
        let resolvedFromIndex = null;
        let resolvedToIndex = null;

        const executeAction = () => {
            const currentEffects = projectState.getState().effects || [];

            // 🔒 CRITICAL: Resolve effect IDs to current indices at execution time
            // This prevents stale index bugs when effects are reordered between command creation and execution
            let fromIdx, toIdx;
            
            if (typeof fromIdOrIndex === 'string') {
                // ID-based resolution (preferred, stable across reorders)
                fromIdx = currentEffects.findIndex(e => e.id === fromIdOrIndex);
                if (fromIdx === -1) {
                    throw new Error(`Effect with ID ${fromIdOrIndex} not found (may have been deleted)`);
                }
                console.log('🔄 ReorderEffectsCommand: Resolved fromId to index:', {
                    effectId: fromIdOrIndex,
                    resolvedIndex: fromIdx
                });
            } else {
                // Index-based resolution (legacy, may be stale)
                fromIdx = fromIdOrIndex;
                console.warn('⚠️ ReorderEffectsCommand: Using index-based resolution for fromIndex (may be unreliable after reorders)');
            }

            if (typeof toIdOrIndex === 'string') {
                // ID-based resolution (preferred, stable across reorders)
                toIdx = currentEffects.findIndex(e => e.id === toIdOrIndex);
                if (toIdx === -1) {
                    throw new Error(`Effect with ID ${toIdOrIndex} not found (may have been deleted)`);
                }
                console.log('🔄 ReorderEffectsCommand: Resolved toId to index:', {
                    effectId: toIdOrIndex,
                    resolvedIndex: toIdx
                });
            } else {
                // Index-based resolution (legacy, may be stale)
                toIdx = toIdOrIndex;
                console.warn('⚠️ ReorderEffectsCommand: Using index-based resolution for toIndex (may be unreliable after reorders)');
            }

            if (fromIdx < 0 || fromIdx >= currentEffects.length ||
                toIdx < 0 || toIdx >= currentEffects.length) {
                throw new Error(`Invalid indices for reorder: from ${fromIdx} to ${toIdx}`);
            }

            // Store resolved indices for undo operation
            resolvedFromIndex = fromIdx;
            resolvedToIndex = toIdx;

            movedEffect = currentEffects[fromIdx];
            
            // Safety check: ensure we have a valid effect to move
            if (!movedEffect) {
                throw new Error(`No effect found at index ${fromIdx}`);
            }

            const newEffects = [...currentEffects];
            const [removed] = newEffects.splice(fromIdx, 1);
            newEffects.splice(toIdx, 0, removed);

            console.log('🔄 ReorderEffectsCommand: Reordering effects', {
                fromIndex: fromIdx,
                toIndex: toIdx,
                effectId: movedEffect?.id,
                effectName: movedEffect?.name || movedEffect?.className || 'Unknown'
            });

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('effects:reordered', {
                fromIndex: fromIdx,
                toIndex: toIdx,
                effect: movedEffect,
                total: newEffects.length
            }, { source: 'ReorderEffectsCommand' });

            return { success: true, fromIndex: fromIdx, toIndex: toIdx };
        };

        const undoAction = () => {
            if (resolvedFromIndex === null || resolvedToIndex === null) {
                throw new Error('Cannot undo: effect indices were never resolved (command may not have executed)');
            }

            const currentEffects = projectState.getState().effects || [];
            const newEffects = [...currentEffects];

            // Move back: remove from toIndex and insert at fromIndex
            const [removed] = newEffects.splice(resolvedToIndex, 1);
            newEffects.splice(resolvedFromIndex, 0, removed);

            projectState.update({ effects: newEffects });

            // Emit event for UI updates
            EventBusService.emit('effects:reordered', {
                fromIndex: resolvedToIndex,
                toIndex: resolvedFromIndex,
                effect: movedEffect,
                total: newEffects.length
            }, { source: 'ReorderEffectsCommand' });

            return { success: true };
        };

        // Generate description at construction time (before resolution)
        const currentEffects = projectState.getState().effects || [];
        let descriptionIndex;
        
        if (typeof fromIdOrIndex === 'string') {
            descriptionIndex = currentEffects.findIndex(e => e.id === fromIdOrIndex);
        } else {
            descriptionIndex = fromIdOrIndex;
        }
        
        const effect = descriptionIndex >= 0 && descriptionIndex < currentEffects.length
            ? currentEffects[descriptionIndex]
            : null;
        const toDescriptionIndex = typeof toIdOrIndex === 'string' 
            ? currentEffects.findIndex(e => e.id === toIdOrIndex) 
            : toIdOrIndex;
        
        const description = effect
            ? CommandDescriptionHelper.describeReorder(effect, descriptionIndex, toDescriptionIndex)
            : `Moved effect`;

        super('effect.reorder', executeAction, undoAction, description);
        
        // Store both the original parameters and resolved indices for compatibility
        this.fromIdOrIndex = fromIdOrIndex; // Store ID or index for reference
        this.toIdOrIndex = toIdOrIndex;     // Store ID or index for reference
        
        // For backward compatibility, also store as fromIndex/toIndex
        // These are resolved at construction time and may become stale
        this.fromIndex = typeof fromIdOrIndex === 'string' ? descriptionIndex : fromIdOrIndex;
        this.toIndex = typeof toIdOrIndex === 'string' ? toDescriptionIndex : toIdOrIndex;
        
        this.isEffectCommand = true;
    }
}

// Export singleton instance
const effectCommandService = new EffectCommandService();
export default effectCommandService;