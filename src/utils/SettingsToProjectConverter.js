import settingsValidationService from '../services/SettingsValidationService.js';
import resolutionConversionService from '../services/ResolutionConversionService.js';
import projectMetadataService from '../services/ProjectMetadataService.js';
import colorSchemeConversionService from '../services/ColorSchemeConversionService.js';
import ipcSerializationService from '../services/IPCSerializationService.js';
import effectConversionService from '../services/EffectConversionService.js';

/**
 * Converts settings files (render configuration) to project format (UI state)
 * Settings files contain detailed effect configurations for rendering
 * Project files contain UI-friendly effect data for editing
 * 
 * REFACTORED: Decomposed into focused services as part of God Object Destruction Plan - Phase 6, Step 6.4
 * 
 * This class now acts as a facade/orchestrator, delegating to specialized services:
 * - SettingsValidationService: Validates settings file structure
 * - ResolutionConversionService: Handles resolution and orientation conversion
 * - ProjectMetadataService: Extracts project metadata (name, artist, output directory)
 * - ColorSchemeConversionService: Converts color schemes
 * - IPCSerializationService: Serializes configs for IPC transmission
 * - EffectConversionService: Converts effects and hydrates configs
 * 
 * Original size: 852 lines
 * Refactored size: ~120 lines (86% reduction)
 * Services created: 6 focused services
 */
export default class SettingsToProjectConverter {

    /**
     * Convert a settings file to project format
     * @param {Object} settings - The settings file data
     * @param {string} projectName - Optional project name override
     * @param {boolean} serializeForIPC - Whether to serialize complex objects for IPC transmission
     * @param {boolean} skipPositionScaling - Whether to skip position scaling
     * @returns {Promise<Object>} Project data compatible with ProjectState
     */
    static async convertSettingsToProject(settings, projectName = null, serializeForIPC = false, skipPositionScaling = false) {
        console.log('🔄 SettingsToProjectConverter: Converting settings to project format');
        console.log('📄 Settings structure:', {
            hasEffects: !!settings.effects,
            hasAllPrimaryEffects: !!settings.allPrimaryEffects,
            effectsCount: (settings.effects || settings.allPrimaryEffects)?.length || 0,
            hasConfig: !!settings.config,
            hasFinalSize: !!settings.finalSize,
            finalSize: settings.finalSize,
            hasColorScheme: !!settings.colorScheme
        });

        try {
            // Delegate to services for conversion
            const renderSettings = projectMetadataService.extractRenderSettings(settings);
            
            let project = {
                // Extract project name from settings or use provided name
                projectName: projectName || projectMetadataService.extractProjectName(settings),

                // Extract artist info if available
                artist: projectMetadataService.extractArtist(settings),

                // Convert resolution information
                targetResolution: resolutionConversionService.convertResolution(settings),

                // Determine orientation from resolution
                isHorizontal: resolutionConversionService.determineOrientation(settings),

                // Convert frame count
                numFrames: projectMetadataService.extractFrameCount(settings),

                // Convert effects from effects array (contains correct registry keys)
                effects: await effectConversionService.convertAllEffects(settings),

                // Convert color scheme
                colorScheme: colorSchemeConversionService.extractColorSchemeName(settings),
                colorSchemeData: colorSchemeConversionService.convertColorSchemeData(settings),

                // Set default render settings - extract from settings fileOut
                outputDirectory: projectMetadataService.extractOutputDirectory(settings),
                renderStartFrame: renderSettings.renderStartFrame,
                renderJumpFrames: renderSettings.renderJumpFrames,

                // Preserve exact resolution from settings as source of truth
                settingsResolution: settings.finalSize ? {
                    width: settings.finalSize.width,
                    height: settings.finalSize.height,
                    source: 'settings-file'
                } : null
            };

            // Apply position scaling if resolution changed (skip for imports)
            if (!skipPositionScaling) {
                project = await effectConversionService.scalePositionsIfNeeded(project, settings);
            } else {
                console.log('🎯 Skipping position scaling for imported project');
            }

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
                project = ipcSerializationService.serializeProjectForIPC(project);
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
     * @deprecated Use projectMetadataService.extractProjectName() instead
     */
    static extractProjectName(settings) {
        return projectMetadataService.extractProjectName(settings);
    }

    /**
     * Extract output directory from settings
     * @deprecated Use projectMetadataService.extractOutputDirectory() instead
     */
    static extractOutputDirectory(settings) {
        return projectMetadataService.extractOutputDirectory(settings);
    }

    /**
     * Convert resolution from settings format to project format
     * @deprecated Use resolutionConversionService.convertResolution() instead
     */
    static convertResolution(settings) {
        return resolutionConversionService.convertResolution(settings);
    }

    /**
     * Determine if the project is horizontal based on resolution
     * @deprecated Use resolutionConversionService.determineOrientation() instead
     */
    static determineOrientation(settings) {
        return resolutionConversionService.determineOrientation(settings);
    }

    /**
     * Convert all effects from settings to UI format
     * @deprecated Use effectConversionService.convertAllEffects() instead
     */
    static async convertAllEffects(settings) {
        return effectConversionService.convertAllEffects(settings);
    }

    /**
     * Convert effects array to UI effects format
     * @deprecated Use effectConversionService.convertEffects() instead
     */
    static async convertEffects(effectsArray, effectType = 'primary') {
        return effectConversionService.convertEffects(effectsArray, effectType);
    }

    /**
     * Convert effect configuration from settings format to UI format
     * @deprecated Use effectConversionService.convertEffectConfig() instead
     */
    static async convertEffectConfig(settingsConfig, effectName) {
        return effectConversionService.convertEffectConfig(settingsConfig, effectName);
    }

    /**
     * Serialize config objects for IPC
     * @deprecated Use ipcSerializationService.serializeConfigForIPC() instead
     */
    static serializeConfigForIPC(config) {
        return ipcSerializationService.serializeConfigForIPC(config);
    }

    /**
     * Serialize project for IPC
     * @deprecated Use ipcSerializationService.serializeProjectForIPC() instead
     */
    static serializeProjectForIPC(project) {
        return ipcSerializationService.serializeProjectForIPC(project);
    }

    /**
     * Extract color scheme name from settings
     * @deprecated Use colorSchemeConversionService.extractColorSchemeName() instead
     */
    static extractColorSchemeName(settings) {
        return colorSchemeConversionService.extractColorSchemeName(settings);
    }

    /**
     * Convert color scheme data from settings format
     * @deprecated Use colorSchemeConversionService.convertColorSchemeData() instead
     */
    static convertColorSchemeData(settings) {
        return colorSchemeConversionService.convertColorSchemeData(settings);
    }

    /**
     * Validate settings file structure
     * @deprecated Use settingsValidationService.validateSettingsFile() instead
     */
    static validateSettingsFile(settings) {
        return settingsValidationService.validateSettingsFile(settings);
    }

    /**
     * Scale positions if resolution changed
     * @deprecated Use effectConversionService.scalePositionsIfNeeded() instead
     */
    static async scalePositionsIfNeeded(project, settings) {
        return effectConversionService.scalePositionsIfNeeded(project, settings);
    }

    /**
     * Get conversion summary
     * @deprecated Use settingsValidationService.getConversionSummary() instead
     */
    static getConversionSummary(settings) {
        return settingsValidationService.getConversionSummary(settings, (s) => projectMetadataService.extractProjectName(s));
    }
}