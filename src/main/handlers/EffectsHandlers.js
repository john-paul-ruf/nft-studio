import { ipcMain } from 'electron';
import SafeConsole from '../utils/SafeConsole.js';

// Module-level cache for my-nft-gen imports
let _moduleCache = null;

async function _loadModules() {
    if (!_moduleCache) {
        const { getAllFindValueAlgorithms } = await import('my-nft-gen/src/core/math/findValue.js');
        _moduleCache = { getAllFindValueAlgorithms };
    }
    return _moduleCache;
}

/**
 * Effects-specific IPC handlers
 * Follows Interface Segregation Principle - only effects-related operations
 */
class EffectsHandlers {
    constructor(effectsManager) {
        this.effectsManager = effectsManager;
        // Use singleton EffectRegistryService from manager to avoid multiple initializations
        this.registryService = effectsManager?.effectRegistryService || null;
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
                SafeConsole.error('Error getting effect defaults via IPC:', error);
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
                const { getAllFindValueAlgorithms } = await _loadModules();
                const algorithms = getAllFindValueAlgorithms();
                return {
                    success: true,
                    algorithms: algorithms
                };
            } catch (error) {
                SafeConsole.error('Error getting FindValue algorithms via IPC:', error);
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
                // Retry logic: effects might not be loaded on first request
                let effects = await this.effectsManager.getAvailableEffects();
                let retries = 0;
                const maxRetries = 5;
                
                // If we got empty effects, wait a bit and retry
                // This handles the case where effects registry is still initializing
                while (
                    (
                        !effects.primary || 
                        !effects.secondary || 
                        effects.primary.length === 0
                    ) && 
                    retries < maxRetries
                ) {
                    SafeConsole.log(`📊 [EffectsHandlers] Effects not loaded yet, retrying... (${retries + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 200 * (retries + 1)));
                    effects = await this.effectsManager.getAvailableEffects();
                    retries++;
                }
                
                if (retries > 0 && effects.primary && effects.primary.length > 0) {
                    SafeConsole.log(`✅ [EffectsHandlers] Effects loaded successfully after ${retries} retries`);
                }
                
                return {
                    success: true,
                    effects: effects
                };
            } catch (error) {
                SafeConsole.error('Error getting available effects via IPC:', error);
                return {
                    success: false,
                    error: error.message,
                    effects: { primary: [], secondary: [], finalImage: [], keyFrame: [] }
                };
            }
        });

        ipcMain.handle('refresh-effect-registry', async (event, skipPluginReload = true) => {
            try {
                // Refresh the effect registry (useful after loading plugins)
                // Pass skipPluginReload=true by default when called from UI to prevent infinite loops
                // The UI typically calls this after plugin:loaded events, so we don't need to reload plugins again
                await this.registryService.refreshRegistry(skipPluginReload);

                // Return updated effects list
                const effects = await this.effectsManager.getAvailableEffects();
                return {
                    success: true,
                    effects: effects,
                    message: 'Effect registry refreshed successfully'
                };
            } catch (error) {
                SafeConsole.error('Error refreshing effect registry via IPC:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        ipcMain.handle('debug-effect-registry', async (event) => {
            try {
                const debugInfo = await this.registryService.debugRegistry();
                
                return {
                    success: true,
                    debug: debugInfo
                };
            } catch (error) {
                SafeConsole.error('Error debugging effect registry via IPC:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // Preset-related handlers
        ipcMain.handle('get-effect-presets', async (event, effectName) => {
            try {
                const presets = await this.registryService.getPresetsForEffect(effectName);
                
                return {
                    success: true,
                    presets: presets || []
                };
            } catch (error) {
                SafeConsole.error('Error getting effect presets via IPC:', error);
                return {
                    success: false,
                    error: error.message,
                    presets: []
                };
            }
        });

        ipcMain.handle('get-preset', async (event, { effectName, presetName }) => {
            try {
                const preset = await this.registryService.getPreset(effectName, presetName);
                
                return {
                    success: true,
                    preset: preset
                };
            } catch (error) {
                SafeConsole.error('Error getting preset via IPC:', error);
                return {
                    success: false,
                    error: error.message,
                    preset: null
                };
            }
        });

        ipcMain.handle('has-presets', async (event, effectName) => {
            try {
                const hasPresets = await this.registryService.hasPresets(effectName);
                
                return {
                    success: true,
                    hasPresets: hasPresets
                };
            } catch (error) {
                SafeConsole.error('Error checking presets via IPC:', error);
                return {
                    success: false,
                    error: error.message,
                    hasPresets: false
                };
            }
        });

        ipcMain.handle('get-preset-names', async (event, effectName) => {
            try {
                const names = await this.registryService.getPresetNames(effectName);
                
                return {
                    success: true,
                    names: names || []
                };
            } catch (error) {
                SafeConsole.error('Error getting preset names via IPC:', error);
                return {
                    success: false,
                    error: error.message,
                    names: []
                };
            }
        });

        // User preset persistence
        ipcMain.handle('save-user-preset', async (event, { effectName, presetName, config }) => {
            try {
                const map = await this.registryService._readUserPresetsMap();
                const namesForEffect = map[effectName] || {};
                if (namesForEffect[presetName]) {
                    return { success: false, error: 'Duplicate preset name' };
                }
                map[effectName] = { ...namesForEffect, [presetName]: config };
                const ok = await this.registryService._writeUserPresetsMap(map);
                return { success: ok };
            } catch (error) {
                SafeConsole.error('Error saving user preset via IPC:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('delete-user-preset', async (event, { effectName, presetName }) => {
            try {
                const map = await this.registryService._readUserPresetsMap();
                if (map?.[effectName]?.[presetName]) {
                    delete map[effectName][presetName];
                    const ok = await this.registryService._writeUserPresetsMap(map);
                    return { success: ok };
                }
                return { success: true };
            } catch (error) {
                SafeConsole.error('Error deleting user preset via IPC:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('list-user-presets', async (event, effectName) => {
            try {
                const map = await this.registryService._readUserPresetsMap();
                const list = Object.keys(map?.[effectName] || {});
                return { success: true, names: list };
            } catch (error) {
                SafeConsole.error('Error listing user presets via IPC:', error);
                return { success: false, error: error.message, names: [] };
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