import { ipcMain } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import AsarFFmpegResolver from '../../utils/AsarFFmpegResolver.js';

/**
 * Preview-specific IPC handlers
 * Follows Interface Segregation Principle - only preview-related operations
 */
class PreviewHandlers {
    constructor(effectsManager) {
        this.effectsManager = effectsManager;
    }

    /**
     * Register all preview-related IPC handlers
     */
    register() {
        ipcMain.handle('preview-effect', async (event, {
            effectClass,
            effectConfig,
            attachedEffects = null,
            completeEffectData = null,
            frameNumber = 0,
            totalFrames = 60,
            projectSettings = {}
        }) => {
            return await this.handleEffectPreview({
                effectClass,
                effectConfig,
                attachedEffects,
                completeEffectData,
                frameNumber,
                totalFrames,
                projectSettings
            });
        });

        ipcMain.handle('preview-effect-thumbnail', async (event, {
            effectClass,
            effectConfig,
            frameNumber = 0,
            totalFrames = 60,
            projectSettings = {},
            thumbnailSize = 200
        }) => {
            return await this.handleEffectThumbnail({
                effectClass,
                effectConfig,
                frameNumber,
                totalFrames,
                projectSettings,
                thumbnailSize
            });
        });
    }

    /**
     * Handle effect preview generation
     * @param {Object} params - Preview parameters
     * @returns {Promise<Object>} Preview result
     */
    async handleEffectPreview(params) {
        try {
            const myNftGenPath = path.resolve(process.cwd(), '../my-nft-gen');

            // Import required modules using pathToFileURL for production compatibility
            const projectUrl = pathToFileURL(path.join(myNftGenPath, 'src/app/Project.js')).href;
            const colorSchemeUrl = pathToFileURL(path.join(myNftGenPath, 'src/core/color/ColorScheme.js')).href;
            
            const { Project } = await import(projectUrl);
            const { ColorScheme } = await import(colorSchemeUrl);
            const EffectRegistry = await this.effectsManager.effectRegistryService.getEffectRegistry();
            const ConfigRegistry = await this.effectsManager.effectRegistryService.getConfigRegistry();

            // Create preview project
            const previewProject = await this.createPreviewProject(params.projectSettings, myNftGenPath);

            // Get effect class and config
            const registeredEffect = await EffectRegistry.getEffect(params.effectClass);
            if (!registeredEffect) {
                throw new Error(`Effect not found: ${params.effectClass}`);
            }

            // Process config
            let processedConfig = await this.effectsManager.convertConfigToProperTypes(params.effectConfig);
            processedConfig = this.effectsManager.applyPoint2DCenterOverride(processedConfig, {
                resolution: { width: 800, height: 600 }
            });

            // Create effect instance and generate preview
            const configData = ConfigRegistry.getGlobal(params.effectClass);
            if (configData && configData.ConfigClass) {
                const ConfigClass = configData.ConfigClass;
                const configInstance = new ConfigClass(processedConfig);
                const effectInstance = new registeredEffect.EffectClass(configInstance);

                // Generate preview frame
                const canvas = previewProject.createCanvas();
                await effectInstance.apply(canvas, params.frameNumber, params.totalFrames, previewProject.getColorScheme());

                // Convert to base64
                const buffer = canvas.toBuffer('image/png');
                const base64 = buffer.toString('base64');

                return {
                    success: true,
                    preview: `data:image/png;base64,${base64}`,
                    frameNumber: params.frameNumber,
                    totalFrames: params.totalFrames
                };
            }

            throw new Error(`No config class found for effect: ${params.effectClass}`);

        } catch (error) {
            console.error('Error generating effect preview:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Handle effect thumbnail generation
     * @param {Object} params - Thumbnail parameters
     * @returns {Promise<Object>} Thumbnail result
     */
    async handleEffectThumbnail(params) {
        try {
            // Use same logic as preview but could add resizing logic here
            const previewResult = await this.handleEffectPreview({
                effectClass: params.effectClass,
                effectConfig: params.effectConfig,
                attachedEffects: null,
                completeEffectData: null,
                frameNumber: params.frameNumber,
                totalFrames: params.totalFrames,
                projectSettings: params.projectSettings
            });

            if (!previewResult.success) {
                return previewResult;
            }

            return {
                success: true,
                thumbnail: previewResult.preview,
                size: params.thumbnailSize
            };

        } catch (error) {
            console.error('Error generating effect thumbnail:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create preview project instance
     * @param {Object} projectSettings - Project settings
     * @param {string} myNftGenPath - Path to my-nft-gen
     * @returns {Promise<Object>} Preview project
     */
    async createPreviewProject(projectSettings, myNftGenPath) {
        // Use pathToFileURL for production compatibility
        const projectUrl = pathToFileURL(path.join(myNftGenPath, 'src/app/Project.js')).href;
        const colorSchemeUrl = pathToFileURL(path.join(myNftGenPath, 'src/core/color/ColorScheme.js')).href;
        
        const { Project } = await import(projectUrl);
        const { ColorScheme } = await import(colorSchemeUrl);

        const colorScheme = new ColorScheme({
            name: projectSettings.colorScheme || 'preview',
            neutrals: projectSettings.neutrals || ['#FFFFFF'],
            backgrounds: projectSettings.backgrounds || ['#000000'],
            lights: projectSettings.lights || ['#FF0000', '#00FF00', '#0000FF']
        });

        // Get FFmpeg configuration for current environment (dev/production)
        const ffmpegConfig = await AsarFFmpegResolver.getFFmpegConfig();

        const resolution = { width: 800, height: 600 };
        return new Project({
            projectName: 'preview',
            colorScheme: colorScheme,
            ffmpegConfig: ffmpegConfig, // FFmpeg configuration for ASAR compatibility
            neutrals: colorScheme.neutrals,
            backgrounds: colorScheme.backgrounds,
            lights: colorScheme.lights,
            numberOfFrame: 60,
            longestSideInPixels: Math.max(resolution.width, resolution.height),
            shortestSideInPixels: Math.min(resolution.width, resolution.height),
            isHorizontal: resolution.width >= resolution.height,
            projectDirectory: '/tmp/nft-studio-preview',
            frameStart: 0
        });
    }

    /**
     * Unregister all preview-related IPC handlers
     */
    unregister() {
        const handlers = [
            'preview-effect',
            'preview-effect-thumbnail'
        ];

        handlers.forEach(handler => {
            ipcMain.removeAllListeners(handler);
        });
    }
}

export default PreviewHandlers;