import electron from 'electron';
const { BrowserWindow, app } = electron;
import path from 'path';
import FileSystemRenderer from './FileSystemRenderer.js';
import defaultLogger from '../utils/logger.js';
import ProjectState from '../../models/ProjectState.js';
import SettingsToProjectConverter from '../../utils/SettingsToProjectConverter.js';
import ResolutionMapper from '../../utils/ResolutionMapper.js';
import { PluginManagerService } from '../../services/PluginManagerService.js';

/**
 * NFT-specific implementation of project management
 * Follows Open/Closed Principle - open for extension, closed for modification
 */
class NftProjectManager {
    constructor(logger = null) {
        // Dependency injection following Dependency Inversion Principle
        this.logger = logger || defaultLogger;
        this.activeProjects = new Map();
        this.fileSystemRenderer = new FileSystemRenderer();
        this.renderMethod = process.env.RENDER_METHOD || 'hybrid'; // 'base64', 'filesystem', or 'hybrid'

        // Initialize plugin manager
        const appDataPath = app.getPath('userData');
        this.pluginManager = new PluginManagerService(appDataPath);
        this.pluginManagerInitialized = false;
    }

    async ensurePluginsLoaded() {
        if (!this.pluginManagerInitialized) {
            await this.pluginManager.initialize();
            this.pluginManagerInitialized = true;
        }

        const pluginPaths = await this.pluginManager.loadPluginsForGeneration();
        if (pluginPaths.length > 0) {
            this.logger.info('Loading plugins for project:', pluginPaths);

            // Dynamically load PluginLoader from my-nft-gen
            try {
                const { PluginLoader } = await import('my-nft-gen/src/core/plugins/PluginLoader.js');

                let loadedAnyPlugin = false;
                for (const pluginInfo of pluginPaths) {
                    if (pluginInfo.success) {
                        try {
                            await PluginLoader.loadPlugin(pluginInfo.path);
                            this.logger.info(`✅ Plugin loaded: ${pluginInfo.name}`);
                            loadedAnyPlugin = true;
                        } catch (error) {
                            this.logger.error(`Failed to load plugin ${pluginInfo.name}:`, error);
                        }
                    }
                }

                // If we loaded any plugins, refresh the effect registry to include them
                if (loadedAnyPlugin) {
                    const EffectRegistryService = await import('../services/EffectRegistryService.js');
                    const registryService = new EffectRegistryService.default();
                    // Pass false to ensure plugins are reloaded since we just loaded new ones
                    await registryService.refreshRegistry(false);
                    this.logger.info('✅ Effect registry refreshed with loaded plugins');
                }
            } catch (error) {
                this.logger.error('Failed to load PluginLoader:', error);
            }
        }
    }

    /**
     * Start a new NFT project
     * @param {Object|ProjectState} projectInput - Project configuration or ProjectState instance
     * @returns {Promise<Object>} Project creation result
     */
    async startNewProject(projectInput) {
        this.logger.header('Starting New NFT Project');

        // Load plugins before starting the project
        await this.ensurePluginsLoaded();

        // Convert input to ProjectState if needed
        const projectState = await this.ensureProjectState(projectInput);
        const config = projectState.getState();

        this.logger.info('Project Configuration Received', {
            projectName: config.projectName,
            resolution: config.targetResolution,
            numberOfFrames: config.numFrames,
            colorScheme: config.colorScheme,
            effectsCount: config.effects?.length || 0
        });

        try {
            const project = await this.createProject(projectState);
            const settings = await this.createProjectSettings(project, projectState);

            // Store the project for potential reuse - only store essential objects, not duplicate state
            this.activeProjects.set(config.projectName, {
                project,
                settings,
                projectState  // Only store ProjectState - config can be derived via projectState.getState()
            });

            this.logger.success(`Project "${config.projectName}" initialized successfully`);

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
     * Resume an existing project directly using ResumeProject
     * @param {string} settingsPath - Path to project settings
     * @returns {Promise<Object>} Project resume result
     */
    async resumeProject(settingsPath) {
        this.logger.header('Resuming Project Using ResumeProject');

        // Load plugins before resuming the project
        await this.ensurePluginsLoaded();

        try {
            // Import the new ProjectResumer
            const { default: ProjectResumer } = await import('../../utils/ProjectResumer.js');

            // Use the simplified resume logic
            const resumeResult = await ProjectResumer.resumeFromSettings(settingsPath);

            if (resumeResult.success) {
                this.logger.success('Project resumed successfully via ResumeProject');
                return resumeResult;
            } else {
                this.logger.error('Project resume failed:', resumeResult.error);
                return resumeResult;
            }

        } catch (error) {
            this.logger.error('Failed to resume project', error);
            return {
                success: false,
                error: error.message,
                settingsPath: settingsPath
            };
        }
    }

    /**
     * Import project data from settings file for editing
     * @param {string} settingsPath - Path to project settings
     * @returns {Promise<Object>} Import result with project data
     */
    async importFromSettings(settingsPath) {
        this.logger.header('Importing Project from Settings File');

        try {
            const fs = await import('fs/promises');

            // Convert relative path to absolute path
            const absoluteSettingsPath = path.isAbsolute(settingsPath)
                ? settingsPath
                : path.resolve(process.cwd(), settingsPath);

            this.logger.info('Importing project from settings file:', absoluteSettingsPath);

            // Load and convert project settings file using existing logic
            let projectData = null;
            try {
                const settingsContent = await fs.readFile(absoluteSettingsPath, 'utf8');
                const settings = JSON.parse(settingsContent);

                // Get the project directory from the settings file location (remove 'settings' folder)
                const settingsDir = path.dirname(absoluteSettingsPath);
                const correctProjectDirectory = settingsDir.endsWith('settings')
                    ? path.dirname(settingsDir)
                    : settingsDir;

                this.logger.info('Converting settings file to project format...');
                // Convert and serialize for IPC in one step - skip position scaling for imports
                const convertedProject = await SettingsToProjectConverter.convertSettingsToProject(settings, null, true, true);

                projectData = {
                    ...convertedProject,
                    projectDirectory: correctProjectDirectory,
                    settingsFilePath: absoluteSettingsPath,
                    isReadOnly: false, // Allow editing of imported projects
                    isImported: true   // Mark as imported from settings (not resumed)
                };

                this.logger.info('✅ Project import successful:', {
                    projectName: projectData.projectName,
                    effectsCount: projectData.effects?.length || 0,
                    numFrames: projectData.numFrames,
                    resolution: projectData.targetResolution,
                    colorScheme: projectData.colorScheme,
                    artist: projectData.artist
                });

            } catch (loadError) {
                this.logger.error('Failed to load or convert settings file:', loadError);
                throw new Error(`Could not load settings file: ${loadError.message}`);
            }

            return {
                success: true,
                projectData: projectData,
                settingsPath: absoluteSettingsPath,
                message: `Successfully imported project "${projectData.projectName}" with ${projectData.effects?.length || 0} effects`
            };

        } catch (error) {
            this.logger.error('Failed to import project from settings', error);
            return {
                success: false,
                error: error.message,
                settingsPath: settingsPath
            };
        }
    }

    /**
     * Render a single frame
     * @param {Object|ProjectState} configInput - Project configuration or ProjectState instance
     * @param {number} frameNumber - Frame to render
     * @returns {Promise<Object>} Render result with buffer
     */
    async renderFrame(configInput, frameNumber) {
        // Load plugins before rendering
        await this.ensurePluginsLoaded();

        // Convert input to ProjectState if needed
        const projectState = await this.ensureProjectState(configInput);
        const config = projectState.getState();

        this.logger.info('Starting frame render', { frameNumber, config: config.projectName });

        // Log project configuration summary
        const effectsSummary = config?.effects?.map(e =>
            `${e.name}(${e.type}${e.visible ? '' : ',hidden'})`
        ).join(', ') || 'none';

        console.log(`🎬 Render setup: ${config?.projectName || 'Unnamed'} - ${effectsSummary}`);

        try {
            // Create a new NFT gen project every time
            const project = await this.createProject(projectState);

            // Configure the project based on UI parameters
            await this.configureProjectFromProjectState(project, projectState);

            // Generate single frame and return buffer
            const totalFrames = config.numFrames || 100;
            const startTime = Date.now();

            // Emit progress event
            this.emitProgressEvent('frameStarted', {
                frameNumber,
                totalFrames,
                projectName: config.projectName
            });

            const buffer = await project.generateSingleFrame(frameNumber, totalFrames, true);

            const renderTime = Date.now() - startTime;
            // Calculate progress - handle 0-indexed frames (0-99 for 100 frames)
            // Frame 0 = 1%, Frame 99 = 100%
            const framesCompleted = frameNumber + 1; // Convert to 1-indexed for progress
            const progress = Math.min(100, Math.max(1, Math.round((framesCompleted / totalFrames) * 100)));

            // Emit completion event
            this.emitProgressEvent('frameCompleted', {
                frameNumber,
                totalFrames,
                renderTime,
                progress,
                projectName: config.projectName
            });

            console.log(`✅ Frame ${frameNumber}/${totalFrames} (${renderTime}ms)`);

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
     * Ensure input is a ProjectState instance
     * @param {Object|ProjectState} input - Input to convert
     * @returns {Promise<ProjectState>} ProjectState instance
     */
    async ensureProjectState(input) {
        if (input instanceof ProjectState) {
            return input;
        }

        // Handle serialized ProjectState
        if (input && input.state && input.version) {
            return await ProjectState.fromObject(input);
        }

        // Handle legacy config objects
        return ProjectState.fromLegacyConfig(input);
    }

    /**
     * Configure project from ProjectState
     * @param {Object} project - Project instance to configure
     * @param {ProjectState} projectState - ProjectState instance
     * @returns {Promise<void>}
     */
    async configureProjectFromProjectState(project, projectState) {
        const config = projectState.getState();
        if (!config.effects || !Array.isArray(config.effects) || config.effects.length === 0) {
            console.log('⚠️  No effects configured for project');
            return;
        }

        // Filter visible effects - consistent with RenderPipelineService
        const visibleEffects = config.effects.filter(effect => effect.visible !== false);
        if (visibleEffects.length === 0) {
            console.log('⚠️  No visible effects configured for project');
            return;
        }

        const hiddenCount = config.effects.length - visibleEffects.length;
        if (hiddenCount > 0) {
            console.log(`🎭 Filtered out ${hiddenCount} hidden effects, processing ${visibleEffects.length} visible effects`);
        }

        const myNftGenPath = path.resolve(process.cwd(), '../my-nft-gen');
        const { default: effectProcessor } = await import('../services/EffectProcessingService.js');

        // Group effects by type while maintaining order
        const primaryEffects = [];
        const secondaryEffects = [];
        const keyframeEffects = [];
        const finalEffects = [];

        // Categorize effects while preserving their order
        for (const effect of visibleEffects) {
            const effectType = effect.type || 'primary';
            switch (effectType) {
                case 'secondary':
                    secondaryEffects.push(effect);
                    break;
                case 'keyframe':
                    keyframeEffects.push(effect);
                    break;
                case 'final':
                case 'finalImage':  // Support both naming conventions
                    finalEffects.push(effect);
                    break;
                case 'primary':
                default:
                    // Keep keyframe effects attached to primary effects - don't extract them
                    // The my-nft-gen library should handle keyframe effects as part of the primary effect
                    primaryEffects.push(effect);
                    
                    // Extract secondary effects from primary effects - handle both formats
                    const secondaryEffectsArray = effect.secondaryEffects || effect.attachedEffects?.secondary || [];
                    if (Array.isArray(secondaryEffectsArray) && secondaryEffectsArray.length > 0) {
                        for (const secondaryEffect of secondaryEffectsArray) {
                            // Add secondary effect with proper structure
                            secondaryEffects.push({
                                ...secondaryEffect,
                                type: 'secondary',
                                parentEffectIndex: primaryEffects.length - 1 // Reference to parent effect
                            });
                        }
                    }
                    break;
            }
        }

        // Process and add primary effects in order
        if (primaryEffects.length > 0) {
            // Log keyframe effects for debugging
            primaryEffects.forEach((effect, index) => {
                const keyframeEffects = effect.attachedEffects?.keyFrame || [];
                if (keyframeEffects.length > 0) {
                    console.log(`🎬 Primary effect ${index} (${effect.name || effect.className}) has ${keyframeEffects.length} keyframe effects:`, 
                        keyframeEffects.map(kf => `Frame ${kf.frame}: ${kf.registryKey}`));
                }
            });

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

        // Keyframe effects are now kept attached to their parent primary effects
        // and processed as part of the primary effect configuration

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
     * @param {ProjectState} projectState - ProjectState instance
     * @returns {Promise<Object>} Project instance
     */
    async createProject(projectState) {
        const projectConfig = projectState.getState();
        const {Project} = await import('my-nft-gen/src/app/Project.js');
        const {ColorScheme} = await import('my-nft-gen/src/core/color/ColorScheme.js');

        // SINGLE SOURCE OF TRUTH for dimensions
        let longestSide, shortestSide;
        const isHorizontal = projectConfig.isHorizontal;

        if (projectConfig.width && projectConfig.height) {
            // Direct dimensions from RenderPipeline (render-frame path)
            // These are already oriented correctly based on isHorizontal from ProjectState
            const width = projectConfig.width;
            const height = projectConfig.height;
            longestSide = Math.max(width, height);
            shortestSide = Math.min(width, height);
        } else if (projectConfig.longestSideInPixels && projectConfig.shortestSideInPixels) {
            // Imported project path - dimensions already set correctly
            longestSide = projectConfig.longestSideInPixels;
            shortestSide = projectConfig.shortestSideInPixels;
        } else {
            // New project or resume path - calculate from resolution
            const resolutionKey = projectConfig.resolution || projectConfig.targetResolution;
            const resolution = this.getResolutionFromConfig(resolutionKey);

            // Resolution mapping always returns landscape format (width > height)
            // Backend Project class will handle orientation based on isHorizontal flag
            longestSide = Math.max(resolution.width, resolution.height);
            shortestSide = Math.min(resolution.width, resolution.height);
        }

        // Build colorSchemeInfo from projectConfig.colorScheme
        const colorSchemeInfo = await this.buildColorSchemeInfo(projectConfig);

        // Ensure projectDirectory is always an absolute path
        let projectDirectory = projectConfig.projectDirectory || projectConfig.outputDirectory;
        if (!projectDirectory) {
            // Default to a subdirectory in the current working directory
            projectDirectory = path.resolve(process.cwd(), 'src/scratch');
        } else if (!path.isAbsolute(projectDirectory)) {
            // Convert relative paths to absolute paths relative to current working directory
            projectDirectory = path.resolve(process.cwd(), projectDirectory);
        }

        // Get plugin paths to pass to the project
        const pluginPaths = await this.pluginManager.loadPluginsForGeneration();
        const enabledPluginPaths = pluginPaths
            .filter(p => p.success)
            .map(p => p.path);

        const project = new Project({
            artist: projectConfig.artist || 'NFT Studio User',
            projectName: projectConfig.projectName,
            projectDirectory: projectDirectory,
            colorScheme: colorSchemeInfo.colorScheme, //my nft gen colorscheme
            pluginPaths: enabledPluginPaths, // Pass plugin paths to project
            neutrals: colorSchemeInfo.neutrals, //array of hex
            backgrounds: colorSchemeInfo.backgrounds, //array of hex
            lights: colorSchemeInfo.lights, //array of hex
            numberOfFrame: projectConfig.numFrames,
            longestSideInPixels: longestSide,
            shortestSideInPixels: shortestSide,
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
     * @param {ProjectState} projectState - ProjectState instance
     * @returns {Promise<Object>} Settings instance
     */
    async createProjectSettings(project, projectState) {
        const projectConfig = projectState.getState();
        const myNftGenPath = path.resolve(process.cwd(), '../my-nft-gen');
        const {Settings} = await import('my-nft-gen/src/app/Settings.js');

        // Process effects into LayerConfig instances
        const { default: effectProcessor } = await import('../services/EffectProcessingService.js');

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
     * Uses ResolutionMapper for consistency across the application
     * @param {string|number} resolutionKey - Resolution key (legacy) or pixel width (new)
     * @returns {Object} Resolution object with width and height
     */
    getResolutionFromConfig(resolutionKey) {
        try {
            // Use ResolutionMapper for consistency
            const dimensions = ResolutionMapper.getDimensions(resolutionKey);
            return {
                width: dimensions.w,
                height: dimensions.h
            };
        } catch (error) {
            console.warn(`Resolution ${resolutionKey} not found in ResolutionMapper, using default`, error);
            return {width: 1920, height: 1080};
        }
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
     * @returns {Object|null} Active project data with { project, settings, projectState }
     * Note: To get config, use activeProject.projectState.getState() - maintains single source of truth
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

    /**
     * Start render loop - continuously generates NEW random loops until stopped
     * @param {Object|ProjectState} configInput - Project configuration or ProjectState instance
     * @returns {Promise<Object>} Render loop result
     */
    async startRenderLoop(configInput) {
        // Convert input to ProjectState if needed
        const projectState = await this.ensureProjectState(configInput);
        const config = projectState.getState();

        console.log('🔥 NftProjectManager.startRenderLoop() called for NEW random loop generation');
        this.logger.header('Starting New Random Loop Generation');

        try {
            // Import event bus for render loop monitoring
            const {UnifiedEventBus} = await import('my-nft-gen/src/core/events/UnifiedEventBus.js');

            // Import the new loop terminator
            const { default: loopTerminator } = await import('../../core/events/LoopTerminator.js');

            // Create a new NFT gen project
            console.log('🎯 Creating project for new random loop generation');
            const project = await this.createProject(projectState);

            // Configure the project based on UI parameters (including effects!)
            await this.configureProjectFromProjectState(project, projectState);

            // Create and configure event bus for render loop
            const eventBus = new UnifiedEventBus({
                enableDebug: true,
                enableMetrics: true,
                enableEventHistory: true,
                maxHistorySize: 1000
            });

            // Set up event forwarding to renderer (so EventBusMonitor can receive events)
            this.setupEventForwarding(eventBus);

            // Attach event bus to the project for monitoring
            if (project) {
                project.eventBus = eventBus;
                console.log('✅ Event bus attached to new random loop project');
            }

            // Generate unique IDs for tracking
            const loopId = `random-loop-${Date.now()}`;
            const workerId = `worker-${loopId}`;

            // Set up loop control with new event-driven system
            this.renderLoopActive = true;
            this.activeRenderLoop = project;
            this.activeRenderLoopEventBus = eventBus;
            this.activeWorkerProcess = null;
            this.currentLoopId = loopId;
            this.currentWorkerId = workerId;

            // Register with loop terminator
            loopTerminator.registerWorker(workerId, loopId);

            // Set up event-driven termination listeners
            this.setupWorkerTerminationListeners(workerId, loopId);

            // Start the continuous random loop generation in background
            this.runRandomLoopGeneration(project, eventBus, loopId, workerId, projectState);

            this.logger.success('New random loop generation started');
            return { success: true, message: 'New random loop generation started', loopId, workerId };

        } catch (error) {
            this.logger.error('Random loop generation failed', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Start resume loop - resumes an existing project from settings
     * @param {Object|ProjectState} configInput - Project configuration or ProjectState instance
     * @returns {Promise<Object>} Resume result
     */
    async startResumeLoop(configInput) {
        // Convert input to ProjectState if needed
        const projectState = await this.ensureProjectState(configInput);
        const config = projectState.getState();

        // Validate this is actually a resumed project
        if (!config.isResumed || !config.settingsFilePath) {
            throw new Error('startResumeLoop called on non-resumed project. Use startRenderLoop for new projects.');
        }

        console.log('🔄 NftProjectManager.startResumeLoop() called for project resume from:', config.settingsFilePath);
        this.logger.header('Starting Project Resume');

        try {
            // Import event bus for render loop monitoring
            const {UnifiedEventBus} = await import('my-nft-gen/src/core/events/UnifiedEventBus.js');

            // Import the new loop terminator
            const { default: loopTerminator } = await import('../../core/events/LoopTerminator.js');

            // For resume, we don't create a new project - ResumeProject handles loading existing settings
            console.log('🎯 Resume will use existing settings file:', config.settingsFilePath);
            const project = null; // ResumeProject doesn't need a pre-created project instance

            // Create and configure event bus for resume
            const eventBus = new UnifiedEventBus({
                enableDebug: true,
                enableMetrics: true,
                enableEventHistory: true,
                maxHistorySize: 1000
            });

            // Set up event forwarding to renderer (so EventBusMonitor can receive events)
            this.setupEventForwarding(eventBus);

            // For resume, ResumeProject will handle project creation and event bus attachment
            console.log('✅ Event bus created for resumed project - ResumeProject will handle attachment');

            // Generate unique IDs for tracking
            const loopId = `resume-loop-${Date.now()}`;
            const workerId = `worker-${loopId}`;

            // Set up loop control with new event-driven system
            this.renderLoopActive = true;
            this.activeRenderLoop = project;
            this.activeRenderLoopEventBus = eventBus;
            this.activeWorkerProcess = null;
            this.currentLoopId = loopId;
            this.currentWorkerId = workerId;

            // Register with loop terminator
            loopTerminator.registerWorker(workerId, loopId);

            // Set up event-driven termination listeners
            this.setupWorkerTerminationListeners(workerId, loopId);

            // Start the project resume in background
            this.runProjectResume(project, eventBus, loopId, workerId, projectState);

            this.logger.success('Project resume started');
            return { success: true, message: 'Project resume started', loopId, workerId };

        } catch (error) {
            this.logger.error('Project resume failed', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Internal method to run random loop generation
     * @param {Object} project - Configured project instance
     * @param {Object} eventBus - Event bus for monitoring
     * @param {string} loopId - Unique loop identifier
     * @param {string} workerId - Unique worker identifier
     * @param {Object} projectState - Project state instance
     */
    async runRandomLoopGeneration(project, eventBus, loopId, workerId, projectState) {
        try {
            this.logger.info(`Starting generateRandomLoop for loop: ${loopId}, worker: ${workerId}`);

            // Emit render loop start event
            if (eventBus) {
                eventBus.emit('render.loop.start', {
                    timestamp: Date.now(),
                    projectName: project.projectName,
                    loopId,
                    workerId
                });
            }

            // Also emit via IPC for EventBusMonitor
            this.emitProgressEvent('render.loop.start', {
                timestamp: Date.now(),
                projectName: project.projectName,
                loopId,
                workerId
            });

            // Check if loop was terminated before starting
            if (!this.renderLoopActive) {
                this.logger.info('Render loop was terminated before starting generation');
                await this.cleanupWorker(workerId, 'terminated_before_start');
                return;
            }

            // Call generateRandomLoop directly for new random loops
            await this.generateRandomLoopWithTermination(project, workerId);

            // Only proceed if still active (not terminated)
            if (this.renderLoopActive) {
                this.logger.info('generateRandomLoop completed');

                // Emit render loop complete event
                if (eventBus) {
                    eventBus.emit('render.loop.complete', {
                        timestamp: Date.now(),
                        projectName: project.projectName,
                        loopId,
                        workerId
                    });
                }

                // Also emit via IPC for EventBusMonitor
                this.emitProgressEvent('render.loop.complete', {
                    timestamp: Date.now(),
                    projectName: project.projectName,
                    loopId,
                    workerId
                });

                // Mark render loop as inactive after completion
                this.renderLoopActive = false;
                
                // Unregister worker on completion
                await this.cleanupWorker(workerId, 'completed');
            }

        } catch (error) {
            this.logger.error('Render loop failed', error);

            // Emit error event
            if (eventBus) {
                eventBus.emit('render.loop.error', {
                    timestamp: Date.now(),
                    error: error.message,
                    projectName: project.projectName,
                    loopId,
                    workerId
                });
            }

            // Also emit via IPC for EventBusMonitor
            this.emitProgressEvent('render.loop.error', {
                timestamp: Date.now(),
                error: error.message,
                projectName: project.projectName,
                loopId,
                workerId
            });

            // Mark render loop as inactive after error
            this.renderLoopActive = false;
            
            // Unregister worker on error
            await this.cleanupWorker(workerId, 'error');
        }

        this.logger.success('Random loop generation finished');
    }

    /**
     * Internal method to run project resume
     * @param {Object} project - Configured project instance
     * @param {Object} eventBus - Event bus for monitoring
     * @param {string} loopId - Unique loop identifier
     * @param {string} workerId - Unique worker identifier
     * @param {Object} projectState - Project state instance
     */
    async runProjectResume(project, eventBus, loopId, workerId, projectState) {
        try {
            const config = projectState.getState();
            this.logger.info(`Starting ResumeProject for loop: ${loopId}, worker: ${workerId}, settings: ${config.settingsFilePath}`);

            // Emit project resume start event
            if (eventBus) {
                eventBus.emit('project.resume.start', {
                    timestamp: Date.now(),
                    projectName: project.projectName,
                    settingsFilePath: config.settingsFilePath,
                    loopId,
                    workerId
                });
            }

            // Also emit via IPC for EventBusMonitor
            this.emitProgressEvent('project.resume.start', {
                timestamp: Date.now(),
                projectName: project.projectName,
                settingsFilePath: config.settingsFilePath,
                loopId,
                workerId
            });

            // Check if loop was terminated before starting
            if (!this.renderLoopActive) {
                this.logger.info('Project resume was terminated before starting');
                await this.cleanupWorker(workerId, 'terminated_before_start');
                return;
            }

            // Call ResumeProject directly for resumed projects
            await this.resumeProjectWithTermination(project, workerId, projectState);

            // Only proceed if still active (not terminated)
            if (this.renderLoopActive) {
                this.logger.info('ResumeProject completed');

                // Emit project resume complete event
                if (eventBus) {
                    eventBus.emit('project.resume.complete', {
                        timestamp: Date.now(),
                        projectName: project.projectName,
                        loopId,
                        workerId
                    });
                }

                // Also emit via IPC for EventBusMonitor
                this.emitProgressEvent('project.resume.complete', {
                    timestamp: Date.now(),
                    projectName: project.projectName,
                    loopId,
                    workerId
                });

                // Mark render loop as inactive after completion
                this.renderLoopActive = false;

                // Unregister worker on completion
                await this.cleanupWorker(workerId, 'completed');
            }

        } catch (error) {
            this.logger.error('Project resume failed', error);

            // Emit error event
            if (eventBus) {
                eventBus.emit('project.resume.error', {
                    timestamp: Date.now(),
                    error: error.message,
                    projectName: project.projectName,
                    loopId,
                    workerId
                });
            }

            // Also emit via IPC for EventBusMonitor
            this.emitProgressEvent('project.resume.error', {
                timestamp: Date.now(),
                error: error.message,
                projectName: project.projectName,
                loopId,
                workerId
            });

            // Mark render loop as inactive after error
            this.renderLoopActive = false;

            // Unregister worker on error
            await this.cleanupWorker(workerId, 'error');
        }

        this.logger.success('Project resume finished');
    }

    /**
     * Generate random loop with proper termination support
     * @param {Object} project - Project instance
     * @param {string} workerId - Worker ID for tracking
     */
    async generateRandomLoopWithTermination(project, workerId) {
        // Create a race between the generation and termination
        return new Promise(async (resolve, reject) => {
            let generationPromise = null;
            let terminationListener = null;

            // Set up termination listener that can cancel the generation
            const setupTerminationListener = () => {
                return new Promise((terminationResolve) => {
                    const checkTermination = setInterval(() => {
                        if (!this.renderLoopActive) {
                            clearInterval(checkTermination);
                            this.logger.info('Random loop termination requested during generation');
                            terminationResolve('terminated');
                        }
                    }, 100); // Check every 100ms for faster response

                    // Store the interval so we can clear it later
                    terminationListener = checkTermination;
                });
            };

            try {
                // Start generateRandomLoop for new random loops only
                generationPromise = project.generateRandomLoop();
                const terminationPromise = setupTerminationListener();

                // Race between generation completion and termination request
                const result = await Promise.race([
                    generationPromise.then(() => 'completed'),
                    terminationPromise
                ]);

                if (result === 'terminated') {
                    this.logger.info('Random loop generation was terminated by user request');

                    // Try to find and kill any child processes
                    await this.killAnyActiveChildProcesses();

                    reject(new Error('Random loop generation terminated by user'));
                } else {
                    this.logger.info('Random loop generation completed successfully');
                    resolve();
                }

            } catch (error) {
                this.logger.error('Random loop generation failed:', error);
                reject(error);
            } finally {
                // Clean up the termination listener
                if (terminationListener) {
                    clearInterval(terminationListener);
                }
            }
        });
    }

    /**
     * Resume project with proper termination support
     * @param {Object} project - Project instance
     * @param {string} workerId - Worker ID for tracking
     * @param {Object} projectState - Project state instance
     */
    async resumeProjectWithTermination(project, workerId, projectState) {
        // Create a race between the resume and termination
        return new Promise(async (resolve, reject) => {
            let resumePromise = null;
            let terminationListener = null;

            // Set up termination listener that can cancel the resume
            const setupTerminationListener = () => {
                return new Promise((terminationResolve) => {
                    const checkTermination = setInterval(() => {
                        if (!this.renderLoopActive) {
                            clearInterval(checkTermination);
                            this.logger.info('Project resume termination requested during execution');
                            terminationResolve('terminated');
                        }
                    }, 100); // Check every 100ms for faster response

                    // Store the interval so we can clear it later
                    terminationListener = checkTermination;
                });
            };

            try {
                const config = projectState.getState();

                if (!config.settingsFilePath) {
                    throw new Error('No settings file path provided for project resume');
                }

                this.logger.info(`Using ResumeProject with settings: ${config.settingsFilePath}`);

                // Import ResumeProject function from my-nft-gen
                const { ResumeProject } = await import('my-nft-gen/src/app/ResumeProject.js');

                // Use ResumeProject for resumed projects
                resumePromise = ResumeProject(config.settingsFilePath, {
                    project,
                    eventCategories: ['PROGRESS', 'COMPLETION', 'ERROR'],
                    eventCallback: (data) => {
                        // Forward events to our event system
                        if (this.activeRenderLoopEventBus) {
                            this.activeRenderLoopEventBus.emit(data.eventName, data);
                        }
                    }
                });

                const terminationPromise = setupTerminationListener();

                // Race between resume completion and termination request
                const result = await Promise.race([
                    resumePromise.then(() => 'completed'),
                    terminationPromise
                ]);

                if (result === 'terminated') {
                    this.logger.info('Project resume was terminated by user request');

                    // Try to find and kill any child processes
                    await this.killAnyActiveChildProcesses();

                    reject(new Error('Project resume terminated by user'));
                } else {
                    this.logger.info('Project resume completed successfully');
                    resolve();
                }

            } catch (error) {
                this.logger.error('Project resume failed:', error);
                reject(error);
            } finally {
                // Clean up the termination listener
                if (terminationListener) {
                    clearInterval(terminationListener);
                }
            }
        });
    }
    
    /**
     * Kill any active child processes that might be running
     * This is a fallback method to ensure processes are terminated for both random loops and resumed projects
     */
    async killAnyActiveChildProcesses() {
        try {
            const { execSync } = await import('child_process');

            // Process patterns to search for - covers both random loops and resumed projects
            const processPatterns = [
                'GenerateLoopWorkerThread.js',  // Random loop generation worker threads
                'my-nft-gen',                   // ResumeProject and other my-nft-gen processes
                'RequestNewWorkerThread',       // General worker threads from my-nft-gen
                'RequestNewFrameBuilderThread'  // Frame builder threads
            ];

            for (const pattern of processPatterns) {
                try {
                    const psOutput = execSync(`ps aux | grep ${pattern} | grep -v grep`, { encoding: 'utf8' });
                    const lines = psOutput.trim().split('\n');

                    for (const line of lines) {
                        if (line.trim()) {
                            const parts = line.trim().split(/\s+/);
                            const pid = parts[1];
                            if (pid && !isNaN(pid)) {
                                this.logger.info(`Killing ${pattern} process PID: ${pid}`);
                                try {
                                    process.kill(parseInt(pid), 'SIGTERM');

                                    // Force kill after 3 seconds if still running
                                    setTimeout(() => {
                                        try {
                                            process.kill(parseInt(pid), 'SIGKILL');
                                        } catch (e) {
                                            // Process already dead, ignore
                                        }
                                    }, 3000);
                                } catch (killError) {
                                    this.logger.warn(`Failed to kill process ${pid}:`, killError.message);
                                }
                            }
                        }
                    }
                } catch (psError) {
                    // ps command failed, probably no matching processes for this pattern
                    this.logger.info(`No ${pattern} processes found to kill`);
                }
            }

        } catch (error) {
            this.logger.warn('Failed to kill child processes:', error.message);
        }
    }

    /**
     * Stop any active loop (random loop or resumed project) - uses event-driven worker termination
     * @returns {Promise<Object>} Stop result
     */
    async stopRenderLoop() {
        this.logger.info('Stopping active loop (random/resume) using event-driven termination');

        if (!this.renderLoopActive) {
            this.logger.info('No active loop found');
            return { success: true, message: 'No active loop was running' };
        }

        try {
            // Import the loop terminator
            const { killWorker } = await import('../../core/events/LoopTerminator.js');

            // Use event-driven worker termination
            if (this.currentWorkerId) {
                this.logger.info(`Terminating worker via event system: ${this.currentWorkerId}`);
                killWorker(this.currentWorkerId, 'SIGTERM');
            } else {
                // Fallback to old method if no worker ID
                this.logger.info('No worker ID available, using fallback termination');
                
                // Signal the loop to stop
                this.renderLoopActive = false;

                // If there's an active worker process, kill it
                if (this.activeWorkerProcess) {
                    this.logger.info('Killing active worker process');
                    this.activeWorkerProcess.kill('SIGTERM');
                    this.activeWorkerProcess = null;
                }
            }

            // Clean up will be handled by the event-driven system
            // But we still need to clean up local references
            await this.cleanupWorker(this.currentWorkerId || 'unknown', 'user_stopped');

            this.logger.success('Active loop stop initiated via event system');
            return { success: true, message: 'Active loop stopped via event system' };

        } catch (error) {
            this.logger.error('Failed to stop active loop via event system, using fallback', error);
            
            // Fallback to old method
            this.renderLoopActive = false;
            
            if (this.activeWorkerProcess) {
                this.activeWorkerProcess.kill('SIGTERM');
                this.activeWorkerProcess = null;
            }
            
            if (this.activeRenderLoopEventBus) {
                this.activeRenderLoopEventBus.removeAllListeners();
                this.activeRenderLoopEventBus.clear();
                this.activeRenderLoopEventBus = null;
            }
            
            this.activeRenderLoop = null;
            this.currentLoopId = null;
            this.currentWorkerId = null;
            
            return { success: true, message: 'Active loop stopped (fallback method)' };
        }
    }

    /**
     * Set up event-driven worker termination listeners
     * @param {string} workerId - Worker ID to listen for
     * @param {string} loopId - Loop ID associated with worker
     */
    setupWorkerTerminationListeners(workerId, loopId) {
        // Import EventBusService for listening to termination events
        import('../../services/EventBusService.js').then(({ default: EventBusService }) => {
            // Listen for specific worker kill commands
            const unsubscribeKillWorker = EventBusService.subscribe('killWorker', async (data) => {
                if (data.workerId === workerId || data.workerId === 'all') {
                    this.logger.info(`Received kill command for worker: ${workerId}`);
                    await this.terminateWorker(workerId, data.signal || 'SIGTERM');
                }
            }, { component: 'NftProjectManager' });

            // Listen for kill all workers commands
            const unsubscribeKillAllWorkers = EventBusService.subscribe('killAllWorkers', async (data) => {
                this.logger.info(`Received kill all workers command`);
                await this.terminateWorker(workerId, data.signal || 'SIGTERM');
            }, { component: 'NftProjectManager' });

            // Store unsubscribe functions for cleanup
            this.workerTerminationUnsubscribers = [unsubscribeKillWorker, unsubscribeKillAllWorkers];
        });
    }

    /**
     * Terminate a specific worker
     * @param {string} workerId - Worker ID to terminate
     * @param {string} signal - Signal to send (SIGTERM, SIGKILL, etc.)
     */
    async terminateWorker(workerId, signal = 'SIGTERM') {
        this.logger.info(`Terminating worker ${workerId} with signal ${signal}`);

        try {
            // Signal the loop to stop
            this.renderLoopActive = false;

            // If there's an active worker process, kill it
            if (this.activeWorkerProcess) {
                this.logger.info(`Killing active worker process with ${signal}`);
                this.activeWorkerProcess.kill(signal);
                this.activeWorkerProcess = null;
            }

            // Also try to kill any child processes that might be running
            await this.killAnyActiveChildProcesses();

            // Clean up worker
            await this.cleanupWorker(workerId, `terminated_${signal}`);

            // Import EventBusService to emit success event
            const { default: EventBusService } = await import('../../services/EventBusService.js');
            EventBusService.emit('workerKilled', {
                workerId,
                signal,
                timestamp: Date.now()
            }, { source: 'NftProjectManager' });

        } catch (error) {
            this.logger.error(`Failed to terminate worker ${workerId}:`, error);

            // Import EventBusService to emit failure event
            const { default: EventBusService } = await import('../../services/EventBusService.js');
            EventBusService.emit('workerKillFailed', {
                workerId,
                signal,
                error: error.message,
                timestamp: Date.now()
            }, { source: 'NftProjectManager' });
        }
    }

    /**
     * Clean up worker resources
     * @param {string} workerId - Worker ID to clean up
     * @param {string} reason - Reason for cleanup
     */
    async cleanupWorker(workerId, reason) {
        this.logger.info(`Cleaning up worker ${workerId} (reason: ${reason})`);

        try {
            // Clean up event bus if present
            if (this.activeRenderLoopEventBus) {
                this.logger.info('Cleaning up render loop event bus');
                this.activeRenderLoopEventBus.removeAllListeners();
                this.activeRenderLoopEventBus.clear();
                this.activeRenderLoopEventBus = null;
            }

            // Clean up project reference
            this.activeRenderLoop = null;
            this.currentLoopId = null;
            this.currentWorkerId = null;

            // Clean up termination listeners
            if (this.workerTerminationUnsubscribers) {
                this.workerTerminationUnsubscribers.forEach(unsubscribe => unsubscribe());
                this.workerTerminationUnsubscribers = null;
            }

            // Unregister from loop terminator
            const { default: loopTerminator } = await import('../../core/events/LoopTerminator.js');
            loopTerminator.unregisterWorker(workerId, reason);

        } catch (error) {
            this.logger.error(`Error during worker cleanup:`, error);
        }
    }

    /**
     * Emit progress events to the renderer process
     * @param {string} eventName - Name of the progress event
     * @param {Object} data - Event data
     */
    emitProgressEvent(eventName, data) {
        const event = {
            eventName,
            data,
            timestamp: Date.now(),
            category: 'PROGRESS',
            source: 'render-progress'
        };

        // Send to all browser windows
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
            window.webContents.send('eventbus-message', event);
        });

        // Also log to console for immediate feedback with ETA
        if (eventName === 'frameCompleted') {
            const { frameNumber, totalFrames, renderTime, progress } = data;

            // Calculate ETA
            if (!this.renderStartTime) {
                this.renderStartTime = Date.now() - renderTime;
            }

            const elapsedTime = Date.now() - this.renderStartTime;
            const framesCompleted = frameNumber + 1;
            const avgTimePerFrame = elapsedTime / framesCompleted;
            const remainingFrames = totalFrames - framesCompleted;
            const estimatedTimeRemaining = Math.round((remainingFrames * avgTimePerFrame) / 1000);

            // Format ETA
            let etaStr = '';
            if (estimatedTimeRemaining > 0) {
                if (estimatedTimeRemaining >= 60) {
                    const minutes = Math.floor(estimatedTimeRemaining / 60);
                    const seconds = estimatedTimeRemaining % 60;
                    etaStr = ` - ETA: ${minutes}m ${seconds}s`;
                } else {
                    etaStr = ` - ETA: ${estimatedTimeRemaining}s`;
                }
            }

            console.log(`📊 Progress: ${frameNumber}/${totalFrames} (${progress}%) - ${renderTime}ms${etaStr}`);

            // Reset on completion
            if (progress >= 100) {
                this.renderStartTime = null;
            }
        }
    }
}

export default NftProjectManager;