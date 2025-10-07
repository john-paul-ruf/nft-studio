import DependencyContainer from './DependencyContainer.js';

// Services
import DialogService from '../services/DialogService.js';
import FileSystemService from '../services/FileSystemService.js';
import ImageService from '../services/ImageService.js';
import FrameService from '../services/FrameService.js';
import EffectRegistryService from '../services/EffectRegistryService.js';
import ConfigProcessingService from '../services/ConfigProcessingService.js';

// Implementations
import ElectronFileOperations from '../implementations/ElectronFileOperations.js';
import NftEffectsManager from '../implementations/NftEffectsManager.js';
import NftProjectManager from '../implementations/NftProjectManager.js';
import ConsoleLogger from '../implementations/ConsoleLogger.js';

// Utils
import SafeConsole from '../utils/SafeConsole.js';

/**
 * Service Factory
 * Implements Dependency Inversion Principle
 * Configures and creates all services with proper dependencies
 */
class ServiceFactory {
    constructor() {
        this.container = new DependencyContainer();
        this.configure();
    }

    /**
     * Configure all dependencies
     */
    configure() {
        // Register services as singletons
        this.container.registerSingleton('dialogService', () => new DialogService());
        this.container.registerSingleton('fileSystemService', () => new FileSystemService());
        this.container.registerSingleton('imageService', () => new ImageService());
        this.container.registerSingleton('effectRegistryService', () => {
            const service = new EffectRegistryService();
            // Ensure core effects and plugins are loaded immediately
            service.ensureCoreEffectsRegistered().then(() => {
                SafeConsole.log('✅ Effect registry initialized with plugins');
            }).catch(error => {
                SafeConsole.error('⚠️ Failed to initialize effect registry:', error);
            });
            return service;
        });
        this.container.registerSingleton('configProcessingService', () => new ConfigProcessingService());
        this.container.registerSingleton('logger', () => new ConsoleLogger());

        // Register composite services with dependencies
        this.container.registerSingleton('frameService', (container) => {
            return new FrameService(
                container.resolve('fileSystemService'),
                container.resolve('imageService')
            );
        });

        // Register implementations with dependencies
        this.container.registerSingleton('fileOperations', (container) => {
            return new ElectronFileOperations(
                container.resolve('dialogService'),
                container.resolve('fileSystemService'),
                container.resolve('frameService')
            );
        });

        this.container.registerSingleton('effectsManager', (container) => {
            return new NftEffectsManager(
                container.resolve('effectRegistryService'),
                container.resolve('configProcessingService')
            );
        });

        this.container.registerSingleton('projectManager', (container) => {
            return new NftProjectManager(
                container.resolve('logger')
            );
        });
    }

    /**
     * Get file operations service
     * @returns {ElectronFileOperations} File operations implementation
     */
    getFileOperations() {
        return this.container.resolve('fileOperations');
    }

    /**
     * Get effects manager service
     * @returns {NftEffectsManager} Effects manager implementation
     */
    getEffectsManager() {
        return this.container.resolve('effectsManager');
    }

    /**
     * Get project manager service
     * @returns {NftProjectManager} Project manager implementation
     */
    getProjectManager() {
        return this.container.resolve('projectManager');
    }

    /**
     * Get logger service
     * @returns {ConsoleLogger} Logger implementation
     */
    getLogger() {
        return this.container.resolve('logger');
    }

    /**
     * Get any service by name
     * @param {string} serviceName - Service name
     * @returns {*} Service instance
     */
    getService(serviceName) {
        return this.container.resolve(serviceName);
    }

    /**
     * Register additional service
     * @param {string} name - Service name
     * @param {Function} factory - Factory function
     * @param {boolean} singleton - Whether to create as singleton
     */
    registerService(name, factory, singleton = true) {
        this.container.register(name, factory, singleton);
    }

    /**
     * Check if service is registered
     * @param {string} name - Service name
     * @returns {boolean} True if registered
     */
    hasService(name) {
        return this.container.has(name);
    }

    /**
     * Get dependency container for advanced usage
     * @returns {DependencyContainer} Dependency container
     */
    getContainer() {
        return this.container;
    }

    /**
     * Cleanup all services
     * Should be called when app is closing
     */
    async cleanup() {
        try {
            SafeConsole.log('🧹 [ServiceFactory] Cleaning up services...');

            // Cleanup effect registry service
            const effectRegistry = this.container.resolve('effectRegistryService');
            if (effectRegistry && effectRegistry.cleanup) {
                await effectRegistry.cleanup();
            }

            // Add cleanup for other services as needed
            SafeConsole.log('✅ [ServiceFactory] Services cleaned up');
        } catch (error) {
            SafeConsole.error('❌ [ServiceFactory] Cleanup error:', error);
        }
    }
}

// Export singleton instance
export default new ServiceFactory();