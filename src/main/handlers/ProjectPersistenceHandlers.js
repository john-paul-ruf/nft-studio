import { ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';

/**
 * Project persistence IPC handlers
 * Handles file operations for ProjectState persistence
 */
export default class ProjectPersistenceHandlers {
    constructor() {
        // No dependencies needed for this handler
    }

    /**
     * Register all project persistence IPC handlers
     */
    register() {
        // Save project to file
        ipcMain.handle('save-project-file', async (event, filePath, projectData) => {
            try {
                console.log('💾 Saving project to:', filePath);
                await fs.writeFile(filePath, JSON.stringify(projectData, null, 2), 'utf8');

                return {
                    success: true,
                    filePath: filePath
                };
            } catch (error) {
                console.error('❌ Error saving project file:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // Load project from file
        ipcMain.handle('load-project-file', async (event, filePath) => {
            try {
                console.log('📁 Loading project from:', filePath);
                const fileContent = await fs.readFile(filePath, 'utf8');
                const projectData = JSON.parse(fileContent);

                // Ensure outputDirectory is absolute if it exists
                if (projectData.state && projectData.state.outputDirectory) {
                    const outputDir = projectData.state.outputDirectory;
                    if (!path.isAbsolute(outputDir)) {
                        // Convert relative paths to absolute paths relative to the project file's directory
                        const projectFileDir = path.dirname(filePath);
                        projectData.state.outputDirectory = path.resolve(projectFileDir, outputDir);
                        console.log('📁 Resolved relative outputDirectory:', outputDir, '->', projectData.state.outputDirectory);
                    }
                }

                return {
                    success: true,
                    projectData: projectData,
                    filePath: filePath
                };
            } catch (error) {
                console.error('❌ Error loading project file:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // Check if project file exists
        ipcMain.handle('project-file-exists', async (event, filePath) => {
            try {
                await fs.access(filePath);
                return { success: true, exists: true };
            } catch (error) {
                return { success: true, exists: false };
            }
        });

        // Generate project file path
        ipcMain.handle('generate-project-path', async (event, projectDirectory, projectName) => {
            try {
                const sanitizedName = this.sanitizeFileName(projectName);
                const filePath = path.join(projectDirectory, `${sanitizedName}.nftproject`);

                return {
                    success: true,
                    filePath: filePath
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // Get directory from file path
        ipcMain.handle('get-dirname', async (event, filePath) => {
            try {
                const dirname = path.dirname(filePath);
                return {
                    success: true,
                    dirname: dirname
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // Join paths
        ipcMain.handle('join-paths', async (event, ...pathSegments) => {
            try {
                const joinedPath = path.join(...pathSegments);
                return {
                    success: true,
                    path: joinedPath
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        console.log('✅ ProjectPersistenceHandlers registered');
    }

    /**
     * Sanitize filename to remove invalid characters
     * @param {string} filename - Original filename
     * @returns {string} Sanitized filename
     */
    sanitizeFileName(filename) {
        if (!filename) return 'Untitled_Project';

        return filename
            .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/_{2,}/g, '_') // Replace multiple underscores with single
            .trim()
            .substring(0, 100) || 'Untitled_Project'; // Limit length and provide fallback
    }

    /**
     * Unregister all project persistence IPC handlers
     */
    unregister() {
        const handlers = [
            'save-project-file',
            'load-project-file',
            'project-file-exists',
            'generate-project-path',
            'get-dirname',
            'join-paths'
        ];

        handlers.forEach(handler => {
            ipcMain.removeAllListeners(handler);
        });

        console.log('🧹 ProjectPersistenceHandlers unregistered');
    }
}