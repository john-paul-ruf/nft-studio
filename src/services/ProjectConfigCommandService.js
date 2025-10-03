/**
 * Project Config Command Service
 * Handles project configuration commands (Resolution, Orientation, Frames)
 * Extracted from ProjectCommands.js as part of God Object Destruction Plan - Phase 6, Step 6.3
 */

import { Command } from './CommandService.js';
import EventBusService from './EventBusService.js';

/**
 * Service for creating and managing project configuration commands
 */
class ProjectConfigCommandService {
    constructor() {
        console.log('⚙️ ProjectConfigCommandService: Initialized - Project configuration command management');
    }

    /**
     * Create command to change project resolution
     * @param {Object} projectState - Project state instance
     * @param {number} newResolution - New resolution value
     * @returns {Command} ChangeResolutionCommand instance
     */
    createChangeResolutionCommand(projectState, newResolution) {
        return new ChangeResolutionCommand(projectState, newResolution);
    }

    /**
     * Create command to toggle project orientation
     * @param {Object} projectState - Project state instance
     * @returns {Command} ToggleOrientationCommand instance
     */
    createToggleOrientationCommand(projectState) {
        return new ToggleOrientationCommand(projectState);
    }

    /**
     * Create command to change number of frames
     * @param {Object} projectState - Project state instance
     * @param {number} newFrameCount - New frame count
     * @returns {Command} ChangeFramesCommand instance
     */
    createChangeFramesCommand(projectState, newFrameCount) {
        return new ChangeFramesCommand(projectState, newFrameCount);
    }
}

/**
 * Command to change project resolution
 */
export class ChangeResolutionCommand extends Command {
    constructor(projectState, newResolution) {
        let oldResolution = null;

        const executeAction = () => {
            const currentState = projectState.getState();
            oldResolution = currentState.targetResolution || currentState.resolution;

            // Use ProjectState method to trigger auto-scaling
            projectState.setTargetResolution(newResolution);

            // Emit event for UI updates
            EventBusService.emit('resolution:changed', {
                oldResolution,
                newResolution,
                projectData: projectState.getState()
            }, { source: 'ChangeResolutionCommand' });

            return { success: true, oldResolution, newResolution };
        };

        const undoAction = () => {
            if (oldResolution === null) {
                throw new Error('No previous resolution to restore');
            }

            // Use ProjectState method to trigger auto-scaling
            projectState.setTargetResolution(oldResolution);

            // Emit event for UI updates
            EventBusService.emit('resolution:changed', {
                oldResolution: newResolution,
                newResolution: oldResolution,
                projectData: projectState.getState()
            }, { source: 'ChangeResolutionCommand' });

            return { success: true };
        };

        const description = `Changed resolution to ${newResolution}`;
        super('project.resolution.change', executeAction, undoAction, description);
        this.newResolution = newResolution;
        this.isEffectCommand = false; // Not an effect command
    }
}

/**
 * Command to toggle orientation
 */
export class ToggleOrientationCommand extends Command {
    constructor(projectState) {
        const executeAction = () => {
            const currentState = projectState.getState();
            const newOrientation = !currentState.isHorizontal;

            // Use ProjectState method to trigger auto-scaling
            projectState.setIsHorizontal(newOrientation);

            // Emit event for UI updates
            EventBusService.emit('orientation:toggled', {
                isHorizontal: newOrientation,
                projectData: projectState.getState()
            }, { source: 'ToggleOrientationCommand' });

            return { success: true, isHorizontal: newOrientation };
        };

        const undoAction = () => {
            // Toggling is its own undo
            return executeAction();
        };

        const currentState = projectState.getState();
        const description = currentState.isHorizontal ? 'Changed to vertical orientation' : 'Changed to horizontal orientation';
        super('project.orientation.toggle', executeAction, undoAction, description);
        this.isEffectCommand = false; // Not an effect command
    }
}

/**
 * Command to change number of frames
 */
export class ChangeFramesCommand extends Command {
    constructor(projectState, newFrameCount) {
        let oldFrameCount = null;

        const executeAction = () => {
            const currentState = projectState.getState();
            oldFrameCount = currentState.numFrames;

            projectState.update({ numFrames: newFrameCount });

            // Emit event for UI updates
            EventBusService.emit('frames:changed', {
                oldFrameCount,
                newFrameCount,
                projectData: projectState.getState()
            }, { source: 'ChangeFramesCommand' });

            return { success: true, oldFrameCount, newFrameCount };
        };

        const undoAction = () => {
            if (oldFrameCount === null) {
                throw new Error('No previous frame count to restore');
            }

            projectState.update({ numFrames: oldFrameCount });

            // Emit event for UI updates
            EventBusService.emit('frames:changed', {
                oldFrameCount: newFrameCount,
                newFrameCount: oldFrameCount,
                projectData: projectState.getState()
            }, { source: 'ChangeFramesCommand' });

            return { success: true };
        };

        const description = `Changed frame count to ${newFrameCount}`;
        super('project.frames.change', executeAction, undoAction, description);
        this.newFrameCount = newFrameCount;
        this.isEffectCommand = false; // Not an effect command
    }
}

// Export singleton instance
const projectConfigCommandService = new ProjectConfigCommandService();
export default projectConfigCommandService;