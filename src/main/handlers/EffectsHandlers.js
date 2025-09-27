import { ipcMain } from 'electron';

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

        ipcMain.handle('get-findvalue-algorithms', async (event) => {
            try {
                // Import the getAllFindValueAlgorithms function
                const { getAllFindValueAlgorithms } = await import('my-nft-gen/src/core/math/findValue.js');
                const algorithms = getAllFindValueAlgorithms();
                return {
                    success: true,
                    algorithms: algorithms
                };
            } catch (error) {
                console.error('Error getting FindValue algorithms via IPC:', error);
                return {
                    success: false,
                    error: error.message,
                    algorithms: []
                };
            }
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

        ipcMain.handle('refresh-effect-registry', async (event, skipPluginReload = true) => {
            try {
                // Refresh the effect registry (useful after loading plugins)
                const EffectRegistryService = await import('../services/EffectRegistryService.js');
                const registryService = new EffectRegistryService.default();
                // Pass skipPluginReload=true by default when called from UI to prevent infinite loops
                // The UI typically calls this after plugin:loaded events, so we don't need to reload plugins again
                await registryService.refreshRegistry(skipPluginReload);

                // Return updated effects list
                const effects = await this.effectsManager.getAvailableEffects();
                return {
                    success: true,
                    effects: effects,
                    message: 'Effect registry refreshed successfully'
                };
            } catch (error) {
                console.error('Error refreshing effect registry via IPC:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        ipcMain.handle('debug-effect-registry', async (event) => {
            try {
                const EffectRegistryService = await import('../services/EffectRegistryService.js');
                const registryService = new EffectRegistryService.default();
                const debugInfo = await registryService.debugRegistry();
                
                return {
                    success: true,
                    debug: debugInfo
                };
            } catch (error) {
                console.error('Error debugging effect registry via IPC:', error);
                return {
                    success: false,
                    error: error.message
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
            'get-findvalue-algorithms',
            'validate-effect',
            'introspect-config',
            'get-available-effects',
            'refresh-effect-registry',
            'debug-effect-registry'
        ];

        handlers.forEach(handler => {
            ipcMain.removeAllListeners(handler);
        });
    }
}

export default EffectsHandlers;