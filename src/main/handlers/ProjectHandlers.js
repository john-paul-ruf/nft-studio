import { ipcMain } from 'electron';
import ProjectState from '../../models/ProjectState.js';

/**
 * Project-specific IPC handlers
 * Follows Interface Segregation Principle - only project-related operations
 */
class ProjectHandlers {
    constructor(projectManager) {
        this.projectManager = projectManager;
    }

    /**
     * Register all project-related IPC handlers
     */
    register() {
        ipcMain.handle('start-new-project', async (event, projectInput) => {
            // Convert to ProjectState if needed
            const projectState = await this.ensureProjectState(projectInput);
            return await this.projectManager.startNewProject(projectState);
        });

        ipcMain.handle('resume-project', async (event, settingsPath) => {
            return await this.projectManager.resumeProject(settingsPath);
        });

        ipcMain.handle('render-frame', async (event, configInput, frameNumber) => {
            // Convert to ProjectState if needed
            const projectState = await this.ensureProjectState(configInput);
            return await this.projectManager.renderFrame(projectState, frameNumber);
        });

        ipcMain.handle('start-render-loop', async (event, configInput) => {
            // Convert to ProjectState if needed
            const projectState = await this.ensureProjectState(configInput);
            return await this.projectManager.startRenderLoop(projectState);
        });

        ipcMain.handle('stop-render-loop', async () => {
            return await this.projectManager.stopRenderLoop();
        });
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
     * Unregister all project-related IPC handlers
     */
    unregister() {
        const handlers = [
            'start-new-project',
            'resume-project',
            'render-frame',
            'start-render-loop',
            'stop-render-loop'
        ];

        handlers.forEach(handler => {
            ipcMain.removeAllListeners(handler);
        });
    }
}

export default ProjectHandlers;