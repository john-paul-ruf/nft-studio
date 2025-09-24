import path from 'path';

/**
 * Simple project resume handler - just updates paths and calls ResumeProject
 * Follows Single Responsibility Principle - only handles resume logic
 */
class ProjectResumer {
    /**
     * Resume a project from a settings file path
     * @param {string} settingsPath - Path to the settings file
     * @returns {Promise<Object>} Resume result
     */
    static async resumeFromSettings(settingsPath) {
        try {
            const fs = await import('fs/promises');

            // Convert relative path to absolute path
            const absoluteSettingsPath = path.isAbsolute(settingsPath)
                ? settingsPath
                : path.resolve(process.cwd(), settingsPath);

            console.log('🔄 ProjectResumer: Resuming project from settings file:', absoluteSettingsPath);

            // Verify the settings file exists
            try {
                await fs.access(absoluteSettingsPath);
            } catch (accessError) {
                throw new Error(`Settings file not found: ${absoluteSettingsPath}`);
            }

            // Get the project directory from the settings file location
            const settingsDir = path.dirname(absoluteSettingsPath);
            const correctProjectDirectory = settingsDir.endsWith('settings')
                ? path.dirname(settingsDir)
                : settingsDir;

            console.log('📁 ProjectResumer: Project directory determined:', correctProjectDirectory);

            // Import ResumeProject function from my-nft-gen
            const { ResumeProject } = await import('my-nft-gen/src/app/ResumeProject.js');

            // Set up event callback for progress monitoring
            const eventCallback = (eventData) => {
                console.log(`🎬 Resume Event: ${eventData.eventName}`, eventData);
            };

            // Call ResumeProject directly with the settings file
            console.log('🚀 ProjectResumer: Calling ResumeProject...');
            const resumeResult = await ResumeProject(absoluteSettingsPath, {
                eventCategories: ['PROGRESS', 'COMPLETION', 'ERROR'],
                eventCallback
            });

            console.log('✅ ProjectResumer: Resume completed successfully');

            return {
                success: true,
                settingsPath: absoluteSettingsPath,
                projectDirectory: correctProjectDirectory,
                resumeResult,
                message: `Successfully resumed project from ${path.basename(absoluteSettingsPath)}`
            };

        } catch (error) {
            console.error('❌ ProjectResumer: Resume failed:', error);
            return {
                success: false,
                error: error.message,
                settingsPath: settingsPath
            };
        }
    }

    /**
     * Get project info from settings file without resuming
     * @param {string} settingsPath - Path to the settings file
     * @returns {Promise<Object>} Project info
     */
    static async getProjectInfo(settingsPath) {
        try {
            const fs = await import('fs/promises');

            // Convert relative path to absolute path
            const absoluteSettingsPath = path.isAbsolute(settingsPath)
                ? settingsPath
                : path.resolve(process.cwd(), settingsPath);

            // Load and parse settings file
            const settingsContent = await fs.readFile(absoluteSettingsPath, 'utf8');
            const settings = JSON.parse(settingsContent);

            // Get the project directory
            const settingsDir = path.dirname(absoluteSettingsPath);
            const projectDirectory = settingsDir.endsWith('settings')
                ? path.dirname(settingsDir)
                : settingsDir;

            return {
                success: true,
                projectName: settings.runName || settings.projectName || 'Unknown Project',
                projectDirectory,
                settingsPath: absoluteSettingsPath,
                numberOfFrames: settings.numberOfFrame || settings.numFrames || 0,
                resolution: `${settings.longestSideInPixels || 'Unknown'}x${settings.shortestSideInPixels || 'Unknown'}`,
                artist: settings._INVOKER_ || settings.artist || 'Unknown',
                effectsCount: settings.allPrimaryEffects?.length || 0
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                settingsPath: settingsPath
            };
        }
    }
}

export default ProjectResumer;