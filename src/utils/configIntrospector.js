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
            // Create an instance of the config class with default constructor to get defaults
            const result = await ipcRenderer.invoke('introspect-config', {
                configModule: effectMetadata.configModule,
                configClass: effectMetadata.configClass
            });

            if (result.success) {
                // Use the default instance as the source of truth for UI fields
                console.log('Config introspection result:', result);
                console.log('Default instance properties:', Object.keys(result.defaultInstance));
                console.log('Using default config instance for UI generation:', result.defaultInstance);

                const schema = this.convertDefaultInstanceToSchema(result.defaultInstance);
                console.log('Generated schema fields:', schema.fields.map(f => ({name: f.name, type: f.type})));

                // Keep the default instance for initialization
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
     * Convert default config instance directly to UI schema
     * @param {Object} defaultInstance - Default config instance from constructor
     * @returns {Object} UI schema
     */
    static convertDefaultInstanceToSchema(defaultInstance) {
        const fields = [];

        for (const [name, value] of Object.entries(defaultInstance)) {
            // Create field directly from the default instance value
            const field = this.convertValueToField(name, value);
            fields.push(field);
        }

        console.log(`Generated ${fields.length} UI fields from default config instance`);
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

        console.log(`Generated ${fields.length} UI fields from ${Object.keys(properties).length} properties`);
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
        const className = value && typeof value === 'object' && value.constructor ? value.constructor.name : null;

        // Check if property name contains "color" or "Color" - treat as color picker
        const nameLower = name.toLowerCase();
        if (nameLower.includes('color') || nameLower.includes('colour')) {
            return {
                ...field,
                type: 'colorpicker',
                bucketType: 'colorBucket',
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
            // Check if it's a FindValueAlgorithm array
            if (name.toLowerCase().includes('algorithm') || name.toLowerCase().includes('findvalue')) {
                return {
                    ...field,
                    type: 'findvaluealgorithm',
                    label: field.label + ' Algorithms'
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
                return {
                    ...field,
                    type: 'number',
                    min: 0,
                    max: name.includes('opacity') || name.includes('Opacity') ? 1 : 100,
                    step: name.includes('opacity') || name.includes('Opacity') ? 0.01 : 1
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
                                bucketType: 'colorBucket'
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
                            return {
                                ...field,
                                type: 'percentagerange',
                                label: field.label + ' Range'
                            };

                        case 'Point2D':
                            return {
                                ...field,
                                type: 'point2d',
                                label: field.label + ' Position'
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
                                default: value.value || value.percentage || 0.5,
                                label: field.label + ' Percentage'
                            };

                        default:
                            // Check for common object structures
                            if (value.hasOwnProperty('lower') && value.hasOwnProperty('upper')) {
                                return {
                                    ...field,
                                    type: 'range',
                                    min: 0,
                                    max: name.includes('opacity') || name.includes('Opacity') ? 1 : 100,
                                    step: name.includes('opacity') || name.includes('Opacity') ? 0.01 : 1
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

        // Check if property name contains "color" or "Color" - treat as color picker
        const nameLower = name.toLowerCase();
        if (nameLower.includes('color') || nameLower.includes('colour')) {
            return {
                ...field,
                type: 'colorpicker',
                bucketType: 'colorBucket',
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