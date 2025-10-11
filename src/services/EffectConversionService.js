/**
 * EffectConversionService
 * 
 * Extracted from SettingsToProjectConverter as part of God Object Destruction Plan - Phase 6, Step 6.4
 * 
 * Responsibilities:
 * - Convert effects from settings format to project format
 * - Handle primary, secondary, keyframe, and final effects
 * - Hydrate effect configs with defaults via IPC
 * - Handle nested effects (additionalEffects, possibleSecondaryEffects)
 * - Merge config properties intelligently (ColorPicker, range objects, etc.)
 * - Scale positions when resolution changes
 * 
 * Single Responsibility: Effect conversion and config hydration
 */

import IdGenerator from '../utils/IdGenerator.js';
import ResolutionMapper from '../utils/ResolutionMapper.js';
import { PositionScaler } from '../utils/PositionScaler.js';

class EffectConversionService {
    /**
     * Convert all effects (primary + final + additional) from settings to UI format
     * @param {Object} settings - Settings file
     * @returns {Promise<Array>} Array of converted effects
     */
    async convertAllEffects(settings) {
        const allEffects = [];
        let effectCounts = {};

        // Prioritize the 'effects' array over 'allPrimaryEffects' as it contains the proper nested structure
        // The 'effects' array has additionalEffects nested properly, while allPrimaryEffects often doesn't
        const primaryEffectsArray = settings.effects || settings.allPrimaryEffects || [];

        console.log(`🎭 Using ${settings.effects ? 'effects' : 'allPrimaryEffects'} array for primary effects (${primaryEffectsArray.length} items)`);

        // Convert primary effects
        const primaryEffects = await this.convertEffects(primaryEffectsArray, 'primary');
        allEffects.push(...primaryEffects);
        effectCounts.primary = primaryEffects.length;

        // Convert final image effects (keyframe/post-processing effects)
        const finalEffects = await this.convertEffects(
            settings.finalImageEffects || settings.allFinalImageEffects || [],
            'finalImage'  // UI expects 'finalImage', not 'final'
        );
        allEffects.push(...finalEffects);
        effectCounts.final = finalEffects.length;

        // Convert additional effects if they exist
        if (settings.additionalEffects || settings.allAdditionalEffects) {
            const additionalEffects = await this.convertEffects(
                settings.additionalEffects || settings.allAdditionalEffects || [],
                'additional'
            );
            allEffects.push(...additionalEffects);
            effectCounts.additional = additionalEffects.length;
        }

        // Convert secondary effects if they exist as a separate array
        if (settings.secondaryEffects || settings.allSecondaryEffects) {
            const secondaryEffects = await this.convertEffects(
                settings.secondaryEffects || settings.allSecondaryEffects || [],
                'secondary'
            );
            allEffects.push(...secondaryEffects);
            effectCounts.secondary = secondaryEffects.length;
        }

        // Convert keyframe effects if they exist as a separate array
        if (settings.keyFrameEffects || settings.allKeyFrameEffects) {
            const keyFrameEffects = await this.convertEffects(
                settings.keyFrameEffects || settings.allKeyFrameEffects || [],
                'keyframe'
            );
            allEffects.push(...keyFrameEffects);
            effectCounts.keyframe = keyFrameEffects.length;
        }

        // Log summary
        const summary = Object.entries(effectCounts)
            .map(([type, count]) => `${count} ${type}`)
            .join(' + ');
        console.log(`🎭 Total effects converted: ${allEffects.length} (${summary})`);

        return allEffects;
    }

    /**
     * Convert effects array to UI effects format
     * @param {Array} effectsArray - Array of effects from settings
     * @param {string} effectType - Type of effects (primary, secondary, keyframe, finalImage)
     * @returns {Promise<Array>} Array of converted effects
     */
    async convertEffects(effectsArray, effectType = 'primary') {
        if (!Array.isArray(effectsArray)) {
            console.warn('⚠️ Effects array is not an array, returning empty effects');
            return [];
        }

        console.log(`🎭 Converting ${effectsArray.length} ${effectType} effects from settings format`);

        const convertedEffects = [];
        for (let index = 0; index < effectsArray.length; index++) {
            const settingsEffect = effectsArray[index];
            try {
                // Extract effect name - settings use 'name' field
                const effectName = settingsEffect.name || 'base-config';

                // Convert the effect configuration - handle both field names used in settings files
                // Some settings use 'currentEffectConfig', others use 'config'
                const effectConfig = settingsEffect.currentEffectConfig || settingsEffect.config;
                const uiEffect = {
                    id: IdGenerator.generateId(),
                    name: effectName,
                    className: effectName,
                    registryKey: effectName,
                    type: effectType, // Use the provided effect type
                    config: await this.convertEffectConfig(effectConfig, effectName),
                    visible: true,

                    // Preserve additional settings data that might be useful
                    percentChance: settingsEffect.percentChance || 100,
                    ignoreSecondaryEffects: settingsEffect.ignoreSecondaryEffects || false
                };

                // Convert secondary effects if they exist (legacy format)
                if (settingsEffect.possibleSecondaryEffects && settingsEffect.possibleSecondaryEffects.length > 0) {
                    uiEffect.secondaryEffects = await Promise.all(settingsEffect.possibleSecondaryEffects.map(async secEffect => {
                        const secEffectName = secEffect.name || 'secondary-effect';
                        return {
                            id: IdGenerator.generateId(),
                            name: secEffectName,
                            className: secEffectName,
                            registryKey: secEffectName,
                            type: 'secondary',
                            config: await this.convertEffectConfig(secEffect.currentEffectConfig || secEffect.config, secEffectName),
                            percentChance: secEffect.percentChance || 100,
                            visible: true
                        };
                    }));
                }

                // Convert additional effects - these are secondary/keyframe effects attached to this primary effect
                if (settingsEffect.additionalEffects && Array.isArray(settingsEffect.additionalEffects)) {
                    console.log(`  🔗 Processing ${settingsEffect.additionalEffects.length} additionalEffects for ${effectName}`);

                    // In this settings format, additionalEffects are directly the secondary/keyframe effects
                    // Convert them to the structure the UI expects: secondaryEffects array
                    const convertedSecondaryEffects = await Promise.all(settingsEffect.additionalEffects.map(async additionalEffect => {
                            const addEffectName = additionalEffect.name || 'additional-effect';
                            return {
                                id: IdGenerator.generateId(),
                                name: addEffectName,
                                className: addEffectName,
                                registryKey: addEffectName,
                                type: 'secondary',
                                config: await this.convertEffectConfig(additionalEffect.config, addEffectName),
                                percentChance: 100,
                                visible: true,
                                // Preserve original effect metadata
                                originalData: {
                                    requiresLayer: additionalEffect.requiresLayer,
                                    ignoreAdditionalEffects: additionalEffect.ignoreAdditionalEffects
                                }
                            };
                        })
                    );
                    // Attach these as secondaryEffects (what the UI expects)
                    uiEffect.secondaryEffects = convertedSecondaryEffects;

                    console.log(`  ✅ Converted ${convertedSecondaryEffects.length} secondary effects for ${effectName}`);
                }

                // Convert attachedEffects format - newer format with separate secondary and keyFrame arrays
                if (settingsEffect.attachedEffects && typeof settingsEffect.attachedEffects === 'object') {
                    // Handle secondary effects from attachedEffects.secondary
                    if (settingsEffect.attachedEffects.secondary && Array.isArray(settingsEffect.attachedEffects.secondary)) {
                        console.log(`  🔗 Processing ${settingsEffect.attachedEffects.secondary.length} attachedEffects.secondary for ${effectName}`);
                        
                        const convertedSecondaryEffects = await Promise.all(settingsEffect.attachedEffects.secondary.map(async secEffect => {
                            const secEffectName = secEffect.name || 'secondary-effect';
                            return {
                                id: IdGenerator.generateId(),
                                name: secEffectName,
                                className: secEffectName,
                                registryKey: secEffectName,
                                type: 'secondary',
                                config: await this.convertEffectConfig(secEffect.currentEffectConfig || secEffect.config, secEffectName),
                                percentChance: secEffect.percentChance || 100,
                                visible: true
                            };
                        }));
                        
                        // Merge with existing secondaryEffects if any
                        uiEffect.secondaryEffects = [...(uiEffect.secondaryEffects || []), ...convertedSecondaryEffects];
                        console.log(`  ✅ Converted ${convertedSecondaryEffects.length} secondary effects from attachedEffects for ${effectName}`);
                    }

                    // Handle keyframe effects from attachedEffects.keyFrame
                    if (settingsEffect.attachedEffects.keyFrame && Array.isArray(settingsEffect.attachedEffects.keyFrame)) {
                        console.log(`  🎬 Processing ${settingsEffect.attachedEffects.keyFrame.length} attachedEffects.keyFrame for ${effectName}`);
                        
                        const convertedKeyframeEffects = await Promise.all(settingsEffect.attachedEffects.keyFrame.map(async kfEffect => {
                            const kfEffectName = kfEffect.name || 'keyframe-effect';
                            return {
                                id: IdGenerator.generateId(),
                                name: kfEffectName,
                                className: kfEffectName,
                                registryKey: kfEffectName,
                                type: 'keyframe',
                                frame: kfEffect.frame || 0,
                                config: await this.convertEffectConfig(kfEffect.currentEffectConfig || kfEffect.config, kfEffectName),
                                percentChance: kfEffect.percentChance || 100,
                                visible: true
                            };
                        }));
                        
                        uiEffect.keyframeEffects = convertedKeyframeEffects;
                        console.log(`  ✅ Converted ${convertedKeyframeEffects.length} keyframe effects from attachedEffects for ${effectName}`);
                    }
                }

                // Log nested effects if found
                const nestedEffectsInfo = [];
                if (uiEffect.secondaryEffects) nestedEffectsInfo.push(`${uiEffect.secondaryEffects.length} secondary`);
                if (uiEffect.keyFrameEffects) nestedEffectsInfo.push(`${uiEffect.keyFrameEffects.length} keyframe`);
                if (uiEffect.keyframeEffects) nestedEffectsInfo.push(`${uiEffect.keyframeEffects.length} keyframe`);

                const nestedInfo = nestedEffectsInfo.length > 0 ? ` (with ${nestedEffectsInfo.join(', ')})` : '';
                console.log(`✅ Converted ${effectType} effect ${index + 1}: ${effectName}${nestedInfo}`);
                convertedEffects.push(uiEffect);

            } catch (error) {
                console.error(`❌ Failed to convert effect ${index}:`, error);
                // Return a basic effect structure to prevent complete failure
                convertedEffects.push({
                    id: IdGenerator.generateId(),
                    name: 'base-config',
                    className: 'base-config',
                    registryKey: 'base-config',
                    type: effectType,
                    config: {},
                    visible: true
                });
            }
        }

        return convertedEffects;
    }

    /**
     * Convert effect configuration from settings format to UI format
     * Hydrates the effect from settings by finding the matching config from the config registry
     * Creates default config by calling new ConfigClass({}) then merges values by property name
     * @param {Object} settingsConfig - Config from settings file
     * @param {string} effectName - Name of the effect
     * @returns {Promise<Object>} Hydrated config object
     */
    async convertEffectConfig(settingsConfig, effectName) {
        if (!settingsConfig || typeof settingsConfig !== 'object') {
            return {};
        }

        try {
            // Get the effect defaults using IPC to avoid importing main process services
            const result = await window.api.getEffectDefaults(effectName);
            
            if (!result.success || !result.defaults) {
                console.warn(`⚠️ No config class found for effect: ${effectName}, using raw settings`);
                return {...settingsConfig};
            }

            const defaultConfig = result.defaults;
            console.log(`🔧 Retrieved default config for ${effectName} via IPC`);

            // Compare property names from settings config and default config instance
            // Set the properties of matched objects without overwriting top-level properties
            for (const [propertyName, settingsValue] of Object.entries(settingsConfig)) {
                if (defaultConfig.hasOwnProperty(propertyName)) {
                    const defaultValue = defaultConfig[propertyName];

                    // If default value is an object, merge properties instead of overwriting
                    if (defaultValue && typeof defaultValue === 'object' &&
                        settingsValue && typeof settingsValue === 'object') {

                        // Special handling for ColorPicker objects - don't merge, reconstruct from settings data
                        if (typeof defaultValue.getColor === 'function') {
                            // This is a ColorPicker object - reconstruct it with settings data
                            if (settingsValue.__className === 'ColorPicker' ||
                                settingsValue.selectionType || settingsValue.colorValue !== undefined) {

                                // Set ColorPicker properties safely
                                if (settingsValue.selectionType) {
                                    defaultValue.selectionType = settingsValue.selectionType;
                                }
                                if (settingsValue.colorValue !== undefined) {
                                    defaultValue.colorValue = settingsValue.colorValue;
                                }
                                console.log(`🎨 Reconstructed ColorPicker for ${propertyName}: ${settingsValue.selectionType || 'default'}`);
                            } else {
                                console.warn(`⚠️ Invalid ColorPicker data for ${propertyName}, keeping defaults`);
                            }
                        }
                        // Special handling for range objects - they need careful property management
                        else if (typeof defaultValue.lower === 'function' && typeof defaultValue.upper === 'function') {
                            // This is a range object - only set safe properties
                            const safeProperties = ['lowerValue', 'upperValue', 'lower', 'upper'];
                            for (const [subPropertyName, subPropertyValue] of Object.entries(settingsValue)) {
                                if (safeProperties.includes(subPropertyName) && defaultValue.hasOwnProperty(subPropertyName)) {
                                    defaultValue[subPropertyName] = subPropertyValue;
                                    console.log(`🎯 Set range property ${propertyName}.${subPropertyName} = ${subPropertyValue}`);
                                }
                            }
                        } else {
                            // Regular object - set all matching properties
                            for (const [subPropertyName, subPropertyValue] of Object.entries(settingsValue)) {
                                if (defaultValue.hasOwnProperty(subPropertyName)) {
                                    defaultValue[subPropertyName] = subPropertyValue;
                                    console.log(`🔧 Set ${propertyName}.${subPropertyName} = ${subPropertyValue}`);
                                }
                            }
                        }
                        console.log(`✅ Merged object properties for ${propertyName}`);
                    }
                    // For primitive values, direct assignment is fine
                    else {
                        defaultConfig[propertyName] = settingsValue;
                        console.log(`✅ Set ${propertyName} = ${settingsValue} for ${effectName}`);
                    }
                } else {
                    console.warn(`⚠️ Property ${propertyName} not found in default config for ${effectName}`);
                }
            }

            console.log(`🎯 Successfully hydrated config for ${effectName} with ${Object.keys(settingsConfig).length} properties`);
            return defaultConfig;

        } catch (error) {
            console.error(`❌ Config hydration failed for ${effectName}:`, error.message);
            console.error('Settings config:', JSON.stringify(settingsConfig, null, 2));

            // Fallback to raw settings config
            console.warn(`⚠️ Falling back to raw config for ${effectName}`);
            return {...settingsConfig};
        }
    }

    /**
     * Scale positions if the target resolution differs from the settings resolution
     * @param {Object} project - Converted project data
     * @param {Object} settings - Original settings data
     * @returns {Promise<Object>} Project with scaled positions
     */
    async scalePositionsIfNeeded(project, settings) {
        if (!settings.finalSize || !project.effects?.length) {
            console.log('🎯 No position scaling needed: no finalSize or no effects');
            return project;
        }

        // Get original resolution from settings
        const originalWidth = settings.finalSize.width;
        const originalHeight = settings.finalSize.height;

        // Get target resolution from converted project
        let targetWidth, targetHeight;

        if (typeof project.targetResolution === 'number') {
            // Numeric resolution key - use ResolutionMapper
            const targetResolutionData = ResolutionMapper.getDimensions(project.targetResolution, project.isHorizontal);
            targetWidth = targetResolutionData.w;
            targetHeight = targetResolutionData.h;
        } else {
            console.warn('🎯 Unexpected targetResolution format:', project.targetResolution, 'using original resolution');
            targetWidth = originalWidth;
            targetHeight = originalHeight;
        }

        console.log('🎯 Position scaling analysis:', {
            originalResolution: `${originalWidth}x${originalHeight}`,
            targetResolution: `${targetWidth}x${targetHeight}`,
            resolutionChanged: originalWidth !== targetWidth || originalHeight !== targetHeight,
            effectsCount: project.effects.length
        });

        // Only scale if resolution actually changed
        if (originalWidth === targetWidth && originalHeight === targetHeight) {
            console.log('🎯 No position scaling needed: resolutions are identical');
            return project;
        }

        console.log('🎯 Scaling positions from settings resolution to target resolution...');

        // Use PositionScaler to scale all effect positions
        const scaledEffects = PositionScaler.scaleEffectsPositions(
            project.effects,
            originalWidth,
            originalHeight,
            targetWidth,
            targetHeight
        );

        return {
            ...project,
            effects: scaledEffects
        };
    }
}

// Export singleton instance
export default new EffectConversionService();