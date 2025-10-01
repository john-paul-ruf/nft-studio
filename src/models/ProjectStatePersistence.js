/**
 * ProjectStatePersistence - Persistence and Serialization Management
 * 
 * Single Responsibility: Handle project state persistence operations
 * - Serialization and deserialization
 * - File I/O operations
 * - Legacy format support
 * - Version compatibility
 */

export default class ProjectStatePersistence {
    constructor(stateCore, effectsManager) {
        this.stateCore = stateCore;
        this.effectsManager = effectsManager;
    }

    /**
     * Serialize project state to JSON string
     * @returns {string} JSON serialized project state
     */
    serialize() {
        return JSON.stringify({
            version: '1.0.0',
            timestamp: Date.now(),
            state: this.stateCore.getState()
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
            state: { ...this.stateCore.getState() }
        };
    }

    /**
     * Create ProjectState from JSON string
     * @param {string} jsonString - JSON serialized project state
     * @param {Function} onUpdate - Update callback
     * @returns {Promise<Object>} Deserialized state data
     */
    static async fromJSON(jsonString, onUpdate = null) {
        try {
            const data = JSON.parse(jsonString);
            return await ProjectStatePersistence.fromObject(data, onUpdate);
        } catch (error) {
            throw new Error(`Failed to deserialize ProjectState: ${error.message}`);
        }
    }

    /**
     * Create ProjectState from plain object
     * @param {Object} data - Plain object with version, timestamp, and state
     * @param {Function} onUpdate - Update callback
     * @returns {Promise<Object>} Deserialized state data
     */
    static async fromObject(data, onUpdate = null) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data provided for ProjectState deserialization');
        }

        if (!data.state) {
            throw new Error('Missing state property in ProjectState data');
        }

        // Version compatibility check
        const version = data.version || '1.0.0';
        if (!ProjectStatePersistence.isVersionCompatible(version)) {
            throw new Error(`Incompatible ProjectState version: ${version}`);
        }

        // Return the state data for reconstruction
        let stateData = { ...data.state };

        // Ensure all effects have IDs (for backward compatibility)
        if (stateData.effects && Array.isArray(stateData.effects)) {
            try {
                const IdGenerator = (await import('../utils/IdGenerator.js')).default;
                stateData.effects = IdGenerator.ensureEffectsIds(stateData.effects);
            } catch (error) {
                console.warn('Could not load IdGenerator, effects may not have IDs:', error.message);
                // Continue without ID generation if IdGenerator is not available
            }
        }

        return stateData;
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
     * @returns {Object} Converted state data
     */
    static fromLegacyConfig(legacyConfig) {
        if (!legacyConfig || typeof legacyConfig !== 'object') {
            return null;
        }

        // Map legacy properties to new state structure
        return {
            projectName: legacyConfig.projectName || '',
            artist: legacyConfig.artist || '',
            targetResolution: legacyConfig.targetResolution || legacyConfig.resolution || 1080,
            isHorizontal: legacyConfig.isHorizontal || false,
            numFrames: legacyConfig.numFrames || legacyConfig.numberOfFrames || 100,
            effects: legacyConfig.effects || [],
            colorScheme: legacyConfig.colorScheme || 'vapor-dreams',
            colorSchemeData: legacyConfig.colorSchemeData || null,
            outputDirectory: legacyConfig.outputDirectory || null,
            renderStartFrame: legacyConfig.renderStartFrame || 0,
            renderJumpFrames: legacyConfig.renderJumpFrames || 1
        };
    }

    /**
     * Save project state to file (frontend only)
     * @param {string} filePath - Path to save the file
     * @returns {Promise<Object>} Save result
     */
    async saveToFile(filePath) {
        try {
            if (!this.isBrowser()) {
                throw new Error('File operations are only available in browser environment');
            }

            const result = await window.api.saveProjectFile(filePath, this.toJSON());
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Load project state from file (frontend only)
     * @param {string} filePath - Path to load the file from
     * @returns {Promise<Object>} Loaded state data
     */
    static async loadFromFile(filePath) {
        try {
            if (!ProjectStatePersistence.isBrowser()) {
                throw new Error('File operations are only available in browser environment');
            }

            const result = await window.api.loadProjectFile(filePath);
            if (result.success) {
                return await ProjectStatePersistence.fromJSON(JSON.stringify(result.projectData));
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            throw new Error(`Failed to load project from file: ${error.message}`);
        }
    }

    /**
     * Export state for backend compatibility
     * @returns {Object} Backend-compatible state
     */
    exportForBackend() {
        const state = this.stateCore.getState();
        return {
            ...state,
            // Ensure backend compatibility
            resolution: state.targetResolution,
            numberOfFrames: state.numFrames
        };
    }

    /**
     * Create backup of current state
     * @returns {Object} Backup data with metadata
     */
    createBackup() {
        return {
            version: '1.0.0',
            timestamp: Date.now(),
            backupType: 'manual',
            state: this.stateCore.getState(),
            metadata: {
                effectsCount: this.effectsManager.getEffectsCount(),
                hasEffects: this.effectsManager.hasEffects(),
                stateSize: this.stateCore.getStateSize()
            }
        };
    }

    /**
     * Restore state from backup
     * @param {Object} backup - Backup data
     * @returns {Object} Restored state data
     */
    static restoreFromBackup(backup) {
        if (!backup || !backup.state) {
            throw new Error('Invalid backup data');
        }

        // Version compatibility check
        if (!ProjectStatePersistence.isVersionCompatible(backup.version)) {
            throw new Error(`Incompatible backup version: ${backup.version}`);
        }

        return backup.state;
    }

    /**
     * Get export formats
     * @returns {string[]} Available export formats
     */
    getExportFormats() {
        return ['json', 'nftproject', 'backup'];
    }

    /**
     * Export in specific format
     * @param {string} format - Export format
     * @returns {string|Object} Exported data
     */
    exportAs(format) {
        switch (format.toLowerCase()) {
            case 'json':
                return this.serialize();
            case 'nftproject':
                return this.toJSON();
            case 'backup':
                return this.createBackup();
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Import from specific format
     * @param {string|Object} data - Import data
     * @param {string} format - Import format
     * @returns {Object} Imported state data
     */
    static async importFrom(data, format) {
        switch (format.toLowerCase()) {
            case 'json':
                return await ProjectStatePersistence.fromJSON(data);
            case 'nftproject':
                return await ProjectStatePersistence.fromObject(data);
            case 'backup':
                return ProjectStatePersistence.restoreFromBackup(data);
            case 'legacy':
                return ProjectStatePersistence.fromLegacyConfig(data);
            default:
                throw new Error(`Unsupported import format: ${format}`);
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

    /**
     * Get persistence capabilities
     * @returns {Object} Available persistence features
     */
    static getCapabilities() {
        return {
            fileOperations: ProjectStatePersistence.isBrowser(),
            serialization: true,
            legacySupport: true,
            backupRestore: true,
            versionCompatibility: true,
            supportedVersions: ['1.0.0'],
            exportFormats: ['json', 'nftproject', 'backup'],
            importFormats: ['json', 'nftproject', 'backup', 'legacy']
        };
    }
}