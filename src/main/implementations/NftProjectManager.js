const {BrowserWindow} = require('electron');
const path = require('path');
const FileSystemRenderer = require('./FileSystemRenderer');

/**
 * NFT-specific implementation of project management
 * Follows Open/Closed Principle - open for extension, closed for modification
 */
class NftProjectManager {
    constructor(logger = null) {
        // Dependency injection following Dependency Inversion Principle
        this.logger = logger || require('../utils/logger');
        this.activeProjects = new Map();
        this.fileSystemRenderer = new FileSystemRenderer();
        this.renderMethod = process.env.RENDER_METHOD || 'hybrid'; // 'base64', 'filesystem', or 'hybrid'
    }

    /**
     * Start a new NFT project
     * @param {Object} projectConfig - Project configuration
     * @returns {Promise<Object>} Project creation result
     */
    async startNewProject(projectConfig) {
        this.logger.header('Starting New NFT Project');
        this.logger.info('Project Configuration Received', {
            projectName: projectConfig.projectName,
            resolution: projectConfig.resolution,
            numberOfFrames: projectConfig.numberOfFrames,
            colorScheme: projectConfig.colorScheme,
            effectsCount: {
                primary: projectConfig.effects?.primary?.length || 0,
                final: projectConfig.effects?.final?.length || 0
            }
        });

        try {
            const project = await this.createProject(projectConfig);
            const settings = await this.createProjectSettings(project, projectConfig);

            // Store the project for potential reuse
            this.activeProjects.set(projectConfig.projectName, {
                project,
                settings,
                config: projectConfig
            });

            this.logger.success(`Project "${projectConfig.projectName}" initialized successfully`);

            return {
                success: true,
                projectPath: settings.getProjectDirectory(),
                settingsFile: settings.getSettingsFilePath()
            };

        } catch (error) {
            this.logger.error('Failed to start new project', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Resume an existing project
     * @param {string} settingsPath - Path to project settings
     * @returns {Promise<Object>} Project resume result
     */
    async resumeProject(settingsPath) {
        try {
            const {RequestNewWorkerThread} = await import('my-nft-gen/src/core/worker-threads/RequestNewWorkerThread.js');
            const {UnifiedEventBus} = await import('my-nft-gen/src/core/events/UnifiedEventBus.js');

            // Create event bus
            const eventBus = new UnifiedEventBus({
                enableDebug: false,
                enableMetrics: true,
                enableEventHistory: true
            });

            // Set up event forwarding
            this.setupEventForwarding(eventBus);

            // Start worker thread
            await RequestNewWorkerThread(settingsPath, eventBus);

            return {
                success: true,
                metrics: eventBus.getMetrics()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Render a single frame
     * @param {Object} config - Project configuration containing effect classes and config instances
     * @param {number} frameNumber - Frame to render
     * @returns {Promise<Object>} Render result with buffer
     */
    async renderFrame(config, frameNumber) {
        this.logger.info('Starting frame render', { frameNumber, config: config.projectName });

        // Debug the actual config received from UI
        console.log('🔍 DEBUG: Full config received from UI:', {
            configType: typeof config,
            configKeys: config ? Object.keys(config) : 'null config',
            effectsType: typeof config?.effects,
            effectsIsArray: Array.isArray(config?.effects),
            effectsLength: config?.effects?.length,
            firstEffectType: typeof config?.effects?.[0],
            firstEffectKeys: config?.effects?.[0] ? Object.keys(config.effects[0]) : 'no first effect'
        });

        try {
            // Create a new NFT gen project every time
            const project = await this.createProject(config);

            // Configure the project based on UI parameters
            await this.configureProjectFromUI(project, config);

            console.log('🎬 Backend frame generation:', {
                frameNumber: frameNumber,
                configNumFrames: config.numFrames,
                configRenderStartFrame: config.renderStartFrame,
                configRenderJumpFrames: config.renderJumpFrames,
                usingFrameNumber: frameNumber,
                usingTotalFrames: config.numFrames || 100
            });

            // Generate single frame and return buffer
            const totalFrames = config.numFrames || 100;
            const buffer = await project.generateSingleFrame(frameNumber, totalFrames, true);

            this.logger.success(`Frame ${frameNumber} rendered successfully`);

            return {
                success: true,
                frameBuffer: buffer,
                frameNumber: frameNumber
            };

        } catch (error) {
            this.logger.error('Failed to render frame', error);
            return {
                success: false,
                error: error.message,
                frameNumber: frameNumber
            };
        }
    }

    /**
     * Configure project from UI parameters including effect classes and config instances
     * @param {Object} project - Project instance to configure
     * @param {Object} config - UI configuration containing effects
     * @returns {Promise<void>}
     */
    async configureProjectFromUI(project, config) {
        if (!config.effects || !Array.isArray(config.effects) || config.effects.length === 0) {
            return;
        }

        const myNftGenPath = path.resolve(process.cwd(), '../my-nft-gen');
        const effectProcessor = require('../services/EffectProcessingService');

        // Group effects by type while maintaining order
        const primaryEffects = [];
        const secondaryEffects = [];
        const keyframeEffects = [];
        const finalEffects = [];

        // Categorize effects while preserving their order
        for (const effect of config.effects) {
            const effectType = effect.type || 'primary';
            switch (effectType) {
                case 'secondary':
                    secondaryEffects.push(effect);
                    break;
                case 'keyframe':
                    keyframeEffects.push(effect);
                    break;
                case 'final':
                    finalEffects.push(effect);
                    break;
                case 'primary':
                default:
                    primaryEffects.push(effect);
                    break;
            }
        }

        // Process and add primary effects in order
        if (primaryEffects.length > 0) {
            const processedEffects = await effectProcessor.processEffects(
                primaryEffects,
                myNftGenPath
            );

            for (const layerConfig of processedEffects) {
                project.addPrimaryEffect({layerConfig});
            }
        }

        // Process and add secondary effects if the project supports them
        if (secondaryEffects.length > 0 && project.addSecondaryEffect) {
            const processedEffects = await effectProcessor.processEffects(
                secondaryEffects,
                myNftGenPath
            );

            for (const layerConfig of processedEffects) {
                project.addSecondaryEffect({layerConfig});
            }
        }

        // Process and add keyframe effects if the project supports them
        if (keyframeEffects.length > 0 && project.addKeyframeEffect) {
            const processedEffects = await effectProcessor.processEffects(
                keyframeEffects,
                myNftGenPath
            );

            for (const layerConfig of processedEffects) {
                project.addKeyframeEffect({layerConfig});
            }
        }

        // Process and add final effects in order
        if (finalEffects.length > 0) {
            const processedEffects = await effectProcessor.processEffects(
                finalEffects,
                myNftGenPath
            );

            for (const layerConfig of processedEffects) {
                project.addFinalEffect({layerConfig});
            }
        }
    }

    /**
     * Create a new Project instance
     * @param {Object} projectConfig - Project configuration
     * @returns {Promise<Object>} Project instance
     */
    async createProject(projectConfig) {
        const {Project} = await import('my-nft-gen/src/app/Project.js');
        const {ColorScheme} = await import('my-nft-gen/src/core/color/ColorScheme.js');

        console.log('🔍 Backend resolution debug:', {
            'projectConfig.resolution': projectConfig.resolution,
            'projectConfig.targetResolution': projectConfig.targetResolution,
            'projectConfig.width': projectConfig.width,
            'projectConfig.height': projectConfig.height
        });

        // Use targetResolution if resolution is not provided (for Canvas renders)
        const resolutionKey = projectConfig.resolution || projectConfig.targetResolution;
        const resolution = this.getResolutionFromConfig(resolutionKey);
        const isHorizontal = projectConfig.isHorizontal;

        console.log('🎯 Backend using resolution:', { resolutionKey, resolution, isHorizontal });

        // Build colorSchemeInfo from projectConfig.colorScheme
        const colorSchemeInfo = await this.buildColorSchemeInfo(projectConfig);

        const project = new Project({
            artist: projectConfig.artist || 'NFT Studio User',
            projectName: projectConfig.projectName,
            projectDirectory: projectConfig.projectDirectory || 'src/scratch',
            colorScheme: colorSchemeInfo.colorScheme, //my nft gen colorscheme
            neutrals: colorSchemeInfo.neutrals, //array of hex
            backgrounds: colorSchemeInfo.backgrounds, //array of hex
            lights: colorSchemeInfo.lights, //array of hex
            numberOfFrame: projectConfig.numberOfFrames,
            longestSideInPixels: Math.max(resolution.width, resolution.height),
            shortestSideInPixels: Math.min(resolution.width, resolution.height),
            isHorizontal: isHorizontal,
            maxConcurrentFrameBuilderThreads: 1,
            renderJumpFrames: 1,
            frameStart: 0
        });

        return project;
    }

    /**
     * Build colorSchemeInfo from projectConfig
     * @param {Object} projectConfig - Project configuration
     * @returns {Promise<Object>} Color scheme info object
     */
    async buildColorSchemeInfo(projectConfig) {
        // If colorSchemeInfo is already provided, use it directly
        if (projectConfig.colorSchemeInfo) {
            return projectConfig.colorSchemeInfo;
        }

        // UI must provide complete color scheme data - no defaults, no fallbacks
        if (!projectConfig.colorSchemeData) {
            throw new Error('MISSING colorSchemeData: UI must provide complete color scheme data');
        }

        const colorSchemeData = projectConfig.colorSchemeData;

        // Strict validation - fail fast if data is incomplete
        if (!colorSchemeData.colors) {
            throw new Error('MISSING colorSchemeData.colors array');
        }
        if (!Array.isArray(colorSchemeData.colors)) {
            throw new Error('INVALID colorSchemeData.colors: must be array');
        }
        if (colorSchemeData.colors.length === 0) {
            throw new Error('EMPTY colorSchemeData.colors: must contain hex colors');
        }

        if (!colorSchemeData.lights) {
            throw new Error('MISSING colorSchemeData.lights array');
        }
        if (!Array.isArray(colorSchemeData.lights)) {
            throw new Error('INVALID colorSchemeData.lights: must be array');
        }
        if (colorSchemeData.lights.length === 0) {
            throw new Error('EMPTY colorSchemeData.lights: must contain hex colors');
        }

        if (!colorSchemeData.neutrals) {
            throw new Error('MISSING colorSchemeData.neutrals array');
        }
        if (!Array.isArray(colorSchemeData.neutrals)) {
            throw new Error('INVALID colorSchemeData.neutrals: must be array');
        }
        if (colorSchemeData.neutrals.length === 0) {
            throw new Error('EMPTY colorSchemeData.neutrals: must contain hex colors');
        }

        if (!colorSchemeData.backgrounds) {
            throw new Error('MISSING colorSchemeData.backgrounds array');
        }
        if (!Array.isArray(colorSchemeData.backgrounds)) {
            throw new Error('INVALID colorSchemeData.backgrounds: must be array');
        }
        if (colorSchemeData.backgrounds.length === 0) {
            throw new Error('EMPTY colorSchemeData.backgrounds: must contain hex colors');
        }

        // Import ColorScheme - let it fail if my-nft-gen not available
        const {ColorScheme} = await import('my-nft-gen/src/core/color/ColorScheme.js');

        // Create ColorScheme instance - colorBucket comes from colors, not lights
        const colorScheme = new ColorScheme({
            colorBucket: colorSchemeData.colors,
            colorSchemeInfo: colorSchemeData.name
        });

        return {
            colorScheme: colorScheme,
            neutrals: colorSchemeData.neutrals,
            backgrounds: colorSchemeData.backgrounds,
            lights: colorSchemeData.lights
        };
    }

    /**
     * Create project settings
     * @param {Object} project - Project instance
     * @param {Object} projectConfig - Project configuration
     * @returns {Promise<Object>} Settings instance
     */
    async createProjectSettings(project, projectConfig) {
        const myNftGenPath = path.resolve(process.cwd(), '../my-nft-gen');
        const {Settings} = await import('my-nft-gen/src/app/Settings.js');

        // Process effects into LayerConfig instances
        const effectProcessor = require('../services/EffectProcessingService');

        // Extract primary effects from the effects array
        let primaryEffects = [];

        if (Array.isArray(projectConfig.effects)) {
            // Filter only primary effects for settings (as Settings typically only handles primary effects)
            primaryEffects = projectConfig.effects.filter(e => !e.type || e.type === 'primary');
        } else if (projectConfig.effects?.primary) {
            // Backward compatibility: handle old structure
            primaryEffects = projectConfig.effects.primary;
        }

        const allPrimaryEffects = await effectProcessor.processEffects(
            primaryEffects,
            myNftGenPath
        );

        const settings = new Settings(project, allPrimaryEffects);
        await settings.save();

        return settings;
    }

    /**
     * Get resolution configuration from resolution key or pixel width
     * @param {string|number} resolutionKey - Resolution key (legacy) or pixel width (new)
     * @returns {Object} Resolution object with width and height
     */
    getResolutionFromConfig(resolutionKey) {
        // If it's a number, treat it as pixel width (new format)
        if (typeof resolutionKey === 'number' || !isNaN(parseInt(resolutionKey))) {
            const width = parseInt(resolutionKey);

            // Complete resolution mapping to match ResolutionMapper
            const allResolutions = {
                160: {width: 160, height: 120},
                240: {width: 240, height: 180},
                320: {width: 320, height: 240},
                360: {width: 360, height: 640},
                375: {width: 375, height: 667},
                414: {width: 414, height: 736},
                480: {width: 480, height: 360},
                640: {width: 640, height: 480},
                800: {width: 800, height: 600},
                854: {width: 854, height: 480},
                960: {width: 960, height: 540},
                1024: {width: 1024, height: 768},
                1080: {width: 1080, height: 1080},
                1152: {width: 1152, height: 864},
                1280: {width: 1280, height: 720},
                1366: {width: 1366, height: 768},
                1440: {width: 1440, height: 900},
                1600: {width: 1600, height: 900},
                1680: {width: 1680, height: 1050},
                1920: {width: 1920, height: 1080},
                2048: {width: 2048, height: 1080},
                2560: {width: 2560, height: 1440},
                2880: {width: 2880, height: 1620},
                3200: {width: 3200, height: 1800},
                3440: {width: 3440, height: 1440},
                3840: {width: 3840, height: 2160},
                4096: {width: 4096, height: 2160},
                5120: {width: 5120, height: 2880},
                6144: {width: 6144, height: 3456},
                7680: {width: 7680, height: 4320},
                8192: {width: 8192, height: 4320}
            };

            return allResolutions[width] || {width: 1920, height: 1080};
        }

        // Legacy string-based resolution mapping for backward compatibility
        const legacyResolutionMap = {
            'hd': {width: 1920, height: 1080},
            'fhd': {width: 1920, height: 1080},
            '4k': {width: 3840, height: 2160},
            'uhd': {width: 3840, height: 2160},
            'square_hd': {width: 1080, height: 1080},
            'square_4k': {width: 2160, height: 2160}
        };

        return legacyResolutionMap[resolutionKey] || {width: 1920, height: 1080};
    }

    /**
     * Set up event forwarding to renderer
     * @param {Object} eventBus - Event bus instance
     */
    setupEventForwarding(eventBus) {
        const forwardEventToRenderer = (eventName, data) => {
            this.logger.event(eventName, data);
            if (BrowserWindow.getAllWindows().length > 0) {
                BrowserWindow.getAllWindows()[0].webContents.send('worker-event', {eventName, data});
            }
        };

        const originalEmit = eventBus.emit.bind(eventBus);
        eventBus.emit = function (eventName, data) {
            const result = originalEmit(eventName, data);
            forwardEventToRenderer(eventName, data);
            return result;
        };
    }

    /**
     * Get active project
     * @param {string} projectName - Project name
     * @returns {Object|null} Active project data
     */
    getActiveProject(projectName) {
        return this.activeProjects.get(projectName) || null;
    }

    /**
     * Clear all active projects
     */
    clearActiveProjects() {
        this.activeProjects.clear();
    }
}

module.exports = NftProjectManager;