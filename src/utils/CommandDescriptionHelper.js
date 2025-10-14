/**
 * CommandDescriptionHelper - Generates detailed, human-readable descriptions for commands
 */

class CommandDescriptionHelper {
    /**
     * Generate a detailed description of property changes between two objects
     */
    static describePropertyChanges(oldObj, newObj, effectName) {
        const changes = [];

        // Include ID in the effect name
        const effectWithId = this.getEffectName(newObj || oldObj);

        // Check for visibility changes
        if (oldObj?.visible !== newObj?.visible) {
            return `${newObj.visible === false ? 'Hid' : 'Showed'} ${effectWithId}`;
        }

        // Check for config changes
        if (oldObj?.config && newObj?.config) {
            const configChanges = this.diffConfig(oldObj.config, newObj.config);
            if (configChanges.length > 0) {
                if (configChanges.length === 1) {
                    return `Changed ${configChanges[0]} in ${effectWithId}`;
                } else if (configChanges.length <= 3) {
                    return `Changed ${configChanges.join(', ')} in ${effectWithId}`;
                } else {
                    return `Changed ${configChanges.length} properties in ${effectWithId}`;
                }
            }
        }

        // Check for secondary effects changes
        const oldSecondaryCount = oldObj?.secondaryEffects?.length || 0;
        const newSecondaryCount = newObj?.secondaryEffects?.length || 0;

        if (oldSecondaryCount !== newSecondaryCount) {
            if (newSecondaryCount > oldSecondaryCount) {
                const addedEffect = newObj.secondaryEffects[newSecondaryCount - 1];
                const addedName = this.getEffectName(addedEffect);
                return `Added ${addedName} to ${effectWithId}`;
            } else {
                return `Removed secondary effect from ${effectWithId}`;
            }
        }

        // Check for keyframe effects changes (use new keyframeEffects property with backward compatibility)
        const oldKeyframeCount = oldObj?.keyframeEffects?.length || oldObj?.attachedEffects?.keyFrame?.length || 0;
        const newKeyframeCount = newObj?.keyframeEffects?.length || newObj?.attachedEffects?.keyFrame?.length || 0;

        if (oldKeyframeCount !== newKeyframeCount) {
            if (newKeyframeCount > oldKeyframeCount) {
                const keyframeArray = newObj.keyframeEffects || newObj.attachedEffects?.keyFrame || [];
                const addedKeyframe = keyframeArray[newKeyframeCount - 1];
                const frame = addedKeyframe.frame || 0;
                const keyframeName = this.getEffectName(addedKeyframe);
                return `Added ${keyframeName} at frame ${frame} to ${effectWithId}`;
            } else {
                return `Removed keyframe from ${effectWithId}`;
            }
        }

        // Default to generic update
        return `Updated ${effectWithId} properties`;
    }

    /**
     * Compare two config objects and return list of changed properties
     */
    static diffConfig(oldConfig, newConfig) {
        const changes = [];
        const allKeys = new Set([
            ...Object.keys(oldConfig || {}),
            ...Object.keys(newConfig || {})
        ]);

        for (const key of allKeys) {
            const oldValue = oldConfig?.[key];
            const newValue = newConfig?.[key];

            if (!this.deepEqual(oldValue, newValue)) {
                changes.push(this.formatPropertyName(key));
            }
        }

        return changes;
    }

    /**
     * Format property name to be human-readable
     */
    static formatPropertyName(propertyName) {
        // Handle special property names
        const specialNames = {
            'layerOpacity': 'layer opacity',
            'underLayerOpacity': 'under-layer opacity',
            'sparsityFactor': 'sparsity',
            'innerColor': 'inner color',
            'outerColor': 'outer color',
            'numberOfRings': 'ring count',
            'ringThickness': 'ring thickness',
            'startRadius': 'start radius',
            'endRadius': 'end radius',
            'rotationSpeed': 'rotation speed',
            'colorScheme': 'color scheme',
            'blendMode': 'blend mode',
            'gaussianBlur': 'blur amount',
            'morphAmount': 'morph amount',
            'morphSpeed': 'morph speed'
        };

        if (specialNames[propertyName]) {
            return specialNames[propertyName];
        }

        // Convert camelCase to readable format
        return propertyName
            .replace(/([A-Z])/g, ' $1')
            .toLowerCase()
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    /**
     * Deep equality check for objects
     */
    static deepEqual(obj1, obj2) {
        if (obj1 === obj2) return true;

        if (obj1 == null || obj2 == null) return false;

        if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
            return obj1 === obj2;
        }

        // Handle arrays
        if (Array.isArray(obj1) && Array.isArray(obj2)) {
            if (obj1.length !== obj2.length) return false;
            for (let i = 0; i < obj1.length; i++) {
                if (!this.deepEqual(obj1[i], obj2[i])) return false;
            }
            return true;
        }

        // Handle objects
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        if (keys1.length !== keys2.length) return false;

        for (const key of keys1) {
            if (!keys2.includes(key)) return false;
            if (!this.deepEqual(obj1[key], obj2[key])) return false;
        }

        return true;
    }

    /**
     * Get a readable name for an effect with ID
     */
    static getEffectName(effect, includeId = true) {
        if (!effect) return 'effect';

        let baseName = '';

        // Try different naming properties
        if (effect.name) {
            baseName = effect.name;
        } else if (effect.className) {
            // Convert class name to readable format
            baseName = effect.className
                .replace(/Effect$/, '')
                .replace(/([A-Z])/g, ' $1')
                .trim();
        } else if (effect.registryKey) {
            baseName = effect.registryKey
                .replace(/-/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
        } else {
            baseName = 'effect';
        }

        // Add ID if available and requested
        if (includeId && effect.id) {
            // Shorten the ID for display (show last 6 characters)
            const shortId = effect.id.length > 6
                ? effect.id.slice(-6)
                : effect.id;
            return `${baseName} [${shortId}]`;
        }

        return baseName;
    }

    /**
     * Get just the effect type name without ID
     */
    static getEffectTypeName(effect) {
        return this.getEffectName(effect, false);
    }

    /**
     * Describe a color value change
     */
    static describeColorChange(oldColor, newColor, propertyName) {
        const oldDesc = this.describeColor(oldColor);
        const newDesc = this.describeColor(newColor);

        if (oldDesc && newDesc) {
            return `Changed ${propertyName} from ${oldDesc} to ${newDesc}`;
        }
        return `Changed ${propertyName}`;
    }

    /**
     * Get a readable description of a color value
     */
    static describeColor(color) {
        if (!color) return null;

        if (typeof color === 'string') {
            // Handle hex colors
            if (color.startsWith('#')) {
                return color.toUpperCase();
            }
            return color;
        }

        if (color.colorValue) {
            return color.colorValue.toUpperCase();
        }

        if (color.selectionType === 'scheme') {
            return 'color scheme';
        }

        return null;
    }

    /**
     * Generate description for effect reordering
     */
    static describeReorder(effect, fromIndex, toIndex) {
        const effectName = this.getEffectName(effect); // Include ID
        const fromPos = fromIndex + 1;
        const toPos = toIndex + 1;

        if (Math.abs(fromIndex - toIndex) === 1) {
            // Adjacent move
            if (fromIndex < toIndex) {
                return `Moved ${effectName} down`;
            } else {
                return `Moved ${effectName} up`;
            }
        } else {
            // Non-adjacent move
            return `Moved ${effectName} from position ${fromPos} to ${toPos}`;
        }
    }

    /**
     * Generate description for adding an effect
     */
    static describeAdd(effect, index, parentEffect = null) {
        const effectName = this.getEffectName(effect); // Include ID

        if (parentEffect) {
            const parentName = this.getEffectName(parentEffect); // Include parent ID
            return `Added ${effectName} to ${parentName}`;
        }

        if (index === 0) {
            return `Added ${effectName} as first effect`;
        }

        return `Added ${effectName} at position ${index + 1}`;
    }

    /**
     * Generate description for deleting an effect
     */
    static describeDelete(effect, index, parentEffect = null) {
        const effectName = this.getEffectName(effect); // Include ID

        if (parentEffect) {
            const parentName = this.getEffectName(parentEffect); // Include parent ID
            return `Removed ${effectName} from ${parentName}`;
        }

        return `Removed ${effectName}`;
    }
}

export default CommandDescriptionHelper;