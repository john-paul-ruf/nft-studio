const { ipcRenderer } = window.require('electron');

/**
 * Configuration Introspector
 * Dynamically analyzes effect configuration classes to extract their properties
 */
export class ConfigIntrospector {

    /**
     * Analyze a config class and extract all its properties and their types
     * @param {Object} effectMetadata - Effect metadata from discovery
     * @returns {Promise<Object>} Schema object with fields
     */
    static async analyzeConfigClass(effectMetadata) {
        try {
            // Create an instance of the config class to introspect its properties
            const result = await ipcRenderer.invoke('introspect-config', {
                configModule: effectMetadata.configModule,
                configClass: effectMetadata.configClass
            });

            if (result.success) {
                const schema = this.convertToSchema(result.properties);

                // Also include the default instance for proper initialization
                schema.defaultInstance = result.defaultInstance;

                return schema;
            } else {
                console.error('Config introspection failed:', result.error);
                return this.getFallbackSchema(effectMetadata.configClass);
            }
        } catch (error) {
            console.error('Error analyzing config class:', error);
            return this.getFallbackSchema(effectMetadata.configClass);
        }
    }

    /**
     * Convert introspected properties to UI schema
     * @param {Object} properties - Properties from introspection
     * @returns {Object} UI schema
     */
    static convertToSchema(properties) {
        const fields = [];

        for (const [name, property] of Object.entries(properties)) {
            const field = this.convertPropertyToField(name, property);
            if (field) {
                fields.push(field);
            }
        }

        return { fields };
    }

    /**
     * Convert a single property to a UI field definition
     * @param {string} name - Property name
     * @param {Object} property - Property definition
     * @returns {Object|null} Field definition or null if not supported
     */
    static convertPropertyToField(name, property) {
        const { type, value, className } = property;

        // Skip functions and complex objects we can't handle
        if (type === 'function' || type === 'undefined') {
            return null;
        }

        const field = {
            name,
            label: this.generateLabel(name)
        };

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

            // Skip other complex arrays for now (like elementGastonMultiStep)
            if (value.length > 0 && typeof value[0] === 'object' && value[0].constructor.name !== 'Object') {
                console.log(`Skipping complex array field: ${name}`);
                return null;
            }
        }

        // Handle different property types
        switch (type) {
            case 'boolean':
                return {
                    ...field,
                    type: 'boolean',
                    default: value
                };

            case 'number':
                return {
                    ...field,
                    type: 'number',
                    default: value,
                    min: 0,
                    max: name.includes('opacity') || name.includes('Opacity') ? 1 : 100,
                    step: name.includes('opacity') || name.includes('Opacity') ? 0.01 : 1
                };

            case 'string':
                return {
                    ...field,
                    type: 'text',
                    default: value
                };

            case 'object':
                return this.handleObjectProperty(field, property, name);

            default:
                return {
                    ...field,
                    type: 'text',
                    default: String(value),
                    readonly: true
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
                        bucketType: 'colorBucket',
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
                    return {
                        ...field,
                        type: 'percentagerange',
                        default: value,
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
                    // For unknown classes, try to handle as object with properties
                    if (value && typeof value === 'object') {
                        // Check for dynamic range structure (bottom/top with lower/upper)
                        if (value.hasOwnProperty('bottom') && value.hasOwnProperty('top') &&
                            value.bottom && value.top &&
                            value.bottom.hasOwnProperty('lower') && value.bottom.hasOwnProperty('upper') &&
                            value.top.hasOwnProperty('lower') && value.top.hasOwnProperty('upper')) {
                            return {
                                ...field,
                                type: 'dynamicrange',
                                default: value,
                                label: field.label + ' Dynamic Range'
                            };
                        }
                        if (value.hasOwnProperty('lower') && value.hasOwnProperty('upper')) {
                            return {
                                ...field,
                                type: 'range',
                                min: 0,
                                max: name.includes('opacity') || name.includes('Opacity') ? 1 : 100,
                                default: value,
                                step: name.includes('opacity') || name.includes('Opacity') ? 0.01 : 1
                            };
                        }
                        if (value.hasOwnProperty('x') && value.hasOwnProperty('y')) {
                            return {
                                ...field,
                                type: 'point2d',
                                default: value
                            };
                        }
                    }
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

    /**
     * Get fallback schema for known effect types
     * @param {string} configClass - Config class name
     * @returns {Object} Fallback schema
     */
    static getFallbackSchema(configClass) {
        const commonFields = [
            {
                name: 'layerOpacity',
                type: 'percentage',
                default: 0.7,
                label: 'Layer Opacity'
            },
            {
                name: 'center',
                type: 'point2d',
                default: { x: 540, y: 960 },
                label: 'Center Point'
            }
        ];

        // Add specific fields based on config class type
        if (configClass.includes('Flare') || configClass.includes('Eye')) {
            commonFields.push(
                {
                    name: 'innerColor',
                    type: 'colorpicker',
                    bucketType: 'colorBucket',
                    label: 'Inner Color'
                },
                {
                    name: 'outerColor',
                    type: 'colorpicker',
                    bucketType: 'colorBucket',
                    label: 'Outer Color'
                }
            );
        }

        return { fields: commonFields };
    }
}