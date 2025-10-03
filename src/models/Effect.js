/**
 * Effect - Base class for all NFT effects
 * 
 * Represents a visual effect that can be applied to NFT generation.
 * Provides validation, serialization, and utility methods for effect management.
 * 
 * @class
 */
export class Effect {
    /**
     * Create an Effect instance
     * 
     * @param {Object} params - Effect parameters
     * @param {string} params.id - Unique identifier for the effect
     * @param {string} params.name - User-facing effect name (e.g., 'amp', 'glow')
     * @param {string} [params.className] - Effect class name for my-nft-gen (defaults to name)
     * @param {string} [params.registryKey] - Registry lookup key (defaults to name)
     * @param {Object} params.config - Effect-specific configuration object
     * @param {string} params.type - Effect type ('primary', 'secondary', 'finalImage', 'specialty', 'keyframe')
     * @param {number} [params.percentChance=100] - Application probability (0-100)
     * @param {boolean} [params.visible=true] - UI visibility flag
     * @param {Array<Effect>} [params.secondaryEffects=[]] - Nested secondary effects
     * @param {Array<Effect>} [params.keyframeEffects=[]] - Animation keyframe effects
     * 
     * @throws {Error} If required parameters are missing or invalid
     */
    constructor({
        id,
        name,
        className,
        registryKey,
        config,
        type,
        percentChance = 100,
        visible = true,
        secondaryEffects = [],
        keyframeEffects = []
    }) {
        // Validate required parameters
        if (!id) {
            throw new Error('Effect requires an id');
        }
        if (!name) {
            throw new Error('Effect requires a name');
        }
        if (!type) {
            throw new Error('Effect requires a type');
        }
        if (!config) {
            throw new Error('Effect requires a config object');
        }

        // Validate type
        const validTypes = ['primary', 'secondary', 'finalImage', 'specialty', 'keyframe'];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid effect type: ${type}. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate percentChance
        if (typeof percentChance !== 'number' || percentChance < 0 || percentChance > 100) {
            throw new Error('percentChance must be a number between 0 and 100');
        }

        // Validate visible
        if (typeof visible !== 'boolean') {
            throw new Error('visible must be a boolean');
        }

        // Validate arrays
        if (!Array.isArray(secondaryEffects)) {
            throw new Error('secondaryEffects must be an array');
        }
        if (!Array.isArray(keyframeEffects)) {
            throw new Error('keyframeEffects must be an array');
        }

        // Assign properties
        this.id = id;
        this.name = name;
        this.className = className || name;
        this.registryKey = registryKey || name;
        this.config = config;
        this.type = type;
        this.percentChance = percentChance;
        this.visible = visible;
        this.secondaryEffects = secondaryEffects;
        this.keyframeEffects = keyframeEffects;
    }

    /**
     * Create Effect instance from plain object (POJO)
     * 
     * @param {Object} pojo - Plain object representation of effect
     * @returns {Effect} Effect instance
     * @throws {Error} If pojo is null/undefined or invalid
     * @static
     */
    static fromPOJO(pojo) {
        if (!pojo) {
            throw new Error('Cannot create Effect from null/undefined');
        }

        // Handle both old format (attachedEffects) and new format (secondaryEffects/keyframeEffects)
        let secondaryEffects = [];
        let keyframeEffects = [];

        if (pojo.attachedEffects) {
            // Old format: { attachedEffects: { secondary: [], keyFrame: [] } }
            secondaryEffects = (pojo.attachedEffects.secondary || []).map(se => 
                se instanceof Effect ? se : Effect.fromPOJO(se)
            );
            keyframeEffects = (pojo.attachedEffects.keyFrame || []).map(ke => 
                ke instanceof Effect ? ke : Effect.fromPOJO(ke)
            );
        } else {
            // New format: { secondaryEffects: [], keyframeEffects: [] }
            secondaryEffects = (pojo.secondaryEffects || []).map(se => 
                se instanceof Effect ? se : Effect.fromPOJO(se)
            );
            keyframeEffects = (pojo.keyframeEffects || []).map(ke => 
                ke instanceof Effect ? ke : Effect.fromPOJO(ke)
            );
        }

        return new Effect({
            id: pojo.id,
            name: pojo.name,
            className: pojo.className,
            registryKey: pojo.registryKey,
            config: pojo.config,
            type: pojo.type,
            percentChance: pojo.percentChance,
            visible: pojo.visible,
            secondaryEffects,
            keyframeEffects
        });
    }

    /**
     * Convert Effect instance to plain object (POJO)
     * 
     * Used for serialization (IPC, file persistence, etc.)
     * 
     * @returns {Object} Plain object representation
     */
    toPOJO() {
        return {
            id: this.id,
            name: this.name,
            className: this.className,
            registryKey: this.registryKey,
            config: this.config,
            type: this.type,
            percentChance: this.percentChance,
            visible: this.visible,
            secondaryEffects: this.secondaryEffects.map(se => 
                se instanceof Effect ? se.toPOJO() : se
            ),
            keyframeEffects: this.keyframeEffects.map(ke => 
                ke instanceof Effect ? ke.toPOJO() : ke
            )
        };
    }

    /**
     * Create a deep clone of this effect
     * 
     * Generates a new ID for the cloned effect to ensure uniqueness.
     * Also generates new IDs for all nested effects.
     * 
     * @returns {Effect} Cloned effect with new ID
     */
    clone() {
        // Deep clone via JSON serialization
        const pojo = JSON.parse(JSON.stringify(this.toPOJO()));
        
        // Generate new ID for cloned effect
        pojo.id = `effect_${Date.now()}_${Math.random()}`;
        
        // Generate new IDs for nested effects
        if (pojo.secondaryEffects && pojo.secondaryEffects.length > 0) {
            pojo.secondaryEffects = pojo.secondaryEffects.map(se => ({
                ...se,
                id: `effect_${Date.now()}_${Math.random()}`
            }));
        }
        
        if (pojo.keyframeEffects && pojo.keyframeEffects.length > 0) {
            pojo.keyframeEffects = pojo.keyframeEffects.map(ke => ({
                ...ke,
                id: `effect_${Date.now()}_${Math.random()}`
            }));
        }
        
        return Effect.fromPOJO(pojo);
    }

    /**
     * Validate effect structure and properties
     * 
     * @returns {Object} Validation result { valid: boolean, errors: string[] }
     */
    validate() {
        const errors = [];

        // Validate required fields
        if (!this.id) errors.push('Missing required field: id');
        if (!this.name) errors.push('Missing required field: name');
        if (!this.type) errors.push('Missing required field: type');
        if (!this.config) errors.push('Missing required field: config');

        // Validate type
        const validTypes = ['primary', 'secondary', 'finalImage', 'specialty', 'keyframe'];
        if (this.type && !validTypes.includes(this.type)) {
            errors.push(`Invalid type: ${this.type}`);
        }

        // Validate percentChance
        if (typeof this.percentChance !== 'number' || this.percentChance < 0 || this.percentChance > 100) {
            errors.push('percentChance must be between 0 and 100');
        }

        // Validate visible
        if (typeof this.visible !== 'boolean') {
            errors.push('visible must be a boolean');
        }

        // Validate nested effects
        if (!Array.isArray(this.secondaryEffects)) {
            errors.push('secondaryEffects must be an array');
        } else {
            this.secondaryEffects.forEach((se, index) => {
                if (se instanceof Effect) {
                    const seValidation = se.validate();
                    if (!seValidation.valid) {
                        errors.push(`Secondary effect ${index}: ${seValidation.errors.join(', ')}`);
                    }
                }
            });
        }

        if (!Array.isArray(this.keyframeEffects)) {
            errors.push('keyframeEffects must be an array');
        } else {
            this.keyframeEffects.forEach((ke, index) => {
                if (ke instanceof Effect) {
                    const keValidation = ke.validate();
                    if (!keValidation.valid) {
                        errors.push(`Keyframe effect ${index}: ${keValidation.errors.join(', ')}`);
                    }
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Update effect configuration
     * 
     * @param {Object} updates - Configuration updates to merge
     * @returns {Effect} This effect instance (for chaining)
     */
    updateConfig(updates) {
        if (!updates || typeof updates !== 'object') {
            throw new Error('Updates must be an object');
        }

        this.config = {
            ...this.config,
            ...updates
        };

        return this;
    }

    /**
     * Check if effect has secondary effects
     * 
     * @returns {boolean} True if effect has secondary effects
     */
    hasSecondaryEffects() {
        return Array.isArray(this.secondaryEffects) && this.secondaryEffects.length > 0;
    }

    /**
     * Check if effect has keyframe effects
     * 
     * @returns {boolean} True if effect has keyframe effects
     */
    hasKeyframeEffects() {
        return Array.isArray(this.keyframeEffects) && this.keyframeEffects.length > 0;
    }

    /**
     * Get all nested effects (secondary + keyframe)
     * 
     * @returns {Array<Effect>} Array of all nested effects
     */
    getAllNestedEffects() {
        return [
            ...this.secondaryEffects,
            ...this.keyframeEffects
        ];
    }

    /**
     * Get attached effects in old format (for backward compatibility)
     * 
     * @returns {Object} Object with secondary and keyFrame arrays
     */
    get attachedEffects() {
        return {
            secondary: this.secondaryEffects,
            keyFrame: this.keyframeEffects
        };
    }

    /**
     * Check if this effect is of a specific type
     * 
     * @param {string} type - Type to check
     * @returns {boolean} True if effect matches type
     */
    isType(type) {
        return this.type === type;
    }

    /**
     * Check if this effect is a primary effect
     * 
     * @returns {boolean} True if effect is primary
     */
    isPrimary() {
        return this.type === 'primary';
    }

    /**
     * Check if this effect is a secondary effect
     * 
     * @returns {boolean} True if effect is secondary
     */
    isSecondary() {
        return this.type === 'secondary';
    }

    /**
     * Check if this effect is a final image effect
     * 
     * @returns {boolean} True if effect is final image
     */
    isFinalImage() {
        return this.type === 'finalImage';
    }

    /**
     * Get a string representation of the effect
     * 
     * @returns {string} String representation
     */
    toString() {
        return `Effect(${this.name}, type=${this.type}, id=${this.id})`;
    }

    /**
     * Get a JSON representation of the effect
     * 
     * @returns {string} JSON string
     */
    toJSON() {
        return JSON.stringify(this.toPOJO(), null, 2);
    }
}