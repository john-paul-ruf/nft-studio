const { ipcRenderer } = window.require('electron');

/**
 * Dynamic effect library that discovers effects from the file system
 * Replaces static effect definitions with dynamic discovery
 */
export class EffectLibrary {
    static _cachedEffects = null;
    static _cacheTimestamp = 0;
    static CACHE_DURATION = 30000; // 30 seconds

    /**
     * Get all available effects, using cache if still valid
     * @returns {Promise<Object>} Available effects by category
     */
    static async getAvailableEffects() {
        const now = Date.now();

        // Return cached effects if still valid
        if (this._cachedEffects && (now - this._cacheTimestamp) < this.CACHE_DURATION) {
            return this._cachedEffects;
        }

        try {
            const result = await ipcRenderer.invoke('discover-effects');

            if (result.success) {
                this._cachedEffects = result.effects;
                this._cacheTimestamp = now;
                return result.effects;
            } else {
                console.error('Failed to discover effects:', result.error);
                return this._getFallbackEffects();
            }
        } catch (error) {
            console.error('Error fetching available effects:', error);
            return this._getFallbackEffects();
        }
    }

    /**
     * Get effects for a specific category
     * @param {string} category - Effect category (primary, secondary, keyFrame, final)
     * @returns {Promise<Array>} Effects in the specified category
     */
    static async getEffectsByCategory(category) {
        const allEffects = await this.getAvailableEffects();
        return allEffects[category] || [];
    }

    /**
     * Get metadata for a specific effect
     * @param {string} effectName - Name of the effect
     * @param {string} category - Category of the effect
     * @returns {Promise<Object|null>} Effect metadata or null if not found
     */
    static async getEffectMetadata(effectName, category) {
        try {
            const result = await ipcRenderer.invoke('get-effect-metadata', { effectName, category });

            if (result.success) {
                return result.metadata;
            } else {
                console.error('Failed to get effect metadata:', result.error);
                return null;
            }
        } catch (error) {
            console.error('Error fetching effect metadata:', error);
            return null;
        }
    }

    /**
     * Validate that an effect can be loaded
     * @param {Object} effectMetadata - Effect metadata
     * @returns {Promise<boolean>} True if effect is valid
     */
    static async validateEffect(effectMetadata) {
        try {
            const result = await ipcRenderer.invoke('validate-effect', effectMetadata);
            return result.success ? result.isValid : false;
        } catch (error) {
            console.error('Error validating effect:', error);
            return false;
        }
    }

    /**
     * Clear the effects cache to force refresh
     */
    static clearCache() {
        this._cachedEffects = null;
        this._cacheTimestamp = 0;
    }

    /**
     * Get fallback effects if dynamic discovery fails
     * @returns {Object} Fallback effects structure
     */
    static _getFallbackEffects() {
        return {
            primary: [
                {
                    name: 'FuzzFlareEffect',
                    displayName: 'Fuzz Flare',
                    description: 'Creates dynamic energy patterns with customizable colors and animations',
                    configClass: 'FuzzFlareConfig',
                    effectFile: 'my-nft-effects-core/src/effects/primaryEffects/fuzz-flare/FuzzFlareEffect.js',
                    configModule: 'my-nft-effects-core/src/effects/primaryEffects/fuzz-flare/FuzzFlareConfig.js'
                }
            ],
            secondary: [],
            keyFrame: [],
            final: []
        };
    }
}

// Maintain backward compatibility for components that import availableEffects
export const availableEffects = await EffectLibrary.getAvailableEffects();