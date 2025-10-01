import electron from 'electron';
const { app } = electron;
import path from 'path';
import FileSystemRenderer from './FileSystemRenderer.js';
import defaultLogger from '../utils/logger.js';
import ProjectState from '../../models/ProjectState.js';
import { PluginLifecycleManager } from '../../services/PluginLifecycleManager.js';
import { ProjectLifecycleManager } from '../../services/ProjectLifecycleManager.js';
import { RenderCoordinator } from '../../services/RenderCoordinator.js';
import { PluginManagerService } from '../../services/PluginManagerService.js';

/**
 * NFT-specific implementation of project management - REFACTORED
 * 
 * This is the refactored version that uses extracted services:
 * - PluginLifecycleManager for plugin management
 * - ProjectLifecycleManager for project lifecycle operations
 * - RenderCoordinator for render operations
 * 
 * Responsibilities (after refactoring):
 * - Service coordination and orchestration
 * - High-level project workflow management
 * - Effect configuration and processing
 * - IPC communication handling
 * - Legacy API compatibility
 */
class NftProjectManager {
    constructor(logger = null, eventBus = null) {
        // Dependency injection following Dependency Inversion Principle
        this.logger = logger || defaultLogger;
        this.fileSystemRenderer = new FileSystemRenderer();
        this.renderMethod = process.env.RENDER_METHOD || 'hybrid';

        // Initialize extracted services
        let appDataPath;
        try {
            appDataPath = app && app.getPath ? app.getPath('userData') : '/tmp/nft-studio-test';
        } catch (error) {
            // Fallback for test environment
            appDataPath = '/tmp/nft-studio-test';
        }
        const pluginManagerService = new PluginManagerService(appDataPath);
        
        this.pluginLifecycleManager = new PluginLifecycleManager(
            pluginManagerService, 
            eventBus, 
            this.logger
        );
        
        this.projectLifecycleManager = new ProjectLifecycleManager(
            null, // fileSystem - for future abstraction
            null, // validator - for future abstraction
            eventBus,
            this.logger
        );
        
        this.renderCoordinator = new RenderCoordinator(
            null, // renderEngine - for future abstraction
            null, // queueManager - for future abstraction
            eventBus,
            this.logger
        );
    }

    /**
     * Start a new NFT project
     * @param {Object|ProjectState} projectInput - Project configuration or ProjectState instance
     * @returns {Promise<Object>} Project creation result
     */
    async startNewProject(projectInput) {
        this.logger.header('Starting New NFT Project');

        try {
            // Ensure plugins are loaded
            await this.pluginLifecycleManager.ensurePluginsLoaded();

            // Convert input to ProjectState if needed
            const projectState = await this.projectLifecycleManager.ensureProjectState(projectInput);
            const config = projectState.getState();

            this.logger.info('Project Configuration Received', {
                projectName: config.projectName,
                resolution: config.targetResolution,
                numberOfFrames: config.numFrames,
                colorScheme: config.colorScheme,
                effectsCount: config.effects?.length || 0
            });

            // Create project using ProjectLifecycleManager
            const projectResult = await this.projectLifecycleManager.createProject(projectState);

            if (!projectResult.success) {
                throw new Error('Failed to create project');
            }

            // Configure effects on the project
            await this.configureProjectFromProjectState(projectResult.project, projectState);

            this.logger.success(`Project "${config.projectName}" initialized successfully`);

            return {
                success: true,
                projectPath: projectResult.projectPath,
                settingsFile: projectResult.settingsFile
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
        this.logger.header('Resuming Project');

        try {
            // Ensure plugins are loaded
            await this.pluginLifecycleManager.ensurePluginsLoaded();

            // Load project using ProjectLifecycleManager
            const result = await this.projectLifecycleManager.loadProject(settingsPath);

            if (result.success) {
                this.logger.success('Project resumed successfully');
            } else {
                this.logger.error('Project resume failed:', result.error);
            }

            return result;

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
            // Use ProjectLifecycleManager for import
            const result = await this.projectLifecycleManager.importFromSettings(settingsPath);
            
            if (result.success) {
                this.logger.success('Project imported successfully');
            } else {
                this.logger.error('Project import failed:', result.error);
            }

            return result;

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
        try {
            // Ensure plugins are loaded
            await this.pluginLifecycleManager.ensurePluginsLoaded();

            // Convert input to ProjectState if needed
            const projectState = await this.projectLifecycleManager.ensureProjectState(configInput);
            const config = projectState.getState();

            this.logger.info('Starting frame render', { frameNumber, config: config.projectName });

            // Create project using ProjectLifecycleManager
            const projectResult = await this.projectLifecycleManager.createProject(projectState);
            if (!projectResult.success) {
                throw new Error('Failed to create project for rendering');
            }

            // Configure the project based on UI parameters
            await this.configureProjectFromProjectState(projectResult.project, projectState);

            // Use RenderCoordinator for frame rendering
            const renderResult = await this.renderCoordinator.renderFrame(
                projectResult.project,
                frameNumber,
                config.numFrames || 100,
                config.projectName
            );

            return renderResult;

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
     * Start render loop - continuously generates NEW random loops until stopped
     * @param {Object|ProjectState} configInput - Project configuration or ProjectState instance
     * @returns {Promise<Object>} Render loop result
     */
    async startRenderLoop(configInput) {
        try {
            // Ensure plugins are loaded
            await this.pluginLifecycleManager.ensurePluginsLoaded();

            // Convert input to ProjectState if needed
            const projectState = await this.projectLifecycleManager.ensureProjectState(configInput);

            console.log('🔥 NftProjectManager.startRenderLoop() - delegating to RenderCoordinator');

            // Create project using ProjectLifecycleManager
            const projectResult = await this.projectLifecycleManager.createProject(projectState);
            if (!projectResult.success) {
                throw new Error('Failed to create project for render loop');
            }

            // Configure the project based on UI parameters
            await this.configureProjectFromProjectState(projectResult.project, projectState);

            // Use RenderCoordinator for render loop
            return await this.renderCoordinator.startRenderLoop(projectResult.project, projectState);

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
        try {
            // Ensure plugins are loaded
            await this.pluginLifecycleManager.ensurePluginsLoaded();

            // Convert input to ProjectState if needed
            const projectState = await this.projectLifecycleManager.ensureProjectState(configInput);

            console.log('🔄 NftProjectManager.startResumeLoop() - delegating to RenderCoordinator');

            // Use RenderCoordinator for resume loop (project can be null for resume)
            return await this.renderCoordinator.startResumeLoop(null, projectState);

        } catch (error) {
            this.logger.error('Project resume failed', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Stop any active loop (random loop or resumed project)
     * @returns {Promise<Object>} Stop result
     */
    async stopRenderLoop() {
        this.logger.info('Stopping active loop - delegating to RenderCoordinator');
        return await this.renderCoordinator.stopRenderLoop();
    }

    /**
     * Get active project
     * @param {string} projectName - Project name
     * @returns {Object|null} Active project data
     */
    getActiveProject(projectName) {
        return this.projectLifecycleManager.getActiveProject(projectName);
    }

    /**
     * Clear all active projects
     */
    clearActiveProjects() {
        this.projectLifecycleManager.clearActiveProjects();
    }

    /**
     * Get render status
     * @returns {Object} Current render status
     */
    getRenderStatus() {
        return this.renderCoordinator.getRenderStatus();
    }

    /**
     * Get plugin status
     * @returns {Object} Current plugin status
     */
    getPluginStatus() {
        return {
            isInitialized: this.pluginLifecycleManager.isInitialized(),
            loadedPluginCount: this.pluginLifecycleManager.getLoadedPluginCount(),
            loadedPlugins: this.pluginLifecycleManager.getLoadedPlugins()
        };
    }

    // Effect configuration methods (remaining core responsibility)

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
                case 'finalImage':
                    finalEffects.push(effect);
                    break;
                case 'primary':
                default:
                    primaryEffects.push(effect);
                    
                    // Extract secondary effects from primary effects
                    const secondaryEffectsArray = effect.secondaryEffects || effect.attachedEffects?.secondary || [];
                    if (Array.isArray(secondaryEffectsArray) && secondaryEffectsArray.length > 0) {
                        for (const secondaryEffect of secondaryEffectsArray) {
                            secondaryEffects.push({
                                ...secondaryEffect,
                                type: 'secondary',
                                parentEffectIndex: primaryEffects.length - 1
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

    // Legacy compatibility methods (delegate to appropriate services)

    /**
     * Ensure input is a ProjectState instance (legacy compatibility)
     * @param {Object|ProjectState} input - Input to convert
     * @returns {Promise<ProjectState>} ProjectState instance
     */
    async ensureProjectState(input) {
        return await this.projectLifecycleManager.ensureProjectState(input);
    }

    /**
     * Ensure plugins are loaded (legacy compatibility)
     * @returns {Promise<void>}
     */
    async ensurePluginsLoaded() {
        return await this.pluginLifecycleManager.ensurePluginsLoaded();
    }

    /**
     * Set up event forwarding to renderer (legacy compatibility)
     * @param {Object} eventBus - Event bus instance
     */
    setupEventForwarding(eventBus) {
        // This is now handled by RenderCoordinator internally
        this.logger.info('Event forwarding setup delegated to RenderCoordinator');
    }

    /**
     * Emit progress events (legacy compatibility)
     * @param {string} eventName - Name of the progress event
     * @param {Object} data - Event data
     */
    emitProgressEvent(eventName, data) {
        // This is now handled by RenderCoordinator
        this.renderCoordinator.emitProgressEvent(eventName, data);
    }
}

export default NftProjectManager;