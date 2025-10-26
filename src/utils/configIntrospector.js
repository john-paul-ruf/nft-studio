// Use the exposed API from preload script instead of direct electron access
import { safeConsoleError, safeConsoleLog } from './errorFormatter.js';

/**
 * Configuration Introspector
 * Dynamically analyzes effect configuration classes to extract their properties
 */
class ConfigIntrospector {

    /**
     * Analyze a config class and extract all its properties and their types
     * @param {Object} effectMetadata - Effect metadata from discovery
     * @param {Object} projectState - ProjectState instance for resolution context (optional)
     * @returns {Promise<Object>} Schema object with fields
     */
    static async analyzeConfigClass(effectMetadata, projectState = null) {
        try {
            // Use the actual effect name from the registry (name field, not className)
            // The name should match what's registered in the plugin registry
            safeConsoleLog('🔍 Introspecting config for effect:', {
                name: effectMetadata.name,
                className: effectMetadata.className
            });

            // Extract only serializable data needed for IPC from ProjectState
            const projectData = projectState ? {
                targetResolution: projectState.getTargetResolution(),
                isHorizontal: projectState.getIsHorizontal(),
                resolution: projectState.getTargetResolution() // Backward compatibility
            } : null;

            const result = await window.api.introspectConfig({
                effectName: effectMetadata.registryKey, // Use registryKey for consistency
                projectData: projectData
            });

            safeConsoleLog('🔌 Frontend: Backend returned config introspection result:', {
                success: result.success,
                error: result.error,
                hasDefaultInstance: !!result.defaultInstance,
                defaultInstanceKeys: result.defaultInstance ? Object.keys(result.defaultInstance) : [],
                fullResult: result
            });

            if (result.success) {
                // Use the default instance as the source of truth for UI fields
                safeConsoleLog('✅ Frontend: Config introspection successful for:', effectMetadata.registryKey);
                safeConsoleLog('   Default instance properties:', Object.keys(result.defaultInstance));
                safeConsoleLog('   Using default config instance for UI generation:', result.defaultInstance);

                const schema = this.convertDefaultInstanceToSchema(result.defaultInstance);
                safeConsoleLog('   Generated schema fields:', schema.fields.map(f => ({name: f.name, type: f.type})));

                // Keep the default instance for initialization
                schema.defaultInstance = result.defaultInstance;

                return schema;
            } else {
                safeConsoleError(`❌ Frontend: Config introspection failed for ${effectMetadata.registryKey}:`, result.error);
                throw new Error(`Config introspection failed: ${result.error}`);
            }
        } catch (error) {
            safeConsoleError('Error analyzing config class:', error);
            throw error;
        }
    }

    /**
     * Convert default config instance directly to UI schema
     * @param {Object} defaultInstance - Default config instance from constructor
     * @returns {Object} UI schema
     */
    static convertDefaultInstanceToSchema(defaultInstance) {
        const fields = [];

        for (const [name, value] of Object.entries(defaultInstance)) {
            // Skip metadata properties that shouldn't be editable
            if (name.startsWith('__') && name.endsWith('__')) {
                safeConsoleLog(`Skipping metadata property: ${name}`);
                continue;
            }
            if (name === '__className') {
                safeConsoleLog(`Skipping __className metadata property`);
                continue;
            }

            // Create field directly from the default instance value
            const field = this.convertValueToField(name, value);
            fields.push(field);
        }

        safeConsoleLog(`Generated ${fields.length} UI fields from default config instance`);
        return { fields };
    }

    /**
     * Convert introspected properties to UI schema (legacy method for backward compatibility)
     * @param {Object} properties - Properties from introspection
     * @returns {Object} UI schema
     */
    static convertToSchema(properties) {
        const fields = [];

        for (const [name, property] of Object.entries(properties)) {
            // NEVER skip any property - every property must have a UI field
            const field = this.convertPropertyToField(name, property);
            fields.push(field);
        }

        safeConsoleLog(`Generated ${fields.length} UI fields from ${Object.keys(properties).length} properties`);
        return { fields };
    }

    /**
     * Convert a default value directly to a UI field definition
     * @param {string} name - Property name
     * @param {*} value - Default value from config instance
     * @returns {Object} Field definition
     */
    static convertValueToField(name, value) {
        const field = {
            name,
            label: this.generateLabel(name),
            default: value
        };

        const type = typeof value;
        // Check for preserved className metadata first, then fall back to constructor name
        const className = (value && typeof value === 'object' && value.__className) ||
                         (value && typeof value === 'object' && value.constructor ? value.constructor.name : null);

        // Check if property name represents a color value - treat as color picker
        // Only match properties that are actually color values, not properties like "colorMode"
        const nameLower = name.toLowerCase();
        const isColorProperty = (
            // Exact matches: "color" or "colour"
            nameLower === 'color' || nameLower === 'colour' ||
            // Ends with "Color" or "Colour": backgroundColor, strokeColor, etc.
            nameLower.endsWith('color') || nameLower.endsWith('colour')
        ) && (
            // Exclude properties that end with "Mode" or other non-color suffixes
            !nameLower.endsWith('mode') && 
            !nameLower.endsWith('type') && 
            !nameLower.endsWith('style')
        );
        
        if (isColorProperty) {
            return {
                ...field,
                type: 'colorpicker',
                bucketType: 'color-bucket',
                label: field.label
            };
        }

        // Handle functions - show as readonly
        if (type === 'function') {
            return {
                ...field,
                type: 'readonly',
                default: '[Function]',
                label: field.label + ' (Function)'
            };
        }

        // Handle undefined - show as readonly
        if (type === 'undefined' || value === null) {
            return {
                ...field,
                type: 'readonly',
                default: value === null ? '[Null]' : '[Undefined]',
                label: field.label + ' (Undefined)'
            };
        }

        // Handle inaccessible properties - show as readonly
        if (type === 'inaccessible') {
            return {
                ...field,
                type: 'readonly',
                default: '[Inaccessible]',
                label: field.label + ' (Inaccessible)'
            };
        }

        // Handle arrays
        if (Array.isArray(value)) {
            // Check if it's a MultiStep array (contains objects with minPercentage, maxPercentage, etc.)
            if (value.length > 0 && value[0] && typeof value[0] === 'object' &&
                'minPercentage' in value[0] && 'maxPercentage' in value[0] &&
                'max' in value[0] && 'times' in value[0] && 'type' in value[0]) {
                return {
                    ...field,
                    type: 'multistep',
                    label: field.label + ' Timeline'
                };
            }

            // Check if it's a FindValueAlgorithm array
            if (name.toLowerCase().includes('algorithm') || name.toLowerCase().includes('findvalue')) {
                return {
                    ...field,
                    type: 'findvaluealgorithm',
                    label: field.label + ' Algorithms'
                };
            }

            // Check if it's a strategy array (contains string options)
            if (nameLower.includes('strategy') && value.length > 0 && typeof value[0] === 'string') {
                return {
                    ...field,
                    type: 'multiselect',
                    options: value,
                    label: field.label + ' Options'
                };
            }

            // Check if it's a sparsity factor or similar numeric array
            if (nameLower.includes('sparsity') || nameLower.includes('factor')) {
                return {
                    ...field,
                    type: 'sparsityfactor',
                    label: field.label + ' (Divisors of 360)'
                };
            }

            // All other arrays as JSON
            return {
                ...field,
                type: 'json',
                label: field.label + ' (Array)'
            };
        }

        // Handle primitive types
        switch (type) {
            case 'boolean':
                return {
                    ...field,
                    type: 'boolean'
                };

            case 'number':
                // Handle specific numeric field types
                // Stroke and thickness should be regular numbers (0-20 range)
                if (nameLower.includes('stroke') || nameLower.includes('thickness')) {
                    return {
                        ...field,
                        type: 'number',
                        min: 0,
                        max: 20,
                        step: 1
                    };
                }

                // Opacity fields should be percentages (0-1 range with 0.01 step)
                if (nameLower.includes('opacity')) {
                    return {
                        ...field,
                        type: 'number',
                        min: 0,
                        max: 1,
                        step: 0.01
                    };
                }

                // Default number handling
                return {
                    ...field,
                    type: 'number',
                    min: 0,
                    max: 100,
                    step: 1
                };

            case 'string':
                return {
                    ...field,
                    type: 'text'
                };

            case 'object':
                // Handle known object types by their constructor name
                if (className) {
                    switch (className) {
                        case 'ColorPicker':
                            return {
                                ...field,
                                type: 'colorpicker',
                                bucketType: 'color-bucket'
                            };

                        case 'Range':
                            return {
                                ...field,
                                type: 'range',
                                min: 1,
                                max: 100,
                                label: field.label + ' Range'
                            };

                        case 'PercentageRange':
                            // Handle PercentageRange objects that may have function getters
                            let defaultValue = value;
                            if (value && typeof value.lower === 'function' && typeof value.upper === 'function') {
                                // Convert function getters to actual values for UI
                                try {
                                    defaultValue = {
                                        lower: value.lower(),
                                        upper: value.upper()
                                    };
                                } catch (e) {
                                    // If functions fail, use safe defaults
                                    defaultValue = { lower: 0.1, upper: 0.9 };
                                }
                            } else if (value && (value.lower === '[Function]' || value.upper === '[Function]')) {
                                // After IPC serialization, functions become "[Function]" strings
                                safeConsoleLog('PercentageRange with serialized functions, using defaults');
                                defaultValue = { lower: 0.1, upper: 0.9 };
                            } else if (value && value.__className) {
                                // Remove className metadata from the default value
                                const { __className, ...cleanValue } = value;
                                defaultValue = cleanValue;
                            }
                            return {
                                ...field,
                                type: 'percentagerange',
                                default: defaultValue,
                                label: field.label + ' Range'
                            };

                        case 'Point2D':
                            return {
                                ...field,
                                type: 'point2d',
                                label: field.label + ' Position'
                            };

                        case 'Position':
                            return {
                                ...field,
                                type: 'position',
                                label: field.label + ' Position'
                            };

                        case 'ArcPath':
                            return {
                                ...field,
                                type: 'arc-path',
                                label: field.label + ' Arc Path'
                            };

                        case 'DynamicRange':
                            return {
                                ...field,
                                type: 'dynamicrange',
                                label: field.label + ' Dynamic Range'
                            };

                        case 'PercentageShortestSide':
                        case 'PercentageLongestSide':
                            return {
                                ...field,
                                type: 'percentage',
                                default: value.percent || value.value || value.percentage || 0.5,
                                label: field.label + ' Percentage'
                            };

                        default:
                            // For objects without a clear class name, fall back to structure-based detection
                            // But this should be rare since most objects should have proper class names

                            // Check for Point2D structure (x, y properties)
                            if (value.hasOwnProperty('x') && value.hasOwnProperty('y') &&
                                typeof value.x === 'number' && typeof value.y === 'number') {
                                safeConsoleLog(`Detected Point2D structure for field: ${name}`, value);

                                // For center-like properties, default to position type
                                const isCenter = name.toLowerCase().includes('center') ||
                                               name.toLowerCase().includes('position') ||
                                               name.toLowerCase().includes('point');

                                if (isCenter) {
                                    return {
                                        ...field,
                                        type: 'position',
                                        label: field.label + ' Position'
                                    };
                                } else {
                                    return {
                                        ...field,
                                        type: 'point2d',
                                        label: field.label + ' Position'
                                    };
                                }
                            }

                            if (value.hasOwnProperty('lower') && value.hasOwnProperty('upper')) {
                                // Default to regular range - class-based detection should handle most cases
                                return {
                                    ...field,
                                    type: 'range',
                                    min: 0,
                                    max: name.includes('opacity') || name.includes('Opacity') ? 1 : 100,
                                    step: name.includes('opacity') || name.includes('Opacity') ? 0.01 : 1,
                                    label: field.label + ' Range'
                                };
                            }
                            if (value.hasOwnProperty('x') && value.hasOwnProperty('y')) {
                                return {
                                    ...field,
                                    type: 'point2d'
                                };
                            }
                            // Dynamic range structure
                            if (value.hasOwnProperty('bottom') && value.hasOwnProperty('top')) {
                                return {
                                    ...field,
                                    type: 'dynamicrange',
                                    label: field.label + ' Dynamic Range'
                                };
                            }
                            break;
                    }
                }

                // Final fallback: Check for Point2D structure even without className
                if (value.hasOwnProperty('x') && value.hasOwnProperty('y') &&
                    typeof value.x === 'number' && typeof value.y === 'number') {
                    safeConsoleLog(`Fallback detected Point2D structure for field: ${name}`, value);

                    // For center-like properties, default to position type
                    const isCenter = name.toLowerCase().includes('center') ||
                                   name.toLowerCase().includes('position') ||
                                   name.toLowerCase().includes('point');

                    if (isCenter) {
                        return {
                            ...field,
                            type: 'position',
                            label: field.label + ' Position'
                        };
                    } else {
                        return {
                            ...field,
                            type: 'point2d',
                            label: field.label + ' Position'
                        };
                    }
                }

                // Default to JSON for unknown objects
                return {
                    ...field,
                    type: 'json',
                    label: field.label + ' (Object)'
                };

            default:
                // Default everything else to JSON
                return {
                    ...field,
                    type: 'json',
                    label: field.label + ` (${type})`
                };
        }
    }

    /**
     * Convert a single property to a UI field definition (legacy method)
     * @param {string} name - Property name
     * @param {Object} property - Property definition
     * @returns {Object} Field definition (never null - all properties must be mapped)
     */
    static convertPropertyToField(name, property) {
        const { type, value, className } = property;

        const field = {
            name,
            label: this.generateLabel(name)
        };

        // Check if property name represents a color value - treat as color picker
        // Only match properties that are actually color values, not properties like "colorMode"
        const nameLower = name.toLowerCase();
        const isColorProperty = (
            // Exact matches: "color" or "colour"
            nameLower === 'color' || nameLower === 'colour' ||
            // Ends with "Color" or "Colour": backgroundColor, strokeColor, etc.
            nameLower.endsWith('color') || nameLower.endsWith('colour')
        ) && (
            // Exclude properties that end with "Mode" or other non-color suffixes
            !nameLower.endsWith('mode') && 
            !nameLower.endsWith('type') && 
            !nameLower.endsWith('style')
        );
        
        if (isColorProperty) {
            return {
                ...field,
                type: 'colorpicker',
                bucketType: 'color-bucket',
                default: value,
                label: field.label
            };
        }

        // Handle functions - show as readonly
        if (type === 'function') {
            return {
                ...field,
                type: 'readonly',
                default: '[Function]',
                label: field.label + ' (Function)'
            };
        }

        // Handle undefined - show as readonly
        if (type === 'undefined') {
            return {
                ...field,
                type: 'readonly',
                default: '[Undefined]',
                label: field.label + ' (Undefined)'
            };
        }

        // Handle special array types
        if (Array.isArray(value)) {
            // Check if it's a FindValueAlgorithm array
            if (name.toLowerCase().includes('algorithm') || name.toLowerCase().includes('findvalue')) {
                return {
                    ...field,
                    type: 'findvaluealgorithm',
                    default: value,
                    label: field.label + ' Algorithms'
                };
            }

            // Handle complex arrays as JSON (no skipping)
            if (value.length > 0 && typeof value[0] === 'object' && value[0].constructor.name !== 'Object') {
                return {
                    ...field,
                    type: 'json',
                    default: value,
                    label: field.label + ' (Complex Array)',
                    warning: 'Complex object array - edit with care'
                };
            }

            // Simple arrays get JSON treatment
            return {
                ...field,
                type: 'json',
                default: value,
                label: field.label + ' (Array)'
            };
        }

        // Handle different property types - prefer specific UI types but fallback to JSON
        switch (type) {
            case 'boolean':
                return {
                    ...field,
                    type: 'boolean',
                    default: value
                };

            case 'number':
                // Handle specific numeric field types
                // Stroke and thickness should be regular numbers (0-20 range)
                if (nameLower.includes('stroke') || nameLower.includes('thickness')) {
                    return {
                        ...field,
                        type: 'number',
                        default: value,
                        min: 0,
                        max: 20,
                        step: 1
                    };
                }

                // Opacity fields should be percentages (0-1 range with 0.01 step)
                if (nameLower.includes('opacity')) {
                    return {
                        ...field,
                        type: 'number',
                        default: value,
                        min: 0,
                        max: 1,
                        step: 0.01
                    };
                }

                // Default number handling
                return {
                    ...field,
                    type: 'number',
                    default: value,
                    min: 0,
                    max: 100,
                    step: 1
                };

            case 'string':
                return {
                    ...field,
                    type: 'text',
                    default: value
                };

            case 'object':
                // Try to use specific UI components, but fall back to JSON for unknown objects
                const objectField = this.handleObjectProperty(field, property, name);
                if (objectField.type === 'json') {
                    // Already handled as JSON
                    return objectField;
                }
                return objectField;

            default:
                // Default everything else to JSON for complete coverage
                return {
                    ...field,
                    type: 'json',
                    default: value,
                    label: field.label + ` (${type})`
                };
        }
    }

    /**
     * Handle object properties (Range, ColorPicker, Point2D, etc.)
     * @param {Object} field - Base field definition
     * @param {Object} property - Property definition
     * @param {string} name - Property name
     * @returns {Object} Field definition
     */
    static handleObjectProperty(field, property, name) {
        const { className, value } = property;

        if (className) {
            switch (className) {
                case 'ColorPicker':
                    return {
                        ...field,
                        type: 'colorpicker',
                        bucketType: 'color-bucket',
                        default: value
                    };

                case 'Range':
                    return {
                        ...field,
                        type: 'range',
                        min: 1,
                        max: 100,
                        default: value,
                        label: field.label + ' Range'
                    };

                case 'PercentageRange':
                    // Handle PercentageRange objects that may have function getters
                    let defaultValue = value;
                    if (value && typeof value.lower === 'function' && typeof value.upper === 'function') {
                        // Convert function getters to actual values for UI
                        try {
                            defaultValue = {
                                lower: value.lower(),
                                upper: value.upper()
                            };
                        } catch (e) {
                            // If functions fail, use safe defaults
                            defaultValue = { lower: 0.1, upper: 0.9 };
                        }
                    } else if (value && value.__className) {
                        // Remove className metadata from the default value
                        const { __className, ...cleanValue } = value;
                        defaultValue = cleanValue;
                    }
                    return {
                        ...field,
                        type: 'percentagerange',
                        default: defaultValue,
                        label: field.label + ' Range'
                    };

                case 'Point2D':
                    return {
                        ...field,
                        type: 'point2d',
                        default: value,
                        label: field.label + ' Position'
                    };

                case 'DynamicRange':
                    return {
                        ...field,
                        type: 'dynamicrange',
                        default: value,
                        label: field.label + ' Dynamic Range'
                    };

                case 'PercentageShortestSide':
                case 'PercentageLongestSide':
                    return {
                        ...field,
                        type: 'percentage',
                        default: value.value || value.percentage || 0.5,
                        label: field.label + ' Percentage'
                    };

                default:
                    // All core configs are standardized to use correct types
                    // If we reach here, it's an unknown object type - default to JSON
                    break;
            }
        }

        // Default object handling
        return {
            ...field,
            type: 'json',
            default: value,
            label: field.label + ' (Object)'
        };
    }

    /**
     * Generate a human-readable label from property name
     * @param {string} name - Property name
     * @returns {string} Human-readable label
     */
    static generateLabel(name) {
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

}

export { ConfigIntrospector };
export default ConfigIntrospector;