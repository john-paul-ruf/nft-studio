import path from 'path';
import ProjectState from '../models/ProjectState.js';
import SettingsToProjectConverter from '../utils/SettingsToProjectConverter.js';
import ResolutionMapper from '../utils/ResolutionMapper.js';
import defaultLogger from '../main/utils/logger.js';

/**
 * ProjectLifecycleManager - Handles project creation, loading, and saving operations
 * Extracted from NftProjectManager as part of god object decomposition
 * 
 * Responsibilities:
 * - Project creation from ProjectState
 * - Project loading from settings files
 * - Project import operations
 * - Project state management
 * - Settings file operations
 */
export class ProjectLifecycleManager {
    constructor(fileSystem = null, validator = null, eventBus = null, logger = null) {
        // Dependency injection following Dependency Inversion Principle
        this.fileSystem = fileSystem; // For future file operations abstraction
        this.validator = validator;   // For future validation abstraction
        this.eventBus = eventBus;     // For event emission
        this.logger = logger || defaultLogger;
        
        // Internal state
        this.activeProjects = new Map();
    }

    /**
     * Create a new project from ProjectState
     * @param {ProjectState} projectState - ProjectState instance
     * @returns {Promise<Object>} Project creation result with project and settings
     */
    async createProject(projectState) {
        this.logger.info('Creating new project from ProjectState');
        
        if (!(projectState instanceof ProjectState)) {
            throw new Error('ProjectState instance required for project creation');
        }

        const config = projectState.getState();
        
        try {
            // Create the my-nft-gen Project instance
            const project = await this.createProjectInstance(projectState);
            
            // Create project settings
            const settings = await this.createProjectSettings(project, projectState);
            
            // Store the project for potential reuse
            this.activeProjects.set(config.projectName, {
                project,
                settings,
                projectState
            });

            // Emit project created event
            if (this.eventBus) {
                this.eventBus.emit('project:created', {
                    projectName: config.projectName,
                    projectPath: settings.getProjectDirectory(),
                    settingsFile: settings.getSettingsFilePath(),
                    timestamp: Date.now()
                });
            }

            this.logger.success(`Project "${config.projectName}" created successfully`);

            return {
                success: true,
                project,
                settings,
                projectPath: settings.getProjectDirectory(),
                settingsFile: settings.getSettingsFilePath()
            };

        } catch (error) {
            this.logger.error('Failed to create project', error);
            
            // Emit project creation error event
            if (this.eventBus) {
                this.eventBus.emit('project:createError', {
                    projectName: config.projectName,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
            
            throw error;
        }
    }

    /**
     * Load an existing project from settings file path
     * @param {string} settingsPath - Path to project settings file
     * @returns {Promise<Object>} Project load result
     */
    async loadProject(settingsPath) {
        this.logger.header('Loading Project from Settings File');
        
        try {
            // Convert relative path to absolute path
            const absoluteSettingsPath = path.isAbsolute(settingsPath)
                ? settingsPath
                : path.resolve(process.cwd(), settingsPath);

            this.logger.info('Loading project from settings file:', absoluteSettingsPath);

            // Import ProjectResumer for loading existing projects
            const { default: ProjectResumer } = await import('../utils/ProjectResumer.js');

            // Use the simplified resume logic
            const resumeResult = await ProjectResumer.resumeFromSettings(absoluteSettingsPath);

            if (resumeResult.success) {
                // Emit project loaded event
                if (this.eventBus) {
                    this.eventBus.emit('project:loaded', {
                        settingsPath: absoluteSettingsPath,
                        projectName: resumeResult.projectName || 'Unknown',
                        timestamp: Date.now()
                    });
                }

                this.logger.success('Project loaded successfully');
                return resumeResult;
            } else {
                // Emit project load error event
                if (this.eventBus) {
                    this.eventBus.emit('project:loadError', {
                        settingsPath: absoluteSettingsPath,
                        error: resumeResult.error,
                        timestamp: Date.now()
                    });
                }

                this.logger.error('Project load failed:', resumeResult.error);
                return resumeResult;
            }

        } catch (error) {
            this.logger.error('Failed to load project', error);
            
            // Emit project load error event
            if (this.eventBus) {
                this.eventBus.emit('project:loadError', {
                    settingsPath: settingsPath,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
            
            return {
                success: false,
                error: error.message,
                settingsPath: settingsPath
            };
        }
    }

    /**
     * Import project data from settings file for editing
     * @param {string} settingsPath - Path to project settings file
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

            // Load and convert project settings file
            let projectData = null;
            try {
                const settingsContent = await fs.readFile(absoluteSettingsPath, 'utf8');
                const settings = JSON.parse(settingsContent);

                // Get the project directory from the settings file location
                const settingsDir = path.dirname(absoluteSettingsPath);
                const correctProjectDirectory = settingsDir.endsWith('settings')
                    ? path.dirname(settingsDir)
                    : settingsDir;

                this.logger.info('Converting settings file to project format...');
                
                // Convert and serialize for IPC - skip position scaling for imports
                const convertedProject = await SettingsToProjectConverter.convertSettingsToProject(
                    settings, 
                    null, 
                    true, // skipPositionScaling
                    true  // serializeForIPC
                );

                projectData = {
                    ...convertedProject,
                    projectDirectory: correctProjectDirectory,
                    settingsFilePath: absoluteSettingsPath,
                    isReadOnly: false, // Allow editing of imported projects
                    isImported: true   // Mark as imported from settings
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

            // Emit project imported event
            if (this.eventBus) {
                this.eventBus.emit('project:imported', {
                    settingsPath: absoluteSettingsPath,
                    projectName: projectData.projectName,
                    effectsCount: projectData.effects?.length || 0,
                    timestamp: Date.now()
                });
            }

            return {
                success: true,
                projectData: projectData,
                settingsPath: absoluteSettingsPath,
                message: `Successfully imported project "${projectData.projectName}" with ${projectData.effects?.length || 0} effects`
            };

        } catch (error) {
            this.logger.error('Failed to import project from settings', error);
            
            // Emit project import error event
            if (this.eventBus) {
                this.eventBus.emit('project:importError', {
                    settingsPath: settingsPath,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
            
            return {
                success: false,
                error: error.message,
                settingsPath: settingsPath
            };
        }
    }

    /**
     * Save project state to settings file
     * @param {Object} project - Project instance to save
     * @param {ProjectState} projectState - ProjectState instance
     * @returns {Promise<Object>} Save result
     */
    async saveProject(project, projectState) {
        this.logger.info('Saving project state');
        
        try {
            if (!project || !projectState) {
                throw new Error('Both project and projectState are required for saving');
            }

            const config = projectState.getState();
            
            // Create settings if they don't exist
            let settings;
            const activeProject = this.activeProjects.get(config.projectName);
            if (activeProject && activeProject.settings) {
                settings = activeProject.settings;
            } else {
                settings = await this.createProjectSettings(project, projectState);
            }

            // Save the settings
            await settings.save();

            // Emit project saved event
            if (this.eventBus) {
                this.eventBus.emit('project:saved', {
                    projectName: config.projectName,
                    settingsFile: settings.getSettingsFilePath(),
                    timestamp: Date.now()
                });
            }

            this.logger.success(`Project "${config.projectName}" saved successfully`);

            return {
                success: true,
                settingsFile: settings.getSettingsFilePath(),
                projectPath: settings.getProjectDirectory()
            };

        } catch (error) {
            this.logger.error('Failed to save project', error);
            
            // Emit project save error event
            if (this.eventBus) {
                this.eventBus.emit('project:saveError', {
                    projectName: projectState?.getState()?.projectName || 'Unknown',
                    error: error.message,
                    timestamp: Date.now()
                });
            }
            
            throw error;
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
     * Get active project by name
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
        
        // Emit projects cleared event
        if (this.eventBus) {
            this.eventBus.emit('projects:cleared', {
                timestamp: Date.now()
            });
        }
        
        this.logger.info('All active projects cleared');
    }

    /**
     * Get list of active project names
     * @returns {string[]} Array of active project names
     */
    getActiveProjectNames() {
        return Array.from(this.activeProjects.keys());
    }

    /**
     * Check if a project is active
     * @param {string} projectName - Project name to check
     * @returns {boolean} True if project is active
     */
    isProjectActive(projectName) {
        return this.activeProjects.has(projectName);
    }

    /**
     * Remove a specific active project
     * @param {string} projectName - Project name to remove
     * @returns {boolean} True if project was removed
     */
    removeActiveProject(projectName) {
        const removed = this.activeProjects.delete(projectName);
        
        if (removed && this.eventBus) {
            this.eventBus.emit('project:removed', {
                projectName,
                timestamp: Date.now()
            });
        }
        
        return removed;
    }

    // Private helper methods

    /**
     * Create a new Project instance from ProjectState
     * @param {ProjectState} projectState - ProjectState instance
     * @returns {Promise<Object>} Project instance
     * @private
     */
    async createProjectInstance(projectState) {
        const projectConfig = projectState.getState();
        const { Project } = await import('my-nft-gen/src/app/Project.js');
        const { ColorScheme } = await import('my-nft-gen/src/core/color/ColorScheme.js');

        // Calculate dimensions - single source of truth
        let longestSide, shortestSide;
        const isHorizontal = projectConfig.isHorizontal;

        if (projectConfig.width && projectConfig.height) {
            // Direct dimensions from render pipeline
            const width = projectConfig.width;
            const height = projectConfig.height;
            longestSide = Math.max(width, height);
            shortestSide = Math.min(width, height);
        } else if (projectConfig.longestSideInPixels && projectConfig.shortestSideInPixels) {
            // Imported project path
            longestSide = projectConfig.longestSideInPixels;
            shortestSide = projectConfig.shortestSideInPixels;
        } else {
            // New project or resume path - calculate from resolution
            const resolutionKey = projectConfig.resolution || projectConfig.targetResolution;
            const resolution = this.getResolutionFromConfig(resolutionKey);
            longestSide = Math.max(resolution.width, resolution.height);
            shortestSide = Math.min(resolution.width, resolution.height);
        }

        // Build color scheme info
        const colorSchemeInfo = await this.buildColorSchemeInfo(projectConfig);

        // Ensure project directory is absolute
        let projectDirectory = projectConfig.projectDirectory || projectConfig.outputDirectory;
        if (!projectDirectory) {
            projectDirectory = path.resolve(process.cwd(), 'src/scratch');
        } else if (!path.isAbsolute(projectDirectory)) {
            projectDirectory = path.resolve(process.cwd(), projectDirectory);
        }

        // Create the project instance
        const project = new Project({
            artist: projectConfig.artist || 'NFT Studio User',
            projectName: projectConfig.projectName,
            projectDirectory: projectDirectory,
            colorScheme: colorSchemeInfo.colorScheme,
            pluginPaths: [], // Plugin paths will be handled by PluginLifecycleManager
            neutrals: colorSchemeInfo.neutrals,
            backgrounds: colorSchemeInfo.backgrounds,
            lights: colorSchemeInfo.lights,
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
     * Create project settings from project and ProjectState
     * @param {Object} project - Project instance
     * @param {ProjectState} projectState - ProjectState instance
     * @returns {Promise<Object>} Settings instance
     * @private
     */
    async createProjectSettings(project, projectState) {
        const projectConfig = projectState.getState();
        const myNftGenPath = path.resolve(process.cwd(), '../my-nft-gen');
        const { Settings } = await import('my-nft-gen/src/app/Settings.js');

        // Process effects into LayerConfig instances
        const { default: effectProcessor } = await import('./EffectProcessingService.js');

        // Extract primary effects from the effects array
        let primaryEffects = [];

        if (Array.isArray(projectConfig.effects)) {
            // Filter only primary effects for settings
            primaryEffects = projectConfig.effects.filter(e => !e.type || e.type === 'primary');
        } else if (projectConfig.effects?.primary) {
            // Backward compatibility
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
     * Build color scheme info from project config
     * @param {Object} projectConfig - Project configuration
     * @returns {Promise<Object>} Color scheme info object
     * @private
     */
    async buildColorSchemeInfo(projectConfig) {
        // If colorSchemeInfo is already provided, use it directly
        if (projectConfig.colorSchemeInfo) {
            return projectConfig.colorSchemeInfo;
        }

        // UI must provide complete color scheme data
        if (!projectConfig.colorSchemeData) {
            throw new Error('MISSING colorSchemeData: UI must provide complete color scheme data');
        }

        const colorSchemeData = projectConfig.colorSchemeData;

        // Strict validation - fail fast if data is incomplete
        this.validateColorSchemeData(colorSchemeData);

        // Import ColorScheme
        const { ColorScheme } = await import('my-nft-gen/src/core/color/ColorScheme.js');

        // Create ColorScheme instance
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
     * Validate color scheme data structure
     * @param {Object} colorSchemeData - Color scheme data to validate
     * @private
     */
    validateColorSchemeData(colorSchemeData) {
        const requiredArrays = ['colors', 'lights', 'neutrals', 'backgrounds'];
        
        for (const arrayName of requiredArrays) {
            if (!colorSchemeData[arrayName]) {
                throw new Error(`MISSING colorSchemeData.${arrayName} array`);
            }
            if (!Array.isArray(colorSchemeData[arrayName])) {
                throw new Error(`INVALID colorSchemeData.${arrayName}: must be array`);
            }
            if (colorSchemeData[arrayName].length === 0) {
                throw new Error(`EMPTY colorSchemeData.${arrayName}: must contain hex colors`);
            }
        }
    }

    /**
     * Get resolution configuration from resolution key or pixel width
     * @param {string|number} resolutionKey - Resolution key or pixel width
     * @returns {Object} Resolution object with width and height
     * @private
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
            this.logger.warn(`Resolution ${resolutionKey} not found in ResolutionMapper, using default`, error);
            return { width: 1920, height: 1080 };
        }
    }
}

export default ProjectLifecycleManager;