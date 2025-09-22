/**
 * CommandService - Single Source of Truth for All User Actions
 * Implements Command Pattern with built-in undo/redo stack
 */

import EventBusService from './EventBusService.js';

class CommandService {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = 100;
        this.isExecuting = false;

        console.log('⚡ CommandService: Initialized - Single source of truth for user actions');

        // Subscribe to undo/redo events
        EventBusService.subscribe('command:undo', () => this.undo(), { component: 'CommandService' });
        EventBusService.subscribe('command:redo', () => this.redo(), { component: 'CommandService' });
    }

    /**
     * Execute a command with automatic undo/redo stack management
     * @param {Object} command - Command to execute
     */
    execute(command) {
        if (this.isExecuting) {
            console.warn('⚡ CommandService: Command already executing, skipping');
            return;
        }

        this.isExecuting = true;

        try {
            console.log(`⚡ CommandService: Executing command '${command.type}'`, command);

            // Execute the command
            const result = command.execute();

            // Add to undo stack if command is undoable
            if (command.undo) {
                this.undoStack.push(command);

                // Clear redo stack when new command is executed
                this.redoStack = [];

                // Maintain stack size
                if (this.undoStack.length > this.maxStackSize) {
                    this.undoStack = this.undoStack.slice(-this.maxStackSize);
                }
            }

            // Emit command executed event
            EventBusService.emit('command:executed', {
                command: command.type,
                canUndo: this.canUndo(),
                canRedo: this.canRedo(),
                stackSize: this.undoStack.length
            }, { source: 'CommandService' });

            return result;

        } catch (error) {
            console.error(`⚡ CommandService: Error executing command '${command.type}':`, error);
            EventBusService.emit('command:error', { command: command.type, error }, { source: 'CommandService' });
            throw error;
        } finally {
            this.isExecuting = false;
        }
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
                canUndo: this.canUndo(),
                canRedo: this.canRedo()
            }, { source: 'CommandService' });

        } catch (error) {
            console.error(`⚡ CommandService: Error undoing command '${command.type}':`, error);
            // Put command back on undo stack if undo failed
            this.undoStack.push(command);
            throw error;
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
                canUndo: this.canUndo(),
                canRedo: this.canRedo()
            }, { source: 'CommandService' });

        } catch (error) {
            console.error(`⚡ CommandService: Error redoing command '${command.type}':`, error);
            // Put command back on redo stack if redo failed
            this.redoStack.push(command);
            throw error;
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
            lastCommand: this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1].type : null
        };
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
    constructor(type, executeAction, undoAction = null) {
        this.type = type;
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