/**
 * ColorSchemeConversionService
 * 
 * Extracted from SettingsToProjectConverter as part of God Object Destruction Plan - Phase 6, Step 6.4
 * 
 * Responsibilities:
 * - Extract color scheme name from settings
 * - Convert color scheme data from settings format
 * - Generate fallback color arrays when missing
 * - Validate color scheme completeness
 * 
 * Single Responsibility: Color scheme extraction and conversion
 */

class ColorSchemeConversionService {
    /**
     * Extract color scheme name from settings
     * @param {Object} settings - Settings file
     * @returns {string} Color scheme name
     */
    extractColorSchemeName(settings) {
        // Settings files don't typically have a scheme name, so we'll generate one
        // based on the color scheme info or use a default
        if (settings.colorScheme?.colorSchemeInfo) {
            const info = settings.colorScheme.colorSchemeInfo.toLowerCase();
            if (info.includes('vishuddha')) return 'vishuddha-chakra';
            if (info.includes('chakra')) return 'chakra-inspired';
        }

        // Default to a generic name
        return 'custom-scheme';
    }

    /**
     * Convert color scheme data from settings format
     * @param {Object} settings - Settings file
     * @returns {Object|null} Color scheme data or null if no colors available
     */
    convertColorSchemeData(settings) {
        if (!settings.colorScheme) return null;

        // Extract color arrays from the correct locations in settings
        const colors = settings.colorScheme.colorBucket || [];
        const neutrals = settings.neutrals || settings.colorScheme.neutrals || [];
        const backgrounds = settings.backgrounds || settings.colorScheme.backgrounds || [];
        const lights = settings.lights || settings.colorScheme.lights || [];

        console.log('🎨 Color scheme extraction:', {
            colorsCount: colors.length,
            neutralsCount: neutrals.length,
            backgroundsCount: backgrounds.length,
            lightsCount: lights.length,
            hasColorScheme: !!settings.colorScheme,
            colorSchemeKeys: settings.colorScheme ? Object.keys(settings.colorScheme) : []
        });

        // Ensure we have minimum required data - generate fallbacks if needed
        if (colors.length === 0) {
            console.warn('⚠️ No colors found in colorScheme.colorBucket, cannot create color scheme');
            return null; // Can't proceed without colors
        }

        // Generate fallback arrays if missing - use the colors as fallbacks
        let finalNeutrals = neutrals.length > 0 ? neutrals : colors.slice(0, Math.max(1, Math.floor(colors.length / 2)));
        let finalBackgrounds = backgrounds.length > 0 ? backgrounds : colors.slice(0, Math.max(1, Math.floor(colors.length / 3)));
        let finalLights = lights.length > 0 ? lights : colors; // Use all colors as lights fallback

        console.log('🎨 Final color scheme arrays:', {
            colors: colors.length,
            neutrals: finalNeutrals.length,
            backgrounds: finalBackgrounds.length,
            lights: finalLights.length,
            generatedFallbacks: {
                neutrals: neutrals.length === 0,
                backgrounds: backgrounds.length === 0,
                lights: lights.length === 0
            }
        });

        return {
            // Main color palette - NftProjectManager expects 'colors' array
            colors,

            // Additional color categories - NftProjectManager requires these
            neutrals: finalNeutrals,
            backgrounds: finalBackgrounds,
            lights: finalLights,

            // Preserve color scheme info
            info: settings.colorScheme.colorSchemeInfo || '',

            // Mark as converted from settings
            source: 'settings-conversion'
        };
    }
}

// Export singleton instance
export default new ColorSchemeConversionService();