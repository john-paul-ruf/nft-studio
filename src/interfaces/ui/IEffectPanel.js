/**
 * Interface for Effect Panel UI Operations
 * 
 * This interface defines the contract for managing the effects panel UI,
 * including effect display, interaction, and state management.
 * 
 * @interface IEffectPanel
 */
export class IEffectPanel {
    /**
     * Renders the effects panel with current state
     * 
     * @param {Object} state - Current panel state
     * @param {Array<Object>} state.effects - Array of effect instances
     * @param {Object} state.selectedEffect - Currently selected effect
     * @param {boolean} state.isLoading - Whether panel is loading
     * @returns {Object} Rendered panel component
     */
    render(state) {
        throw new Error('IEffectPanel.render() must be implemented');
    }

    /**
     * Updates the panel state
     * 
     * @param {Object} newState - New state to apply
     * @returns {Promise<void>}
     */
    async updateState(newState) {
        throw new Error('IEffectPanel.updateState() must be implemented');
    }

    /**
     * Handles effect selection
     * 
     * @param {string} effectId - ID of selected effect
     * @returns {Promise<void>}
     */
    async selectEffect(effectId) {
        throw new Error('IEffectPanel.selectEffect() must be implemented');
    }

    /**
     * Handles effect deselection
     * 
     * @returns {Promise<void>}
     */
    async deselectEffect() {
        throw new Error('IEffectPanel.deselectEffect() must be implemented');
    }

    /**
     * Adds a new effect to the panel
     * 
     * @param {Object} effectDefinition - Effect to add
     * @param {number} [position] - Position to insert at (default: end)
     * @returns {Promise<string>} Added effect instance ID
     */
    async addEffect(effectDefinition, position = -1) {
        throw new Error('IEffectPanel.addEffect() must be implemented');
    }

    /**
     * Removes an effect from the panel
     * 
     * @param {string} effectId - ID of effect to remove
     * @returns {Promise<boolean>} True if effect was removed
     */
    async removeEffect(effectId) {
        throw new Error('IEffectPanel.removeEffect() must be implemented');
    }

    /**
     * Reorders effects in the panel
     * 
     * @param {string} effectId - ID of effect to move
     * @param {number} newPosition - New position for the effect
     * @returns {Promise<void>}
     */
    async reorderEffect(effectId, newPosition) {
        throw new Error('IEffectPanel.reorderEffect() must be implemented');
    }

    /**
     * Duplicates an existing effect
     * 
     * @param {string} effectId - ID of effect to duplicate
     * @returns {Promise<string>} ID of duplicated effect
     */
    async duplicateEffect(effectId) {
        throw new Error('IEffectPanel.duplicateEffect() must be implemented');
    }

    /**
     * Toggles effect enabled/disabled state
     * 
     * @param {string} effectId - ID of effect to toggle
     * @returns {Promise<boolean>} New enabled state
     */
    async toggleEffect(effectId) {
        throw new Error('IEffectPanel.toggleEffect() must be implemented');
    }

    /**
     * Updates effect configuration
     * 
     * @param {string} effectId - ID of effect to update
     * @param {Object} newConfig - New configuration
     * @returns {Promise<void>}
     */
    async updateEffectConfig(effectId, newConfig) {
        throw new Error('IEffectPanel.updateEffectConfig() must be implemented');
    }

    /**
     * Gets current panel state
     * 
     * @returns {Object} Current panel state
     */
    getState() {
        throw new Error('IEffectPanel.getState() must be implemented');
    }

    /**
     * Gets all effects in the panel
     * 
     * @returns {Array<Object>} Array of effect instances
     */
    getEffects() {
        throw new Error('IEffectPanel.getEffects() must be implemented');
    }

    /**
     * Gets currently selected effect
     * 
     * @returns {Object|null} Selected effect or null
     */
    getSelectedEffect() {
        throw new Error('IEffectPanel.getSelectedEffect() must be implemented');
    }

    /**
     * Clears all effects from the panel
     * 
     * @returns {Promise<void>}
     */
    async clearEffects() {
        throw new Error('IEffectPanel.clearEffects() must be implemented');
    }

    /**
     * Exports current effect configuration
     * 
     * @returns {Promise<Object>} Exported configuration
     */
    async exportConfiguration() {
        throw new Error('IEffectPanel.exportConfiguration() must be implemented');
    }

    /**
     * Imports effect configuration
     * 
     * @param {Object} configuration - Configuration to import
     * @returns {Promise<void>}
     */
    async importConfiguration(configuration) {
        throw new Error('IEffectPanel.importConfiguration() must be implemented');
    }

    /**
     * Sets event handlers for panel interactions
     * 
     * @param {Object} handlers - Event handler functions
     * @param {Function} [handlers.onEffectSelect] - Effect selection handler
     * @param {Function} [handlers.onEffectChange] - Effect change handler
     * @param {Function} [handlers.onEffectAdd] - Effect addition handler
     * @param {Function} [handlers.onEffectRemove] - Effect removal handler
     * @param {Function} [handlers.onEffectReorder] - Effect reorder handler
     */
    setEventHandlers(handlers) {
        throw new Error('IEffectPanel.setEventHandlers() must be implemented');
    }
}