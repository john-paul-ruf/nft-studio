import ResolutionMapper from '../utils/ResolutionMapper.js';

/**
 * ProjectState class manages the frontend project configuration and state
 * Encapsulates all project-related data and provides methods for manipulation
 */
export default class ProjectState {
    constructor(initialConfig = null, onUpdate = null) {
        this.onUpdate = onUpdate;
        this.state = this.initializeState(initialConfig);
    }

    /**
     * Initialize project state with defaults or provided config
     * @param {Object|null} initialConfig - Initial project configuration
     * @returns {Object} Initialized state
     */
    initializeState(initialConfig) {
        if (initialConfig) {
            return { ...initialConfig };
        }

        // Default project state
        return {
            projectName: '',
            artist: '',
            targetResolution: ResolutionMapper.getDefaultResolution(),
            isHorizontal: false,
            numFrames: 100,
            effects: [],
            colorScheme: null,
            colorSchemeData: null,
            outputDirectory: null,
            renderStartFrame: 0,
            renderJumpFrames: 1
        };
    }

    /**
     * Get current project state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Update project state with new values
     * @param {Object} updates - Updates to apply
     */
    update(updates) {
        this.state = { ...this.state, ...updates };
        if (this.onUpdate) {
            this.onUpdate(this.getState());
        }
    }

    /**
     * Get project name
     * @returns {string}
     */
    getProjectName() {
        return this.state.projectName;
    }

    /**
     * Set project name
     * @param {string} name
     */
    setProjectName(name) {
        this.update({ projectName: name });
    }

    /**
     * Get target resolution
     * @returns {number|string}
     */
    getTargetResolution() {
        return this.state.targetResolution;
    }

    /**
     * Set target resolution
     * @param {number|string} resolution
     */
    setTargetResolution(resolution) {
        this.update({ targetResolution: resolution });
    }

    /**
     * Get resolution dimensions
     * @returns {Object} Object with width and height
     */
    getResolutionDimensions() {
        return ResolutionMapper.getDimensions(this.state.targetResolution, this.state.isHorizontal);
    }

    /**
     * Get orientation
     * @returns {boolean}
     */
    getIsHorizontal() {
        return this.state.isHorizontal;
    }

    /**
     * Set orientation
     * @param {boolean} isHorizontal
     */
    setIsHorizontal(isHorizontal) {
        this.update({ isHorizontal });
    }

    /**
     * Get number of frames
     * @returns {number}
     */
    getNumFrames() {
        return this.state.numFrames;
    }

    /**
     * Set number of frames
     * @param {number} numFrames
     */
    setNumFrames(numFrames) {
        this.update({ numFrames });
    }

    /**
     * Get effects array
     * @returns {Array}
     */
    getEffects() {
        return [...this.state.effects];
    }

    /**
     * Set effects array
     * @param {Array} effects
     */
    setEffects(effects) {
        this.update({ effects: [...effects] });
    }

    /**
     * Add effect to the effects array
     * @param {Object} effect - Effect to add
     */
    addEffect(effect) {
        const effects = [...this.state.effects, effect];
        this.setEffects(effects);
    }

    /**
     * Update effect at specific index
     * @param {number} index - Index of effect to update
     * @param {Object} updates - Updates to apply to the effect
     */
    updateEffect(index, updates) {
        const effects = [...this.state.effects];
        if (effects[index]) {
            effects[index] = { ...effects[index], ...updates };
            this.setEffects(effects);
        }
    }

    /**
     * Remove effect at specific index
     * @param {number} index - Index of effect to remove
     */
    removeEffect(index) {
        const effects = this.state.effects.filter((_, i) => i !== index);
        this.setEffects(effects);
    }

    /**
     * Reorder effects
     * @param {number} sourceIndex - Source index
     * @param {number} destinationIndex - Destination index
     */
    reorderEffects(sourceIndex, destinationIndex) {
        const effects = [...this.state.effects];
        const [movedEffect] = effects.splice(sourceIndex, 1);
        effects.splice(destinationIndex, 0, movedEffect);
        this.setEffects(effects);
    }

    /**
     * Get color scheme
     * @returns {Object|null}
     */
    getColorScheme() {
        return this.state.colorScheme;
    }

    /**
     * Set color scheme
     * @param {Object} colorScheme
     */
    setColorScheme(colorScheme) {
        this.update({ colorScheme });
    }

    /**
     * Get color scheme data
     * @returns {Object|null}
     */
    getColorSchemeData() {
        return this.state.colorSchemeData;
    }

    /**
     * Set color scheme data
     * @param {Object} colorSchemeData
     */
    setColorSchemeData(colorSchemeData) {
        this.update({ colorSchemeData });
    }

    /**
     * Get artist name
     * @returns {string}
     */
    getArtist() {
        return this.state.artist;
    }

    /**
     * Set artist name
     * @param {string} artist
     */
    setArtist(artist) {
        this.update({ artist });
    }

    /**
     * Get output directory
     * @returns {string|null}
     */
    getOutputDirectory() {
        return this.state.outputDirectory;
    }

    /**
     * Set output directory
     * @param {string} outputDirectory
     */
    setOutputDirectory(outputDirectory) {
        this.update({ outputDirectory });
    }

    /**
     * Get render start frame
     * @returns {number}
     */
    getRenderStartFrame() {
        return this.state.renderStartFrame;
    }

    /**
     * Set render start frame
     * @param {number} renderStartFrame
     */
    setRenderStartFrame(renderStartFrame) {
        this.update({ renderStartFrame });
    }

    /**
     * Get render jump frames
     * @returns {number}
     */
    getRenderJumpFrames() {
        return this.state.renderJumpFrames;
    }

    /**
     * Set render jump frames
     * @param {number} renderJumpFrames
     */
    setRenderJumpFrames(renderJumpFrames) {
        this.update({ renderJumpFrames });
    }

    /**
     * Check if project has any effects
     * @returns {boolean}
     */
    hasEffects() {
        return this.state.effects.length > 0;
    }

    /**
     * Get effects by type
     * @param {string} type - Effect type to filter by
     * @returns {Array}
     */
    getEffectsByType(type) {
        return this.state.effects.filter(effect => effect.type === type);
    }

    /**
     * Check if project is ready for rendering
     * @returns {boolean}
     */
    isReadyForRender() {
        return this.state.projectName &&
               this.state.targetResolution &&
               this.state.colorSchemeData &&
               this.state.effects.length > 0;
    }

    /**
     * Export project configuration for backend
     * @returns {Object}
     */
    exportForBackend() {
        return {
            ...this.state,
            // Ensure backend compatibility
            resolution: this.state.targetResolution,
            numberOfFrames: this.state.numFrames
        };
    }

    /**
     * Create a deep copy of the project state
     * @returns {ProjectState}
     */
    clone() {
        return new ProjectState(this.getState(), this.onUpdate);
    }

    /**
     * Reset project to default state
     */
    reset() {
        this.state = this.initializeState();
        if (this.onUpdate) {
            this.onUpdate(this.getState());
        }
    }

    /**
     * Validate project configuration
     * @returns {Object} Validation result with isValid and errors
     */
    validate() {
        const errors = [];

        if (!this.state.projectName || this.state.projectName.trim() === '') {
            errors.push('Project name is required');
        }

        if (!this.state.targetResolution) {
            errors.push('Target resolution is required');
        }

        if (!this.state.colorSchemeData) {
            errors.push('Color scheme is required');
        }

        if (this.state.numFrames <= 0) {
            errors.push('Number of frames must be greater than 0');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Serialize project state to JSON string
     * @returns {string} JSON serialized project state
     */
    serialize() {
        return JSON.stringify({
            version: '1.0.0',
            timestamp: Date.now(),
            state: this.state
        });
    }

    /**
     * Serialize project state to plain object
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            version: '1.0.0',
            timestamp: Date.now(),
            state: { ...this.state }
        };
    }

    /**
     * Create ProjectState from JSON string
     * @param {string} jsonString - JSON serialized project state
     * @param {Function} onUpdate - Update callback
     * @returns {ProjectState} New ProjectState instance
     */
    static fromJSON(jsonString, onUpdate = null) {
        try {
            const data = JSON.parse(jsonString);
            return ProjectState.fromObject(data, onUpdate);
        } catch (error) {
            throw new Error(`Failed to deserialize ProjectState: ${error.message}`);
        }
    }

    /**
     * Create ProjectState from plain object
     * @param {Object} data - Plain object with version, timestamp, and state
     * @param {Function} onUpdate - Update callback
     * @returns {ProjectState} New ProjectState instance
     */
    static fromObject(data, onUpdate = null) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data provided for ProjectState deserialization');
        }

        if (!data.state) {
            throw new Error('Missing state property in ProjectState data');
        }

        // Version compatibility check
        const version = data.version || '1.0.0';
        if (!ProjectState.isVersionCompatible(version)) {
            throw new Error(`Incompatible ProjectState version: ${version}`);
        }

        // Create new instance with hydrated state
        const instance = new ProjectState(null, onUpdate);
        instance.state = { ...instance.state, ...data.state };

        return instance;
    }

    /**
     * Check if a version is compatible with current ProjectState
     * @param {string} version - Version string to check
     * @returns {boolean} True if compatible
     */
    static isVersionCompatible(version) {
        const supportedVersions = ['1.0.0'];
        return supportedVersions.includes(version);
    }

    /**
     * Create ProjectState from legacy config object
     * @param {Object} legacyConfig - Legacy project configuration
     * @param {Function} onUpdate - Update callback
     * @returns {ProjectState} New ProjectState instance
     */
    static fromLegacyConfig(legacyConfig, onUpdate = null) {
        if (!legacyConfig || typeof legacyConfig !== 'object') {
            return new ProjectState(null, onUpdate);
        }

        const instance = new ProjectState(null, onUpdate);

        // Map legacy properties to new state structure
        instance.state = {
            ...instance.state,
            projectName: legacyConfig.projectName || '',
            artist: legacyConfig.artist || '',
            targetResolution: legacyConfig.targetResolution || legacyConfig.resolution || instance.state.targetResolution,
            isHorizontal: legacyConfig.isHorizontal || false,
            numFrames: legacyConfig.numFrames || legacyConfig.numberOfFrames || 100,
            effects: legacyConfig.effects || [],
            colorScheme: legacyConfig.colorScheme || null,
            colorSchemeData: legacyConfig.colorSchemeData || null,
            outputDirectory: legacyConfig.outputDirectory || null,
            renderStartFrame: legacyConfig.renderStartFrame || 0,
            renderJumpFrames: legacyConfig.renderJumpFrames || 1
        };

        return instance;
    }

    /**
     * Save project state to file (frontend only)
     * @param {string} filePath - Path to save the file
     * @returns {Promise<Object>} Save result
     */
    async saveToFile(filePath) {
        try {
            const result = await window.api.saveProjectFile(filePath, this.toJSON());
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Load project state from file (frontend only)
     * @param {string} filePath - Path to load the file from
     * @param {Function} onUpdate - Update callback
     * @returns {Promise<ProjectState>} Loaded ProjectState instance
     */
    static async loadFromFile(filePath, onUpdate = null) {
        try {
            const result = await window.api.loadProjectFile(filePath);
            if (result.success) {
                return ProjectState.fromJSON(JSON.stringify(result.projectData), onUpdate);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            throw new Error(`Failed to load project from file: ${error.message}`);
        }
    }

    /**
     * Check if running in browser/frontend environment
     * @returns {boolean} True if in browser
     */
    static isBrowser() {
        return typeof window !== 'undefined';
    }

    /**
     * Check if running in Node.js/backend environment
     * @returns {boolean} True if in Node.js
     */
    static isNode() {
        return typeof window === 'undefined' && typeof process !== 'undefined';
    }
}