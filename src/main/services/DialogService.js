import { dialog } from 'electron';
import SafeConsole from '../utils/SafeConsole.js';

/**
 * Service responsible for dialog operations only
 * Follows Single Responsibility Principle
 */
class DialogService {
    /**
     * Show folder selection dialog
     * @returns {Promise<Object>} Dialog result
     */
    async showFolderDialog() {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory']
            });
            return result;
        } catch (error) {
            SafeConsole.error('Error showing folder dialog:', error);
            return { canceled: true };
        }
    }

    /**
     * Show file selection dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<Object>} Dialog result
     */
    async showFileDialog(options = {}) {
        try {
            const dialogOptions = {
                properties: ['openFile'],
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                ...options
            };

            const result = await dialog.showOpenDialog(dialogOptions);
            return result;
        } catch (error) {
            SafeConsole.error('Error showing file dialog:', error);
            return { canceled: true };
        }
    }

    /**
     * Show save dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<Object>} Dialog result
     */
    async showSaveDialog(options = {}) {
        try {
            const result = await dialog.showSaveDialog(options);
            return result;
        } catch (error) {
            SafeConsole.error('Error showing save dialog:', error);
            return { canceled: true };
        }
    }
}

export default DialogService;