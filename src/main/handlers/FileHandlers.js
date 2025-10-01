import { ipcMain } from 'electron';

/**
 * File-specific IPC handlers
 * Follows Interface Segregation Principle - only file-related operations
 */
class FileHandlers {
    constructor(fileOperations) {
        this.fileOperations = fileOperations;
    }

    /**
     * Register all file-related IPC handlers
     */
    register() {
        ipcMain.handle('select-folder', async () => {
            return await this.fileOperations.selectFolder();
        });

        ipcMain.handle('select-directory', async () => {
            return await this.fileOperations.selectDirectory();
        });

        ipcMain.handle('select-file', async (event, options = {}) => {
            return await this.fileOperations.selectFile(options);
        });

        ipcMain.handle('read-file', async (event, filePath) => {
            const result = await this.fileOperations.readFile(filePath);
            return result;
        });

        ipcMain.handle('write-file', async (event, filePath, content) => {
            return await this.fileOperations.writeFile(filePath, content);
        });

        ipcMain.handle('read-frame-image', async (event, framePath) => {
            return await this.fileOperations.readFrameImage(framePath);
        });

        ipcMain.handle('list-completed-frames', async (event, projectDirectory) => {
            return await this.fileOperations.listCompletedFrames(projectDirectory);
        });
    }

    /**
     * Unregister all file-related IPC handlers
     */
    unregister() {
        const handlers = [
            'select-folder',
            'select-directory',
            'select-file',
            'read-file',
            'write-file',
            'read-frame-image',
            'list-completed-frames'
        ];

        handlers.forEach(handler => {
            ipcMain.removeAllListeners(handler);
        });
    }
}

export default FileHandlers;