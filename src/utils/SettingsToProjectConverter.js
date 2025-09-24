import IdGenerator from './IdGenerator.js';
import ResolutionMapper from './ResolutionMapper.js';

/**
 * Converts settings files (render configuration) to project format (UI state)
 * Settings files contain detailed effect configurations for rendering
 * Project files contain UI-friendly effect data for editing
 */
export default class SettingsToProjectConverter {

    /**
     * Convert a settings file to project format
     * @param {Object} settings - The settings file data
     * @param {string} projectName - Optional project name override
     * @param {boolean} serializeForIPC - Whether to serialize complex objects for IPC transmission
     * @returns {Object} Project data compatible with ProjectState
     */
    static async convertSettingsToProject(settings, projectName = null, serializeForIPC = false) {
        console.log('🔄 SettingsToProjectConverter: Converting settings to project format');
        console.log('📄 Settings structure:', {
            hasEffects: !!settings.effects,
            hasAllPrimaryEffects: !!settings.allPrimaryEffects,
            effectsCount: (settings.effects || settings.allPrimaryEffects)?.length || 0,
            hasConfig: !!settings.config,
            hasFinalSize: !!settings.finalSize,
            hasColorScheme: !!settings.colorScheme
        });

        try {
            let project = {
                // Extract project name from settings or use provided name
                projectName: projectName || this.extractProjectName(settings),

                // Extract artist info if available
                artist: settings.config?._INVOKER_ || '',

                // Convert resolution information
                targetResolution: this.convertResolution(settings),

                // Determine orientation from resolution
                isHorizontal: this.determineOrientation(settings),

                // Convert frame count
                numFrames: settings.config?.numberOfFrame || 100,

                // Convert effects from effects array (contains correct registry keys)
                effects: await this.convertAllEffects(settings),

                // Convert color scheme
                colorScheme: this.extractColorSchemeName(settings),
                colorSchemeData: this.convertColorSchemeData(settings),

                // Set default render settings - extract from settings fileOut
                outputDirectory: this.extractOutputDirectory(settings),
                renderStartFrame: settings.frameStart || 0,
                renderJumpFrames: settings.config?.frameInc || 1,

                // Preserve exact resolution from settings as source of truth
                settingsResolution: settings.finalSize ? {
                    width: settings.finalSize.width,
                    height: settings.finalSize.height,
                    source: 'settings-file'
                } : null
            };

            console.log('✅ SettingsToProjectConverter: Conversion complete');
            console.log('📊 Project summary:', {
                projectName: project.projectName,
                effectsCount: project.effects.length,
                numFrames: project.numFrames,
                resolution: project.targetResolution,
                colorScheme: project.colorScheme
            });

            // Serialize for IPC if requested
            if (serializeForIPC) {
                project = this.serializeProjectForIPC(project);
                console.log('🔄 SettingsToProjectConverter: Serialized for IPC transmission');
            }

            return project;

        } catch (error) {
            console.error('❌ SettingsToProjectConverter: Conversion failed:', error);
            throw new Error(`Failed to convert settings to project: ${error.message}`);
        }
    }

    /**
     * Extract project name from settings
     */
    static extractProjectName(settings) {
        // Try various sources for project name
        const sources = [
            settings.config?.finalFileName,
            settings.config?.runName,
            settings.config?.fileOut?.split('/').pop(),
            'Converted Project'
        ];

        for (const source of sources) {
            if (source && typeof source === 'string' && source.trim()) {
                return source.trim();
            }
        }

        return 'Converted Project';
    }

    /**
     * Extract output directory from settings
     */
    static extractOutputDirectory(settings) {
        // Try to extract from fileOut path in config
        if (settings.config?.fileOut) {
            // Remove the filename part to get directory
            const fileOut = settings.config.fileOut;
            const lastSlashIndex = fileOut.lastIndexOf('/');
            if (lastSlashIndex !== -1) {
                const directoryPath = fileOut.substring(0, lastSlashIndex);
                // Go up one more level by finding the second-to-last slash
                const secondLastSlashIndex = directoryPath.lastIndexOf('/');
                if (secondLastSlashIndex !== -1) {
                    return directoryPath.substring(0, secondLastSlashIndex + 1); // Keep the trailing slash
                }
                return directoryPath; // Fallback if there's no parent directory
            }
        }

        // Fallback to workingDirectory (go up one level)
        if (settings.workingDirectory) {
            const cleanPath = settings.workingDirectory.replace(/\/$/, ''); // Remove trailing slash
            const lastSlashIndex = cleanPath.lastIndexOf('/');
            if (lastSlashIndex !== -1) {
                return cleanPath.substring(0, lastSlashIndex + 1); // Keep the trailing slash
            }
            return cleanPath; // Fallback if there's no parent directory
        }

        // Final fallback
        return null;
    }


    /**
     * Convert resolution from settings format to project format
     * Settings file resolution is the source of truth
     */
    static convertResolution(settings) {
        if (!settings.finalSize) {
            console.warn('⚠️ No finalSize found in settings, using default resolution');
            return ResolutionMapper.getDefaultResolution();
        }

        const {width, height} = settings.finalSize;
        console.log(`📐 Settings resolution: ${width}x${height}`);

        // Try to find matching resolution in ResolutionMapper
        const resolutions = ResolutionMapper.getAllResolutions();

        // Convert object to array for searching
        const resolutionEntries = Object.entries(resolutions).map(([key, res]) => ({
            key: parseInt(key),
            width: res.w,
            height: res.h,
            name: res.name,
            ...res
        }));

        const matchingResolution = resolutionEntries.find(res =>
            res.width === width && res.height === height
        );

        if (matchingResolution) {
            console.log('📐 Found matching resolution:', matchingResolution.name);
            return matchingResolution.name;
        }

        // Settings file resolution is truth - create custom resolution identifier
        // This ensures the exact resolution from settings is preserved
        const customResolution = `${width}x${height}`;
        console.log('📐 Using custom resolution from settings (exact match):', customResolution);
        return customResolution;
    }

    /**
     * Determine if the project is horizontal based on resolution
     */
    static determineOrientation(settings) {
        if (!settings.finalSize) return false;
        return settings.finalSize.width > settings.finalSize.height;
    }

    /**
     * Convert all effects (primary + final + additional) from settings to UI format
     */
    static async convertAllEffects(settings) {
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
     */
    static async convertEffects(effectsArray, effectType = 'primary') {
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
                    uiEffect.secondaryEffects = await Promise.all(settingsEffect.possibleSecondaryEffects.map(async secEffect => ({
                        id: IdGenerator.generateId(),
                        registryKey: secEffect.name || 'secondary-effect',
                        config: await this.convertEffectConfig(secEffect.currentEffectConfig || secEffect.config, secEffect.name || 'secondary-effect'),
                        percentChance: secEffect.percentChance || 100
                    })));
                }

                // Convert additional effects - these are secondary/keyframe effects attached to this primary effect
                if (settingsEffect.additionalEffects && Array.isArray(settingsEffect.additionalEffects)) {
                    console.log(`  🔗 Processing ${settingsEffect.additionalEffects.length} additionalEffects for ${effectName}`);

                    // In this settings format, additionalEffects are directly the secondary/keyframe effects
                    // Convert them to the structure the UI expects: secondaryEffects array
                    const convertedSecondaryEffects = await Promise.all(settingsEffect.additionalEffects.map(async additionalEffect => ({
                        id: IdGenerator.generateId(),
                        registryKey: additionalEffect.name || 'additional-effect',
                        config: await this.convertEffectConfig(additionalEffect.config, additionalEffect.name || 'additional-effect'),
                        percentChance: 100,
                        // Preserve original effect metadata
                        originalData: {
                            requiresLayer: additionalEffect.requiresLayer,
                            ignoreAdditionalEffects: additionalEffect.ignoreAdditionalEffects
                        }
                    })));

                    // Attach these as secondaryEffects (what the UI expects)
                    uiEffect.secondaryEffects = convertedSecondaryEffects;

                    console.log(`  ✅ Converted ${convertedSecondaryEffects.length} secondary effects for ${effectName}`);
                }

                // Log nested effects if found
                const nestedEffectsInfo = [];
                if (uiEffect.secondaryEffects) nestedEffectsInfo.push(`${uiEffect.secondaryEffects.length} secondary`);
                if (uiEffect.keyFrameEffects) nestedEffectsInfo.push(`${uiEffect.keyFrameEffects.length} keyframe`);

                const nestedInfo = nestedEffectsInfo.length > 0 ? ` (with ${nestedEffectsInfo.join(', ')})` : '';
                console.log(`✅ Converted ${effectType} effect ${index + 1}: ${effectName}${nestedInfo}`);
                convertedEffects.push(uiEffect);

            } catch (error) {
                console.error(`❌ Failed to convert effect ${index}:`, error);
                // Return a basic effect structure to prevent complete failure
                convertedEffects.push({
                    id: IdGenerator.generateId(),
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
     */
    static async convertEffectConfig(settingsConfig, effectName) {
        if (!settingsConfig || typeof settingsConfig !== 'object') {
            return {};
        }

        try {
            // Get the effect with its linked config class using EffectRegistryService
            const EffectRegistryService = (await import('../main/services/EffectRegistryService.js')).default;
            const registryService = new EffectRegistryService();

            // Find matching config from the config registry using the same key
            const effectWithConfig = await registryService.getEffectWithConfig(effectName);

            if (!effectWithConfig || !effectWithConfig.configClass) {
                console.warn(`⚠️ No config class found for effect: ${effectName}, using raw settings`);
                return {...settingsConfig};
            }

            const ConfigClass = effectWithConfig.configClass;

            // Create the default config by calling new ConfigClass({})
            const defaultConfig = new ConfigClass({});
            console.log(`🔧 Created default config for ${effectName}`);

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
     * Serialize config objects to remove non-cloneable properties (methods) for IPC
     * @param {Object} config - Config object to serialize
     * @returns {Object} Serialized config safe for IPC
     */
    static serializeConfigForIPC(config) {
        if (!config || typeof config !== 'object') {
            return config;
        }

        const serialized = {};
        for (const [key, value] of Object.entries(config)) {
            if (typeof value === 'function') {
                // Skip functions - they can't be serialized
                continue;
            } else if (value && typeof value === 'object') {
                // Handle ColorPicker objects specially
                if (typeof value.getColor === 'function') {
                    // This is a ColorPicker - serialize its properties
                    serialized[key] = {
                        selectionType: value.selectionType || 'colorBucket',
                        colorValue: value.colorValue || null,
                        __className: 'ColorPicker'
                    };
                }
                // Recursively serialize nested objects, but extract values from method objects
                else if (typeof value.lower === 'function' && typeof value.upper === 'function') {
                    // Range object - safely extract the actual values
                    try {
                        serialized[key] = {
                            lower: value.lower(),
                            upper: value.upper()
                        };
                    } catch (error) {
                        console.warn(`⚠️ Failed to serialize range object ${key}:`, error.message);
                        // Fallback: try to extract raw numeric properties if methods fail
                        if (typeof value.lowerValue === 'number' && typeof value.upperValue === 'number') {
                            serialized[key] = {
                                lower: value.lowerValue,
                                upper: value.upperValue
                            };
                        } else {
                            // Last resort: serialize as regular object
                            serialized[key] = this.serializeConfigForIPC(value);
                        }
                    }
                } else {
                    // Regular object - recursively serialize
                    serialized[key] = this.serializeConfigForIPC(value);
                }
            } else {
                // Primitive values are safe
                serialized[key] = value;
            }
        }
        return serialized;
    }

    /**
     * Serialize all effect configs in a project for IPC transmission
     * @param {Object} project - Project data with effects
     * @returns {Object} Project with serialized configs
     */
    static serializeProjectForIPC(project) {
        if (!project || !project.effects) {
            return project;
        }

        return {
            ...project,
            effects: project.effects.map(effect => ({
                ...effect,
                config: this.serializeConfigForIPC(effect.config),
                // Also serialize secondary effects if they exist
                secondaryEffects: effect.secondaryEffects?.map(secEffect => ({
                    ...secEffect,
                    config: this.serializeConfigForIPC(secEffect.config)
                }))
            }))
        };
    }

    /**
     * Extract color scheme name from settings
     */
    static extractColorSchemeName(settings) {
        // Settings files don't typically have a scheme name, so we'll generate one
        // based on the color scheme info or use a default
        if (settings.colorScheme?.colorSchemeInfo) {
            const info = settings.colorScheme.colorSchemeInfo.toLowerCase();
            if (info.includes('vishuddha')) return 'vishuddha-chakra';
            if (info.includes('chakra')) return 'chakra-inspired';
        }

        // Default to a generic name
        return 'custom-scheme';
    }

    /**
     * Convert color scheme data from settings format
     */
    static convertColorSchemeData(settings) {
        if (!settings.colorScheme) return null;

        return {
            // Main color palette - NftProjectManager expects 'colors' array
            colors: settings.colorScheme.colorBucket || [],

            // Additional color categories from settings
            neutrals: settings.neutrals || [],
            backgrounds: settings.backgrounds || [],
            lights: settings.lights || [],

            // Preserve color scheme info
            info: settings.colorScheme.colorSchemeInfo || '',

            // Mark as converted from settings
            source: 'settings-conversion'
        };
    }

    /**
     * Validate that a settings file has the expected structure
     */
    static validateSettingsFile(settings) {
        const errors = [];

        if (!settings || typeof settings !== 'object') {
            errors.push('Settings must be a valid object');
            return errors;
        }

        // Check for at least one effect array
        const hasAnyEffects = settings.effects || settings.allPrimaryEffects ||
            settings.finalImageEffects || settings.allFinalImageEffects ||
            settings.additionalEffects || settings.allAdditionalEffects ||
            settings.secondaryEffects || settings.allSecondaryEffects ||
            settings.keyFrameEffects || settings.allKeyFrameEffects;

        if (!hasAnyEffects) {
            errors.push('Settings must contain at least one effects array (effects, allPrimaryEffects, finalImageEffects, etc.)');
        }

        // Validate array types for existing arrays
        const effectArrays = [
            'effects', 'allPrimaryEffects', 'finalImageEffects', 'allFinalImageEffects',
            'additionalEffects', 'allAdditionalEffects', 'secondaryEffects', 'allSecondaryEffects',
            'keyFrameEffects', 'allKeyFrameEffects'
        ];

        effectArrays.forEach(arrayName => {
            if (settings[arrayName] && !Array.isArray(settings[arrayName])) {
                errors.push(`${arrayName} must be an array`);
            }
        });

        if (!settings.config) {
            errors.push('Settings must contain config object');
        }

        if (!settings.finalSize) {
            errors.push('Settings must contain finalSize object');
        }

        return errors;
    }

    /**
     * Get a summary of what will be converted
     */
    static getConversionSummary(settings) {
        const validation = this.validateSettingsFile(settings);
        if (validation.length > 0) {
            return {
                valid: false,
                errors: validation
            };
        }

        return {
            valid: true,
            summary: {
                projectName: this.extractProjectName(settings),
                effectsCount: (settings.effects || settings.allPrimaryEffects)?.length || 0,
                numFrames: settings.config?.numberOfFrame || 100,
                resolution: `${settings.finalSize?.width || 0}x${settings.finalSize?.height || 0}`,
                hasColorScheme: !!settings.colorScheme,
                artist: settings.config?._INVOKER_ || 'Unknown'
            }
        };
    }
}