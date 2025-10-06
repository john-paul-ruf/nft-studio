
// Static imports for core modules
import { PluginLoader } from 'my-nft-gen/src/core/plugins/PluginLoader.js';
import { ConfigLinker } from 'my-nft-gen/src/core/registry/ConfigLinker.js';
import { EnhancedEffectsRegistration } from 'my-nft-gen/src/core/registry/EnhancedEffectsRegistration.js';
import { PluginRegistry } from 'my-nft-gen/src/core/registry/PluginRegistry.js';
import { EffectCategories } from 'my-nft-gen/src/core/registry/EffectCategories.js';
import { EffectRegistry } from 'my-nft-gen/src/core/registry/EffectRegistry.js';
import { ConfigRegistry } from 'my-nft-gen/src/core/registry/ConfigRegistry.js';
import { app, BrowserWindow } from 'electron';
import { PluginManagerService } from '../../services/PluginManagerService.js';
import SecurePluginLoader from './SecurePluginLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import SafeConsole from "../utils/SafeConsole.js";

/**
 * Service responsible for effect registry operations only
 * Follows Single Responsibility Principle
 */
class EffectRegistryService {
    constructor() {
        this.coreEffectsRegistered = false;
        this.securePluginLoader = null;
    }

    /**
     * Ensure core effects are registered only once using new enhanced registration with config linking
     * @returns {Promise<void>}
     */
    async ensureCoreEffectsRegistered() {
        if (!this.coreEffectsRegistered) {
            try {
                SafeConsole.log('🔄 [EffectRegistryService] Starting core effects registration...');
                
                // Use the simpler PluginLoader approach that avoids validation issues
                // Ensure effects are loaded
                SafeConsole.log('🔄 [EffectRegistryService] Loading core effects...');
                await PluginLoader.ensureEffectsLoaded();
                SafeConsole.log('✅ [EffectRegistryService] Core effects loaded');

                // Also try to link configs if possible
                try {
                    SafeConsole.log('🔄 [EffectRegistryService] Linking configs...');
                    await ConfigLinker.linkEffectsWithConfigs();
                    SafeConsole.log('✅ [EffectRegistryService] Configs linked');
                } catch (linkError) {
                    // Config linking is optional - effects will still work without it
                    SafeConsole.log('⚠️ [EffectRegistryService] Config linking skipped:', linkError.message);
                }

                this.coreEffectsRegistered = true;
                SafeConsole.log('✅ [EffectRegistryService] Core effects registration complete');
                
                // Load plugins AFTER core effects are fully registered to avoid circular dependencies
                SafeConsole.log('🔄 [EffectRegistryService] Loading user plugins...');
                await this.loadPluginsForUI();
                SafeConsole.log('✅ [EffectRegistryService] User plugins loaded');
                
                // Log registry state for debugging
                await this.logRegistryState();
            } catch (error) {
                SafeConsole.log('❌ [EffectRegistryService] Failed to register core effects:', error);

                // Try the original enhanced registration as a fallback
                try {
                    await EnhancedEffectsRegistration.registerEffectsFromPackage('my-nft-effects-core');

                    this.coreEffectsRegistered = true;
                    SafeConsole.log('✅ [EffectRegistryService] Core effects loaded using enhanced registration');
                } catch (fallbackError) {
                    SafeConsole.log('❌ [EffectRegistryService] All registration methods failed:', fallbackError);
                    throw error; // Re-throw original error
                }
            }
        }
    }
    
    /**
     * Log the current state of the registry for debugging
     * @returns {Promise<void>}
     */
    async logRegistryState() {
        try {
            const primaryEffects = PluginRegistry.getByCategory(EffectCategories.PRIMARY);
            const secondaryEffects = PluginRegistry.getByCategory(EffectCategories.SECONDARY);
            const keyFrameEffects = PluginRegistry.getByCategory(EffectCategories.KEY_FRAME);
            const finalImageEffects = PluginRegistry.getByCategory(EffectCategories.FINAL_IMAGE);
            
            SafeConsole.log('📊 [EffectRegistryService] Current registry state:', {
                primary: primaryEffects.length,
                secondary: secondaryEffects.length,
                keyFrame: keyFrameEffects.length,
                finalImage: finalImageEffects.length
            });
            
            // Log the names of all effects
            SafeConsole.log('📊 [EffectRegistryService] Primary effects:', primaryEffects.map(p => p.name).join(', '));
            SafeConsole.log('📊 [EffectRegistryService] Secondary effects:', secondaryEffects.map(p => p.name).join(', '));
            SafeConsole.log('📊 [EffectRegistryService] Final image effects:', finalImageEffects.map(p => p.name).join(', '));
        } catch (error) {
            SafeConsole.log('❌ [EffectRegistryService] Failed to log registry state:', error);
        }
    }

    /**
     * Get effect registry
     * @returns {Promise<Object>} Effect registry
     */
    async getEffectRegistry() {
        await this.ensureCoreEffectsRegistered();
        return EffectRegistry;
    }

    /**
     * Get config registry
     * @returns {Promise<Object>} Config registry
     */
    async getConfigRegistry() {
        await this.ensureCoreEffectsRegistered();
        return ConfigRegistry;
    }

    /**
     * Get all available effects by category
     * @returns {Promise<Object>} Effects by category
     */
    async getAllEffects() {
        const EffectReg = await this.getEffectRegistry();

        return {
            primary: EffectReg.getByCategoryGlobal(EffectCategories.PRIMARY),
            secondary: EffectReg.getByCategoryGlobal(EffectCategories.SECONDARY),
            keyFrame: EffectReg.getByCategoryGlobal(EffectCategories.KEY_FRAME),
            final: EffectReg.getByCategoryGlobal(EffectCategories.FINAL_IMAGE)
        };
    }

    /**
     * Get specific effect by name
     * @param {string} effectName - Name of effect
     * @returns {Promise<Object|null>} Effect or null if not found
     */
    async getEffect(effectName) {
        const EffectReg = await this.getEffectRegistry();
        return EffectReg.getGlobal(effectName);
    }

    /**
     * Get modern plugin registry with config linking
     * @returns {Promise<Object>} Plugin registry
     */
    async getPluginRegistry() {
        await this.ensureCoreEffectsRegistered();
        return PluginRegistry;
    }

    /**
     * Get effect with its linked config class
     * @param {string} effectName - Name of effect
     * @returns {Promise<Object|null>} Plugin with effect and config class or null if not found
     */
    async getEffectWithConfig(effectName) {
        const PluginReg = await this.getPluginRegistry();
        return PluginReg.get(effectName);
    }

    /**
     * Get all effects with their config classes by category
     * @returns {Promise<Object>} Effects with configs by category
     */
    async getAllEffectsWithConfigs() {
        const PluginReg = await this.getPluginRegistry();

        const result = {
            primary: PluginReg.getByCategory(EffectCategories.PRIMARY),
            secondary: PluginReg.getByCategory(EffectCategories.SECONDARY),
            keyFrame: PluginReg.getByCategory(EffectCategories.KEY_FRAME),
            finalImage: PluginReg.getByCategory(EffectCategories.FINAL_IMAGE)
        };
        
        SafeConsole.log(`📊 [EffectRegistryService] getAllEffectsWithConfigs() returning:`, {
            primary: result.primary.length,
            secondary: result.secondary.length,
            keyFrame: result.keyFrame.length,
            finalImage: result.finalImage.length
        });
        
        return result;
    }

    /**
     * Get plugin registry statistics including config linking info
     * @returns {Promise<Object>} Registry statistics
     */
    async getRegistryStats() {
        const PluginReg = await this.getPluginRegistry();
        return PluginReg.getStats();
    }

    /**
     * Check if core effects are registered
     * @returns {boolean} True if registered
     */
    areCoreEffectsRegistered() {
        return this.coreEffectsRegistered;
    }

    /**
     * Debug method to check current registry state
     * @returns {Promise<Object>} Registry debug information
     */
    async debugRegistry() {
        try {
            const EffectReg = await this.getEffectRegistry();
            
            const debug = {
                primary: Object.keys(EffectReg.getByCategoryGlobal(EffectCategories.PRIMARY)),
                secondary: Object.keys(EffectReg.getByCategoryGlobal(EffectCategories.SECONDARY)),
                keyFrame: Object.keys(EffectReg.getByCategoryGlobal(EffectCategories.KEY_FRAME)),
                finalImage: Object.keys(EffectReg.getByCategoryGlobal(EffectCategories.FINAL_IMAGE))
            };
            
            return debug;
        } catch (error) {
            console.error('❌ Failed to debug registry:', error);
            return { error: error.message };
        }
    }

    /**
     * Load plugins for UI display (called during initial effect registry setup)
     * @returns {Promise<void>}
     */
    async loadPluginsForUI() {
        try {
            // Initialize secure plugin loader if not already done
            if (!this.securePluginLoader) {
                this.securePluginLoader = new SecurePluginLoader();
            }

            // Get enabled plugins
            const appDataPath = app.getPath('userData');
            const pluginManager = new PluginManagerService(appDataPath);
            await pluginManager.initialize();

            const pluginPaths = await pluginManager.loadPluginsForGeneration();

            SafeConsole.log(`📦 [EffectRegistryService] Found ${pluginPaths.length} plugin(s) to load`);
            SafeConsole.log(`📦 [EffectRegistryService] Running in ${app.isPackaged ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
            SafeConsole.log(`📦 [EffectRegistryService] app.isPackaged: ${app.isPackaged}, NODE_ENV: ${process.env.NODE_ENV}`);

            if (pluginPaths.length > 0) {
                SafeConsole.log('📦 [EffectRegistryService] Loading plugins for UI:', pluginPaths);

                for (const pluginInfo of pluginPaths) {
                    if (pluginInfo.success) {
                        try {
                            SafeConsole.log(`🔄 [EffectRegistryService] Loading plugin: ${pluginInfo.name} from ${pluginInfo.path}`);

                            // Try PluginLoader first for development compatibility
                            let loadedSuccessfully = false;

                            if (!app.isPackaged) {
                                // In development, try the standard PluginLoader first
                                try {
                                    SafeConsole.log(`🔄 [EffectRegistryService] Attempting PluginLoader for: ${pluginInfo.name}`);
                                    await PluginLoader.loadPlugin(pluginInfo.path);
                                    SafeConsole.log(`✅ [EffectRegistryService] Plugin loaded via PluginLoader: ${pluginInfo.name}`);
                                    loadedSuccessfully = true;
                                } catch (loaderError) {
                                    SafeConsole.log(`⚠️ [EffectRegistryService] PluginLoader failed, will use secure loader: ${loaderError.message}`);
                                }
                            }

                            // Use secure plugin loader if PluginLoader failed or in production
                            if (!loadedSuccessfully) {
                                SafeConsole.log(`🔒 [EffectRegistryService] Using secure plugin loader for: ${pluginInfo.name}`);
                                SafeConsole.log(`🔒 [EffectRegistryService] Secure loader initialized: ${!!this.securePluginLoader}`);

                                // Determine the actual plugin file
                                let pluginFile = pluginInfo.path;
                                const stats = await fs.stat(pluginInfo.path);

                                if (stats.isDirectory()) {
                                    // Look for main entry point
                                    const possibleFiles = ['plugin.js', 'index.js', 'main.js'];
                                    for (const file of possibleFiles) {
                                        const testPath = path.join(pluginInfo.path, file);
                                        try {
                                            await fs.access(testPath);
                                            pluginFile = testPath;
                                            SafeConsole.log(`📁 [EffectRegistryService] Found plugin entry: ${file}`);
                                            break;
                                        } catch (e) {
                                            // Continue to next file
                                        }
                                    }
                                }

                                // Load plugin in secure sandbox
                                SafeConsole.log(`🔒 [EffectRegistryService] Calling securePluginLoader.loadPlugin for: ${pluginFile}`);
                                const result = await this.securePluginLoader.loadPlugin(pluginFile);
                                SafeConsole.log(`🔒 [EffectRegistryService] SecureLoader result:`, result);

                                if (result.success) {
                                    // Register the effects and configs from the sandbox
                                    SafeConsole.log(`✅ [EffectRegistryService] Plugin loaded securely: ${pluginInfo.name}`);
                                    SafeConsole.log(`   Effects: ${result.effects.length}, Configs: ${result.configs.length}`);

                                    // Process the sandbox results and add to registries
                                    for (const effect of result.effects) {
                                        try {
                                            // Create a safe wrapper for the effect
                                            const SafeEffect = this.createSafeEffectWrapper(effect);
                                            EffectRegistry.register(effect.name, SafeEffect, effect.category);
                                            PluginRegistry.register({
                                                name: effect.name,
                                                category: effect.category,
                                                effectClass: SafeEffect
                                            });
                                            SafeConsole.log(`   ✅ Registered effect: ${effect.name}`);
                                        } catch (regError) {
                                            SafeConsole.log(`   ❌ Failed to register effect ${effect.name}: ${regError.message}`);
                                        }
                                    }

                                    for (const config of result.configs) {
                                        try {
                                            // Create a safe wrapper for the config
                                            const SafeConfig = this.createSafeConfigWrapper(config);
                                            ConfigRegistry.register(config.name, SafeConfig);
                                            SafeConsole.log(`   ✅ Registered config: ${config.name}`);
                                        } catch (regError) {
                                            SafeConsole.log(`   ❌ Failed to register config ${config.name}: ${regError.message}`);
                                        }
                                    }
                                } else {
                                    SafeConsole.log(`❌ [EffectRegistryService] Secure loader failed for ${pluginInfo.name}: ${result.error}`);
                                }
                            }
                        } catch (error) {
                            SafeConsole.log(`❌ [EffectRegistryService] Failed to load plugin ${pluginInfo.name}:`, error);
                            SafeConsole.log(`   Plugin path: ${pluginInfo.path}`);
                            SafeConsole.log(`   Error: ${error.message}`);
                        }
                    }
                }

                SafeConsole.log(`✅ [EffectRegistryService] Finished loading ${pluginPaths.length} plugin(s)`);
            } else {
                SafeConsole.log('ℹ️ [EffectRegistryService] No plugins found to load');
            }
        } catch (error) {
            console.error('❌ [EffectRegistryService] Failed to load plugins for UI:', error);
            // Don't throw - this is optional for UI display
        }
    }

    /**
     * Create a safe wrapper for plugin effects
     * @param {Object} effectData - Effect data from sandbox
     * @returns {Class} Safe effect class
     */
    createSafeEffectWrapper(effectData) {
        return class SafePluginEffect {
            constructor(...args) {
                this.effectData = effectData;
                this.args = args;
            }

            async apply(canvas, frame, config) {
                try {
                    // Execute effect code in a safe manner
                    // The actual effect logic was validated in the sandbox
                    SafeConsole.log(`🎨 Applying plugin effect: ${effectData.name}`);

                    // If we have the effect code, we can execute it
                    // Otherwise, this is a placeholder
                    if (effectData.effectCode) {
                        const effectFunc = new Function('canvas', 'frame', 'config', effectData.effectCode);
                        return await effectFunc.call(this, canvas, frame, config);
                    }

                    return canvas;
                } catch (error) {
                    SafeConsole.log(`❌ Plugin effect error in ${effectData.name}:`, error);
                    throw error;
                }
            }
        };
    }

    /**
     * Create a safe wrapper for plugin configs
     * @param {Object} configData - Config data from sandbox
     * @returns {Class} Safe config class
     */
    createSafeConfigWrapper(configData) {
        return class SafePluginConfig {
            constructor(...args) {
                this.configData = configData;
                this.args = args;
            }

            // Add config methods as needed
        };
    }

    /**
     * Cleanup resources when shutting down
     */
    async cleanup() {
        try {
            if (this.securePluginLoader) {
                SafeConsole.log('🧹 [EffectRegistryService] Cleaning up plugin loader...');
                this.securePluginLoader.cleanup();
                this.securePluginLoader = null;
            }
        } catch (error) {
            SafeConsole.log('❌ [EffectRegistryService] Cleanup error:', error);
        }
    }

    /**
     * Force refresh the effect registry (used after loading plugins)
     * This reloads the plugin registry to include newly loaded plugins
     * @param {boolean} skipPluginReload - Skip reloading plugins (used to prevent infinite loops)
     * @returns {Promise<void>}
     */
    async refreshRegistry(skipPluginReload = false) {
        try {
            console.log('🔄 Refreshing effect registry...');

            // Only reload plugins if not explicitly skipped
            // This prevents infinite loops when refreshRegistry is called from plugin:loaded events
            if (!skipPluginReload) {
                // Reload plugins to ensure they're properly loaded
                await this.loadPluginsForUI();
            }

            // Force config linking again to pick up new plugins
            try {
                await ConfigLinker.linkEffectsWithConfigs();
                console.log('✅ Config linking completed');
            } catch (linkError) {
                console.log('⚠️ Config linking skipped:', linkError.message);
            }

            // Log current registry state for debugging
            const EffectReg = await this.getEffectRegistry();

            const primaryEffects = EffectReg.getByCategoryGlobal(EffectCategories.PRIMARY);
            console.log('📊 Primary effects in registry:', Object.keys(primaryEffects));

            // Emit a single event to notify UI that effects should be reloaded
            // This is better than emitting multiple plugin:loaded events
            await this.emitEffectsRefreshedEvent();

            console.log('✅ Effect registry refreshed');
        } catch (error) {
            console.error('❌ Failed to refresh effect registry:', error);
            throw error;
        }
    }

    /**
     * Emit effects refreshed event to the renderer process
     */
    async emitEffectsRefreshedEvent() {
        try {
            const windows = BrowserWindow.getAllWindows();

            const event = {
                type: 'effects:refreshed',
                data: {
                    timestamp: new Date().toISOString()
                },
                timestamp: Date.now(),
                source: 'EffectRegistryService'
            };

            console.log('📊 Emitting effects:refreshed event');

            windows.forEach(window => {
                window.webContents.send('eventbus-message', event);
            });
        } catch (error) {
            console.error('Failed to emit effects refreshed event:', error);
        }
    }

}

export default EffectRegistryService;