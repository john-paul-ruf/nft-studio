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
                else if (typeof value.lower === 'function' && typeof value.upper === 'function') {
                    try {
                        const lowerResult = value.lower();
                        const upperResult = value.upper();

                        if (lowerResult && typeof lowerResult === 'object' &&
                            'percent' in lowerResult && 'side' in lowerResult) {
                            serialized[key] = {
                                __className: 'PercentageRange',
                                lower: {
                                    __className: lowerResult.side === 'shortest' ? 'PercentageShortestSide' : 'PercentageLongestSide',
                                    percent: lowerResult.percent,
                                    side: lowerResult.side
                                },
                                upper: {
                                    __className: upperResult.side === 'shortest' ? 'PercentageShortestSide' : 'PercentageLongestSide',
                                    percent: upperResult.percent,
                                    side: upperResult.side
                                }
                            };
                        } else {
                            serialized[key] = {
                                lower: lowerResult,
                                upper: upperResult
                            };
                        }
                    } catch (error) {
                        console.warn(`⚠️ Failed to serialize range object ${key}:`, error.message);
                        if (typeof value.lowerValue === 'number' && typeof value.upperValue === 'number') {
                            serialized[key] = {
                                lower: value.lowerValue,
                                upper: value.upperValue
                            };
                        } else {
                            serialized[key] = this.serializeConfigForIPC(value);
                        }
                    }
                }
                else if (value.__type === 'ColorPicker' || value.__className === 'ColorPicker') {
                    serialized[key] = {
                        selectionType: value.selectionType || 'color-bucket',
                        colorValue: value.colorValue || null,
                        __className: 'ColorPicker'
                    };
                }
                else if (value.__type === 'PercentageRange' || value.__className === 'PercentageRange' ||
                         (value.lower && typeof value.lower === 'object' && 'percent' in value.lower && 'side' in value.lower &&
                          value.upper && typeof value.upper === 'object' && 'percent' in value.upper && 'side' in value.upper)) {
                    const lower = value.lower || {};
                    const upper = value.upper || {};
                    serialized[key] = {
                        __className: 'PercentageRange',
                        lower: {
                            __className: (lower.side || 'shortest') === 'shortest' ? 'PercentageShortestSide' : 'PercentageLongestSide',
                            percent: lower.percent ?? 0.5,
                            side: lower.side || 'shortest'
                        },
                        upper: {
                            __className: (upper.side || 'longest') === 'shortest' ? 'PercentageShortestSide' : 'PercentageLongestSide',
                            percent: upper.percent ?? 0.5,
                            side: upper.side || 'longest'
                        }
                    };
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
                })),
                // Also serialize keyframe effects if they exist
                keyframeEffects: effect.keyframeEffects?.map(keyframeEffect => ({
                    ...keyframeEffect,
                    config: this.serializeConfigForIPC(keyframeEffect.config)
                }))
            }))
        };
    }
}

// Export singleton instance
export default new IPCSerializationService();