/**
 * Interface for Context Menu Operations
 * 
 * This interface defines the contract for providing context menus
 * in the UI, including menu creation, display, and action handling.
 * 
 * @interface IContextMenuProvider
 */
export class IContextMenuProvider {
    /**
     * Creates a context menu for a specific element or context
     * 
     * @param {string} contextType - Type of context ('effect', 'panel', 'project', etc.)
     * @param {Object} contextData - Data related to the context
     * @param {Object} [options] - Menu creation options
     * @returns {Promise<Object>} Context menu definition
     */
    async createContextMenu(contextType, contextData, options = {}) {
        throw new Error('IContextMenuProvider.createContextMenu() must be implemented');
    }

    /**
     * Shows a context menu at the specified position
     * 
     * @param {Object} menuDefinition - Menu definition to display
     * @param {number} x - X coordinate for menu position
     * @param {number} y - Y coordinate for menu position
     * @param {Object} [options] - Display options
     * @returns {Promise<void>}
     */
    async showContextMenu(menuDefinition, x, y, options = {}) {
        throw new Error('IContextMenuProvider.showContextMenu() must be implemented');
    }

    /**
     * Hides the currently displayed context menu
     * 
     * @returns {Promise<void>}
     */
    async hideContextMenu() {
        throw new Error('IContextMenuProvider.hideContextMenu() must be implemented');
    }

    /**
     * Handles context menu item selection
     * 
     * @param {string} actionId - ID of selected menu action
     * @param {Object} contextData - Context data for the action
     * @returns {Promise<ActionResult>} Result of action execution
     */
    async handleMenuAction(actionId, contextData) {
        throw new Error('IContextMenuProvider.handleMenuAction() must be implemented');
    }

    /**
     * Registers a new context menu action
     * 
     * @param {Object} actionDefinition - Action definition
     * @param {string} actionDefinition.id - Unique action ID
     * @param {string} actionDefinition.label - Display label
     * @param {Function} actionDefinition.handler - Action handler function
     * @param {string} [actionDefinition.icon] - Icon for the action
     * @param {Function} [actionDefinition.isEnabled] - Function to check if action is enabled
     * @param {Function} [actionDefinition.isVisible] - Function to check if action is visible
     * @returns {Promise<void>}
     */
    async registerAction(actionDefinition) {
        throw new Error('IContextMenuProvider.registerAction() must be implemented');
    }

    /**
     * Unregisters a context menu action
     * 
     * @param {string} actionId - ID of action to unregister
     * @returns {Promise<boolean>} True if action was unregistered
     */
    async unregisterAction(actionId) {
        throw new Error('IContextMenuProvider.unregisterAction() must be implemented');
    }

    /**
     * Gets available actions for a specific context
     * 
     * @param {string} contextType - Type of context
     * @param {Object} contextData - Context data
     * @returns {Promise<Array<Object>>} Array of available actions
     */
    async getAvailableActions(contextType, contextData) {
        throw new Error('IContextMenuProvider.getAvailableActions() must be implemented');
    }

    /**
     * Creates a submenu structure
     * 
     * @param {string} submenuId - Unique submenu ID
     * @param {string} label - Submenu label
     * @param {Array<Object>} items - Submenu items
     * @returns {Object} Submenu definition
     */
    createSubmenu(submenuId, label, items) {
        throw new Error('IContextMenuProvider.createSubmenu() must be implemented');
    }

    /**
     * Creates a menu separator
     * 
     * @returns {Object} Separator definition
     */
    createSeparator() {
        throw new Error('IContextMenuProvider.createSeparator() must be implemented');
    }

    /**
     * Validates menu action permissions
     * 
     * @param {string} actionId - Action ID to validate
     * @param {Object} contextData - Context data
     * @returns {Promise<PermissionResult>} Permission validation result
     */
    async validateActionPermissions(actionId, contextData) {
        throw new Error('IContextMenuProvider.validateActionPermissions() must be implemented');
    }

    /**
     * Sets global context menu options
     * 
     * @param {Object} options - Global options
     * @param {string} [options.theme] - Menu theme
     * @param {number} [options.maxWidth] - Maximum menu width
     * @param {boolean} [options.showIcons] - Whether to show icons
     * @param {boolean} [options.showShortcuts] - Whether to show keyboard shortcuts
     */
    setGlobalOptions(options) {
        throw new Error('IContextMenuProvider.setGlobalOptions() must be implemented');
    }

    /**
     * Handles keyboard shortcuts for menu actions
     * 
     * @param {KeyboardEvent} event - Keyboard event
     * @param {Object} contextData - Current context data
     * @returns {Promise<boolean>} True if shortcut was handled
     */
    async handleKeyboardShortcut(event, contextData) {
        throw new Error('IContextMenuProvider.handleKeyboardShortcut() must be implemented');
    }

    /**
     * Gets the currently displayed menu information
     * 
     * @returns {Object|null} Current menu info or null if no menu is shown
     */
    getCurrentMenu() {
        throw new Error('IContextMenuProvider.getCurrentMenu() must be implemented');
    }

    /**
     * Sets event handlers for menu interactions
     * 
     * @param {Object} handlers - Event handler functions
     * @param {Function} [handlers.onShow] - Menu show handler
     * @param {Function} [handlers.onHide] - Menu hide handler
     * @param {Function} [handlers.onAction] - Action execution handler
     * @param {Function} [handlers.onHover] - Item hover handler
     */
    setEventHandlers(handlers) {
        throw new Error('IContextMenuProvider.setEventHandlers() must be implemented');
    }

    /**
     * Cleans up context menu resources and event listeners
     * 
     * @returns {void}
     */
    cleanup() {
        throw new Error('IContextMenuProvider.cleanup() must be implemented');
    }
}

/**
 * Action result structure
 * @typedef {Object} ActionResult
 * @property {boolean} success - Whether action was successful
 * @property {Object} [data] - Result data from action
 * @property {string} [error] - Error message if action failed
 * @property {boolean} [closeMenu] - Whether to close menu after action
 */

/**
 * Permission result structure
 * @typedef {Object} PermissionResult
 * @property {boolean} allowed - Whether action is allowed
 * @property {string} [reason] - Reason if action is not allowed
 * @property {Array<string>} [requiredPermissions] - Required permissions for action
 */