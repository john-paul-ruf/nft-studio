/**
 * SettingsValidationService
 * 
 * Extracted from SettingsToProjectConverter as part of God Object Destruction Plan - Phase 6, Step 6.4
 * 
 * Responsibilities:
 * - Validate settings file structure
 * - Check for required fields
 * - Validate array types
 * - Generate validation error messages
 * 
 * Single Responsibility: Settings file validation
 */

class SettingsValidationService {
    /**
     * Validate that a settings file has the expected structure
     * @param {Object} settings - Settings file to validate
     * @returns {Array<string>} Array of validation error messages (empty if valid)
     */
    validateSettingsFile(settings) {
        const errors = [];

        if (!settings || typeof settings !== 'object') {
            errors.push('Settings must be a valid object');
            return errors;
        }

        // Check for at least one effect array
        const hasAnyEffects = settings.effects || settings.allPrimaryEffects ||
            settings.finalImageEffects || settings.allFinalImageEffects ||
            settings.additionalEffects || settings.allAdditionalEffects ||
            settings.secondaryEffects || settings.allSecondaryEffects ||
            settings.keyFrameEffects || settings.allKeyFrameEffects;

        if (!hasAnyEffects) {
            errors.push('Settings must contain at least one effects array (effects, allPrimaryEffects, finalImageEffects, etc.)');
        }

        // Validate array types for existing arrays
        const effectArrays = [
            'effects', 'allPrimaryEffects', 'finalImageEffects', 'allFinalImageEffects',
            'additionalEffects', 'allAdditionalEffects', 'secondaryEffects', 'allSecondaryEffects',
            'keyFrameEffects', 'allKeyFrameEffects'
        ];

        effectArrays.forEach(arrayName => {
            if (settings[arrayName] && !Array.isArray(settings[arrayName])) {
                errors.push(`${arrayName} must be an array`);
            }
        });

        if (!settings.config) {
            errors.push('Settings must contain config object');
        }

        if (!settings.finalSize) {
            errors.push('Settings must contain finalSize object');
        }

        return errors;
    }

    /**
     * Get a summary of what will be converted
     * @param {Object} settings - Settings file to summarize
     * @param {Function} extractProjectName - Function to extract project name
     * @returns {Object} Validation result with summary or errors
     */
    getConversionSummary(settings, extractProjectName) {
        const validation = this.validateSettingsFile(settings);
        if (validation.length > 0) {
            return {
                valid: false,
                errors: validation
            };
        }

        return {
            valid: true,
            summary: {
                projectName: extractProjectName(settings),
                effectsCount: (settings.effects || settings.allPrimaryEffects)?.length || 0,
                numFrames: settings.config?.numberOfFrame || 100,
                resolution: `${settings.finalSize?.width || 0}x${settings.finalSize?.height || 0}`,
                hasColorScheme: !!settings.colorScheme,
                artist: settings.config?._INVOKER_ || 'Unknown'
            }
        };
    }
}

// Export singleton instance
export default new SettingsValidationService();