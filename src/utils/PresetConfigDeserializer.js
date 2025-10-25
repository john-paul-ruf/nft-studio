/**
 * PresetConfigDeserializer
 * 
 * Utility for deserializing preset configurations received from the main process.
 * CRITICAL: Preserves __type metadata for proper class reconstruction in main process.
 * 
 * Data flow:
 * 1. Main process serializes configs with __type metadata (EffectRegistryService._serializeConfig)
 * 2. Configs are sent via IPC to renderer
 * 3. Renderer displays config in form inputs (which ignore __type property)
 * 4. When preset is applied, config (WITH __type) is sent back to main process
 * 5. Main process deserializes using __type to reconstruct class instances (e.g., ColorPicker)
 * 
 * IMPORTANT: The __type metadata MUST be preserved throughout this flow, otherwise
 * class instances cannot be properly reconstructed, leading to "getColor is not a function"
 * and similar errors.
 * 
 * Single Responsibility: Normalize config structure while preserving __type metadata
 */

class PresetConfigDeserializer {
    /**
     * Deserialize a preset configuration, removing __type metadata and converting to plain objects
     * @param {Object} config - Configuration object with potential __type metadata
     * @returns {Object} Plain object suitable for form inputs
     */
    static deserialize(config) {
        if (!config || typeof config !== 'object') {
            return config;
        }

        // Handle arrays
        if (Array.isArray(config)) {
            return config.map(item => this.deserialize(item));
        }

        // Handle objects with __type metadata
        if (config.__type) {
            return this._deserializeTypedObject(config);
        }

        // Recursively deserialize nested objects
        const result = {};
        for (const [key, value] of Object.entries(config)) {
            result[key] = this.deserialize(value);
        }

        return result;
    }

    /**
     * Deserialize an object with __type metadata
     * CRITICAL: Preserves __type metadata for proper reconstruction in main process
     * @param {Object} obj - Object with __type property
     * @returns {Object} Plain object WITH __type preserved
     * @private
     */
    static _deserializeTypedObject(obj) {
        const { __type, ...props } = obj;

        switch (__type) {
            case 'PercentageRange':
                // Convert to plain object with lower/upper structure
                console.log('[PresetConfigDeserializer] Deserializing PercentageRange:', {
                    originalObj: obj,
                    props,
                    hasLower: !!props.lower,
                    hasUpper: !!props.upper,
                    lowerValue: props.lower,
                    upperValue: props.upper,
                    functionsDetected: props._functionsDetected
                });
                
                // If functions were detected during serialization, use default values
                if (props._functionsDetected || props.lower === null || props.upper === null) {
                    console.log('[PresetConfigDeserializer] PercentageRange had functions, using default values');
                    const result = {
                        __type: 'PercentageRange',
                        lower: { __type: 'PercentageShortestSide', percent: 0.5, side: 'shortest' },
                        upper: { __type: 'PercentageLongestSide', percent: 0.5, side: 'longest' }
                    };
                    console.log('[PresetConfigDeserializer] PercentageRange result (defaults):', result);
                    return result;
                }
                
                const result = {
                    __type: 'PercentageRange',
                    lower: this.deserialize(props.lower),
                    upper: this.deserialize(props.upper)
                };
                console.log('[PresetConfigDeserializer] PercentageRange result:', result);
                return result;

            case 'PercentageShortestSide':
            case 'PercentageLongestSide':
                // Convert to plain object with percent and side, PRESERVE __type
                return {
                    __type,
                    percent: props.percent ?? 0.5,
                    side: __type === 'PercentageShortestSide' ? 'shortest' : 'longest'
                };

            case 'Range':
                // Convert to plain object with lower/upper, PRESERVE __type
                return {
                    __type: 'Range',
                    lower: props.lower ?? 0,
                    upper: props.upper ?? 1
                };

            case 'DynamicRange':
                // Convert to plain object with bottom/top, PRESERVE __type
                return {
                    __type: 'DynamicRange',
                    bottom: this.deserialize(props.bottom),
                    top: this.deserialize(props.top)
                };

            case 'Point2D':
                // Convert to plain object with x/y, PRESERVE __type
                return {
                    __type: 'Point2D',
                    x: props.x ?? 0,
                    y: props.y ?? 0
                };

            case 'position':
                // Position objects need the 'name' property for PositionScaler to recognize them
                return {
                    name: 'position',
                    x: props.x ?? 0,
                    y: props.y ?? 0
                };

            case 'arc-path':
                // Arc path objects need the 'name' property for PositionScaler to recognize them
                return {
                    name: 'arc-path',
                    center: {
                        x: props.center?.x ?? 0,
                        y: props.center?.y ?? 0
                    },
                    radius: props.radius ?? 100,
                    startAngle: props.startAngle ?? 0,
                    endAngle: props.endAngle ?? 360,
                    direction: props.direction ?? 1
                };

            case 'ColorPicker':
                // CRITICAL: Preserve __type so main process can reconstruct ColorPicker instance
                return {
                    __type: 'ColorPicker',
                    selectionType: props.selectionType ?? 'single',
                    colorValue: props.colorValue ?? '#000000'
                };

            default:
                // Unknown type - preserve __type and recursively deserialize properties
                console.warn(`[PresetConfigDeserializer] Unknown __type: ${__type}, preserving for reconstruction`);
                const unknownResult = { __type };
                for (const [key, value] of Object.entries(props)) {
                    unknownResult[key] = this.deserialize(value);
                }
                return unknownResult;
        }
    }
}

export default PresetConfigDeserializer;