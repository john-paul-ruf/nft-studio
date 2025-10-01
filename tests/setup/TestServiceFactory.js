import DependencyContainer from '../../src/main/container/DependencyContainer.js';
import ImageService from '../../src/main/services/ImageService.js';

// Test-compatible service implementations
class TestDialogService {
    /**
     * Show folder selection dialog
     * @returns {Promise<Object>} Dialog result
     */
    async showFolderDialog() {
        // Simulate successful folder selection
        return { 
            canceled: false, 
            filePaths: ['/test/selected/folder'] 
        };
    }
    
    /**
     * Show file selection dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<Object>} Dialog result
     */
    async showFileDialog(options = {}) {
        // Handle null/undefined options
        const safeOptions = options || {};
        
        // Simulate file selection based on options
        const defaultFilters = [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ];
        
        const filters = safeOptions.filters || defaultFilters;
        const extension = (Array.isArray(filters) && filters.length > 0 && filters[0]?.extensions?.[0]) || 'txt';
        
        return { 
            canceled: false, 
            filePaths: [`/test/selected/file.${extension}`] 
        };
    }
    
    /**
     * Show save dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<Object>} Dialog result
     */
    async showSaveDialog(options = {}) {
        // Handle null/undefined options
        const safeOptions = options || {};
        
        // Simulate save dialog
        const defaultName = safeOptions.defaultPath || 'untitled';
        return { 
            canceled: false, 
            filePath: `/test/save/${defaultName}` 
        };
    }
    
    // Legacy methods for backward compatibility
    async showOpenDialog(options) {
        return this.showFileDialog(options);
    }
    
    async showMessageBox(options) {
        return { response: 0 };
    }
}

class TestFileSystemService {
    constructor(testDirectory) {
        this.testDirectory = testDirectory;
        this.files = new Map();
    }
    
    async readFile(filePath) {
        try {
            const { promises: fs } = await import('fs');
            const path = await import('path');
            
            // Handle relative paths by using test directory
            if (!path.default.isAbsolute(filePath) && !filePath.includes(path.default.sep)) {
                filePath = path.default.join(this.testDirectory, filePath);
            }
            
            const content = await fs.readFile(filePath, 'utf8');
            return { success: true, content };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async writeFile(filePath, content) {
        try {
            const { promises: fs } = await import('fs');
            const path = await import('path');
            
            // Handle relative paths by using test directory
            if (!path.default.isAbsolute(filePath) && !filePath.includes(path.default.sep)) {
                filePath = path.default.join(this.testDirectory, filePath);
            }
            
            // Ensure directory exists
            const dir = path.default.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });
            
            await fs.writeFile(filePath, content, 'utf8');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async fileExists(filePath) {
        try {
            const { promises: fs } = await import('fs');
            const path = await import('path');
            
            // Handle relative paths by using test directory
            if (!path.default.isAbsolute(filePath) && !filePath.includes(path.default.sep)) {
                filePath = path.default.join(this.testDirectory, filePath);
            }
            
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    async listFiles(directoryPath, filter = null) {
        try {
            const { promises: fs } = await import('fs');
            const files = await fs.readdir(directoryPath);
            return filter ? files.filter(file => filter.test(file)) : files;
        } catch (error) {
            return [];
        }
    }
    
    async ensureDirectory(directoryPath) {
        try {
            const { promises: fs } = await import('fs');
            await fs.mkdir(directoryPath, { recursive: true });
            return true;
        } catch (error) {
            return false;
        }
    }
}

class TestImageService {
    async loadImage(imagePath) {
        return { success: true, width: 1920, height: 1080, format: 'png' };
    }
    
    async processImage(imageData, operations) {
        return { success: true, processedData: 'processed-image-data' };
    }
}

class TestFrameService {
    constructor(fileSystemService, imageService) {
        // Dependency injection following Dependency Inversion Principle
        this.fileSystemService = fileSystemService;
        this.imageService = imageService;
    }

    /**
     * List completed frames in a project directory
     * @param {string} projectDirectory - Project directory path
     * @returns {Promise<Object>} Frames list result
     */
    async listCompletedFrames(projectDirectory) {
        try {
            const path = await import('path');
            const framesDir = path.default.join(projectDirectory, 'frames');

            // Check if frames directory exists
            if (!(await this.fileSystemService.fileExists(framesDir))) {
                return {
                    success: true,
                    frames: [],
                    totalFrames: 0
                };
            }

            // Get image files only
            const imageFilter = /\.(png|jpg|jpeg|gif|webp|bmp)$/i;
            const files = await this.fileSystemService.listFiles(framesDir, imageFilter);

            // Sort files by frame number
            const frameFiles = files.sort((a, b) => {
                const numA = this.imageService.extractFrameNumber(a);
                const numB = this.imageService.extractFrameNumber(b);
                return numA - numB;
            });

            // Create frame objects
            const frames = frameFiles.map(file => ({
                filename: file,
                path: path.default.join(framesDir, file),
                frameNumber: this.imageService.extractFrameNumber(file)
            }));

            return {
                success: true,
                frames,
                totalFrames: frames.length,
                framesDirectory: framesDir
            };
        } catch (error) {
            console.error('Error listing completed frames:', error);
            return {
                success: false,
                error: error.message,
                frames: [],
                totalFrames: 0
            };
        }
    }

    /**
     * Read frame image as base64
     * @param {string} framePath - Path to frame image
     * @returns {Promise<Object>} Frame image result
     */
    async readFrameImage(framePath) {
        if (!this.imageService.isValidImageExtension(framePath)) {
            return {
                success: false,
                error: 'Invalid image file extension'
            };
        }

        return await this.imageService.readImageAsBase64(framePath);
    }

    /**
     * Validate frame directory structure
     * @param {string} projectDirectory - Project directory path
     * @returns {Promise<Object>} Validation result
     */
    async validateFrameDirectory(projectDirectory) {
        const path = await import('path');
        const framesDir = path.default.join(projectDirectory, 'frames');
        const exists = await this.fileSystemService.fileExists(framesDir);

        return {
            valid: exists,
            framesDirectory: framesDir,
            exists
        };
    }
}

class TestEffectRegistryService {
    constructor() {
        this.coreEffectsRegistered = false;
        this.effects = new Map();
        this.effectsByCategory = {
            primary: new Map(),
            secondary: new Map(),
            keyFrame: new Map(),
            final: new Map(),
            finalImage: new Map()
        };
        this.pluginRegistry = new Map();
        this.configRegistry = new Map();
        this.initializeTestEffects();
    }
    
    initializeTestEffects() {
        // Test effects for primary category
        const blurEffect = {
            name: 'Blur',
            type: 'blur',
            category: 'primary',
            properties: { intensity: 0.5, radius: 5 }
        };
        const glowEffect = {
            name: 'Glow',
            type: 'glow',
            category: 'primary',
            properties: { color: '#ffffff', strength: 0.8 }
        };
        
        // Test effects for secondary category
        const shadowEffect = {
            name: 'Shadow',
            type: 'shadow',
            category: 'secondary',
            properties: { offset: { x: 2, y: 2 }, blur: 3, color: '#000000' }
        };
        
        // Store effects
        this.effects.set('blur', blurEffect);
        this.effects.set('glow', glowEffect);
        this.effects.set('shadow', shadowEffect);
        
        // Store by category
        this.effectsByCategory.primary.set('blur', blurEffect);
        this.effectsByCategory.primary.set('glow', glowEffect);
        this.effectsByCategory.secondary.set('shadow', shadowEffect);
        
        // Store in plugin registry with config
        this.pluginRegistry.set('blur', {
            effect: blurEffect,
            config: { type: 'BlurConfig', properties: ['intensity', 'radius'] }
        });
        this.pluginRegistry.set('glow', {
            effect: glowEffect,
            config: { type: 'GlowConfig', properties: ['color', 'strength'] }
        });
        this.pluginRegistry.set('shadow', {
            effect: shadowEffect,
            config: { type: 'ShadowConfig', properties: ['offset', 'blur', 'color'] }
        });
    }
    
    /**
     * Ensure core effects are registered only once
     * @returns {Promise<void>}
     */
    async ensureCoreEffectsRegistered() {
        if (!this.coreEffectsRegistered) {
            // Simulate registration process
            this.coreEffectsRegistered = true;
            console.log('✅ Test core effects registered');
        }
    }
    
    /**
     * Get effect registry
     * @returns {Promise<Object>} Effect registry
     */
    async getEffectRegistry() {
        await this.ensureCoreEffectsRegistered();
        return {
            getGlobal: (effectName) => this.effects.get(effectName) || null,
            getByCategoryGlobal: (category) => {
                const categoryMap = this.effectsByCategory[category] || new Map();
                const result = {};
                for (const [key, value] of categoryMap) {
                    result[key] = value;
                }
                return result;
            }
        };
    }
    
    /**
     * Get config registry
     * @returns {Promise<Object>} Config registry
     */
    async getConfigRegistry() {
        await this.ensureCoreEffectsRegistered();
        return {
            get: (configName) => this.configRegistry.get(configName) || null,
            getAll: () => Array.from(this.configRegistry.values())
        };
    }
    
    /**
     * Get all available effects by category
     * @returns {Promise<Object>} Effects by category
     */
    async getAllEffects() {
        const EffectRegistry = await this.getEffectRegistry();
        
        return {
            primary: EffectRegistry.getByCategoryGlobal('primary'),
            secondary: EffectRegistry.getByCategoryGlobal('secondary'),
            keyFrame: EffectRegistry.getByCategoryGlobal('keyFrame'),
            final: EffectRegistry.getByCategoryGlobal('final')
        };
    }
    
    /**
     * Get specific effect by name
     * @param {string} effectName - Name of effect
     * @returns {Promise<Object|null>} Effect or null if not found
     */
    async getEffect(effectName) {
        const EffectRegistry = await this.getEffectRegistry();
        return EffectRegistry.getGlobal(effectName);
    }
    
    /**
     * Get modern plugin registry with config linking
     * @returns {Promise<Object>} Plugin registry
     */
    async getPluginRegistry() {
        await this.ensureCoreEffectsRegistered();
        return {
            get: (effectName) => this.pluginRegistry.get(effectName) || null,
            getByCategory: (category) => {
                const result = {};
                for (const [key, plugin] of this.pluginRegistry) {
                    if (plugin.effect && plugin.effect.category === category) {
                        result[key] = plugin;
                    }
                }
                return result;
            },
            getStats: () => ({
                totalPlugins: this.pluginRegistry.size,
                totalEffects: this.effects.size,
                categoryCounts: {
                    primary: this.effectsByCategory.primary.size,
                    secondary: this.effectsByCategory.secondary.size,
                    keyFrame: this.effectsByCategory.keyFrame.size,
                    final: this.effectsByCategory.final.size,
                    finalImage: this.effectsByCategory.finalImage.size
                }
            })
        };
    }
    
    /**
     * Get effect with its linked config class
     * @param {string} effectName - Name of effect
     * @returns {Promise<Object|null>} Plugin with effect and config class or null if not found
     */
    async getEffectWithConfig(effectName) {
        const PluginRegistry = await this.getPluginRegistry();
        return PluginRegistry.get(effectName);
    }
    
    /**
     * Get all effects with their config classes by category
     * @returns {Promise<Object>} Effects with configs by category
     */
    async getAllEffectsWithConfigs() {
        const PluginRegistry = await this.getPluginRegistry();
        
        return {
            primary: PluginRegistry.getByCategory('primary'),
            secondary: PluginRegistry.getByCategory('secondary'),
            keyFrame: PluginRegistry.getByCategory('keyFrame'),
            finalImage: PluginRegistry.getByCategory('final')
        };
    }
    
    /**
     * Get plugin registry statistics including config linking info
     * @returns {Promise<Object>} Registry statistics
     */
    async getRegistryStats() {
        const PluginRegistry = await this.getPluginRegistry();
        return PluginRegistry.getStats();
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
            const EffectRegistry = await this.getEffectRegistry();
            
            const debug = {
                primary: Object.keys(EffectRegistry.getByCategoryGlobal('primary')),
                secondary: Object.keys(EffectRegistry.getByCategoryGlobal('secondary')),
                keyFrame: Object.keys(EffectRegistry.getByCategoryGlobal('keyFrame')),
                finalImage: Object.keys(EffectRegistry.getByCategoryGlobal('final'))
            };
            
            console.log('🔍 Test Registry Debug Info:', debug);
            return debug;
        } catch (error) {
            console.error('❌ Failed to debug test registry:', error);
            return { error: error.message };
        }
    }
    
    /**
     * Load plugins for UI display (test implementation)
     * @returns {Promise<void>}
     */
    async loadPluginsForUI() {
        // Test implementation - simulate plugin loading
        console.log('🔄 Test: Loading plugins for UI...');
        // In test environment, this is a no-op but shouldn't throw
    }
    
    /**
     * Force refresh the effect registry (test implementation)
     * @param {boolean} skipPluginReload - Skip reloading plugins
     * @returns {Promise<void>}
     */
    async refreshRegistry(skipPluginReload = false) {
        console.log('🔄 Test: Refreshing effect registry...');
        
        if (!skipPluginReload) {
            await this.loadPluginsForUI();
        }
        
        // Simulate refresh
        console.log('✅ Test: Effect registry refreshed');
    }
    
    /**
     * Emit effects refreshed event (test implementation)
     * @returns {Promise<void>}
     */
    async emitEffectsRefreshedEvent() {
        // Test implementation - simulate event emission
        console.log('📡 Test: Emitting effects refreshed event...');
        // In test environment, this is a no-op but shouldn't throw
    }
}

class TestConfigProcessingService {
    /**
     * Convert configuration values to proper types (test implementation)
     * @param {Object} config - Configuration object
     * @returns {Promise<Object>} Processed configuration
     */
    async convertConfigToProperTypes(config) {
        if (!config || typeof config !== 'object') return config;

        const result = {};

        for (const [key, value] of Object.entries(config)) {
            if (typeof value === 'string') {
                result[key] = this.convertStringValue(value);
            } else if (Array.isArray(value)) {
                result[key] = await Promise.all(
                    value.map(item => {
                        if (typeof item === 'string') {
                            return this.convertStringValue(item);
                        } else {
                            return this.convertConfigToProperTypes(item);
                        }
                    })
                );
            } else if (value && typeof value === 'object') {
                result[key] = await this.convertConfigToProperTypes(value);
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    /**
     * Convert string value to appropriate type (test implementation)
     * @param {string} value - String value
     * @returns {*} Converted value
     */
    convertStringValue(value) {
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (!isNaN(value) && !isNaN(parseFloat(value)) && isFinite(parseFloat(value))) {
            return parseFloat(value);
        }
        return value;
    }

    /**
     * Apply Point2D center override for configurations (test implementation)
     * @param {Object} config - Configuration object
     * @param {Object} projectState - ProjectState instance with resolution
     * @returns {Object} Processed configuration
     */
    applyPoint2DCenterOverride(config, projectState) {
        if (!config || !projectState) return config;

        const dimensions = projectState.getResolutionDimensions();
        const centerX = dimensions.w / 2;
        const centerY = dimensions.h / 2;

        return this.processObjectForCenterOverride(config, centerX, centerY);
    }

    /**
     * Process object for center override recursively (test implementation)
     * @param {*} obj - Object to process
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @returns {*} Processed object
     */
    processObjectForCenterOverride(obj, centerX, centerY) {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => this.processObjectForCenterOverride(item, centerX, centerY));
        }

        // Check if this is a Point2D-like object
        if (obj.x !== undefined && obj.y !== undefined) {
            return this.processPoint2DValue(obj, centerX, centerY);
        }

        // Process all properties recursively
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = this.processObjectForCenterOverride(value, centerX, centerY);
        }
        return result;
    }

    /**
     * Process Point2D value for center override (test implementation)
     * @param {Object} point - Point object with x, y properties
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @returns {Object} Processed point
     */
    processPoint2DValue(point, centerX, centerY) {
        if (point.x === 'center' && typeof point.y === 'number') {
            return { x: centerX, y: point.y };
        } else if (point.y === 'center' && typeof point.x === 'number') {
            return { x: point.x, y: centerY };
        } else if (point.x === 'center' && point.y === 'center') {
            return { x: centerX, y: centerY };
        }
        return point;
    }

    /**
     * Validate configuration object (test implementation)
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validation result
     */
    validateConfig(config) {
        const errors = [];

        if (!config || typeof config !== 'object') {
            errors.push('Configuration must be an object');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

class TestLogger {
    log(...args) {
        console.log('[TEST]', ...args);
    }
    
    error(...args) {
        console.error('[TEST ERROR]', ...args);
    }
    
    warn(...args) {
        console.warn('[TEST WARN]', ...args);
    }
}

class TestProjectManager {
    constructor(logger) {
        this.logger = logger;
    }
    
    async createProject(config) {
        return {
            id: `project_${Date.now()}`,
            ...config,
            filePath: `/test/projects/${config.name}.nftproject`
        };
    }
    
    async loadProject(filePath) {
        return {
            id: 'loaded_project',
            name: 'Loaded Project',
            filePath
        };
    }
}

class TestEffectsManager {
    constructor(effectRegistry, configProcessor) {
        this.effectRegistry = effectRegistry;
        this.configProcessor = configProcessor;
    }
    
    async applyEffect(effectType, config) {
        const effect = this.effectRegistry.getEffect(effectType);
        if (!effect) {
            throw new Error(`Effect ${effectType} not found`);
        }
        
        return {
            success: true,
            appliedEffect: effect,
            config: this.configProcessor.processConfig(config)
        };
    }
}

class TestFileOperations {
    constructor(dialogService, fileSystemService, frameService) {
        this.dialogService = dialogService;
        this.fileSystemService = fileSystemService;
        this.frameService = frameService;
    }
    
    async openFile() {
        const result = await this.dialogService.showOpenDialog({});
        if (!result.canceled) {
            return this.fileSystemService.readFile(result.filePaths[0]);
        }
        return { success: false, error: 'Canceled' };
    }
    
    async saveFile(content) {
        const result = await this.dialogService.showSaveDialog({});
        if (!result.canceled) {
            return this.fileSystemService.writeFile(result.filePath, content);
        }
        return { success: false, error: 'Canceled' };
    }
}

/**
 * Test Service Factory
 * Creates test-compatible services that work in Node.js environment
 * Uses real objects and real behavior, but without Electron dependencies
 */
class TestServiceFactory {
    constructor(testDirectory) {
        this.container = new DependencyContainer();
        this.testDirectory = testDirectory;
        this.configure();
    }
    
    configure() {
        // Register test services as singletons
        this.container.registerSingleton('dialogService', () => new TestDialogService());
        this.container.registerSingleton('fileSystemService', () => new TestFileSystemService(this.testDirectory));
        this.container.registerSingleton('imageService', () => new ImageService());
        this.container.registerSingleton('effectRegistryService', () => new TestEffectRegistryService());
        this.container.registerSingleton('configProcessingService', () => new TestConfigProcessingService());
        this.container.registerSingleton('logger', () => new TestLogger());
        
        // Register composite services with dependencies
        this.container.registerSingleton('frameService', (container) => {
            return new TestFrameService(
                container.resolve('fileSystemService'),
                container.resolve('imageService')
            );
        });
        
        // Register implementations with dependencies
        this.container.registerSingleton('fileOperations', (container) => {
            return new TestFileOperations(
                container.resolve('dialogService'),
                container.resolve('fileSystemService'),
                container.resolve('frameService')
            );
        });
        
        this.container.registerSingleton('effectsManager', (container) => {
            return new TestEffectsManager(
                container.resolve('effectRegistryService'),
                container.resolve('configProcessingService')
            );
        });
        
        this.container.registerSingleton('projectManager', (container) => {
            return new TestProjectManager(
                container.resolve('logger')
            );
        });
    }
    
    getFileOperations() {
        return this.container.resolve('fileOperations');
    }
    
    getEffectsManager() {
        return this.container.resolve('effectsManager');
    }
    
    getProjectManager() {
        return this.container.resolve('projectManager');
    }
    
    getLogger() {
        return this.container.resolve('logger');
    }
    
    getService(serviceName) {
        return this.container.resolve(serviceName);
    }
    
    registerService(name, factory, singleton = true) {
        this.container.register(name, factory, singleton);
    }
    
    hasService(name) {
        return this.container.has(name);
    }
    
    getContainer() {
        return this.container;
    }
}

export default TestServiceFactory;