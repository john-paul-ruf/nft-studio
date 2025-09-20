// Frontend services
import FrontendServiceFactory from './container/FrontendServiceFactory.js';
import ProjectStateManager from './services/ProjectStateManager.js';

// Utils
import { utilsFactory } from './utils/UtilsFactory.js';

// Data repositories
import FileColorSchemeRepository from './data/repositories/FileColorSchemeRepository.js';

/**
 * Main application factory
 * Implements Dependency Inversion Principle for the entire application
 * Coordinates all factories and provides unified access to services
 */
class ApplicationFactory {
    constructor() {
        this.frontendServiceFactory = FrontendServiceFactory;
        this.utilsFactory = utilsFactory;
        this.repositories = new Map();
        this.projectStateManager = null;
        this.initialized = false;
    }

    /**
     * Initialize the application factory
     */
    initialize() {
        if (this.initialized) {
            return;
        }

        // Initialize frontend services
        this.frontendServiceFactory.initialize();

        // Initialize repositories
        this.initializeRepositories();

        // Initialize ProjectStateManager singleton
        this.projectStateManager = new ProjectStateManager();
        console.log('✅ ProjectStateManager initialized');

        this.initialized = true;
        console.log('✅ Application factory initialized');
    }

    /**
     * Initialize data repositories
     */
    initializeRepositories() {
        // Color scheme repository
        const fileService = this.frontendServiceFactory.getFileService();
        const colorSchemeRepository = new FileColorSchemeRepository(fileService);
        this.repositories.set('colorScheme', colorSchemeRepository);
    }

    /**
     * Get frontend service factory
     * @returns {FrontendServiceFactory} Frontend service factory
     */
    getFrontendServiceFactory() {
        this.ensureInitialized();
        return this.frontendServiceFactory;
    }

    /**
     * Get utils factory
     * @returns {UtilsFactory} Utils factory
     */
    getUtilsFactory() {
        this.ensureInitialized();
        return this.utilsFactory;
    }

    /**
     * Get project service
     * @returns {IProjectService} Project service
     */
    getProjectService() {
        return this.frontendServiceFactory.getProjectService();
    }

    /**
     * Get effect service
     * @returns {IEffectService} Effect service
     */
    getEffectService() {
        return this.frontendServiceFactory.getEffectService();
    }

    /**
     * Get file service
     * @returns {IFileService} File service
     */
    getFileService() {
        return this.frontendServiceFactory.getFileService();
    }

    /**
     * Get navigation service
     * @returns {INavigationService} Navigation service
     */
    getNavigationService() {
        return this.frontendServiceFactory.getNavigationService();
    }

    /**
     * Get color scheme service
     * @returns {Object} Color scheme service
     */
    getColorSchemeService() {
        return this.frontendServiceFactory.getColorSchemeService();
    }

    /**
     * Get preferences service
     * @returns {Object} Preferences service
     */
    getPreferencesService() {
        return this.frontendServiceFactory.getPreferencesService();
    }

    /**
     * Get schema generator
     * @returns {ISchemaGenerator} Schema generator
     */
    getSchemaGenerator() {
        return this.utilsFactory.getSchemaGenerator();
    }

    /**
     * Get property analyzer
     * @returns {IPropertyAnalyzer} Property analyzer
     */
    getPropertyAnalyzer() {
        return this.utilsFactory.getPropertyAnalyzer();
    }

    /**
     * Get label formatter
     * @returns {LabelFormatter} Label formatter
     */
    getLabelFormatter() {
        return this.utilsFactory.getLabelFormatter();
    }

    /**
     * Get repository by name
     * @param {string} repositoryName - Repository name
     * @returns {*} Repository instance
     */
    getRepository(repositoryName) {
        this.ensureInitialized();
        const repository = this.repositories.get(repositoryName);

        if (!repository) {
            throw new Error(`Repository '${repositoryName}' not found`);
        }

        return repository;
    }

    /**
     * Get color scheme repository
     * @returns {IColorSchemeRepository} Color scheme repository
     */
    getColorSchemeRepository() {
        return this.getRepository('colorScheme');
    }

    /**
     * Get ProjectStateManager singleton
     * @returns {ProjectStateManager} Project state manager
     */
    getProjectStateManager() {
        this.ensureInitialized();
        return this.projectStateManager;
    }

    /**
     * Register custom repository
     * @param {string} name - Repository name
     * @param {*} repository - Repository instance
     */
    registerRepository(name, repository) {
        this.repositories.set(name, repository);
        console.log(`✅ Repository '${name}' registered`);
    }

    /**
     * Create React context value with all services
     * @returns {Object} Context value for React
     */
    createReactContextValue() {
        this.ensureInitialized();
        return {
            // Services
            projectService: this.getProjectService(),
            effectService: this.getEffectService(),
            fileService: this.getFileService(),
            navigationService: this.getNavigationService(),
            colorSchemeService: this.getColorSchemeService(),
            preferencesService: this.getPreferencesService(),

            // State Management
            projectStateManager: this.getProjectStateManager(),

            // Utils
            schemaGenerator: this.getSchemaGenerator(),
            propertyAnalyzer: this.getPropertyAnalyzer(),
            labelFormatter: this.getLabelFormatter(),

            // Repositories
            colorSchemeRepository: this.getColorSchemeRepository(),

            // Factories (for advanced usage)
            frontendServiceFactory: this.frontendServiceFactory,
            utilsFactory: this.utilsFactory,
            applicationFactory: this
        };
    }

    /**
     * Get service health status
     * @returns {Object} Health status of all services
     */
    getHealthStatus() {
        this.ensureInitialized();

        return {
            initialized: this.initialized,
            services: {
                project: !!this.frontendServiceFactory.hasService('projectService'),
                effect: !!this.frontendServiceFactory.hasService('effectService'),
                file: !!this.frontendServiceFactory.hasService('fileService'),
                navigation: !!this.frontendServiceFactory.hasService('navigationService'),
                colorScheme: !!this.frontendServiceFactory.hasService('colorSchemeService'),
                preferences: !!this.frontendServiceFactory.hasService('preferencesService')
            },
            repositories: {
                colorScheme: this.repositories.has('colorScheme')
            },
            utils: {
                schemaGenerator: !!this.utilsFactory,
                propertyAnalyzer: !!this.utilsFactory,
                labelFormatter: !!this.utilsFactory
            }
        };
    }

    /**
     * Clear all caches and reset state
     */
    reset() {
        this.frontendServiceFactory.clear();
        this.utilsFactory.clearCache();
        this.repositories.clear();
        this.initialized = false;
        console.log('✅ Application factory reset');
    }

    /**
     * Ensure the factory is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            this.initialize();
        }
    }
}

// Export singleton instance
export default new ApplicationFactory();