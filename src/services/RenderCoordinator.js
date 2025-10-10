import electron from 'electron';
const { BrowserWindow, app } = electron;
import defaultLogger from '../main/utils/logger.js';
import { promises as fs } from 'fs';
import os from 'os';
import loopTerminator from '../core/events/LoopTerminator.js';

// Module-level cache for my-nft-gen imports
let _moduleCache = null;

async function _loadModules() {
    if (!_moduleCache) {
        const { UnifiedEventBus } = await import('my-nft-gen/src/core/events/UnifiedEventBus.js');
        _moduleCache = { UnifiedEventBus };
    }
    return _moduleCache;
}

/**
 * RenderCoordinator - Handles render operations and coordination
 * Extracted from NftProjectManager as part of god object decomposition
 * 
 * Responsibilities:
 * - Single frame rendering
 * - Render loop coordination (random loops and project resume)
 * - Render process management and termination
 * - Progress event emission
 * - Worker process lifecycle management
 */
export class RenderCoordinator {
    constructor(renderEngine = null, queueManager = null, eventBus = null, logger = null) {
        // Dependency injection following Dependency Inversion Principle
        this.renderEngine = renderEngine;   // For future render engine abstraction
        this.queueManager = queueManager;   // For future render queue management
        this.eventBus = eventBus;           // For event emission
        this.logger = logger || defaultLogger;
        
        // Render state management
        this.renderLoopActive = false;
        this.activeRenderLoop = null;
        this.activeRenderLoopEventBus = null;
        this.activeWorkerProcess = null;
        this.currentLoopId = null;
        this.currentWorkerId = null;
        this.workerTerminationUnsubscribers = null;
        this.renderStartTime = null;
        
        // Track last unpinned settings file for cleanup
        this.lastUnpinnedSettingsFile = null;
    }

    /**
     * Render a single frame
     * @param {Object} project - Configured project instance
     * @param {number} frameNumber - Frame to render
     * @param {number} totalFrames - Total frames in project
     * @param {string} projectName - Project name for logging
     * @param {string|null} settingsFile - Optional settings file path for pinned rendering
     * @param {string|null} outputDirectory - Output directory for settings files and frames
     * @returns {Promise<Object>} Render result with buffer
     */
    async renderFrame(project, frameNumber, totalFrames, projectName, settingsFile = null, outputDirectory = null) {
        this.logger.info('Starting frame render', { frameNumber, projectName, settingsFile, outputDirectory });

        try {
            const startTime = Date.now();

            // If not pinned (no settingsFile provided), clean up previous unpinned settings
            if (!settingsFile && this.lastUnpinnedSettingsFile) {
                this.logger.info('Cleaning up previous unpinned settings before new render');
                await this.cleanupUnpinnedSettings(this.lastUnpinnedSettingsFile);
                this.lastUnpinnedSettingsFile = null;
            }

            // If no settings file provided, generate one before rendering (for potential pinning)
            let effectiveSettingsFile = settingsFile;
            if (!settingsFile && project && typeof project.generateSettingsFile === 'function') {
                try {
                    const timestamp = Date.now();
                    
                    // Create working directory first
                    const workingDirectory = outputDirectory 
                        ? `${outputDirectory}/${projectName}-frame-${frameNumber}-${timestamp}/`
                        : `${await this.getTempDirectory()}/${projectName}-frame-${frameNumber}-${timestamp}/`;
                    
                    // Ensure working directory exists
                    await fs.mkdir(workingDirectory, { recursive: true });
                    
                    // Create settings directory INSIDE the working directory
                    const settingsDir = `${workingDirectory}settings`;
                    await fs.mkdir(settingsDir, { recursive: true });
                    
                    // Save settings file in the working directory's settings folder
                    effectiveSettingsFile = `${settingsDir}/${projectName}-frame-${frameNumber}-settings.json`;
                    
                    // Generate settings object and write to file
                    const settingsObject = await project.generateSettingsFile({
                        numberOfFrame: totalFrames,
                        finalFileName: `${projectName}-frame-${frameNumber}`,
                        workingDirectory: workingDirectory
                    });
                    await fs.writeFile(effectiveSettingsFile, JSON.stringify(settingsObject));
                    
                    this.logger.info('Generated settings file for frame', { settingsFile: effectiveSettingsFile });
                } catch (error) {
                    this.logger.warn('Failed to generate settings file, continuing without it', error);
                    effectiveSettingsFile = null;
                }
            }

            // Emit progress event
            this.emitProgressEvent('frameStarted', {
                frameNumber,
                totalFrames,
                projectName,
                isPinned: !!settingsFile
            });

            // Generate single frame (with optional settings file for pin mode)
            // Note: generateSingleFrame signature is (frameNumber, totalFrames, returnAsBuffer, outputDirectory, settingsFile)
            const result = await project.generateSingleFrame(frameNumber, totalFrames, true, null, effectiveSettingsFile);

            const renderTime = Date.now() - startTime;
            
            // Extract buffer and settings file from result
            // Backend now returns: { buffer: Buffer, settingsFile: string }
            const buffer = result.buffer || result; // Fallback for old format
            const generatedSettingsFile = result.settingsFile || effectiveSettingsFile;
            
            // Track unpinned settings file for future cleanup
            if (!settingsFile && generatedSettingsFile) {
                this.lastUnpinnedSettingsFile = generatedSettingsFile;
                this.logger.info('Tracking unpinned settings file for cleanup', { 
                    settingsFile: generatedSettingsFile 
                });
            }
            
            // Calculate progress - handle 0-indexed frames
            const framesCompleted = frameNumber + 1;
            const progress = Math.min(100, Math.max(1, Math.round((framesCompleted / totalFrames) * 100)));

            // Emit completion event
            this.emitProgressEvent('frameCompleted', {
                frameNumber,
                totalFrames,
                renderTime,
                progress,
                projectName,
                settingsFile: generatedSettingsFile,
                isPinned: !!settingsFile
            });

            console.log(`✅ Frame ${frameNumber}/${totalFrames} (${renderTime}ms)`);
            if (generatedSettingsFile) {
                console.log(`📄 Settings file: ${generatedSettingsFile}`);
            }

            return {
                success: true,
                frameBuffer: buffer,
                settingsFile: generatedSettingsFile,
                frameNumber: frameNumber,
                renderTime
            };

        } catch (error) {
            this.logger.error('Failed to render frame', error);
            
            // Emit error event
            this.emitProgressEvent('frameError', {
                frameNumber,
                totalFrames,
                projectName,
                error: error.message
            });
            
            return {
                success: false,
                error: error.message,
                frameNumber: frameNumber
            };
        }
    }

    /**
     * Start render loop - continuously generates NEW random loops until stopped
     * 
     * USE THIS METHOD FOR:
     * - Starting a fresh render loop with current project settings
     * - Starting a pinned render loop (pass settingsFile parameter with pinned settings)
     * 
     * DO NOT USE FOR:
     * - Resuming an interrupted render (use startResumeLoop instead)
     * 
     * @param {Object} project - Configured project instance
     * @param {Object} projectState - Project state instance
     * @param {string|null} settingsFile - Optional pinned settings file for applying saved effects
     * @returns {Promise<Object>} Render loop result
     */
    async startRenderLoop(project, projectState, settingsFile = null) {
        const config = projectState.getState();
        
        console.log('🔥 RenderCoordinator.startRenderLoop() called for NEW random loop generation', { settingsFile });
        this.logger.header('Starting New Random Loop Generation');

        try {
            // If not pinned (no settingsFile provided), clean up previous unpinned settings
            if (!settingsFile && this.lastUnpinnedSettingsFile) {
                this.logger.info('Cleaning up previous unpinned settings before new render loop');
                await this.cleanupUnpinnedSettings(this.lastUnpinnedSettingsFile);
                this.lastUnpinnedSettingsFile = null;
            }

            // Load modules dynamically
            const { UnifiedEventBus } = await _loadModules();

            // Create and configure event bus for render loop
            const eventBus = new UnifiedEventBus({
                enableDebug: true,
                enableMetrics: true,
                enableEventHistory: true,
                maxHistorySize: 1000
            });

            // Set up event forwarding to renderer
            this.setupEventForwarding(eventBus);

            // Attach event bus to the project for monitoring
            if (project) {
                project.eventBus = eventBus;
                console.log('✅ Event bus attached to new random loop project');
            }

            // Generate unique IDs for tracking
            const loopId = `random-loop-${Date.now()}`;
            const workerId = `worker-${loopId}`;

            // Set up loop control with event-driven system
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
            this.runRandomLoopGeneration(project, eventBus, loopId, workerId, projectState, settingsFile);

            this.logger.success('New random loop generation started', { settingsFile });
            return { success: true, message: 'New random loop generation started', loopId, workerId, isPinned: !!settingsFile };

        } catch (error) {
            this.logger.error('Random loop generation failed', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Start resume loop - resumes an INTERRUPTED render from where it left off
     * 
     * USE THIS METHOD FOR:
     * - Resuming an interrupted render that has partial frames completed
     * - Continuing a render that was stopped/crashed midway
     * 
     * DO NOT USE FOR:
     * - Starting a fresh render with pinned settings (use startRenderLoop with settingsFile instead)
     * - Starting a new render loop (use startRenderLoop instead)
     * 
     * NOTE: The settingsFile parameter is DEPRECATED for this method.
     * For pinned rendering, use startRenderLoop with the pinned settings file.
     * 
     * @param {Object} project - Project instance (can be null for resume)
     * @param {Object} projectState - Project state instance
     * @param {string|null} settingsFile - DEPRECATED - use startRenderLoop for pinned rendering
     * @returns {Promise<Object>} Resume result
     */
    async startResumeLoop(project, projectState, settingsFile = null) {
        const config = projectState.getState();

        // If a settingsFile is provided for pinned rendering, redirect to the correct method
        if (settingsFile) {
            this.logger.warn('startResumeLoop called with pinned settings file. Redirecting to startRenderLoop...');
            this.logger.info('For pinned rendering, use startRenderLoop with the settingsFile parameter');
            // Automatically redirect to the correct method
            return this.startRenderLoop(project, projectState, settingsFile);
        }

        // Validate this is actually a resumed project
        if (!config.isResumed || !config.settingsFilePath) {
            throw new Error('startResumeLoop called on non-resumed project. Use startRenderLoop for new projects.');
        }

        const effectiveSettingsFile = config.settingsFilePath;
        console.log('🔄 RenderCoordinator.startResumeLoop() called for project resume from:', effectiveSettingsFile);
        this.logger.header('Starting Project Resume');

        try {
            // Clean up previous unpinned settings before resuming
            // Note: Resume uses its own settings file, so we clean up any previous unpinned ones
            if (this.lastUnpinnedSettingsFile) {
                this.logger.info('Cleaning up previous unpinned settings before project resume');
                await this.cleanupUnpinnedSettings(this.lastUnpinnedSettingsFile);
                this.lastUnpinnedSettingsFile = null;
            }

            // Load modules dynamically
            const { UnifiedEventBus } = await _loadModules();

            // Create and configure event bus for resume
            const eventBus = new UnifiedEventBus({
                enableDebug: true,
                enableMetrics: true,
                enableEventHistory: true,
                maxHistorySize: 1000
            });

            // Set up event forwarding to renderer
            this.setupEventForwarding(eventBus);

            console.log('✅ Event bus created for resumed project - ResumeProject will handle attachment');

            // Generate unique IDs for tracking
            const loopId = `resume-loop-${Date.now()}`;
            const workerId = `worker-${loopId}`;

            // Set up loop control with event-driven system
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
            return { success: true, message: 'Project resume started', loopId, workerId, isPinned: false };

        } catch (error) {
            this.logger.error('Project resume failed', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Pause render operation
     * @returns {Promise<Object>} Pause result
     */
    async pauseRender() {
        this.logger.info('Pausing render operation');
        
        try {
            // For now, we don't have pause functionality in the underlying system
            // This would require implementing pause/resume in my-nft-gen
            this.logger.warn('Pause functionality not yet implemented in underlying render system');
            
            return {
                success: false,
                message: 'Pause functionality not yet implemented'
            };
            
        } catch (error) {
            this.logger.error('Failed to pause render', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cancel render operation
     * @returns {Promise<Object>} Cancel result
     */
    async cancelRender() {
        this.logger.info('Cancelling render operation');
        
        try {
            return await this.stopRenderLoop();
            
        } catch (error) {
            this.logger.error('Failed to cancel render', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Stop any active loop (random loop or resumed project)
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
            const { killWorker } = await import('../core/events/LoopTerminator.js');

            // Signal the loop to stop immediately
            this.renderLoopActive = false;

            // Use event-driven worker termination
            if (this.currentWorkerId) {
                this.logger.info(`Terminating worker via event system: ${this.currentWorkerId}`);
                killWorker(this.currentWorkerId, 'SIGTERM');
            } else {
                // Fallback to old method if no worker ID
                this.logger.info('No worker ID available, using fallback termination');

                // If there's an active worker process, kill it
                if (this.activeWorkerProcess) {
                    this.logger.info('Killing active worker process');
                    this.activeWorkerProcess.kill('SIGTERM');
                    this.activeWorkerProcess = null;
                }
            }

            // Also try to kill any child processes immediately
            await this.killAnyActiveChildProcesses();

            // Wait a moment for processes to actually stop
            await new Promise(resolve => setTimeout(resolve, 500));

            // Clean up will be handled by the event-driven system
            await this.cleanupWorker(this.currentWorkerId || 'unknown', 'user_stopped');

            // Verify the loop is actually stopped
            if (!this.renderLoopActive && !this.activeRenderLoop) {
                this.logger.success('Active loop stopped successfully via event system');
                return { success: true, message: 'Active loop stopped via event system' };
            } else {
                // Force kill if still running
                await this.killAnyActiveChildProcesses();
                this.renderLoopActive = false;
                this.activeRenderLoop = null;
                this.logger.warn('Active loop force-stopped');
                return { success: true, message: 'Active loop force-stopped' };
            }

        } catch (error) {
            this.logger.error('Failed to stop active loop via event system, using fallback', error);

            // Fallback to old method - force stop everything
            this.renderLoopActive = false;

            if (this.activeWorkerProcess) {
                this.activeWorkerProcess.kill('SIGTERM');
                this.activeWorkerProcess = null;
            }

            // Force kill child processes
            await this.killAnyActiveChildProcesses();

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
     * Get render status
     * @returns {Object} Current render status
     */
    getRenderStatus() {
        return {
            isActive: this.renderLoopActive,
            currentLoopId: this.currentLoopId,
            currentWorkerId: this.currentWorkerId,
            hasActiveProject: !!this.activeRenderLoop,
            hasEventBus: !!this.activeRenderLoopEventBus
        };
    }

    /**
     * Capture current settings for pin mode
     * Exports the current project settings to a file in the output directory
     * @param {Object} project - Configured project instance
     * @param {string|null} outputDirectory - Output directory for settings file
     * @returns {Promise<Object>} Capture result with settings file path
     */
    async captureSettingsForPin(project, outputDirectory = null) {
        this.logger.info('Capturing settings for pin mode', { outputDirectory });

        try {
            // Check if project has generateSettingsFile method (new method in my-nft-gen)
            if (!project || typeof project.generateSettingsFile !== 'function') {
                throw new Error('Project does not support settings file generation');
            }

            // Generate settings file path in output directory/settings or temp
            const timestamp = Date.now();
            const settingsDir = outputDirectory 
                ? `${outputDirectory}/settings`
                : await this.getTempDirectory();
            
            // Ensure settings directory exists
            if (outputDirectory) {
                await fs.mkdir(settingsDir, { recursive: true });
            }
            
            const settingsFilePath = `${settingsDir}/pin-settings-${timestamp}.json`;
            const workingDirectory = outputDirectory 
                ? `${outputDirectory}/pin-${project.projectName}-${timestamp}/`
                : `${await this.getTempDirectory()}/pin-${project.projectName}-${timestamp}/`;

            // Ensure working directory exists
            await fs.mkdir(workingDirectory, { recursive: true });

            // Generate settings object and write to file
            const settingsObject = await project.generateSettingsFile({
                workingDirectory: workingDirectory
            });
            await fs.writeFile(settingsFilePath, JSON.stringify(settingsObject));

            this.logger.success('Settings captured for pin mode', { settingsFilePath });

            return {
                success: true,
                settingsFilePath,
                timestamp
            };

        } catch (error) {
            this.logger.error('Failed to capture settings for pin mode', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get temporary directory for settings files
     * @returns {Promise<string>} Temporary directory path
     * @private
     */
    async getTempDirectory() {
        // Use electron's app.getPath('temp') if available (main process)
        if (app && app.getPath) {
            try {
                return app.getPath('temp');
            } catch (error) {
                this.logger.warn('Failed to get Electron temp path, using OS temp', error);
            }
        }

        // Fallback to system temp directory
        return os.tmpdir();
    }

    /**
     * Clean up unpinned settings files and their parent directories
     * This method deletes temporary settings files that were created for unpinned renders
     * @param {string} settingsFilePath - Path to the settings file to delete
     * @returns {Promise<Object>} Cleanup result
     * @private
     */
    async cleanupUnpinnedSettings(settingsFilePath) {
        if (!settingsFilePath) {
            return { success: true, message: 'No settings file to clean up' };
        }

        try {
            this.logger.info('Cleaning up unpinned settings', { settingsFilePath });

            // Extract the parent directory (working directory)
            // Settings files are typically in: /path/to/working-dir/settings/file.json
            // We want to delete the entire working directory
            const path = await import('path');
            const settingsDir = path.dirname(settingsFilePath); // Gets the 'settings' directory
            const workingDirectory = path.dirname(settingsDir); // Gets the parent working directory

            // Verify this looks like a temporary directory before deleting
            // Check if it contains timestamp or temp-like patterns
            const dirName = path.basename(workingDirectory);
            const isTempDir = dirName.includes('frame-') || 
                             dirName.includes('pinned-loop-') || 
                             dirName.includes('pin-') ||
                             workingDirectory.includes(os.tmpdir());

            if (!isTempDir) {
                this.logger.warn('Skipping cleanup - directory does not appear to be temporary', { 
                    workingDirectory 
                });
                return { 
                    success: false, 
                    message: 'Directory does not appear to be temporary, skipping cleanup for safety' 
                };
            }

            // Delete the entire working directory recursively
            await fs.rm(workingDirectory, { recursive: true, force: true });
            
            this.logger.success('Unpinned settings cleaned up successfully', { 
                workingDirectory 
            });

            return {
                success: true,
                deletedDirectory: workingDirectory,
                message: 'Unpinned settings and parent directory deleted'
            };

        } catch (error) {
            // Don't fail the render if cleanup fails
            this.logger.warn('Failed to clean up unpinned settings (non-critical)', error);
            return {
                success: false,
                error: error.message,
                message: 'Cleanup failed but continuing with render'
            };
        }
    }

    // Private helper methods

    /**
     * Internal method to run random loop generation
     * @param {Object} project - Configured project instance
     * @param {Object} eventBus - Event bus for monitoring
     * @param {string} loopId - Unique loop identifier
     * @param {string} workerId - Unique worker identifier
     * @param {Object} projectState - Project state instance
     * @param {string|null} settingsFile - Optional settings file path for pinned rendering
     * @private
     */
    async runRandomLoopGeneration(project, eventBus, loopId, workerId, projectState, settingsFile = null) {
        try {
            this.logger.info(`Starting generateRandomLoop for loop: ${loopId}, worker: ${workerId}`);

            // Get totalFrames and outputDirectory from project state
            const config = projectState.getState();
            const totalFrames = config.numFrames || 100;
            const outputDirectory = config.outputDirectory;

            // Handle pinned settings file if provided
            let effectiveSettingsFile = settingsFile;
            if (settingsFile) {
                // Apply pinned settings to the project
                try {
                    this.logger.info('Applying pinned settings to project for render loop');
                    const settingsContent = await fs.readFile(settingsFile, 'utf8');
                    const settingsObject = JSON.parse(settingsContent);
                    
                    // Extract effect configuration from pinned settings
                    if (settingsObject.settings && settingsObject.settings.projectConfig) {
                        const pinnedConfig = settingsObject.settings.projectConfig;
                        
                        // Extract and clean the effect list
                        if (pinnedConfig.effectList) {
                            // Deep clone to avoid modifying original
                            const cleanedEffectList = JSON.parse(JSON.stringify(pinnedConfig.effectList));
                            
                            // Remove any file path references from effects
                            const removeFilePaths = (obj) => {
                                if (!obj || typeof obj !== 'object') return obj;
                                if (Array.isArray(obj)) {
                                    return obj.map(item => removeFilePaths(item));
                                }
                                const cleaned = {};
                                for (const key in obj) {
                                    const value = obj[key];
                                    // Skip file path properties
                                    if (typeof value === 'string' && 
                                        (value.includes('.json') || value.includes('frame-'))) {
                                        continue;
                                    }
                                    cleaned[key] = typeof value === 'object' ? removeFilePaths(value) : value;
                                }
                                return cleaned;
                            };
                            
                            // Apply cleaned effects to project
                            project.effectList = removeFilePaths(cleanedEffectList);
                            this.logger.info('Applied cleaned effect list from pinned settings');
                        }
                        
                        // Apply resolution and frame count
                        if (pinnedConfig.outputResolution) {
                            project.outputResolution = pinnedConfig.outputResolution;
                        }
                        if (pinnedConfig.numberOfFrame) {
                            project.numberOfFrame = pinnedConfig.numberOfFrame;
                        }
                    }
                    
                    // Set fresh working directory for pinned render
                    const timestamp = Date.now();
                    const workingDirectory = outputDirectory 
                        ? `${outputDirectory}/pinned-loop-${timestamp}/`
                        : `${await this.getTempDirectory()}/pinned-loop-${timestamp}/`;
                    
                    await fs.mkdir(workingDirectory, { recursive: true });
                    project.workingDirectory = workingDirectory;
                    
                    // Create settings directory inside working directory and copy pinned settings
                    const settingsDir = `${workingDirectory}settings`;
                    await fs.mkdir(settingsDir, { recursive: true });
                    
                    // Save the cleaned settings to the working directory
                    effectiveSettingsFile = `${settingsDir}/pinned-settings-${timestamp}.json`;
                    const cleanedSettings = {
                        settings: {
                            projectConfig: {
                                effectList: project.effectList,
                                outputResolution: project.outputResolution,
                                numberOfFrame: project.numberOfFrame
                            }
                        }
                    };
                    await fs.writeFile(effectiveSettingsFile, JSON.stringify(cleanedSettings));
                    
                    this.logger.info('Configured project with pinned settings for render loop', {
                        workingDirectory,
                        settingsFile: effectiveSettingsFile
                    });
                    
                } catch (error) {
                    this.logger.error('Failed to apply pinned settings', error);
                    throw error;
                }
                
            } else if (project && typeof project.generateSettingsFile === 'function') {
                // Generate new settings file if not pinned
                try {
                    const timestamp = Date.now();
                    
                    // Create the working directory first
                    const workingDirectory = outputDirectory 
                        ? `${outputDirectory}/loop-${project.projectName}-${timestamp}/`
                        : `${await this.getTempDirectory()}/loop-${project.projectName}-${timestamp}/`;
                    
                    // Ensure working directory exists
                    await fs.mkdir(workingDirectory, { recursive: true });
                    
                    // Create settings directory INSIDE the working directory
                    const settingsDir = `${workingDirectory}settings`;
                    await fs.mkdir(settingsDir, { recursive: true });
                    
                    // Save settings file in the working directory's settings folder
                    effectiveSettingsFile = `${settingsDir}/loop-settings-${timestamp}.json`;
                    
                    // Generate settings object and write to file
                    const settingsObject = await project.generateSettingsFile({
                        numberOfFrame: totalFrames,
                        workingDirectory: workingDirectory
                    });
                    await fs.writeFile(effectiveSettingsFile, JSON.stringify(settingsObject));
                    
                    this.logger.info('Generated settings file for loop', { settingsFile: effectiveSettingsFile });
                } catch (error) {
                    this.logger.warn('Failed to generate settings file for loop, continuing without it', error);
                    effectiveSettingsFile = null;
                }
            }

            // Emit render loop start event
            if (eventBus) {
                eventBus.emit('render.loop.start', {
                    timestamp: Date.now(),
                    projectName: project.projectName,
                    loopId,
                    workerId,
                    totalFrames,
                    settingsFile: effectiveSettingsFile,
                    isPinned: !!settingsFile
                });
            }

            // Also emit via IPC for EventBusMonitor
            this.emitProgressEvent('render.loop.start', {
                timestamp: Date.now(),
                projectName: project.projectName,
                loopId,
                workerId,
                totalFrames,
                settingsFile: effectiveSettingsFile,
                isPinned: !!settingsFile
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
     * @private
     */
    async runProjectResume(project, eventBus, loopId, workerId, projectState) {
        try {
            const config = projectState.getState();
            const totalFrames = config.numFrames || 100;
            const outputDirectory = config.outputDirectory;
            
            // Use the settings file from the config (for true resume operations)
            const effectiveSettingsFile = config.settingsFilePath;
            
            this.logger.info(`Starting ResumeProject for loop: ${loopId}, worker: ${workerId}, settings: ${effectiveSettingsFile}`);

            // Generate settings file before resuming if not provided (for potential pinning)
            if (!effectiveSettingsFile && project && typeof project.generateSettingsFile === 'function') {
                try {
                    const timestamp = Date.now();
                    const settingsDir = outputDirectory 
                        ? `${outputDirectory}/settings`
                        : await this.getTempDirectory();
                    
                    // Ensure settings directory exists
                    if (outputDirectory) {
                        await fs.mkdir(settingsDir, { recursive: true });
                    }
                    
                    const generatedSettingsFile = `${settingsDir}/resume-settings-${timestamp}.json`;
                    const workingDirectory = outputDirectory 
                        ? `${outputDirectory}/resume-${project.projectName}-${timestamp}/`
                        : `${await this.getTempDirectory()}/resume-${project.projectName}-${timestamp}/`;
                    
                    // Ensure working directory exists
                    await fs.mkdir(workingDirectory, { recursive: true });
                    
                    // Generate settings object and write to file
                    const settingsObject = await project.generateSettingsFile({
                        numberOfFrame: totalFrames,
                        workingDirectory: workingDirectory
                    });
                    await fs.writeFile(generatedSettingsFile, JSON.stringify(settingsObject));
                    
                    this.logger.info('Generated settings file for resume', { settingsFile: generatedSettingsFile });
                    // Update config with generated settings file
                    config.settingsFilePath = generatedSettingsFile;
                } catch (error) {
                    this.logger.warn('Failed to generate settings file for resume, continuing without it', error);
                }
            }

            // Emit project resume start event
            if (eventBus) {
                eventBus.emit('project.resume.start', {
                    timestamp: Date.now(),
                    projectName: project?.projectName || 'Unknown',
                    settingsFilePath: effectiveSettingsFile,
                    loopId,
                    workerId,
                    totalFrames,
                    isPinned: !!settingsFile
                });
            }

            // Also emit via IPC for EventBusMonitor
            this.emitProgressEvent('project.resume.start', {
                timestamp: Date.now(),
                projectName: project?.projectName || 'Unknown',
                settingsFilePath: effectiveSettingsFile,
                loopId,
                workerId,
                totalFrames,
                isPinned: false
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
                        projectName: project?.projectName || 'Unknown',
                        loopId,
                        workerId
                    });
                }

                // Also emit via IPC for EventBusMonitor
                this.emitProgressEvent('project.resume.complete', {
                    timestamp: Date.now(),
                    projectName: project?.projectName || 'Unknown',
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
                    projectName: project?.projectName || 'Unknown',
                    loopId,
                    workerId
                });
            }

            // Also emit via IPC for EventBusMonitor
            this.emitProgressEvent('project.resume.error', {
                timestamp: Date.now(),
                error: error.message,
                projectName: project?.projectName || 'Unknown',
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
     * @private
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
                    }, 50); // Check every 50ms for faster response

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
     * @private
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
                    }, 50); // Check every 50ms for faster response

                    // Store the interval so we can clear it later
                    terminationListener = checkTermination;
                });
            };

            try {
                const config = projectState.getState();
                
                // Get the settings file from config for true resume
                const effectiveSettingsFile = config.settingsFilePath;

                if (!effectiveSettingsFile) {
                    throw new Error('No settings file path provided for project resume');
                }

                // This method now only handles true resume operations
                // Pinned rendering is handled by startRenderLoop
                this.logger.info(`Using ResumeProject for project resume with settings: ${effectiveSettingsFile}`);
                
                // Import ResumeProject function from my-nft-gen
                const { ResumeProject } = await import('my-nft-gen/src/app/ResumeProject.js');

                // Use ResumeProject for resumed projects
                resumePromise = ResumeProject(effectiveSettingsFile, {
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

                // Race between operation completion and termination request
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
                this.logger.error('Operation failed:', error);
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
     * Kill any active child processes
     * @private
     */
    async killAnyActiveChildProcesses() {
        try {
            const { execSync } = await import('child_process');

            // Process patterns to search for
            const processPatterns = [
                'GenerateLoopWorkerThread.js',
                'my-nft-gen',
                'RequestNewWorkerThread',
                'RequestNewFrameBuilderThread'
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
                    // ps command failed, probably no matching processes
                    this.logger.info(`No ${pattern} processes found to kill`);
                }
            }

        } catch (error) {
            this.logger.warn('Failed to kill child processes:', error.message);
        }
    }

    /**
     * Set up event forwarding to renderer
     * @param {Object} eventBus - Event bus instance
     * @private
     */
    setupEventForwarding(eventBus) {
        console.log('🔧 [RenderCoordinator] Setting up event forwarding wrapper');
        
        // Events to log (reduce noise from high-frequency events)
        const verboseEvents = new Set(['frameStarted', 'frameCompleted', 'fatalError', 'error']);
        
        const forwardEventToRenderer = (eventName, data) => {
            // Only log important events to prevent console spam
            if (verboseEvents.has(eventName)) {
                this.logger.event(eventName, data);
            }
            
            try {
                if (BrowserWindow && BrowserWindow.getAllWindows && BrowserWindow.getAllWindows().length > 0) {
                    const windows = BrowserWindow.getAllWindows();
                    const window = windows[0];
                    const payload = { eventName, data };
                    
                    // Send via IPC without excessive logging
                    window.webContents.send('worker-event', payload);
                } else if (verboseEvents.has(eventName)) {
                    // Only log missing window for important events
                    console.log(`⚠️ [RenderCoordinator] No BrowserWindow available to send: ${eventName}`);
                }
            } catch (error) {
                // Always log errors
                console.error(`❌ [RenderCoordinator] Error sending to renderer: ${eventName}`, error);
            }
        };

        const originalEmit = eventBus.emit.bind(eventBus);
        eventBus.emit = function (eventName, data) {
            const result = originalEmit(eventName, data);
            forwardEventToRenderer(eventName, data);
            return result;
        };
        
        console.log('✅ [RenderCoordinator] Event forwarding wrapper installed');
    }

    /**
     * Set up event-driven worker termination listeners
     * @param {string} workerId - Worker ID to listen for
     * @param {string} loopId - Loop ID associated with worker
     * @private
     */
    setupWorkerTerminationListeners(workerId, loopId) {
        // Import EventBusService for listening to termination events
        import('../services/EventBusService.js').then(({ default: EventBusService }) => {
            // Listen for specific worker kill commands
            const unsubscribeKillWorker = EventBusService.subscribe('killWorker', async (data) => {
                if (data.workerId === workerId || data.workerId === 'all') {
                    this.logger.info(`Received kill command for worker: ${workerId}`);
                    await this.terminateWorker(workerId, data.signal || 'SIGTERM');
                }
            }, { component: 'RenderCoordinator' });

            // Listen for kill all workers commands
            const unsubscribeKillAllWorkers = EventBusService.subscribe('killAllWorkers', async (data) => {
                this.logger.info(`Received kill all workers command`);
                await this.terminateWorker(workerId, data.signal || 'SIGTERM');
            }, { component: 'RenderCoordinator' });

            // Store unsubscribe functions for cleanup
            this.workerTerminationUnsubscribers = [unsubscribeKillWorker, unsubscribeKillAllWorkers];
        });
    }

    /**
     * Terminate a specific worker
     * @param {string} workerId - Worker ID to terminate
     * @param {string} signal - Signal to send
     * @private
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
            const { default: EventBusService } = await import('../services/EventBusService.js');
            EventBusService.emit('workerKilled', {
                workerId,
                signal,
                timestamp: Date.now()
            }, { source: 'RenderCoordinator' });

        } catch (error) {
            this.logger.error(`Failed to terminate worker ${workerId}:`, error);

            // Import EventBusService to emit failure event
            const { default: EventBusService } = await import('../services/EventBusService.js');
            EventBusService.emit('workerKillFailed', {
                workerId,
                signal,
                error: error.message,
                timestamp: Date.now()
            }, { source: 'RenderCoordinator' });
        }
    }

    /**
     * Clean up worker resources
     * @param {string} workerId - Worker ID to clean up
     * @param {string} reason - Reason for cleanup
     * @private
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
            const { default: loopTerminator } = await import('../core/events/LoopTerminator.js');
            loopTerminator.unregisterWorker(workerId, reason);

        } catch (error) {
            this.logger.error(`Error during worker cleanup:`, error);
        }
    }

    /**
     * Emit progress events to the renderer process
     * @param {string} eventName - Name of the progress event
     * @param {Object} data - Event data
     * @private
     */
    emitProgressEvent(eventName, data) {
        const event = {
            eventName,
            data,
            timestamp: Date.now(),
            category: 'PROGRESS',
            source: 'render-progress'
        };

        // Send to all browser windows (only if BrowserWindow is available)
        try {
            if (BrowserWindow && BrowserWindow.getAllWindows) {
                const windows = BrowserWindow.getAllWindows();
                windows.forEach(window => {
                    window.webContents.send('eventbus-message', event);
                });
            }
        } catch (error) {
            // BrowserWindow not available (e.g., in test environment)
            // This is expected and should not cause failures
        }

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

        // Emit to internal event bus if available
        if (this.eventBus) {
            this.eventBus.emit('render:progress', event);
        }
    }
}

export default RenderCoordinator;