import electron from 'electron';
const { BrowserWindow } = electron;
import defaultLogger from '../main/utils/logger.js';

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
    }

    /**
     * Render a single frame
     * @param {Object} project - Configured project instance
     * @param {number} frameNumber - Frame to render
     * @param {number} totalFrames - Total frames in project
     * @param {string} projectName - Project name for logging
     * @returns {Promise<Object>} Render result with buffer
     */
    async renderFrame(project, frameNumber, totalFrames, projectName) {
        this.logger.info('Starting frame render', { frameNumber, projectName });

        try {
            const startTime = Date.now();

            // Emit progress event
            this.emitProgressEvent('frameStarted', {
                frameNumber,
                totalFrames,
                projectName
            });

            // Generate single frame
            const buffer = await project.generateSingleFrame(frameNumber, totalFrames, true);

            const renderTime = Date.now() - startTime;
            
            // Calculate progress - handle 0-indexed frames
            const framesCompleted = frameNumber + 1;
            const progress = Math.min(100, Math.max(1, Math.round((framesCompleted / totalFrames) * 100)));

            // Emit completion event
            this.emitProgressEvent('frameCompleted', {
                frameNumber,
                totalFrames,
                renderTime,
                progress,
                projectName
            });

            console.log(`✅ Frame ${frameNumber}/${totalFrames} (${renderTime}ms)`);

            return {
                success: true,
                frameBuffer: buffer,
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
     * @param {Object} project - Configured project instance
     * @param {Object} projectState - Project state instance
     * @returns {Promise<Object>} Render loop result
     */
    async startRenderLoop(project, projectState) {
        const config = projectState.getState();
        
        console.log('🔥 RenderCoordinator.startRenderLoop() called for NEW random loop generation');
        this.logger.header('Starting New Random Loop Generation');

        try {
            // Import event bus for render loop monitoring
            const { UnifiedEventBus } = await import('my-nft-gen/src/core/events/UnifiedEventBus.js');

            // Import the loop terminator
            const { default: loopTerminator } = await import('../core/events/LoopTerminator.js');

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
     * @param {Object} project - Project instance (can be null for resume)
     * @param {Object} projectState - Project state instance
     * @returns {Promise<Object>} Resume result
     */
    async startResumeLoop(project, projectState) {
        const config = projectState.getState();

        // Validate this is actually a resumed project
        if (!config.isResumed || !config.settingsFilePath) {
            throw new Error('startResumeLoop called on non-resumed project. Use startRenderLoop for new projects.');
        }

        console.log('🔄 RenderCoordinator.startResumeLoop() called for project resume from:', config.settingsFilePath);
        this.logger.header('Starting Project Resume');

        try {
            // Import event bus for render loop monitoring
            const { UnifiedEventBus } = await import('my-nft-gen/src/core/events/UnifiedEventBus.js');

            // Import the loop terminator
            const { default: loopTerminator } = await import('../core/events/LoopTerminator.js');

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
            return { success: true, message: 'Project resume started', loopId, workerId };

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

    // Private helper methods

    /**
     * Internal method to run random loop generation
     * @param {Object} project - Configured project instance
     * @param {Object} eventBus - Event bus for monitoring
     * @param {string} loopId - Unique loop identifier
     * @param {string} workerId - Unique worker identifier
     * @param {Object} projectState - Project state instance
     * @private
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
     * @private
     */
    async runProjectResume(project, eventBus, loopId, workerId, projectState) {
        try {
            const config = projectState.getState();
            this.logger.info(`Starting ResumeProject for loop: ${loopId}, worker: ${workerId}, settings: ${config.settingsFilePath}`);

            // Emit project resume start event
            if (eventBus) {
                eventBus.emit('project.resume.start', {
                    timestamp: Date.now(),
                    projectName: project?.projectName || 'Unknown',
                    settingsFilePath: config.settingsFilePath,
                    loopId,
                    workerId
                });
            }

            // Also emit via IPC for EventBusMonitor
            this.emitProgressEvent('project.resume.start', {
                timestamp: Date.now(),
                projectName: project?.projectName || 'Unknown',
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
        const forwardEventToRenderer = (eventName, data) => {
            this.logger.event(eventName, data);
            try {
                if (BrowserWindow && BrowserWindow.getAllWindows && BrowserWindow.getAllWindows().length > 0) {
                    BrowserWindow.getAllWindows()[0].webContents.send('worker-event', { eventName, data });
                }
            } catch (error) {
                // BrowserWindow not available (e.g., in test environment)
                // This is expected and should not cause failures
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