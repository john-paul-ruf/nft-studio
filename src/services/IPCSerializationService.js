/**
 * IPCSerializationService
 * 
 * Extracted from SettingsToProjectConverter as part of God Object Destruction Plan - Phase 6, Step 6.4
 * 
 * Responsibilities:
 * - Serialize config objects for IPC transmission
 * - Handle ColorPicker object serialization
 * - Handle range object serialization
 * - Remove non-cloneable properties (methods)
 * - Serialize entire projects with all effects
 * 
 * Single Responsibility: IPC serialization
 */

class IPCSerializationService {
    /**
     * Serialize config objects to remove non-cloneable properties (methods) for IPC
     * @param {Object} config - Config object to serialize
     * @returns {Object} Serialized config safe for IPC
     */
    serializeConfigForIPC(config) {
        if (!config || typeof config !== 'object') {
            return config;
        }

        const serialized = {};
        for (const [key, value] of Object.entries(config)) {
            if (typeof value === 'function') {
                // Skip functions - they can't be serialized
                continue;
            } else if (value && typeof value === 'object') {
                // Handle ColorPicker objects specially
                if (typeof value.getColor === 'function') {
                    // This is a ColorPicker - serialize its properties
                    serialized[key] = {
                        selectionType: value.selectionType || 'colorBucket',
                        colorValue: value.colorValue || null,
                        __className: 'ColorPicker'
                    };
                }
                // Recursively serialize nested objects, but extract values from method objects
                else if (typeof value.lower === 'function' && typeof value.upper === 'function') {
                    // Range object - safely extract the actual values
                    try {
                        serialized[key] = {
                            lower: value.lower(),
                            upper: value.upper()
                        };
                    } catch (error) {
                        console.warn(`⚠️ Failed to serialize range object ${key}:`, error.message);
                        // Fallback: try to extract raw numeric properties if methods fail
                        if (typeof value.lowerValue === 'number' && typeof value.upperValue === 'number') {
                            serialized[key] = {
                                lower: value.lowerValue,
                                upper: value.upperValue
                            };
                        } else {
                            // Last resort: serialize as regular object
                            serialized[key] = this.serializeConfigForIPC(value);
                        }
                    }
                } else {
                    // Regular object - recursively serialize
                    serialized[key] = this.serializeConfigForIPC(value);
                }
            } else {
                // Primitive values are safe
                serialized[key] = value;
            }
        }
        return serialized;
    }

    /**
     * Serialize all effect configs in a project for IPC transmission
     * @param {Object} project - Project data with effects
     * @returns {Object} Project with serialized configs
     */
    serializeProjectForIPC(project) {
        if (!project || !project.effects) {
            return project;
        }

        return {
            ...project,
            effects: project.effects.map(effect => ({
                ...effect,
                config: this.serializeConfigForIPC(effect.config),
                // Also serialize secondary effects if they exist
                secondaryEffects: effect.secondaryEffects?.map(secEffect => ({
                    ...secEffect,
                    config: this.serializeConfigForIPC(secEffect.config)
                }))
            }))
        };
    }
}

// Export singleton instance
export default new IPCSerializationService();