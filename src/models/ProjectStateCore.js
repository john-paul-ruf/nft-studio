/**
 * ProjectStateCore - Core State Management
 * 
 * Single Responsibility: Manage the core project state data
 * - Basic state storage and retrieval
 * - State initialization
 * - State updates with change tracking
 * - State cloning and reset
 */

import ResolutionMapper from '../utils/ResolutionMapper.js';

export default class ProjectStateCore {
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
            colorScheme: 'vapor-dreams',
            colorSchemeData: null,
            outputDirectory: null,
            renderStartFrame: 0,
            renderJumpFrames: 1
        };
    }

    /**
     * Get current project state (immutable copy)
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
        const oldEffectsCount = this.state?.effects?.length || 0;
        console.log('📝 ProjectStateCore.update: Before update - effects count:', oldEffectsCount);
        console.log('📝 ProjectStateCore.update: Updates being applied:', updates);

        this.state = { ...this.state, ...updates };

        const newEffectsCount = this.state?.effects?.length || 0;
        console.log('📝 ProjectStateCore.update: After update - effects count:', newEffectsCount);
        console.log('📝 ProjectStateCore.update: New effects:', this.state?.effects?.map(e => e.name || e.className) || []);

        if (this.onUpdate) {
            console.log('📝 ProjectStateCore.update: Calling onUpdate callback');
            this.onUpdate(this.getState());
        } else {
            console.log('📝 ProjectStateCore.update: No onUpdate callback set');
        }
    }

    /**
     * Create a deep copy of the project state
     * @returns {ProjectStateCore}
     */
    clone() {
        return new ProjectStateCore(this.getState(), this.onUpdate);
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
     * Set the update callback
     * @param {Function} onUpdate - Update callback function
     */
    setOnUpdate(onUpdate) {
        this.onUpdate = onUpdate;
    }

    /**
     * Get a specific property from state
     * @param {string} key - Property key
     * @returns {*} Property value
     */
    getProperty(key) {
        return this.state[key];
    }

    /**
     * Set a specific property in state
     * @param {string} key - Property key
     * @param {*} value - Property value
     */
    setProperty(key, value) {
        this.update({ [key]: value });
    }

    /**
     * Check if state has a specific property
     * @param {string} key - Property key
     * @returns {boolean} True if property exists
     */
    hasProperty(key) {
        return key in this.state;
    }

    /**
     * Get all property keys
     * @returns {string[]} Array of property keys
     */
    getPropertyKeys() {
        return Object.keys(this.state);
    }

    /**
     * Merge multiple updates into state
     * @param {...Object} updates - Multiple update objects
     */
    mergeUpdates(...updates) {
        const mergedUpdates = Object.assign({}, ...updates);
        this.update(mergedUpdates);
    }

    /**
     * Check if state is empty (default values)
     * @returns {boolean} True if state is empty
     */
    isEmpty() {
        const defaultState = this.initializeState();
        return JSON.stringify(this.state) === JSON.stringify(defaultState);
    }

    /**
     * Get state size (number of properties)
     * @returns {number} Number of properties in state
     */
    getStateSize() {
        return Object.keys(this.state).length;
    }

    /**
     * Export state for backend compatibility
     * @returns {Object} Backend-compatible state
     */
    exportForBackend() {
        return {
            ...this.state,
            // Ensure backend compatibility
            resolution: this.state.targetResolution,
            numberOfFrames: this.state.numFrames
        };
    }
}