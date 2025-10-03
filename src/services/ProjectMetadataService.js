/**
 * ProjectMetadataService
 * 
 * Extracted from SettingsToProjectConverter as part of God Object Destruction Plan - Phase 6, Step 6.4
 * 
 * Responsibilities:
 * - Extract project name from various sources
 * - Extract output directory from settings
 * - Extract artist information
 * - Handle path parsing and fallbacks
 * 
 * Single Responsibility: Project metadata extraction
 */

class ProjectMetadataService {
    /**
     * Extract project name from settings
     * @param {Object} settings - Settings file
     * @returns {string} Project name
     */
    extractProjectName(settings) {
        // Handle null/undefined settings
        if (!settings) {
            return 'Converted Project';
        }
        
        // Try various sources for project name
        const sources = [
            settings.config?.finalFileName,
            settings.config?.runName,
            settings.config?.fileOut?.split('/').pop(),
            'Converted Project'
        ];

        for (const source of sources) {
            if (source && typeof source === 'string' && source.trim()) {
                return source.trim();
            }
        }

        return 'Converted Project';
    }

    /**
     * Extract output directory from settings
     * @param {Object} settings - Settings file
     * @returns {string|null} Output directory path or null
     */
    extractOutputDirectory(settings) {
        // Handle null/undefined settings
        if (!settings) {
            return null;
        }
        
        // First check if there's an explicit outputDirectory field (from newer exports)
        if (settings.outputDirectory) {
            console.log('📁 Using explicit outputDirectory from settings:', settings.outputDirectory);
            return settings.outputDirectory;
        }

        // Try to extract from fileOut path in config
        if (settings.config?.fileOut) {
            const fileOut = settings.config.fileOut;
            // Check if this is an absolute path
            if (fileOut.startsWith('/') || fileOut.match(/^[A-Za-z]:\\/)) {
                // This is an absolute path - extract the directory part
                const lastSlashIndex = Math.max(fileOut.lastIndexOf('/'), fileOut.lastIndexOf('\\'));
                if (lastSlashIndex !== -1) {
                    const directory = fileOut.substring(0, lastSlashIndex + 1);
                    console.log('📁 Extracted absolute directory from fileOut:', directory);
                    return directory;
                }
            } else {
                // This is a relative path - try to combine with workingDirectory if available
                if (settings.workingDirectory) {
                    const lastSlashIndex = Math.max(fileOut.lastIndexOf('/'), fileOut.lastIndexOf('\\'));
                    if (lastSlashIndex !== -1) {
                        const relativeDir = fileOut.substring(0, lastSlashIndex);
                        const fullPath = settings.workingDirectory + '/' + relativeDir;
                        console.log('📁 Combined workingDirectory with relative path:', fullPath);
                        return fullPath;
                    }
                }
                // Just use the relative path as-is
                const lastSlashIndex = Math.max(fileOut.lastIndexOf('/'), fileOut.lastIndexOf('\\'));
                if (lastSlashIndex !== -1) {
                    const directory = fileOut.substring(0, lastSlashIndex + 1);
                    console.log('📁 Using relative directory from fileOut:', directory);
                    return directory;
                }
            }
        }

        // Fallback to workingDirectory if available
        if (settings.workingDirectory) {
            console.log('📁 Using workingDirectory as output directory:', settings.workingDirectory);
            return settings.workingDirectory;
        }

        // Final fallback
        console.log('📁 No output directory found in settings, defaulting to null');
        return null;
    }

    /**
     * Extract artist information from settings
     * @param {Object} settings - Settings file
     * @returns {string} Artist name or empty string
     */
    extractArtist(settings) {
        // Handle null/undefined settings
        if (!settings) {
            return '';
        }
        return settings.config?._INVOKER_ || '';
    }

    /**
     * Extract frame count from settings
     * @param {Object} settings - Settings file
     * @returns {number} Number of frames
     */
    extractFrameCount(settings) {
        // Handle null/undefined settings
        if (!settings) {
            return 100;
        }
        // Use nullish coalescing to allow 0 as a valid value
        return settings.config?.numberOfFrame ?? 100;
    }

    /**
     * Extract render settings from settings file
     * @param {Object} settings - Settings file
     * @returns {Object} Render settings
     */
    extractRenderSettings(settings) {
        // Handle null/undefined settings
        if (!settings) {
            return {
                renderStartFrame: 0,
                renderJumpFrames: 1
            };
        }
        return {
            renderStartFrame: settings.frameStart ?? 0,
            renderJumpFrames: settings.config?.frameInc ?? 1
        };
    }
}

// Export singleton instance
export default new ProjectMetadataService();