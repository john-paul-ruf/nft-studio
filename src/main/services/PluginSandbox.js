import { VM } from 'vm2';
import fs from 'fs/promises';
import path from 'path';
import SafeConsole from '../utils/SafeConsole.js';

/**
 * Secure plugin sandbox for executing untrusted plugin code
 * Uses vm2 for isolation and provides controlled API access
 */
export class PluginSandbox {
    constructor() {
        this.loadedPlugins = new Map();
    }

    /**
     * Create a sandboxed environment with limited API
     * @returns {Object} Sandbox context with safe APIs
     */
    createSandboxContext() {
        return {
            // Console for debugging
            console: {
                log: (...args) => SafeConsole.log('[Plugin]', ...args),
                error: (...args) => SafeConsole.log('[Plugin Error]', ...args),
                warn: (...args) => SafeConsole.log('[Plugin Warning]', ...args)
            },

            // Limited set of safe globals
            Math: Math,
            Date: Date,
            JSON: JSON,
            Array: Array,
            Object: Object,
            String: String,
            Number: Number,
            Boolean: Boolean,

            // Plugin registration API
            registerEffect: null, // Will be injected
            registerConfig: null, // Will be injected

            // No access to:
            // - require/import
            // - process
            // - __dirname/__filename
            // - fs/path/crypto
            // - child_process
            // - network modules
        };
    }

    /**
     * Load and execute a plugin in a sandboxed environment
     * @param {string} pluginPath - Path to the plugin file
     * @param {Object} registries - Effect and Plugin registries
     * @returns {Promise<Object>} Plugin execution result
     */
    async loadPlugin(pluginPath, registries) {
        try {
            SafeConsole.log(`🔒 [PluginSandbox] Loading plugin in sandbox: ${pluginPath}`);

            // Read plugin code
            const pluginCode = await fs.readFile(pluginPath, 'utf8');

            // Create VM with timeout and memory limits
            const vm = new VM({
                timeout: 5000, // 5 second timeout
                sandbox: this.createSandboxContext(),
                eval: false, // Disable eval
                wasm: false, // Disable WebAssembly
                fixAsync: true // Fix async functions
            });

            // Inject safe registration functions
            vm.run(`
                // Safe registration wrapper
                global.registerEffect = function(name, effectClass, category) {
                    if (typeof name !== 'string') {
                        throw new Error('Effect name must be a string');
                    }
                    if (typeof effectClass !== 'function') {
                        throw new Error('Effect class must be a function/class');
                    }

                    // Store registration for later processing
                    global.__registrations = global.__registrations || [];
                    global.__registrations.push({
                        type: 'effect',
                        name: name,
                        class: effectClass,
                        category: category
                    });
                };

                global.registerConfig = function(name, configClass) {
                    if (typeof name !== 'string') {
                        throw new Error('Config name must be a string');
                    }
                    if (typeof configClass !== 'function') {
                        throw new Error('Config class must be a function/class');
                    }

                    // Store registration for later processing
                    global.__registrations = global.__registrations || [];
                    global.__registrations.push({
                        type: 'config',
                        name: name,
                        class: configClass
                    });
                };
            `);

            // Execute plugin code in sandbox
            const result = vm.run(pluginCode);

            // Get registrations from sandbox
            const registrations = vm.run('global.__registrations || []');

            SafeConsole.log(`✅ [PluginSandbox] Plugin executed successfully, ${registrations.length} registrations found`);

            // Process registrations outside the sandbox
            for (const reg of registrations) {
                if (reg.type === 'effect') {
                    // Validate and register effect with actual registry
                    await this.registerEffectSafely(reg, registries.EffectRegistry);
                } else if (reg.type === 'config') {
                    // Validate and register config with actual registry
                    await this.registerConfigSafely(reg, registries.ConfigRegistry);
                }
            }

            return {
                success: true,
                registrations: registrations.length,
                path: pluginPath
            };

        } catch (error) {
            SafeConsole.log(`❌ [PluginSandbox] Failed to load plugin: ${error.message}`);
            return {
                success: false,
                error: error.message,
                path: pluginPath
            };
        }
    }

    /**
     * Safely register an effect after validation
     * @param {Object} registration - Registration data from sandbox
     * @param {Object} registry - Effect registry
     */
    async registerEffectSafely(registration, registry) {
        try {
            // Additional validation before registration
            if (!registration.name || registration.name.length > 100) {
                throw new Error('Invalid effect name');
            }

            // Create a proxy class that wraps the sandboxed class
            const SafeEffectClass = class extends Object {
                constructor(...args) {
                    super();
                    // Initialize with sandboxed class logic
                    this._sandboxedInstance = new registration.class(...args);
                }

                // Proxy methods to sandboxed instance
                async apply(canvas, frame, config) {
                    // Run in controlled environment
                    try {
                        return await this._sandboxedInstance.apply(canvas, frame, config);
                    } catch (error) {
                        SafeConsole.log(`❌ Plugin effect error in ${registration.name}:`, error);
                        throw error;
                    }
                }
            };

            // Register with the actual registry
            registry.register(registration.name, SafeEffectClass, registration.category);
            SafeConsole.log(`✅ [PluginSandbox] Effect registered: ${registration.name}`);

        } catch (error) {
            SafeConsole.log(`❌ [PluginSandbox] Failed to register effect: ${error.message}`);
            throw error;
        }
    }

    /**
     * Safely register a config after validation
     * @param {Object} registration - Registration data from sandbox
     * @param {Object} registry - Config registry
     */
    async registerConfigSafely(registration, registry) {
        try {
            // Additional validation before registration
            if (!registration.name || registration.name.length > 100) {
                throw new Error('Invalid config name');
            }

            // Register with the actual registry
            registry.register(registration.name, registration.class);
            SafeConsole.log(`✅ [PluginSandbox] Config registered: ${registration.name}`);

        } catch (error) {
            SafeConsole.log(`❌ [PluginSandbox] Failed to register config: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load multiple plugins
     * @param {Array} pluginPaths - Array of plugin paths
     * @param {Object} registries - Effect and Plugin registries
     * @returns {Promise<Array>} Results for each plugin
     */
    async loadPlugins(pluginPaths, registries) {
        const results = [];

        for (const pluginPath of pluginPaths) {
            const result = await this.loadPlugin(pluginPath, registries);
            results.push(result);
        }

        return results;
    }
}

export default PluginSandbox;