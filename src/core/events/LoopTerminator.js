import EventBusService from '../../services/EventBusService.js';

/**
 * Loop Terminator - Utility for terminating entire loop generation processes
 * 
 * This provides a comprehensive interface for stopping loop generation at any stage
 * Adapted for nft-studio's EventBusService architecture
 */
export class LoopTerminator {
    constructor() {
        this.eventBus = EventBusService;
        this.activeWorkers = new Map(); // Track active workers
        this.activeLoops = new Map(); // Track active loops
        this.setupAutoTermination();
    }

    /**
     * Register a worker as active
     */
    registerWorker(workerId, loopId = null) {
        this.activeWorkers.set(workerId, {
            loopId,
            startTime: Date.now(),
            status: 'active'
        });
        
        this.eventBus.emit('workerStarted', {
            workerId,
            loopId,
            timestamp: Date.now()
        }, { source: 'LoopTerminator' });
    }

    /**
     * Unregister a worker
     */
    unregisterWorker(workerId, reason = 'completed') {
        const worker = this.activeWorkers.get(workerId);
        if (worker) {
            this.activeWorkers.delete(workerId);
            
            this.eventBus.emit('workerKilled', {
                workerId,
                reason,
                timestamp: Date.now()
            }, { source: 'LoopTerminator' });
        }
    }

    /**
     * Terminate a specific loop generation process
     */
    terminateLoop(loopId, reason = 'user_requested') {
        console.log(`🛑 Terminating loop: ${loopId} (reason: ${reason})`);
        
        // Send loop termination event
        this.eventBus.emit('loop:terminate', {
            loopId,
            reason,
            timestamp: Date.now()
        }, { source: 'LoopTerminator' });
        
        return true;
    }

    /**
     * Terminate all active loops
     */
    terminateAllLoops(reason = 'user_requested') {
        console.log(`🛑 Terminating all loops (reason: ${reason})`);
        
        // Send termination event
        this.eventBus.emit('loop:terminate_all', {
            reason,
            timestamp: Date.now()
        }, { source: 'LoopTerminator' });
        
        return true;
    }

    /**
     * Kill a specific worker
     */
    killWorker(workerId, signal = 'SIGTERM') {
        console.log(`🛑 Killing worker: ${workerId} (signal: ${signal})`);
        
        this.eventBus.emit('killWorker', {
            workerId,
            signal,
            requestedBy: 'LoopTerminator',
            timestamp: Date.now()
        }, { source: 'LoopTerminator' });
        
        return true;
    }

    /**
     * Kill all workers
     */
    killAllWorkers(signal = 'SIGTERM') {
        console.log(`🛑 Killing all workers (signal: ${signal})`);
        
        this.eventBus.emit('killAllWorkers', {
            signal,
            requestedBy: 'LoopTerminator',
            timestamp: Date.now()
        }, { source: 'LoopTerminator' });
        
        return true;
    }

    /**
     * Emergency stop - immediately terminate all loops and workers
     */
    emergencyStopAll(reason = 'emergency') {
        console.log('🚨 EMERGENCY STOP - Terminating all loops and workers immediately');
        
        // Send emergency stop event
        this.eventBus.emit('system:emergency_stop', {
            timestamp: Date.now(),
            reason
        }, { source: 'LoopTerminator' });
        
        // Also terminate all workers with SIGKILL for immediate termination
        this.killAllWorkers('SIGKILL');
        
        // Additional brute force cleanup - directly kill processes
        this.performBruteForceCleanup();
        
        return true;
    }

    /**
     * Brute force cleanup - directly kill all potential worker processes
     * This is a last resort method that bypasses the event system
     */
    async performBruteForceCleanup() {
        try {
            console.log('🔥 Performing brute force process cleanup...');
            
            const { execSync } = await import('child_process');
            
            // Kill all potential worker processes immediately (including resumed projects)
            const killCommands = [
                // Kill all node processes that might be workers
                `pkill -f "GenerateLoopWorkerThread"`,
                `pkill -f "RequestNewWorkerThread"`,
                `pkill -f "RequestNewFrameBuilderThread"`,
                `pkill -f "ResumeProject"`,
                `pkill -f "my-nft-gen"`,
                // Kill any node processes with 'worker' in the command line
                `pkill -f "node.*worker"`,
                `pkill -f "node.*ResumeProject"`,
                `pkill -f "node.*my-nft-gen"`,
                // Kill media processing tools that might be spawned
                `pkill -f "ffmpeg"`,
                `pkill -f "sharp"`
            ];
            
            for (const cmd of killCommands) {
                try {
                    execSync(cmd, { timeout: 2000 });
                    console.log(`✅ Executed: ${cmd}`);
                } catch (e) {
                    // Ignore errors - process might not exist
                    console.log(`ℹ️ Command completed: ${cmd}`);
                }
            }
            
            // Clear our internal tracking
            this.activeWorkers.clear();
            this.activeLoops.clear();
            
            console.log('🔥 Brute force cleanup completed');
            
        } catch (error) {
            console.error('❌ Brute force cleanup failed:', error.message);
        }
    }

    /**
     * Graceful shutdown with timeout
     */
    async gracefulShutdown(timeoutMs = 10000, reason = 'graceful_shutdown') {
        console.log(`🛑 Initiating graceful shutdown (timeout: ${timeoutMs}ms)`);
        
        // Send graceful shutdown signal
        this.eventBus.emit('system:graceful_shutdown', {
            timeoutMs,
            reason,
            timestamp: Date.now()
        }, { source: 'LoopTerminator' });
        
        // Wait for processes to terminate gracefully or timeout
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.log(`⚠️ Graceful shutdown timeout exceeded, forcing termination`);
                this.emergencyStopAll('graceful_timeout');
                resolve(false); // Indicates forced termination
            }, timeoutMs);
            
            // Listen for all processes to complete
            const checkCompletion = () => {
                if (this.activeWorkers.size === 0) {
                    clearTimeout(timeout);
                    resolve(true); // Indicates successful graceful shutdown
                }
            };
            
            // Check periodically
            const interval = setInterval(checkCompletion, 500);
            
            // Clean up interval when done
            setTimeout(() => clearInterval(interval), timeoutMs);
        });
    }

    /**
     * Get status of active loops and workers
     */
    getSystemStatus() {
        return {
            workers: Array.from(this.activeWorkers.keys()),
            loops: Array.from(this.activeLoops.keys()),
            workerDetails: Object.fromEntries(this.activeWorkers),
            loopDetails: Object.fromEntries(this.activeLoops)
        };
    }

    /**
     * Set up automatic loop termination handling
     */
    setupAutoTermination() {
        // Listen for loop termination requests
        this.eventBus.subscribe('loop:terminate', (data) => {
            const { loopId, reason } = data;
            console.log(`🛑 Processing loop termination request for: ${loopId}`);
            
            // Find and terminate workers associated with this loop
            const workersToKill = [];
            this.activeWorkers.forEach((worker, workerId) => {
                if (worker.loopId === loopId) {
                    workersToKill.push(workerId);
                }
            });
            
            // Kill associated workers
            workersToKill.forEach(workerId => {
                this.killWorker(workerId, 'SIGTERM');
            });
        }, { component: 'LoopTerminator' });

        // Listen for terminate all loops
        this.eventBus.subscribe('loop:terminate_all', (data) => {
            const { reason } = data;
            console.log(`🛑 Processing terminate all loops request`);
            
            this.killAllWorkers('SIGTERM');
        }, { component: 'LoopTerminator' });

        // Listen for emergency stop
        this.eventBus.subscribe('system:emergency_stop', (data) => {
            const { reason } = data;
            console.log(`🚨 Processing emergency stop`);
            
            // Force terminate all workers immediately
            const workers = Array.from(this.activeWorkers.keys());
            workers.forEach(workerId => {
                this.killWorker(workerId, 'SIGKILL');
            });
        }, { component: 'LoopTerminator' });

        // Listen for graceful shutdown
        this.eventBus.subscribe('system:graceful_shutdown', (data) => {
            const { timeoutMs, reason } = data;
            console.log(`🛑 Processing graceful shutdown request`);
            
            // Send termination signal to all workers
            this.killAllWorkers('SIGTERM');
        }, { component: 'LoopTerminator' });

        console.log('🛑 Loop termination auto-handling setup complete');
    }
}

// Create singleton instance
const loopTerminator = new LoopTerminator();

// Export convenience functions
export const terminateLoop = loopTerminator.terminateLoop.bind(loopTerminator);
export const terminateAllLoops = loopTerminator.terminateAllLoops.bind(loopTerminator);
export const killWorker = loopTerminator.killWorker.bind(loopTerminator);
export const killAllWorkers = loopTerminator.killAllWorkers.bind(loopTerminator);
export const emergencyStopAll = loopTerminator.emergencyStopAll.bind(loopTerminator);
export const gracefulShutdown = loopTerminator.gracefulShutdown.bind(loopTerminator);
export const getSystemStatus = loopTerminator.getSystemStatus.bind(loopTerminator);
export const performBruteForceCleanup = loopTerminator.performBruteForceCleanup.bind(loopTerminator);

export default loopTerminator;