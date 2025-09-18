const { ipcMain } = require('electron');

/**
 * Effects-specific IPC handlers
 * Follows Interface Segregation Principle - only effects-related operations
 */
class EffectsHandlers {
    constructor(effectsManager) {
        this.effectsManager = effectsManager;
    }

    /**
     * Register all effects-related IPC handlers
     */
    register() {
        ipcMain.handle('discover-effects', async (event) => {
            return await this.effectsManager.discoverEffects();
        });

        ipcMain.handle('get-effect-metadata', async (event, { effectName, category }) => {
            try {
                const metadata = await this.effectsManager.getEffectMetadata({ effectName, category });
                return metadata;
            } catch (error) {
                throw error;
            }
        });

        ipcMain.handle('get-effect-defaults', async (event, effectName) => {
            try {
                const defaults = await this.effectsManager.getEffectDefaults(effectName);
                return {
                    success: true,
                    defaults: defaults || {}
                };
            } catch (error) {
                console.error('Error getting effect defaults via IPC:', error);
                return {
                    success: false,
                    error: error.message,
                    defaults: {}
                };
            }
        });

        ipcMain.handle('get-effect-schema', async (event, effectName) => {
            return await this.effectsManager.getEffectSchema(effectName);
        });

        ipcMain.handle('validate-effect', async (event, effectMetadata) => {
            return await this.effectsManager.validateEffect(effectMetadata);
        });

        ipcMain.handle('introspect-config', async (event, { effectName, projectData }) => {
            return await this.effectsManager.introspectConfig({ effectName, projectData });
        });

        ipcMain.handle('get-available-effects', async (event) => {
            try {
                const effects = await this.effectsManager.getAvailableEffects();
                return {
                    success: true,
                    effects: effects
                };
            } catch (error) {
                console.error('Error getting available effects via IPC:', error);
                return {
                    success: false,
                    error: error.message,
                    effects: { primary: [], secondary: [] }
                };
            }
        });
    }

    /**
     * Unregister all effects-related IPC handlers
     */
    unregister() {
        const handlers = [
            'discover-effects',
            'get-effect-metadata',
            'get-effect-defaults',
            'get-effect-schema',
            'validate-effect',
            'introspect-config',
            'get-available-effects'
        ];

        handlers.forEach(handler => {
            ipcMain.removeAllListeners(handler);
        });
    }
}

module.exports = EffectsHandlers;