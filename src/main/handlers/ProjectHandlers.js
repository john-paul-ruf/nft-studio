const { ipcMain } = require('electron');

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
        ipcMain.handle('start-new-project', async (event, projectConfig) => {
            return await this.projectManager.startNewProject(projectConfig);
        });

        ipcMain.handle('resume-project', async (event, settingsPath) => {
            return await this.projectManager.resumeProject(settingsPath);
        });

        ipcMain.handle('render-frame', async (event, config, frameNumber) => {
            return await this.projectManager.renderFrame(config, frameNumber);
        });
    }

    /**
     * Unregister all project-related IPC handlers
     */
    unregister() {
        const handlers = [
            'start-new-project',
            'resume-project',
            'render-frame'
        ];

        handlers.forEach(handler => {
            ipcMain.removeAllListeners(handler);
        });
    }
}

module.exports = ProjectHandlers;