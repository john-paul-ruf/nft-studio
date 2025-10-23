
import SafeConsole from '../utils/SafeConsole.js';

/**
 * EffectDiscoveryService
 * 
 * Extracted from NftEffectsManager as part of God Object Destruction Plan - Phase 6, Step 6.5
 * 
 * Responsibilities:
 * - Discover available effects from registry
 * - Get available effects for dropdown menus
 * - Serialize effects for IPC transmission
 * - Derive class names from effect names
 * 
 * Single Responsibility: Effect discovery and registry operations
 */

class EffectDiscoveryService {
    constructor(effectRegistryService) {
        this.effectRegistryService = effectRegistryService;
    }

    /**
     * Derive class name from effect name (kebab-case to PascalCase)
     * @param {string} effectName - Effect name (e.g., "red-eye", "hex")
     * @returns {string} Class name (e.g., "RedEye", "Hex")
     */
    deriveClassName(effectName) {
        return effectName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
    }

    /**
     * Get available effects for dropdown menus (simplified version of discoverEffects)
     * @returns {Promise<Object>} Available effects by category
     */
    async getAvailableEffects() {
        try {
            SafeConsole.log('🔍 [EffectDiscoveryService] Getting available effects...');
            const effects = await this.effectRegistryService.getAllEffectsWithConfigs();

            SafeConsole.log('🔍 [EffectDiscoveryService] Raw effects from registry:', {
                primary: effects.primary.length,
                secondary: effects.secondary.length,
                finalImage: effects.finalImage.length
            });

            // Helper function to map effects with plugin source
            const mapEffects = (effectsList) => effectsList.map(plugin => ({
                name: plugin.name,
                registryKey: plugin.name, // Preserve the original registry key
                displayName: plugin.metadata?.displayName || plugin.name,
                description: plugin.metadata?.description || '',
                className: this.deriveClassName(plugin.name),
                configClassName: plugin.configClass ? plugin.configClass.name : (this.deriveClassName(plugin.name) + 'Config'),
                pluginSource: plugin.metadata?.pluginSource || plugin.pluginSource || 'Core Library',
                author: plugin.metadata?.author || plugin.author || 'NFT Studio'
            }));

            // Return primary, secondary, keyFrame, and finalImage effects for the dropdown
            const result = {
                primary: mapEffects(effects.primary),
                secondary: mapEffects(effects.secondary),
                keyFrame: mapEffects(effects.keyFrame),
                finalImage: mapEffects(effects.finalImage)
            };
            
            SafeConsole.log('✅ [EffectDiscoveryService] Returning available effects:', {
                primary: result.primary.length,
                secondary: result.secondary.length,
                keyFrame: result.keyFrame.length,
                finalImage: result.finalImage.length
            });
            
            return result;
        } catch (error) {
            SafeConsole.log('❌ [EffectDiscoveryService] Error getting available effects:', error);
            throw error;
        }
    }

    /**
     * Discover available effects
     * @returns {Promise<Object>} Effects discovery result
     */
    async discoverEffects() {
        try {
            // Use modern plugin registry with linked config classes
            const effects = await this.effectRegistryService.getAllEffectsWithConfigs();

            // Serialize effects to be IPC-safe (remove functions and complex objects)
            const serializedEffects = {};
            for (const [category, categoryEffects] of Object.entries(effects)) {
                serializedEffects[category] = categoryEffects.map(plugin => {
                    // The plugin registry returns plugins with linked config classes
                    const effectName = plugin.name;
                    const className = this.deriveClassName(effectName);
                    const configClassName = plugin.configClass ? plugin.configClass.name : (className + 'Config');

                    return {
                        name: effectName,
                        registryKey: plugin.name, // Add registryKey to match getAvailableEffects() structure
                        displayName: plugin.metadata?.displayName || effectName,
                        description: plugin.metadata?.description || '',
                        category: plugin.category,
                        className: className,
                        configClassName: configClassName,
                        pluginSource: plugin.metadata?.pluginSource || plugin.pluginSource || 'Core Library',
                        author: plugin.metadata?.author || plugin.author || 'NFT Studio'
                    };
                });
            }

            return {
                success: true,
                effects: serializedEffects
            };
        } catch (error) {
            console.error('Error discovering effects:', error);
            return {
                success: false,
                error: error.message,
                effects: null
            };
        }
    }
}

// Export singleton instance
export default EffectDiscoveryService;