const DependencyContainer = require('./DependencyContainer');

// Services
const DialogService = require('../services/DialogService');
const FileSystemService = require('../services/FileSystemService');
const ImageService = require('../services/ImageService');
const FrameService = require('../services/FrameService');
const EffectRegistryService = require('../services/EffectRegistryService');
const ConfigProcessingService = require('../services/ConfigProcessingService');

// Implementations
const ElectronFileOperations = require('../implementations/ElectronFileOperations');
const NftEffectsManager = require('../implementations/NftEffectsManager');
const NftProjectManager = require('../implementations/NftProjectManager');
const ConsoleLogger = require('../implementations/ConsoleLogger');

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
        this.container.registerSingleton('effectRegistryService', () => new EffectRegistryService());
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
}

// Export singleton instance
module.exports = new ServiceFactory();