/**
 * TestDataBuilder - Builds realistic test data for refactoring tests
 * 
 * This builder creates structured test data that matches the real data
 * formats used throughout the NFT Studio application.
 * 
 * REAL OBJECTS ONLY - No mocks, just real data structures.
 */
class TestDataBuilder {
    constructor() {
        this.reset();
    }

    /**
     * Reset builder to initial state
     * @returns {TestDataBuilder} This builder for chaining
     */
    reset() {
        this.data = {};
        return this;
    }

    /**
     * Build a complete NFT project configuration
     * @returns {TestDataBuilder} This builder for chaining
     */
    buildProject() {
        this.data = {
            id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: 'Test NFT Project',
            description: 'A test project for refactoring validation',
            artist: 'Test Artist',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            version: '1.0.0',
            
            // Project settings
            settings: {
                targetResolution: '1080p',
                isHorizontal: true,
                frameCount: 100,
                frameRate: 30,
                outputFormat: 'mp4',
                quality: 'high'
            },
            
            // Effects configuration
            effects: [],
            
            // Render configuration
            renderConfig: {
                outputPath: '/test/output',
                tempPath: '/test/temp',
                parallelProcessing: true,
                maxThreads: 4
            },
            
            // Plugin configuration
            plugins: [],
            
            // File paths
            paths: {
                project: '/test/project.nftproject',
                assets: '/test/assets',
                output: '/test/output'
            }
        };
        
        return this;
    }

    /**
     * Add project metadata
     * @param {Object} metadata - Project metadata
     * @returns {TestDataBuilder} This builder for chaining
     */
    withMetadata(metadata) {
        this.data = { ...this.data, ...metadata };
        return this;
    }

    /**
     * Add project settings
     * @param {Object} settings - Project settings
     * @returns {TestDataBuilder} This builder for chaining
     */
    withSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        return this;
    }

    /**
     * Add effects to the project
     * @param {Array} effects - Array of effect configurations
     * @returns {TestDataBuilder} This builder for chaining
     */
    withEffects(effects) {
        this.data.effects = [...(this.data.effects || []), ...effects];
        return this;
    }

    /**
     * Build a basic effect configuration
     * @param {string} type - Effect type (blur, brightness, etc.)
     * @param {Object} properties - Effect properties
     * @returns {Object} Effect configuration
     */
    buildEffect(type = 'blur', properties = {}) {
        const defaultProperties = {
            blur: { intensity: 50, radius: 10 },
            brightness: { level: 75, contrast: 50 },
            saturation: { level: 100, vibrance: 25 },
            contrast: { level: 50, gamma: 1.0 }
        };

        return {
            id: `effect_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type: type,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} Effect`,
            enabled: true,
            order: 0,
            properties: {
                ...defaultProperties[type] || {},
                ...properties
            },
            keyframes: [],
            secondaryEffects: [],
            created: new Date().toISOString()
        };
    }

    /**
     * Build multiple effects
     * @param {Array} effectTypes - Array of effect type strings
     * @returns {Array} Array of effect configurations
     */
    buildEffects(effectTypes = ['blur', 'brightness']) {
        return effectTypes.map((type, index) => {
            const effect = this.buildEffect(type);
            effect.order = index;
            return effect;
        });
    }

    /**
     * Build a keyframe configuration
     * @param {number} frame - Frame number
     * @param {Object} properties - Keyframe properties
     * @returns {Object} Keyframe configuration
     */
    buildKeyframe(frame = 0, properties = {}) {
        return {
            id: `keyframe_${frame}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            frame: frame,
            properties: properties,
            interpolation: 'linear',
            created: new Date().toISOString()
        };
    }

    /**
     * Build plugin configuration
     * @param {string} name - Plugin name
     * @param {Object} config - Plugin configuration
     * @returns {Object} Plugin configuration
     */
    buildPlugin(name = 'TestPlugin', config = {}) {
        return {
            id: `plugin_${name.toLowerCase()}_${Date.now()}`,
            name: name,
            version: '1.0.0',
            enabled: true,
            config: {
                autoLoad: true,
                priority: 100,
                ...config
            },
            path: `/test/plugins/${name.toLowerCase()}`,
            loaded: false
        };
    }

    /**
     * Build render job configuration
     * @param {string} projectId - Project ID
     * @param {Object} options - Render options
     * @returns {Object} Render job configuration
     */
    buildRenderJob(projectId = null, options = {}) {
        return {
            id: `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            projectId: projectId || this.data.id,
            status: 'pending',
            progress: 0,
            startTime: null,
            endTime: null,
            options: {
                outputFormat: 'mp4',
                quality: 'high',
                frameRate: 30,
                resolution: '1080p',
                ...options
            },
            frames: {
                total: 100,
                completed: 0,
                failed: 0
            },
            created: new Date().toISOString()
        };
    }

    /**
     * Build file system test data
     * @param {string} basePath - Base path for files
     * @returns {Object} File system structure
     */
    buildFileSystem(basePath = '/test') {
        return {
            basePath: basePath,
            directories: [
                `${basePath}/projects`,
                `${basePath}/assets`,
                `${basePath}/output`,
                `${basePath}/temp`,
                `${basePath}/plugins`
            ],
            files: [
                {
                    path: `${basePath}/projects/test.nftproject`,
                    type: 'project',
                    size: 1024,
                    created: new Date().toISOString()
                },
                {
                    path: `${basePath}/assets/background.jpg`,
                    type: 'image',
                    size: 2048000,
                    created: new Date().toISOString()
                }
            ]
        };
    }

    /**
     * Build user preferences data
     * @returns {Object} User preferences
     */
    buildUserPreferences() {
        return {
            theme: 'dark',
            language: 'en',
            autoSave: true,
            autoSaveInterval: 300,
            renderQuality: 'high',
            maxUndoSteps: 50,
            showPreview: true,
            previewQuality: 'medium',
            shortcuts: {
                save: 'Ctrl+S',
                undo: 'Ctrl+Z',
                redo: 'Ctrl+Y',
                render: 'F5'
            },
            recentProjects: [
                '/test/projects/project1.nftproject',
                '/test/projects/project2.nftproject'
            ]
        };
    }

    /**
     * Build error test data
     * @param {string} type - Error type
     * @param {string} message - Error message
     * @returns {Object} Error data
     */
    buildError(type = 'ValidationError', message = 'Test error') {
        return {
            type: type,
            message: message,
            code: `ERR_${type.toUpperCase()}`,
            timestamp: new Date().toISOString(),
            stack: `Error: ${message}\n    at TestDataBuilder.buildError`,
            context: {
                operation: 'test',
                data: this.data
            }
        };
    }

    /**
     * Build performance metrics data
     * @returns {Object} Performance metrics
     */
    buildPerformanceMetrics() {
        return {
            renderTime: Math.random() * 1000 + 500, // 500-1500ms
            memoryUsage: Math.random() * 100 + 50,  // 50-150MB
            cpuUsage: Math.random() * 50 + 25,      // 25-75%
            frameRate: Math.random() * 10 + 25,     // 25-35 fps
            effectProcessingTime: {
                blur: Math.random() * 50 + 10,
                brightness: Math.random() * 30 + 5,
                contrast: Math.random() * 40 + 8
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Build test scenario data for specific refactoring scenarios
     * @param {string} scenario - Scenario name
     * @returns {Object} Scenario-specific test data
     */
    buildScenario(scenario) {
        const scenarios = {
            'simple-project': () => {
                return this.buildProject()
                    .withEffects(this.buildEffects(['blur']))
                    .build();
            },
            
            'complex-project': () => {
                return this.buildProject()
                    .withEffects(this.buildEffects(['blur', 'brightness', 'contrast', 'saturation']))
                    .withSettings({ frameCount: 500, frameRate: 60 })
                    .build();
            },
            
            'empty-project': () => {
                return this.buildProject()
                    .withEffects([])
                    .build();
            },
            
            'error-project': () => {
                const project = this.buildProject().build();
                project.error = this.buildError('ProjectLoadError', 'Failed to load project');
                return project;
            }
        };

        const scenarioBuilder = scenarios[scenario];
        if (!scenarioBuilder) {
            throw new Error(`Unknown scenario: ${scenario}`);
        }

        return scenarioBuilder();
    }

    /**
     * Build the final data object
     * @returns {Object} Built data object
     */
    build() {
        return JSON.parse(JSON.stringify(this.data)); // Deep clone
    }

    /**
     * Build and return as JSON string
     * @param {number} indent - JSON indentation
     * @returns {string} JSON string
     */
    buildAsJson(indent = 2) {
        return JSON.stringify(this.build(), null, indent);
    }

    /**
     * Create a new builder instance with the same data
     * @returns {TestDataBuilder} New builder instance
     */
    clone() {
        const newBuilder = new TestDataBuilder();
        newBuilder.data = JSON.parse(JSON.stringify(this.data));
        return newBuilder;
    }

    /**
     * Validate built data against schema
     * @param {Object} schema - Validation schema
     * @returns {Object} Validation result
     */
    validate(schema = null) {
        const data = this.build();
        
        // Basic validation if no schema provided
        if (!schema) {
            const errors = [];
            
            if (data.id && typeof data.id !== 'string') {
                errors.push('ID must be a string');
            }
            
            if (data.effects && !Array.isArray(data.effects)) {
                errors.push('Effects must be an array');
            }
            
            return {
                valid: errors.length === 0,
                errors: errors,
                data: data
            };
        }
        
        // Custom schema validation would go here
        return { valid: true, errors: [], data: data };
    }
}

export default TestDataBuilder;