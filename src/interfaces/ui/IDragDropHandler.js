/**
 * Interface for Drag and Drop Operations
 * 
 * This interface defines the contract for handling drag and drop interactions
 * in the UI, including effect reordering and external file drops.
 * 
 * @interface IDragDropHandler
 */
export class IDragDropHandler {
    /**
     * Initializes drag and drop functionality for a container
     * 
     * @param {HTMLElement} container - Container element to enable drag/drop
     * @param {Object} options - Drag/drop configuration options
     * @param {Array<string>} [options.acceptedTypes] - Accepted drag types
     * @param {boolean} [options.allowReorder] - Allow item reordering
     * @param {boolean} [options.allowExternalDrop] - Allow external file drops
     * @returns {Promise<void>}
     */
    async initialize(container, options = {}) {
        throw new Error('IDragDropHandler.initialize() must be implemented');
    }

    /**
     * Handles drag start event
     * 
     * @param {DragEvent} event - Drag start event
     * @param {Object} dragData - Data being dragged
     * @returns {Promise<void>}
     */
    async handleDragStart(event, dragData) {
        throw new Error('IDragDropHandler.handleDragStart() must be implemented');
    }

    /**
     * Handles drag over event
     * 
     * @param {DragEvent} event - Drag over event
     * @returns {Promise<void>}
     */
    async handleDragOver(event) {
        throw new Error('IDragDropHandler.handleDragOver() must be implemented');
    }

    /**
     * Handles drag enter event
     * 
     * @param {DragEvent} event - Drag enter event
     * @returns {Promise<void>}
     */
    async handleDragEnter(event) {
        throw new Error('IDragDropHandler.handleDragEnter() must be implemented');
    }

    /**
     * Handles drag leave event
     * 
     * @param {DragEvent} event - Drag leave event
     * @returns {Promise<void>}
     */
    async handleDragLeave(event) {
        throw new Error('IDragDropHandler.handleDragLeave() must be implemented');
    }

    /**
     * Handles drop event
     * 
     * @param {DragEvent} event - Drop event
     * @returns {Promise<DropResult>} Result of drop operation
     */
    async handleDrop(event) {
        throw new Error('IDragDropHandler.handleDrop() must be implemented');
    }

    /**
     * Handles drag end event
     * 
     * @param {DragEvent} event - Drag end event
     * @returns {Promise<void>}
     */
    async handleDragEnd(event) {
        throw new Error('IDragDropHandler.handleDragEnd() must be implemented');
    }

    /**
     * Validates if a drop operation is allowed
     * 
     * @param {Object} dragData - Data being dragged
     * @param {HTMLElement} dropTarget - Target element for drop
     * @returns {Promise<DropValidationResult>} Validation result
     */
    async validateDrop(dragData, dropTarget) {
        throw new Error('IDragDropHandler.validateDrop() must be implemented');
    }

    /**
     * Gets the drop position for reordering
     * 
     * @param {DragEvent} event - Drop event
     * @param {HTMLElement} container - Container element
     * @returns {number} Drop position index
     */
    getDropPosition(event, container) {
        throw new Error('IDragDropHandler.getDropPosition() must be implemented');
    }

    /**
     * Provides visual feedback during drag operations
     * 
     * @param {string} feedbackType - Type of feedback ('valid', 'invalid', 'reorder')
     * @param {HTMLElement} element - Element to apply feedback to
     * @returns {void}
     */
    showDragFeedback(feedbackType, element) {
        throw new Error('IDragDropHandler.showDragFeedback() must be implemented');
    }

    /**
     * Clears visual feedback after drag operations
     * 
     * @param {HTMLElement} [element] - Specific element to clear (optional)
     * @returns {void}}
     */
    clearDragFeedback(element = null) {
        throw new Error('IDragDropHandler.clearDragFeedback() must be implemented');
    }

    /**
     * Handles external file drops
     * 
     * @param {FileList} files - Dropped files
     * @param {HTMLElement} dropTarget - Target element
     * @returns {Promise<FileDropResult>} Result of file drop operation
     */
    async handleFileDrop(files, dropTarget) {
        throw new Error('IDragDropHandler.handleFileDrop() must be implemented');
    }

    /**
     * Handles effect reordering via drag and drop
     * 
     * @param {string} effectId - ID of effect being moved
     * @param {number} fromPosition - Original position
     * @param {number} toPosition - New position
     * @returns {Promise<ReorderResult>} Result of reorder operation
     */
    async handleEffectReorder(effectId, fromPosition, toPosition) {
        throw new Error('IDragDropHandler.handleEffectReorder() must be implemented');
    }

    /**
     * Sets drag and drop event callbacks
     * 
     * @param {Object} callbacks - Event callback functions
     * @param {Function} [callbacks.onDragStart] - Drag start callback
     * @param {Function} [callbacks.onDrop] - Drop callback
     * @param {Function} [callbacks.onReorder] - Reorder callback
     * @param {Function} [callbacks.onFileDrop] - File drop callback
     */
    setCallbacks(callbacks) {
        throw new Error('IDragDropHandler.setCallbacks() must be implemented');
    }

    /**
     * Enables or disables drag and drop functionality
     * 
     * @param {boolean} enabled - Whether to enable drag/drop
     * @returns {void}
     */
    setEnabled(enabled) {
        throw new Error('IDragDropHandler.setEnabled() must be implemented');
    }

    /**
     * Cleans up drag and drop event listeners
     * 
     * @returns {void}
     */
    cleanup() {
        throw new Error('IDragDropHandler.cleanup() must be implemented');
    }
}

/**
 * Drop result structure
 * @typedef {Object} DropResult
 * @property {boolean} success - Whether drop was successful
 * @property {string} type - Type of drop operation performed
 * @property {Object} data - Data related to the drop
 * @property {string} [error] - Error message if drop failed
 */

/**
 * Drop validation result structure
 * @typedef {Object} DropValidationResult
 * @property {boolean} isValid - Whether drop is valid
 * @property {string} [reason] - Reason if drop is invalid
 * @property {Array<string>} [warnings] - Any warnings about the drop
 */

/**
 * File drop result structure
 * @typedef {Object} FileDropResult
 * @property {boolean} success - Whether file drop was successful
 * @property {Array<Object>} processedFiles - Information about processed files
 * @property {Array<string>} errors - Any errors during file processing
 */

/**
 * Reorder result structure
 * @typedef {Object} ReorderResult
 * @property {boolean} success - Whether reorder was successful
 * @property {number} oldPosition - Original position
 * @property {number} newPosition - New position
 * @property {string} [error] - Error message if reorder failed
 */