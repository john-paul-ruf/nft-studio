/**
 * CommandService - Single Source of Truth for All User Actions
 * Implements Command Pattern with built-in undo/redo stack
 */

import EventBusService from './EventBusService.js';

class CommandService {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = 50; // Limit to 50 actions as requested
        this.isExecuting = false;
        this.executionQueue = Promise.resolve(); // Queue for sequential execution

        console.log('⚡ CommandService: Initialized - Single source of truth for user actions');

        // Subscribe to undo/redo events
        EventBusService.subscribe('command:undo', () => this.undo(), { component: 'CommandService' });
        EventBusService.subscribe('command:redo', () => this.redo(), { component: 'CommandService' });

        // Subscribe to undo/redo to specific index events
        EventBusService.subscribe('command:undo-to-index', (payload) => this.undoToIndex(payload.index), { component: 'CommandService' });
        EventBusService.subscribe('command:redo-to-index', (payload) => this.redoToIndex(payload.index), { component: 'CommandService' });
    }

    /**
     * Execute a command with automatic undo/redo stack management
     * Handles both sync and async commands, ensuring sequential execution
     * @param {Object} command - Command to execute
     * @returns {Promise} Promise that resolves when command completes
     */
    execute(command) {
        // Create a promise for this specific execution
        let executionPromise;
        
        // Chain this execution to the queue to ensure sequential execution
        this.executionQueue = this.executionQueue
            .then(async () => {
                if (this.isExecuting) {
                    console.warn('⚡ CommandService: Command already executing, skipping');
                    return;
                }

                this.isExecuting = true;

                try {
                    console.log(`⚡ CommandService: Executing command '${command.type}'`, command);

                    // Execute the command (await if it's a promise)
                    const result = await command.execute();

                    // Only add to undo stack if command is undoable AND is an effect command
                    if (command.undo && command.isEffectCommand !== false) {
                        // Check if this is an effect-related command
                        if (command.isEffectCommand === true) {
                            console.log(`⚡ CommandService: Adding effect command to undo stack: ${command.type}`);
                            this.undoStack.push(command);

                            // Clear redo stack when new command is executed
                            this.redoStack = [];

                            // Maintain stack size
                            if (this.undoStack.length > this.maxStackSize) {
                                this.undoStack = this.undoStack.slice(-this.maxStackSize);
                            }
                        } else {
                            console.log(`⚡ CommandService: Skipping non-effect command for undo/redo: ${command.type}`);
                        }
                    }

                    // Only emit undo/redo state changes for effect commands
                    if (command.isEffectCommand !== false) {
                        EventBusService.emit('command:executed', {
                            command: command.type,
                            description: command.description,
                            canUndo: this.canUndo(),
                            canRedo: this.canRedo(),
                            stackSize: this.undoStack.length,
                            undoStack: this.getUndoHistory(),
                            redoStack: this.getRedoHistory()
                        }, { source: 'CommandService' });
                    }

                    return result;

                } catch (error) {
                    console.error(`⚡ CommandService: Error executing command '${command.type}':`, error);
                    EventBusService.emit('command:error', { command: command.type, error }, { source: 'CommandService' });
                    throw error;
                } finally {
                    this.isExecuting = false;
                }
            })
            .catch(error => {
                // Catch errors to prevent unhandled rejections in the queue chain
                // The error is already logged and emitted above, just prevent propagation
                throw error;
            });

        // Store the execution promise before catching to return to caller
        executionPromise = this.executionQueue;
        
        // Catch errors in the queue to prevent them from breaking the chain
        this.executionQueue = this.executionQueue.catch(() => {
            // Silently catch to keep the queue alive for next command
            // Errors are already handled and thrown to the caller via executionPromise
        });

        // Return the promise for this specific execution (with error propagation)
        return executionPromise;
    }

    /**
     * Undo the last command
     */
    undo() {
        if (!this.canUndo()) {
            console.warn('⚡ CommandService: No commands to undo');
            return;
        }

        const command = this.undoStack.pop();
        console.log(`⚡ CommandService: Undoing command '${command.type}'`);

        try {
            command.undo();
            this.redoStack.push(command);

            EventBusService.emit('command:undone', {
                command: command.type,
                description: command.description,
                canUndo: this.canUndo(),
                canRedo: this.canRedo(),
                undoStack: this.getUndoHistory(),
                redoStack: this.getRedoHistory()
            }, { source: 'CommandService' });

        } catch (error) {
            console.error(`⚡ CommandService: Error undoing command '${command.type}':`, error);
            // Put command back on undo stack if undo failed
            this.undoStack.push(command);
            throw error;
        }
    }

    /**
     * Undo multiple commands to a specific index
     */
    undoToIndex(targetIndex) {
        if (targetIndex < 0 || targetIndex >= this.undoStack.length) {
            console.warn('⚡ CommandService: Invalid undo index:', targetIndex);
            return;
        }

        const commandsToUndo = this.undoStack.length - targetIndex;
        console.log(`⚡ CommandService: Undoing ${commandsToUndo} commands to reach index ${targetIndex}`);

        for (let i = 0; i < commandsToUndo; i++) {
            this.undo();
        }
    }

    /**
     * Redo the last undone command
     */
    redo() {
        if (!this.canRedo()) {
            console.warn('⚡ CommandService: No commands to redo');
            return;
        }

        const command = this.redoStack.pop();
        console.log(`⚡ CommandService: Redoing command '${command.type}'`);

        try {
            command.execute();
            this.undoStack.push(command);

            EventBusService.emit('command:redone', {
                command: command.type,
                description: command.description,
                canUndo: this.canUndo(),
                canRedo: this.canRedo(),
                undoStack: this.getUndoHistory(),
                redoStack: this.getRedoHistory()
            }, { source: 'CommandService' });

        } catch (error) {
            console.error(`⚡ CommandService: Error redoing command '${command.type}':`, error);
            // Put command back on redo stack if redo failed
            this.redoStack.push(command);
            throw error;
        }
    }

    /**
     * Redo multiple commands to a specific index
     */
    redoToIndex(targetIndex) {
        if (targetIndex < 0 || targetIndex >= this.redoStack.length) {
            console.warn('⚡ CommandService: Invalid redo index:', targetIndex);
            return;
        }

        const commandsToRedo = this.redoStack.length - targetIndex;
        console.log(`⚡ CommandService: Redoing ${commandsToRedo} commands to reach index ${targetIndex}`);

        for (let i = 0; i < commandsToRedo; i++) {
            this.redo();
        }
    }

    /**
     * Check if undo is possible
     * @returns {boolean} True if can undo
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Check if redo is possible
     * @returns {boolean} True if can redo
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Get undo/redo state for UI
     * @returns {Object} Undo/redo state
     */
    getState() {
        return {
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            undoStackSize: this.undoStack.length,
            redoStackSize: this.redoStack.length,
            lastCommand: this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1].type : null,
            lastCommandDescription: this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1].description : null,
            undoStack: this.getUndoHistory(),
            redoStack: this.getRedoHistory()
        };
    }

    /**
     * Get undo history with descriptions
     * @returns {Array} Undo history
     */
    getUndoHistory() {
        return this.undoStack.map((cmd, index) => ({
            index,
            type: cmd.type,
            description: cmd.description || cmd.type,
            timestamp: cmd.timestamp
        })).reverse(); // Most recent first
    }

    /**
     * Get redo history with descriptions
     * @returns {Array} Redo history
     */
    getRedoHistory() {
        return this.redoStack.map((cmd, index) => ({
            index,
            type: cmd.type,
            description: cmd.description || cmd.type,
            timestamp: cmd.timestamp
        })).reverse(); // Most recent first
    }

    /**
     * Clear all command history
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        console.log('⚡ CommandService: Cleared command history');

        EventBusService.emit('command:cleared', {
            canUndo: false,
            canRedo: false
        }, { source: 'CommandService' });
    }

    /**
     * Get command history for debugging
     * @returns {Object} Command history
     */
    getHistory() {
        return {
            undoStack: this.undoStack.map(cmd => ({ type: cmd.type, timestamp: cmd.timestamp })),
            redoStack: this.redoStack.map(cmd => ({ type: cmd.type, timestamp: cmd.timestamp }))
        };
    }
}

/**
 * Base Command Class
 * All commands should extend this class
 */
export class Command {
    constructor(type, executeAction, undoAction = null, description = null) {
        this.type = type;
        this.description = description || type; // Human-readable description
        this.timestamp = Date.now();
        this.executeAction = executeAction;
        this.undoAction = undoAction;
    }

    execute() {
        return this.executeAction();
    }

    undo() {
        if (!this.undoAction) {
            throw new Error(`Command '${this.type}' is not undoable`);
        }
        return this.undoAction();
    }
}

// Export singleton instance
export default new CommandService();