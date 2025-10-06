/**
 * Service for handling project persistence and auto-saving
 * Manages saving ProjectState to files automatically
 */
import ProjectState from '../models/ProjectState.js';

export default class ProjectPersistenceService {
    constructor() {
        this.currentProjectState = null;
        this.currentProjectPath = null;
        this.autoSaveEnabled = true;
        this.saveTimeout = null;
        this.saveDelay = 1000; // 1 second delay for debouncing
    }

    /**
     * Set the current project and enable auto-saving
     * @param {ProjectState} projectState - Current project state
     * @param {string} projectDirectory - Directory where project should be saved
     */
    async setCurrentProject(projectState, projectDirectory) {
        this.currentProjectState = projectState;
        this.currentProjectPath = await this.generateProjectFilePath(projectState, projectDirectory);

        // Set up auto-save callback on the ProjectState core
        const originalOnUpdate = projectState.core.onUpdate;
        projectState.core.onUpdate = (newState) => {
            console.log('💾 ProjectPersistenceService: onUpdate callback triggered');
            
            // Call original callback first
            if (originalOnUpdate) {
                console.log('💾 ProjectPersistenceService: Calling original onUpdate callback');
                originalOnUpdate(newState);
            }

            // Trigger auto-save
            if (this.autoSaveEnabled) {
                console.log('💾 ProjectPersistenceService: Auto-save enabled, triggering debounced save');
                this.debouncedSave();
            } else {
                console.log('💾 ProjectPersistenceService: Auto-save disabled, skipping save');
            }
        };

        // Initial save
        this.saveProject();
    }

    /**
     * Generate file path for project based on project name and directory
     * @param {ProjectState} projectState - Project state
     * @param {string} projectDirectory - Base directory
     * @returns {Promise<string>} Full file path
     */
    async generateProjectFilePath(projectState, projectDirectory) {
        const projectName = projectState.getProjectName() || 'Untitled Project';
        const sanitizedName = this.sanitizeFileName(projectName);

        // Use IPC to generate path
        const result = await window.api.generateProjectPath(projectDirectory, sanitizedName);
        if (result.success) {
            return result.filePath;
        } else {
            throw new Error(`Failed to generate project path: ${result.error}`);
        }
    }

    /**
     * Sanitize filename to remove invalid characters
     * @param {string} filename - Original filename
     * @returns {string} Sanitized filename
     */
    sanitizeFileName(filename) {
        return filename
            .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .trim()
            .substring(0, 100); // Limit length
    }

    /**
     * Debounced save to avoid excessive file writes
     */
    debouncedSave() {
        console.log('💾 ProjectPersistenceService: debouncedSave called');
        
        if (this.saveTimeout) {
            console.log('💾 ProjectPersistenceService: Clearing existing save timeout');
            clearTimeout(this.saveTimeout);
        }

        console.log(`💾 ProjectPersistenceService: Setting save timeout for ${this.saveDelay}ms`);
        this.saveTimeout = setTimeout(() => {
            console.log('💾 ProjectPersistenceService: Save timeout triggered, calling saveProject');
            this.saveProject();
        }, this.saveDelay);
    }

    /**
     * Save the current project to file
     * @returns {Promise<boolean>} Success status
     */
    async saveProject() {
        if (!this.currentProjectState || !this.currentProjectPath) {
            console.warn('ProjectPersistenceService: No project to save');
            return false;
        }

        try {
            const success = await this.currentProjectState.saveToFile(this.currentProjectPath);

            if (success.success) {
                console.log(`📁 Project auto-saved to: ${this.currentProjectPath}`);
                return true;
            } else {
                console.error('📁 Failed to save project:', success.error);
                return false;
            }
        } catch (error) {
            console.error('📁 Error saving project:', error.message);
            return false;
        }
    }

    /**
     * Update project directory and regenerate file path
     * @param {string} newDirectory - New project directory
     */
    async updateProjectDirectory(newDirectory) {
        if (this.currentProjectState) {
            this.currentProjectPath = await this.generateProjectFilePath(this.currentProjectState, newDirectory);
            this.currentProjectState.setOutputDirectory(newDirectory);
            this.debouncedSave();
        }
    }

    /**
     * Update project name and regenerate file path
     * @param {string} newName - New project name
     */
    async updateProjectName(newName) {
        if (this.currentProjectState) {
            const oldPath = this.currentProjectPath;
            this.currentProjectState.setProjectName(newName);

            // Get project directory using IPC
            const dirResult = await window.api.getDirname(this.currentProjectPath);
            if (dirResult.success) {
                const projectDirectory = dirResult.dirname;
                this.currentProjectPath = await this.generateProjectFilePath(this.currentProjectState, projectDirectory);

                // If path changed, save to new location and optionally clean up old file
                if (oldPath !== this.currentProjectPath) {
                    console.log(`📁 Project renamed, new file: ${this.currentProjectPath}`);
                    this.saveProject();
                }
            }
        }
    }

    /**
     * Enable or disable auto-saving
     * @param {boolean} enabled - Whether auto-save should be enabled
     */
    setAutoSaveEnabled(enabled) {
        this.autoSaveEnabled = enabled;
        console.log(`📁 Auto-save ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set the auto-save delay
     * @param {number} delay - Delay in milliseconds
     */
    setAutoSaveDelay(delay) {
        this.saveDelay = delay;
    }

    /**
     * Force immediate save
     * @returns {Promise<boolean>} Success status
     */
    async forceSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        return await this.saveProject();
    }

    /**
     * Get current project file path
     * @returns {string|null} Current file path
     */
    getCurrentProjectPath() {
        return this.currentProjectPath;
    }

    /**
     * Load project from file
     * @param {string} filePath - Path to project file
     * @returns {Promise<ProjectState|null>} Loaded project state
     */
    async loadProject(filePath) {
        try {
            const projectState = await ProjectState.loadFromFile(filePath);

            // Get project directory using IPC
            const dirResult = await window.api.getDirname(filePath);
            if (dirResult.success) {
                const projectDirectory = dirResult.dirname;
                await this.setCurrentProject(projectState, projectDirectory);

                console.log(`📁 Project loaded from: ${filePath}`);
                return projectState;
            } else {
                throw new Error(`Failed to get directory from path: ${dirResult.error}`);
            }
        } catch (error) {
            console.error('📁 Error loading project:', error.message);
            return null;
        }
    }

    /**
     * Check if a project file exists
     * @param {string} filePath - Path to check
     * @returns {Promise<boolean>} Whether file exists
     */
    async projectExists(filePath) {
        try {
            const result = await window.api.projectFileExists(filePath);
            return result.success && result.exists;
        } catch {
            return false;
        }
    }

    /**
     * Create a backup of the current project
     * @returns {Promise<string|null>} Backup file path or null if failed
     */
    async createBackup() {
        if (!this.currentProjectPath || !this.currentProjectState) {
            return null;
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = this.currentProjectPath.replace('.nftproject', `_backup_${timestamp}.nftproject`);

            const success = await this.currentProjectState.saveToFile(backupPath);

            if (success.success) {
                console.log(`📁 Backup created: ${backupPath}`);
                return backupPath;
            }

            return null;
        } catch (error) {
            console.error('📁 Error creating backup:', error.message);
            return null;
        }
    }

    /**
     * Clear current project and stop auto-saving
     */
    clearProject() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }

        this.currentProjectState = null;
        this.currentProjectPath = null;
        console.log('📁 Project persistence cleared');
    }
}