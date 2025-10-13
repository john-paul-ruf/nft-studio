/**
 * Service responsible for effect CRUD operations
 * Extracted from useEffectManagement hook to follow Single Responsibility Principle
 */

import CenterUtils from '../utils/CenterUtils.js';
import IdGenerator from '../utils/IdGenerator.js';
import {
    AddEffectCommand,
    DeleteEffectCommand,
    UpdateEffectCommand,
    ReorderEffectsCommand,
    AddSecondaryEffectCommand,
    AddKeyframeEffectCommand,
    ReorderSecondaryEffectsCommand,
    ReorderKeyframeEffectsCommand,
    DeleteSecondaryEffectCommand,
    DeleteKeyframeEffectCommand
} from '../commands/ProjectCommands.js';
import { UpdateSecondaryEffectCommand } from './SecondaryEffectCommandService.js';
import { UpdateKeyframeEffectCommand } from './KeyframeEffectCommandService.js';
import PreferencesService from './PreferencesService.js';
import { Effect } from '../models/Effect.js';

class EffectOperationsService {
    /**
     * Initialize the EffectOperationsService
     * @param {Object} dependencies - Service dependencies
     * @param {Object} dependencies.commandService - Command service for undo/redo
     * @param {Object} dependencies.eventBus - Event bus for communication
     * @param {Object} dependencies.logger - Logger service
     */
    constructor({ commandService, eventBus, logger }) {
        if (!commandService) {
            throw new Error('EffectOperationsService requires commandService dependency');
        }
        if (!eventBus) {
            throw new Error('EffectOperationsService requires eventBus dependency');
        }
        if (!logger) {
            throw new Error('EffectOperationsService requires logger dependency');
        }

        this.commandService = commandService;
        this.eventBus = eventBus;
        this.logger = logger;
        
        // Bind methods to preserve context
        this.createEffect = this.createEffect.bind(this);
        this.createEffectWithConfig = this.createEffectWithConfig.bind(this);
        this.updateEffect = this.updateEffect.bind(this);
        this.deleteEffect = this.deleteEffect.bind(this);
        this.reorderEffects = this.reorderEffects.bind(this);
        this.toggleEffectVisibility = this.toggleEffectVisibility.bind(this);
        this.createSecondaryEffect = this.createSecondaryEffect.bind(this);
        this.createKeyframeEffect = this.createKeyframeEffect.bind(this);
        this.deleteSecondaryEffect = this.deleteSecondaryEffect.bind(this);
        this.deleteKeyframeEffect = this.deleteKeyframeEffect.bind(this);
        this.reorderSecondaryEffects = this.reorderSecondaryEffects.bind(this);
        this.reorderKeyframeEffects = this.reorderKeyframeEffects.bind(this);

        // Track operation metrics
        this.operationMetrics = {
            effectsCreated: 0,
            effectsUpdated: 0,
            effectsDeleted: 0,
            effectsReordered: 0,
            secondaryEffectsCreated: 0,
            keyframeEffectsCreated: 0,
            operationErrors: 0,
            lastOperationTime: null
        };

        this.logger.info('EffectOperationsService initialized successfully');
    }

    /**
     * Create a new effect with default configuration
     * @param {Object} params - Effect creation parameters
     * @param {string} params.effectName - Name of the effect to create
     * @param {string} params.effectType - Type of effect (primary, secondary, finalImage)
     * @param {Object} params.projectState - Current project state
     * @param {Array} params.availableEffects - Available effects registry
     * @returns {Promise<Object>} Created effect data
     */
    async createEffect({ effectName, effectType = 'primary', projectState, availableEffects }) {
        const startTime = Date.now();
        
        try {
            this.logger.info(`Creating effect: ${effectName} (${effectType})`);

            // Find the effect in available effects to get the registryKey
            const effectCategory = availableEffects[effectType] || [];
            const effectData = effectCategory.find(e => e.name === effectName);
            const registryKey = effectData?.registryKey || effectName;

            // ⚠️ CRITICAL: Start with empty config - NO defaults applied
            // Effects should be created with empty configuration and user configures them manually
            // This includes NO center defaults, NO saved defaults, NO backend defaults
            let processedConfig = {};

            this.logger.info(`Creating effect with empty config for ${effectName}:`, {
                registryKey,
                config: processedConfig
            });

            // Validate and correct effect type
            let validatedType = effectType;
            if (effectData && effectData.category) {
                const naturalCategory = effectData.category;
                this.logger.info(`Effect natural category validation:`, {
                    effectName,
                    requestedType: effectType,
                    naturalCategory
                });

                // Use natural category if it differs from requested
                if (naturalCategory !== effectType) {
                    validatedType = naturalCategory;
                    this.logger.warn(`Effect type corrected from ${effectType} to ${naturalCategory}`);
                }
            }

            // Create the effect object using Effect class
            const effect = new Effect({
                id: IdGenerator.generateId(),
                name: effectName,
                className: effectData?.className || effectName,
                registryKey: registryKey,
                config: processedConfig,
                type: validatedType,
                percentChance: 100,
                visible: true
            });

            // Add the effect using command pattern
            const addCommand = new AddEffectCommand(projectState, effect, effectName);
            await this.commandService.execute(addCommand);

            // Update metrics
            this.operationMetrics.effectsCreated++;
            this.operationMetrics.lastOperationTime = Date.now();

            // Emit event
            this.eventBus.emit('effectOperations:effectCreated', {
                effect,
                effectType: validatedType,
                operationTime: Date.now() - startTime
            });

            this.logger.info(`Effect created successfully: ${effectName}`);
            return effect;

        } catch (error) {
            this.operationMetrics.operationErrors++;
            this.logger.error(`Error creating effect ${effectName}:`, error);
            throw error;
        }
    }

    /**
     * Create a new effect with pre-calculated configuration (for specialty effects)
     * @param {Object} params - Effect creation parameters
     * @param {string} params.effectName - Name of the effect to create
     * @param {string} params.effectType - Type of effect
     * @param {Object} params.config - Pre-calculated configuration
     * @param {number} params.percentChance - Percentage chance for the effect
     * @param {Object} params.projectState - Current project state
     * @param {Array} params.availableEffects - Available effects registry
     * @returns {Promise<Object>} Created effect data
     */
    async createEffectWithConfig({ effectName, effectType = 'primary', config, percentChance = 100, projectState, availableEffects }) {
        const startTime = Date.now();
        
        try {
            this.logger.info(`Creating effect with config: ${effectName} (${effectType})`);

            // Find the effect in available effects to get the registryKey
            const effectCategory = availableEffects[effectType] || [];
            const effectData = effectCategory.find(e => e.name === effectName);
            const registryKey = effectData?.registryKey || effectName;

            // For specialty effects, use the provided config directly without centering
            const effect = new Effect({
                id: IdGenerator.generateId(),
                name: effectName,
                className: effectData?.className || effectName,
                registryKey: registryKey,
                config: config, // Use the provided config as-is
                type: effectType,
                percentChance: percentChance || 100,
                visible: true
            });

            // Add the effect directly to project state
            const currentEffects = projectState.getState().effects || [];
            const newEffects = [...currentEffects, effect];
            projectState.update({ effects: newEffects });

            // Update metrics
            this.operationMetrics.effectsCreated++;
            this.operationMetrics.lastOperationTime = Date.now();

            // Emit event
            this.eventBus.emit('effectOperations:effectCreatedWithConfig', {
                effect,
                effectType,
                operationTime: Date.now() - startTime
            });

            this.logger.info(`Specialty effect created successfully: ${effectName}`);
            return effect;

        } catch (error) {
            this.operationMetrics.operationErrors++;
            this.logger.error(`Error creating effect with config ${effectName}:`, error);
            throw error;
        }
    }

    /**
     * Update an existing effect
     * @param {Object} params - Update parameters
     * @param {number} params.index - Index of effect to update
     * @param {Object} params.updatedEffect - Updated effect data
     * @param {Object} params.projectState - Current project state
     * @returns {Promise<void>}
     */
    async updateEffect({ index, updatedEffect, projectState }) {
        const startTime = Date.now();
        
        try {
            const currentEffects = projectState.getState().effects || [];
            const currentEffect = currentEffects[index];
            const effectName = updatedEffect.name || updatedEffect.className || 'Effect';

            this.logger.info(`Updating effect at index ${index}:`, {
                originalEffect: currentEffect?.name || currentEffect?.className,
                updatedEffect: effectName,
                secondaryEffectsCount: updatedEffect.secondaryEffects?.length || 0
            });

            // Defense-in-depth: deep-merge patch into current effect so we never drop fields
            const toPOJO = (e) => (e instanceof Effect ? e.toPOJO() : (e || {}));
            const deepMerge = (base, patch) => {
                if (patch === undefined) return base;
                if (base === undefined) return patch;
                if (patch === null) return base; // avoid wiping required objects
                if (Array.isArray(base) || Array.isArray(patch)) return patch !== undefined ? patch : base;
                if (typeof base !== 'object' || typeof patch !== 'object') return patch;
                const out = { ...base };
                for (const [k, v] of Object.entries(patch)) {
                    if (v === undefined) continue;
                    out[k] = deepMerge(base[k], v);
                }
                return out;
            };

            const prevPOJO = toPOJO(currentEffect);
            const patchPOJO = toPOJO(updatedEffect);
            const merged = {
                ...prevPOJO,
                ...patchPOJO,
                id: prevPOJO?.id,
                type: patchPOJO.type ?? prevPOJO.type,
                name: patchPOJO.name ?? prevPOJO.name,
                className: patchPOJO.className ?? prevPOJO.className,
                registryKey: patchPOJO.registryKey ?? prevPOJO.registryKey,
                percentChance: patchPOJO.percentChance ?? prevPOJO.percentChance,
                visible: patchPOJO.visible ?? prevPOJO.visible,
                config: deepMerge(prevPOJO?.config || {}, patchPOJO?.config || {})
            };
            if (!('secondaryEffects' in patchPOJO)) merged.secondaryEffects = prevPOJO?.secondaryEffects || [];
            if (!('keyframeEffects' in patchPOJO)) merged.keyframeEffects = prevPOJO?.keyframeEffects || [];

            // Use command pattern for undo/redo support
            const updateCommand = new UpdateEffectCommand(projectState, index, merged, effectName);
            await this.commandService.execute(updateCommand);

            // Update metrics
            this.operationMetrics.effectsUpdated++;
            this.operationMetrics.lastOperationTime = Date.now();

            // Emit event
            this.eventBus.emit('effectOperations:effectUpdated', {
                index,
                effect: updatedEffect,
                operationTime: Date.now() - startTime
            });

            this.logger.info(`Effect updated successfully at index ${index}`);

        } catch (error) {
            this.operationMetrics.operationErrors++;
            this.logger.error(`Error updating effect at index ${index}:`, error);
            throw error;
        }
    }

    /**
     * Delete an effect
     * @param {Object} params - Delete parameters
     * @param {number} params.index - Index of effect to delete
     * @param {Object} params.projectState - Current project state
     * @returns {Promise<void>}
     */
    async deleteEffect({ index, projectState }) {
        const startTime = Date.now();
        
        try {
            const currentEffects = projectState.getState().effects || [];
            const effectToDelete = currentEffects[index];
            
            this.logger.info(`Deleting effect at index ${index}:`, {
                effectName: effectToDelete?.name || effectToDelete?.className,
                totalEffects: currentEffects.length
            });

            // Use Command Pattern for delete
            const deleteCommand = new DeleteEffectCommand(projectState, index);
            await this.commandService.execute(deleteCommand);

            // Update metrics
            this.operationMetrics.effectsDeleted++;
            this.operationMetrics.lastOperationTime = Date.now();

            // Emit event
            this.eventBus.emit('effectOperations:effectDeleted', {
                index,
                deletedEffect: effectToDelete,
                operationTime: Date.now() - startTime
            });

            this.logger.info(`Effect deleted successfully at index ${index}`);

        } catch (error) {
            this.operationMetrics.operationErrors++;
            this.logger.error(`Error deleting effect at index ${index}:`, error);
            throw error;
        }
    }

    /**
     * Reorder effects
     * @param {Object} params - Reorder parameters
     * @param {number} params.fromIndex - Source index
     * @param {number} params.toIndex - Target index
     * @param {Object} params.projectState - Current project state
     * @returns {Promise<void>}
     */
    async reorderEffects({ fromIndex, toIndex, projectState }) {
        const startTime = Date.now();
        
        try {
            this.logger.info(`Reordering effects from ${fromIndex} to ${toIndex}`);

            // Use command pattern for undo/redo support
            const reorderCommand = new ReorderEffectsCommand(projectState, fromIndex, toIndex);
            await this.commandService.execute(reorderCommand);

            // Update metrics
            this.operationMetrics.effectsReordered++;
            this.operationMetrics.lastOperationTime = Date.now();

            // Emit event
            this.eventBus.emit('effectOperations:effectsReordered', {
                fromIndex,
                toIndex,
                operationTime: Date.now() - startTime
            });

            this.logger.info(`Effects reordered successfully from ${fromIndex} to ${toIndex}`);

        } catch (error) {
            this.operationMetrics.operationErrors++;
            this.logger.error(`Error reordering effects from ${fromIndex} to ${toIndex}:`, error);
            throw error;
        }
    }

    /**
     * Toggle effect visibility
     * @param {Object} params - Toggle parameters
     * @param {string} params.effectId - ID of effect to toggle (preferred, ID-first pattern)
     * @param {number} params.index - Index of effect to toggle (deprecated, for backward compatibility)
     * @param {Object} params.projectState - Current project state
     * @returns {Promise<void>}
     */
    async toggleEffectVisibility({ effectId, index, projectState }) {
        const startTime = Date.now();
        
        try {
            const currentEffects = projectState.getState().effects || [];
            
            // 🔒 CRITICAL: Resolve effect ID to current index (ID-first pattern)
            let resolvedIndex = index;
            if (effectId) {
                resolvedIndex = currentEffects.findIndex(e => e.id === effectId);
                if (resolvedIndex === -1) {
                    this.logger.error(`❌ Effect with ID ${effectId} not found in current effects array`);
                    throw new Error(`Effect with ID ${effectId} not found`);
                }
                this.logger.info(`✅ Resolved effect ID ${effectId} to index ${resolvedIndex}`);
            } else if (index !== undefined) {
                // Backward compatibility: if only index provided, log warning
                this.logger.warn(`⚠️ toggleEffectVisibility called with index only (${index}). Please pass effectId for safety.`);
                resolvedIndex = index;
            } else {
                throw new Error('Either effectId or index must be provided to toggleEffectVisibility');
            }
            
            const effect = currentEffects[resolvedIndex];
            if (!effect) {
                this.logger.error(`❌ No effect found at resolved index ${resolvedIndex}`);
                throw new Error(`No effect found at index ${resolvedIndex}`);
            }
            
            const updatedEffect = {
                ...effect,
                visible: effect.visible === false ? true : false
            };

            const effectName = effect.name || effect.className || 'Effect';
            this.logger.info(`Toggling visibility for ${effectName} (ID: ${effect.id}) to ${updatedEffect.visible}`);

            // Use UpdateEffectCommand for visibility toggle
            const updateCommand = new UpdateEffectCommand(
                projectState,
                resolvedIndex,
                updatedEffect,
                effectName
            );

            // Override the description for visibility toggle
            updateCommand.description = `${updatedEffect.visible ? 'Showed' : 'Hid'} ${effectName}`;
            await this.commandService.execute(updateCommand);

            // Emit event
            this.eventBus.emit('effectOperations:effectVisibilityToggled', {
                effectId: effect.id,
                index: resolvedIndex,
                effect: updatedEffect,
                visible: updatedEffect.visible,
                operationTime: Date.now() - startTime
            });

            this.logger.info(`Effect visibility toggled successfully for ${effectName} (ID: ${effect.id})`);

        } catch (error) {
            this.operationMetrics.operationErrors++;
            this.logger.error(`Error toggling effect visibility:`, error);
            throw error;
        }
    }

    /**
     * Create a secondary effect
     * @param {Object} params - Secondary effect creation parameters
     * @param {number} params.parentIndex - Index of parent effect
     * @param {string} params.effectName - Name of secondary effect
     * @param {Object} params.config - Effect configuration
     * @param {Object} params.projectState - Current project state
     * @returns {Promise<void>}
     */
    async createSecondaryEffect({ parentIndex, effectName, config, projectState }) {
        const startTime = Date.now();
        
        try {
            this.logger.info(`Creating secondary effect ${effectName} for parent at index ${parentIndex}`);

            const secondaryEffectData = {
                id: IdGenerator.generateId(),
                name: effectName,
                className: effectName,
                registryKey: effectName,
                type: 'secondary',
                config
            };

            const addSecondaryCommand = new AddSecondaryEffectCommand(
                projectState,
                parentIndex,
                secondaryEffectData,
                effectName
            );
            await this.commandService.execute(addSecondaryCommand);

            // Update metrics
            this.operationMetrics.secondaryEffectsCreated++;
            this.operationMetrics.lastOperationTime = Date.now();

            // Emit event
            this.eventBus.emit('effectOperations:secondaryEffectCreated', {
                parentIndex,
                effectName,
                operationTime: Date.now() - startTime
            });

            this.logger.info(`Secondary effect created successfully: ${effectName}`);

        } catch (error) {
            this.operationMetrics.operationErrors++;
            this.logger.error(`Error creating secondary effect ${effectName}:`, error);
            throw error;
        }
    }

    /**
     * Create a keyframe effect
     * @param {Object} params - Keyframe effect creation parameters
     * @param {number} params.parentIndex - Index of parent effect
     * @param {string} params.effectName - Name of keyframe effect
     * @param {number} params.frame - Frame number for keyframe
     * @param {Object} params.config - Effect configuration
     * @param {Object} params.projectState - Current project state
     * @returns {Promise<void>}
     */
    async createKeyframeEffect({ parentIndex, effectName, frame, config, projectState }) {
        const startTime = Date.now();
        
        try {
            this.logger.info(`Creating keyframe effect ${effectName} for frame ${frame} on parent at index ${parentIndex}`);

            const keyframeEffectData = {
                id: IdGenerator.generateId(),
                name: effectName,
                className: effectName,
                registryKey: effectName,
                type: 'keyframe',
                frame: frame,
                config
            };

            const addKeyframeCommand = new AddKeyframeEffectCommand(
                projectState,
                parentIndex,
                keyframeEffectData,
                effectName,
                frame
            );
            await this.commandService.execute(addKeyframeCommand);

            // Update metrics
            this.operationMetrics.keyframeEffectsCreated++;
            this.operationMetrics.lastOperationTime = Date.now();

            // Emit event
            this.eventBus.emit('effectOperations:keyframeEffectCreated', {
                parentIndex,
                effectName,
                frame,
                operationTime: Date.now() - startTime
            });

            this.logger.info(`Keyframe effect created successfully: ${effectName} at frame ${frame}`);

        } catch (error) {
            this.operationMetrics.operationErrors++;
            this.logger.error(`Error creating keyframe effect ${effectName}:`, error);
            throw error;
        }
    }

    /**
     * Delete a secondary effect
     * @param {Object} params - Delete parameters
     * @param {number} params.parentIndex - Index of parent effect
     * @param {number} params.secondaryIndex - Index of secondary effect to delete
     * @param {Object} params.projectState - Current project state
     * @returns {Promise<void>}
     */
    async deleteSecondaryEffect({ parentIndex, secondaryIndex, projectState }) {
        try {
            this.logger.info(`Deleting secondary effect at index ${secondaryIndex} from parent ${parentIndex}`);

            const deleteSecondaryCommand = new DeleteSecondaryEffectCommand(
                projectState,
                parentIndex,
                secondaryIndex
            );
            await this.commandService.execute(deleteSecondaryCommand);

            // Emit event
            this.eventBus.emit('effectOperations:secondaryEffectDeleted', {
                parentIndex,
                secondaryIndex
            });

            this.logger.info(`Secondary effect deleted successfully`);

        } catch (error) {
            this.operationMetrics.operationErrors++;
            this.logger.error(`Error deleting secondary effect:`, error);
            throw error;
        }
    }

    /**
     * Delete a keyframe effect
     * @param {Object} params - Delete parameters
     * @param {number} params.parentIndex - Index of parent effect
     * @param {number} params.keyframeIndex - Index of keyframe effect to delete
     * @param {Object} params.projectState - Current project state
     * @returns {Promise<void>}
     */
    async deleteKeyframeEffect({ parentIndex, keyframeIndex, projectState }) {
        try {
            this.logger.info(`Deleting keyframe effect at index ${keyframeIndex} from parent ${parentIndex}`);

            const deleteKeyframeCommand = new DeleteKeyframeEffectCommand(
                projectState,
                parentIndex,
                keyframeIndex
            );
            await this.commandService.execute(deleteKeyframeCommand);

            // Emit event
            this.eventBus.emit('effectOperations:keyframeEffectDeleted', {
                parentIndex,
                keyframeIndex
            });

            this.logger.info(`Keyframe effect deleted successfully`);

        } catch (error) {
            this.operationMetrics.operationErrors++;
            this.logger.error(`Error deleting keyframe effect:`, error);
            throw error;
        }
    }

    /**
     * Reorder secondary effects
     * @param {Object} params - Reorder parameters
     * @param {number} params.parentIndex - Index of parent effect
     * @param {number} params.fromIndex - Source index
     * @param {number} params.toIndex - Target index
     * @param {Object} params.projectState - Current project state
     * @returns {Promise<void>}
     */
    async reorderSecondaryEffects({ parentIndex, fromIndex, toIndex, projectState }) {
        try {
            this.logger.info(`Reordering secondary effects from ${fromIndex} to ${toIndex} on parent ${parentIndex}`);

            const reorderSecondaryCommand = new ReorderSecondaryEffectsCommand(
                projectState,
                parentIndex,
                fromIndex,
                toIndex
            );
            await this.commandService.execute(reorderSecondaryCommand);

            // Emit event
            this.eventBus.emit('effectOperations:secondaryEffectsReordered', {
                parentIndex,
                fromIndex,
                toIndex
            });

            this.logger.info(`Secondary effects reordered successfully`);

        } catch (error) {
            this.operationMetrics.operationErrors++;
            this.logger.error(`Error reordering secondary effects:`, error);
            throw error;
        }
    }

    /**
     * Reorder keyframe effects
     * @param {Object} params - Reorder parameters
     * @param {number} params.parentIndex - Index of parent effect
     * @param {number} params.fromIndex - Source index
     * @param {number} params.toIndex - Target index
     * @param {Object} params.projectState - Current project state
     * @returns {Promise<void>}
     */
    async reorderKeyframeEffects({ parentIndex, fromIndex, toIndex, projectState }) {
        try {
            this.logger.info(`Reordering keyframe effects from ${fromIndex} to ${toIndex} on parent ${parentIndex}`);

            const reorderKeyframeCommand = new ReorderKeyframeEffectsCommand(
                projectState,
                parentIndex,
                fromIndex,
                toIndex
            );
            await this.commandService.execute(reorderKeyframeCommand);

            // Emit event
            this.eventBus.emit('effectOperations:keyframeEffectsReordered', {
                parentIndex,
                fromIndex,
                toIndex
            });

            this.logger.info(`Keyframe effects reordered successfully`);

        } catch (error) {
            this.operationMetrics.operationErrors++;
            this.logger.error(`Error reordering keyframe effects:`, error);
            throw error;
        }
    }

    /**
     * Toggle visibility of a secondary effect
     * @param {Object} params - Toggle parameters
     * @param {number} params.parentIndex - Index of parent effect
     * @param {number} params.secondaryIndex - Index of secondary effect
     * @param {Object} params.projectState - Current project state
     * @returns {Promise<void>}
     */
    async toggleSecondaryEffectVisibility({ parentIndex, secondaryIndex, projectState }) {
        const startTime = Date.now();
        
        try {
            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect || !parentEffect.secondaryEffects) {
                throw new Error(`Cannot toggle secondary effect visibility - parent effect at index ${parentIndex} not found or has no secondary effects`);
            }

            const secondaryEffect = parentEffect.secondaryEffects[secondaryIndex];
            if (!secondaryEffect) {
                throw new Error(`Cannot toggle secondary effect visibility - secondary effect at index ${secondaryIndex} not found`);
            }

            const currentVisibility = secondaryEffect.visible !== undefined ? secondaryEffect.visible : true;
            const newVisibility = !currentVisibility;

            this.logger.info(`Toggling secondary effect visibility at parent ${parentIndex}, secondary ${secondaryIndex} to ${newVisibility}`);

            const updateSecondaryCommand = new UpdateSecondaryEffectCommand(
                projectState,
                parentIndex,
                secondaryIndex,
                { visible: newVisibility }
            );
            await this.commandService.execute(updateSecondaryCommand);

            // Update metrics
            this.operationMetrics.effectsUpdated++;
            this.operationMetrics.lastOperationTime = Date.now();

            // Emit event
            this.eventBus.emit('effectOperations:secondaryEffectVisibilityToggled', {
                parentIndex,
                secondaryIndex,
                visible: newVisibility,
                operationTime: Date.now() - startTime
            });

            this.logger.info(`Secondary effect visibility toggled successfully`);

        } catch (error) {
            this.operationMetrics.operationErrors++;
            this.logger.error(`Error toggling secondary effect visibility:`, error);
            throw error;
        }
    }

    /**
     * Toggle visibility of a keyframe effect
     * @param {Object} params - Toggle parameters
     * @param {number} params.parentIndex - Index of parent effect
     * @param {number} params.keyframeIndex - Index of keyframe effect
     * @param {Object} params.projectState - Current project state
     * @returns {Promise<void>}
     */
    async toggleKeyframeEffectVisibility({ parentIndex, keyframeIndex, projectState }) {
        const startTime = Date.now();
        
        try {
            const currentEffects = projectState.getState().effects || [];
            const parentEffect = currentEffects[parentIndex];

            if (!parentEffect) {
                throw new Error(`Cannot toggle keyframe effect visibility - parent effect at index ${parentIndex} not found`);
            }

            const keyframeEffects = parentEffect.keyframeEffects || parentEffect.attachedEffects?.keyFrame || [];
            const keyframeEffect = keyframeEffects[keyframeIndex];
            
            if (!keyframeEffect) {
                throw new Error(`Cannot toggle keyframe effect visibility - keyframe effect at index ${keyframeIndex} not found`);
            }

            const currentVisibility = keyframeEffect.visible !== undefined ? keyframeEffect.visible : true;
            const newVisibility = !currentVisibility;

            this.logger.info(`Toggling keyframe effect visibility at parent ${parentIndex}, keyframe ${keyframeIndex} to ${newVisibility}`);

            const updateKeyframeCommand = new UpdateKeyframeEffectCommand(
                projectState,
                parentIndex,
                keyframeIndex,
                { visible: newVisibility }
            );
            await this.commandService.execute(updateKeyframeCommand);

            // Update metrics
            this.operationMetrics.effectsUpdated++;
            this.operationMetrics.lastOperationTime = Date.now();

            // Emit event
            this.eventBus.emit('effectOperations:keyframeEffectVisibilityToggled', {
                parentIndex,
                keyframeIndex,
                visible: newVisibility,
                operationTime: Date.now() - startTime
            });

            this.logger.info(`Keyframe effect visibility toggled successfully`);

        } catch (error) {
            this.operationMetrics.operationErrors++;
            this.logger.error(`Error toggling keyframe effect visibility:`, error);
            throw error;
        }
    }

    /**
     * Get operation metrics
     * @returns {Object} Current operation metrics
     */
    getOperationMetrics() {
        return {
            ...this.operationMetrics,
            uptime: Date.now() - (this.operationMetrics.lastOperationTime || Date.now())
        };
    }

    /**
     * Reset operation metrics
     */
    resetOperationMetrics() {
        this.operationMetrics = {
            effectsCreated: 0,
            effectsUpdated: 0,
            effectsDeleted: 0,
            effectsReordered: 0,
            secondaryEffectsCreated: 0,
            keyframeEffectsCreated: 0,
            operationErrors: 0,
            lastOperationTime: null
        };
        this.logger.info('Operation metrics reset');
    }
}

export default EffectOperationsService;