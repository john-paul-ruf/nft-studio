// Services
import ElectronProjectService from '../services/ElectronProjectService.js';
import ElectronEffectService from '../services/ElectronEffectService.js';
import ElectronFileService from '../services/ElectronFileService.js';
import ReactNavigationService from '../services/ReactNavigationService.js';

// Import existing services
import ColorSchemeService from '../services/ColorSchemeService.js';
import PreferencesService from '../services/PreferencesService.js';

/**
 * Frontend Service Factory
 * Implements Dependency Inversion Principle for frontend services
 * Provides centralized service creation and management
 */
class FrontendServiceFactory {
    constructor() {
        this.services = new Map();
        this.initialized = false;
    }

    /**
     * Initialize all services
     */
    initialize() {
        if (this.initialized) {
            return;
        }

        // Create service instances
        this.services.set('projectService', new ElectronProjectService());
        this.services.set('effectService', new ElectronEffectService());
        this.services.set('fileService', new ElectronFileService());
        this.services.set('navigationService', new ReactNavigationService());
        this.services.set('colorSchemeService', ColorSchemeService);
        this.services.set('preferencesService', PreferencesService);

        this.initialized = true;
        console.log('✅ Frontend services initialized');
    }

    /**
     * Get project service
     * @returns {ElectronProjectService} Project service instance
     */
    getProjectService() {
        this.ensureInitialized();
        return this.services.get('projectService');
    }

    /**
     * Get effect service
     * @returns {ElectronEffectService} Effect service instance
     */
    getEffectService() {
        this.ensureInitialized();
        return this.services.get('effectService');
    }

    /**
     * Get file service
     * @returns {ElectronFileService} File service instance
     */
    getFileService() {
        this.ensureInitialized();
        return this.services.get('fileService');
    }

    /**
     * Get navigation service
     * @returns {ReactNavigationService} Navigation service instance
     */
    getNavigationService() {
        this.ensureInitialized();
        return this.services.get('navigationService');
    }

    /**
     * Get color scheme service
     * @returns {Object} Color scheme service
     */
    getColorSchemeService() {
        this.ensureInitialized();
        return this.services.get('colorSchemeService');
    }

    /**
     * Get preferences service
     * @returns {Object} Preferences service
     */
    getPreferencesService() {
        this.ensureInitialized();
        return this.services.get('preferencesService');
    }

    /**
     * Get service by name
     * @param {string} serviceName - Service name
     * @returns {*} Service instance
     */
    getService(serviceName) {
        this.ensureInitialized();
        const service = this.services.get(serviceName);

        if (!service) {
            throw new Error(`Service '${serviceName}' not found`);
        }

        return service;
    }

    /**
     * Check if service exists
     * @param {string} serviceName - Service name
     * @returns {boolean} True if service exists
     */
    hasService(serviceName) {
        this.ensureInitialized();
        return this.services.has(serviceName);
    }

    /**
     * Register custom service
     * @param {string} serviceName - Service name
     * @param {*} serviceInstance - Service instance
     */
    registerService(serviceName, serviceInstance) {
        if (this.services.has(serviceName)) {
            console.warn(`Service '${serviceName}' already registered, overriding`);
        }

        this.services.set(serviceName, serviceInstance);
        console.log(`✅ Service '${serviceName}' registered`);
    }

    /**
     * Unregister service
     * @param {string} serviceName - Service name
     */
    unregisterService(serviceName) {
        if (this.services.has(serviceName)) {
            this.services.delete(serviceName);
            console.log(`✅ Service '${serviceName}' unregistered`);
        }
    }

    /**
     * Get all registered service names
     * @returns {Array<string>} Array of service names
     */
    getServiceNames() {
        this.ensureInitialized();
        return Array.from(this.services.keys());
    }

    /**
     * Clear all services
     */
    clear() {
        this.services.clear();
        this.initialized = false;
        console.log('✅ All frontend services cleared');
    }

    /**
     * Ensure services are initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            this.initialize();
        }
    }

    /**
     * Create service provider context value
     * @returns {Object} Context value with all services
     */
    createContextValue() {
        this.ensureInitialized();
        return {
            projectService: this.getProjectService(),
            effectService: this.getEffectService(),
            fileService: this.getFileService(),
            navigationService: this.getNavigationService(),
            colorSchemeService: this.getColorSchemeService(),
            preferencesService: this.getPreferencesService()
        };
    }
}

// Export singleton instance
export default new FrontendServiceFactory();