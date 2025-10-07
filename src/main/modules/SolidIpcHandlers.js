import ServiceFactory from '../container/ServiceFactory.js';
import FileHandlers from '../handlers/FileHandlers.js';
import ProjectHandlers from '../handlers/ProjectHandlers.js';
import EffectsHandlers from '../handlers/EffectsHandlers.js';
import PreviewHandlers from '../handlers/PreviewHandlers.js';
import EventBusHandlers from '../handlers/EventBusHandlers.js';
import ProjectPersistenceHandlers from '../handlers/ProjectPersistenceHandlers.js';
import PluginHandlers from '../handlers/PluginHandlers.js';
import SafeConsole from '../utils/SafeConsole.js';

/**
 * SOLID-compliant IPC handlers manager
 * Follows all SOLID principles:
 * - Single Responsibility: Only manages handler registration
 * - Open/Closed: Open for extension (new handlers), closed for modification
 * - Liskov Substitution: Handler implementations can be substituted
 * - Interface Segregation: Handlers are segregated by functionality
 * - Dependency Inversion: Depends on abstractions (ServiceFactory)
 */
class SolidIpcHandlers {
    constructor(serviceFactory = null) {
        // Dependency injection following Dependency Inversion Principle
        this.serviceFactory = serviceFactory || ServiceFactory;
        this.handlers = [];
    }

    /**
     * Register all IPC handlers using dependency injection
     */
    registerHandlers() {
        // Get services from factory (Dependency Inversion)
        const fileOperations = this.serviceFactory.getFileOperations();
        const projectManager = this.serviceFactory.getProjectManager();
        const effectsManager = this.serviceFactory.getEffectsManager();

        // Create handlers with injected dependencies (Interface Segregation)
        this.handlers = [
            new FileHandlers(fileOperations),
            new ProjectHandlers(projectManager),
            new EffectsHandlers(effectsManager),
            new PreviewHandlers(effectsManager),
            new EventBusHandlers(),
            new ProjectPersistenceHandlers(),
            new PluginHandlers()
        ];

        // Register all handlers
        this.handlers.forEach(handler => {
            handler.register();
        });

    }

    /**
     * Unregister all IPC handlers
     */
    unregisterHandlers() {
        this.handlers.forEach(handler => {
            if (typeof handler.unregister === 'function') {
                handler.unregister();
            }
        });

        this.handlers = [];
        SafeConsole.log('✅ All SOLID IPC handlers unregistered');
    }

    /**
     * Get registered handlers (for testing or inspection)
     * @returns {Array} Array of handler instances
     */
    getHandlers() {
        return [...this.handlers];
    }

    /**
     * Check if handlers are registered
     * @returns {boolean} True if handlers are registered
     */
    areHandlersRegistered() {
        return this.handlers.length > 0;
    }

    /**
     * Add custom handler (Open/Closed Principle - open for extension)
     * @param {Object} handler - Handler instance with register() method
     */
    addCustomHandler(handler) {
        if (!handler || typeof handler.register !== 'function') {
            throw new Error('Handler must have a register() method');
        }

        handler.register();
        this.handlers.push(handler);
        SafeConsole.log(`✅ Custom handler registered: ${handler.constructor.name}`);
    }

    /**
     * Remove custom handler
     * @param {Object} handler - Handler instance to remove
     */
    removeCustomHandler(handler) {
        const index = this.handlers.indexOf(handler);
        if (index > -1) {
            if (typeof handler.unregister === 'function') {
                handler.unregister();
            }
            this.handlers.splice(index, 1);
            SafeConsole.log(`✅ Custom handler removed: ${handler.constructor.name}`);
        }
    }

    /**
     * Get service factory (for advanced usage)
     * @returns {ServiceFactory} Service factory instance
     */
    getServiceFactory() {
        return this.serviceFactory;
    }

    /**
     * Cleanup all resources
     * Should be called when app is closing
     */
    async cleanup() {
        try {
            SafeConsole.log('🧹 [SolidIpcHandlers] Starting cleanup...');

            // Unregister all handlers
            this.unregisterHandlers();

            // Cleanup service factory
            if (this.serviceFactory && this.serviceFactory.cleanup) {
                await this.serviceFactory.cleanup();
            }

            SafeConsole.log('✅ [SolidIpcHandlers] Cleanup complete');
        } catch (error) {
            SafeConsole.error('❌ [SolidIpcHandlers] Cleanup error:', error);
        }
    }
}

export default SolidIpcHandlers;