/**
 * Utility for generating unique alphanumeric IDs
 */
export default class IdGenerator {
    /**
     * Generate a random 8-character alphanumeric ID
     * @returns {string} 8-character alphanumeric ID
     */
    static generateId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Ensure an effect has an ID, generating one if it doesn't exist
     * @param {Object} effect - Effect object
     * @returns {Object} Effect object with ID
     */
    static ensureEffectId(effect) {
        if (!effect.id) {
            effect.id = this.generateId();
        }
        return effect;
    }

    /**
     * Ensure all effects in an array have IDs
     * @param {Array} effects - Array of effect objects
     * @returns {Array} Array of effects with IDs
     */
    static ensureEffectsIds(effects) {
        if (!Array.isArray(effects)) {
            return effects;
        }
        
        return effects.map(effect => {
            const updatedEffect = this.ensureEffectId({ ...effect });
            
            // Also ensure secondary effects have IDs
            if (updatedEffect.secondaryEffects && Array.isArray(updatedEffect.secondaryEffects)) {
                updatedEffect.secondaryEffects = updatedEffect.secondaryEffects.map(secondary => 
                    this.ensureEffectId({ ...secondary })
                );
            }
            
            // Also ensure keyframe effects have IDs (NEW FORMAT)
            if (updatedEffect.keyframeEffects && Array.isArray(updatedEffect.keyframeEffects)) {
                updatedEffect.keyframeEffects = updatedEffect.keyframeEffects.map(keyframe => 
                    this.ensureEffectId({ ...keyframe })
                );
            }
            
            // Also ensure keyframe effects have IDs (OLD FORMAT - for backward compatibility)
            if (updatedEffect.attachedEffects?.keyFrame && Array.isArray(updatedEffect.attachedEffects.keyFrame)) {
                updatedEffect.attachedEffects.keyFrame = updatedEffect.attachedEffects.keyFrame.map(keyframe => 
                    this.ensureEffectId({ ...keyframe })
                );
            }
            
            return updatedEffect;
        });
    }
}