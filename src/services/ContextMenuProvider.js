/**
 * ContextMenuProvider Service
 * 
 * Extracted from EffectsPanel god object as part of Phase 3 refactoring.
 * Handles all context menu operations for effects panel including:
 * - Primary effect context menus
 * - Secondary effect context menus  
 * - Keyframe effect context menus
 * - Menu state management
 * - Menu action coordination
 * 
 * Follows Single Responsibility Principle - only handles context menu logic.
 */

import SafeConsole from '../main/utils/SafeConsole.js';

class ContextMenuProvider {
    constructor(eventBus, logger) {
        this.eventBus = eventBus;
        this.logger = logger || SafeConsole;
        
        // Context menu state
        this.activeMenus = new Map(); // Track active menus by ID
        this.menuCounter = 0; // For generating unique menu IDs
        
        // Menu configuration
        this.menuStyles = {
            backgroundColor: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '4px',
            minWidth: '200px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 1000
        };
        
        this.itemStyles = {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            fontSize: '14px',
            color: '#ffffff',
            cursor: 'pointer',
            borderRadius: '2px',
            outline: 'none',
            userSelect: 'none'
        };
        
        this.separatorStyles = {
            height: '1px',
            backgroundColor: '#333',
            margin: '4px 0'
        };
        
        // Bind methods to preserve context
        this.createPrimaryEffectMenu = this.createPrimaryEffectMenu.bind(this);
        this.createSecondaryEffectMenu = this.createSecondaryEffectMenu.bind(this);
        this.createKeyframeEffectMenu = this.createKeyframeEffectMenu.bind(this);
        this.handleMenuAction = this.handleMenuAction.bind(this);
        this.closeMenu = this.closeMenu.bind(this);
        this.closeAllMenus = this.closeAllMenus.bind(this);
        
        this.logger.log('🎯 ContextMenuProvider initialized');
    }
    
    /**
     * Create primary effect context menu configuration
     * @param {Object} options - Menu options
     * @param {number} options.effectIndex - Index of the effect
     * @param {boolean} options.isReadOnly - Whether the effect is read-only
     * @param {boolean} options.isEffectFinal - Whether this is a final effect
     * @param {Array} options.secondaryEffects - Available secondary effects
     * @param {Array} options.keyframeEffects - Available keyframe effects
     * @returns {Object} Menu configuration
     */
    createPrimaryEffectMenu(options) {
        const {
            effectIndex,
            isReadOnly = false,
            isEffectFinal = false,
            secondaryEffects = [],
            keyframeEffects = []
        } = options;
        
        const menuId = this.generateMenuId('primary');
        
        const menuConfig = {
            id: menuId,
            type: 'primary',
            effectIndex,
            isReadOnly,
            items: [
                {
                    id: 'edit',
                    label: isReadOnly ? 'Edit Effect (Read-only)' : 'Edit Effect',
                    icon: 'Edit',
                    disabled: isReadOnly,
                    action: 'edit-primary-effect',
                    data: { effectIndex }
                }
            ]
        };
        
        // Add secondary and keyframe options for non-final effects
        if (!isEffectFinal && !isReadOnly) {
            menuConfig.items.push({ type: 'separator' });
            
            // Add secondary effects submenu
            const secondarySubmenu = {
                id: 'add-secondary',
                label: 'Add Secondary Effect',
                icon: 'Add',
                type: 'submenu',
                items: secondaryEffects.length === 0 ? [
                    {
                        id: 'no-secondary',
                        label: 'No secondary effects available',
                        disabled: true,
                        style: { fontStyle: 'italic' }
                    }
                ] : secondaryEffects.map(effect => ({
                    id: `secondary-${effect.name}`,
                    label: effect.displayName || effect.name,
                    action: 'add-secondary-effect',
                    data: { effectIndex, secondaryEffect: effect }
                }))
            };
            menuConfig.items.push(secondarySubmenu);
            
            // Add keyframe effects submenu
            const keyframeSubmenu = {
                id: 'add-keyframe',
                label: 'Add Keyframe Effect',
                icon: 'Add',
                type: 'submenu',
                items: keyframeEffects.length === 0 ? [
                    {
                        id: 'no-keyframe',
                        label: 'No keyframe effects available',
                        disabled: true,
                        style: { fontStyle: 'italic' }
                    }
                ] : keyframeEffects.map(effect => ({
                    id: `keyframe-${effect.name}`,
                    label: effect.displayName || effect.name,
                    action: 'add-keyframe-effect',
                    data: { effectIndex, keyframeEffect: effect }
                }))
            };
            menuConfig.items.push(keyframeSubmenu);
        }
        
        // Add delete option
        if (!isReadOnly) {
            menuConfig.items.push({ type: 'separator' });
            menuConfig.items.push({
                id: 'delete',
                label: 'Delete Effect',
                icon: 'Delete',
                action: 'delete-primary-effect',
                data: { effectIndex },
                style: { color: '#ff6b6b' }
            });
        }
        
        this.activeMenus.set(menuId, menuConfig);
        this.logger.log(`🎯 ContextMenuProvider: Primary menu created for effect ${effectIndex}`, { menuId, itemCount: menuConfig.items.length });
        
        return menuConfig;
    }
    
    /**
     * Create secondary effect context menu configuration
     * @param {Object} options - Menu options
     * @param {number} options.parentIndex - Index of the parent effect
     * @param {number} options.secondaryIndex - Index of the secondary effect
     * @param {boolean} options.isReadOnly - Whether the effect is read-only
     * @returns {Object} Menu configuration
     */
    createSecondaryEffectMenu(options) {
        const {
            parentIndex,
            secondaryIndex,
            isReadOnly = false
        } = options;
        
        const menuId = this.generateMenuId('secondary');
        
        const menuConfig = {
            id: menuId,
            type: 'secondary',
            parentIndex,
            secondaryIndex,
            isReadOnly,
            items: [
                {
                    id: 'edit',
                    label: isReadOnly ? 'Edit Secondary Effect (Read-only)' : 'Edit Secondary Effect',
                    icon: 'Edit',
                    disabled: isReadOnly,
                    action: 'edit-secondary-effect',
                    data: { parentIndex, secondaryIndex }
                },
                { type: 'separator' },
                {
                    id: 'delete',
                    label: isReadOnly ? 'Delete Secondary Effect (Read-only)' : 'Delete Secondary Effect',
                    icon: 'Delete',
                    disabled: isReadOnly,
                    action: 'delete-secondary-effect',
                    data: { parentIndex, secondaryIndex },
                    style: { color: isReadOnly ? '#666' : '#ff6b6b' }
                }
            ]
        };
        
        this.activeMenus.set(menuId, menuConfig);
        this.logger.log(`🎯 ContextMenuProvider: Secondary menu created for effect ${parentIndex}:${secondaryIndex}`, { menuId });
        
        return menuConfig;
    }
    
    /**
     * Create keyframe effect context menu configuration
     * @param {Object} options - Menu options
     * @param {number} options.parentIndex - Index of the parent effect
     * @param {number} options.keyframeIndex - Index of the keyframe effect
     * @param {boolean} options.isReadOnly - Whether the effect is read-only
     * @param {number} options.frame - Frame number for the keyframe
     * @returns {Object} Menu configuration
     */
    createKeyframeEffectMenu(options) {
        const {
            parentIndex,
            keyframeIndex,
            isReadOnly = false,
            frame = 0
        } = options;
        
        const menuId = this.generateMenuId('keyframe');
        
        const menuConfig = {
            id: menuId,
            type: 'keyframe',
            parentIndex,
            keyframeIndex,
            frame,
            isReadOnly,
            items: [
                {
                    id: 'edit',
                    label: isReadOnly ? 'Edit Keyframe Effect (Read-only)' : 'Edit Keyframe Effect',
                    icon: 'Edit',
                    disabled: isReadOnly,
                    action: 'edit-keyframe-effect',
                    data: { parentIndex, keyframeIndex, frame }
                },
                { type: 'separator' },
                {
                    id: 'delete',
                    label: isReadOnly ? 'Delete Keyframe Effect (Read-only)' : 'Delete Keyframe Effect',
                    icon: 'Delete',
                    disabled: isReadOnly,
                    action: 'delete-keyframe-effect',
                    data: { parentIndex, keyframeIndex, frame },
                    style: { color: isReadOnly ? '#666' : '#ff6b6b' }
                }
            ]
        };
        
        this.activeMenus.set(menuId, menuConfig);
        this.logger.log(`🎯 ContextMenuProvider: Keyframe menu created for effect ${parentIndex}:${keyframeIndex} frame ${frame}`, { menuId });
        
        return menuConfig;
    }
    
    /**
     * Handle menu action execution
     * @param {string} menuId - Menu identifier
     * @param {string} action - Action to execute
     * @param {Object} data - Action data
     */
    handleMenuAction(menuId, action, data) {
        const menu = this.activeMenus.get(menuId);
        if (!menu) {
            this.logger.warn(`🎯 ContextMenuProvider: Menu ${menuId} not found for action ${action}`);
            return;
        }
        
        this.logger.log(`🎯 ContextMenuProvider: Executing action ${action}`, { menuId, data });
        
        // Emit event for the action
        this.eventBus.emit('context-menu-action', {
            action,
            data,
            menuType: menu.type,
            menuId
        }, {
            timestamp: Date.now(),
            source: 'ContextMenuProvider'
        });
        
        // Update metrics
        this.updateActionMetrics(action, menu.type);
        
        // Close menu after action
        this.closeMenu(menuId);
    }
    
    /**
     * Close a specific menu
     * @param {string} menuId - Menu identifier
     */
    closeMenu(menuId) {
        if (this.activeMenus.has(menuId)) {
            this.activeMenus.delete(menuId);
            this.logger.log(`🎯 ContextMenuProvider: Menu ${menuId} closed`);
            
            this.eventBus.emit('context-menu-closed', {
                menuId
            }, {
                timestamp: Date.now(),
                source: 'ContextMenuProvider'
            });
        }
    }
    
    /**
     * Close all active menus
     */
    closeAllMenus() {
        const menuCount = this.activeMenus.size;
        this.activeMenus.clear();
        
        if (menuCount > 0) {
            this.logger.log(`🎯 ContextMenuProvider: All menus closed (${menuCount} menus)`);
            
            this.eventBus.emit('context-menu-all-closed', {
                closedCount: menuCount
            }, {
                timestamp: Date.now(),
                source: 'ContextMenuProvider'
            });
        }
    }
    
    /**
     * Get active menu by ID
     * @param {string} menuId - Menu identifier
     * @returns {Object|null} Menu configuration or null
     */
    getActiveMenu(menuId) {
        return this.activeMenus.get(menuId) || null;
    }
    
    /**
     * Get all active menus
     * @returns {Array} Array of active menu configurations
     */
    getAllActiveMenus() {
        return Array.from(this.activeMenus.values());
    }
    
    /**
     * Check if any menus are active
     * @returns {boolean} True if any menus are active
     */
    hasActiveMenus() {
        return this.activeMenus.size > 0;
    }
    
    /**
     * Generate unique menu ID
     * @param {string} type - Menu type
     * @returns {string} Unique menu ID
     */
    generateMenuId(type) {
        return `${type}-menu-${++this.menuCounter}-${Date.now()}`;
    }
    
    /**
     * Update action metrics
     * @param {string} action - Action name
     * @param {string} menuType - Menu type
     */
    updateActionMetrics(action, menuType) {
        this.totalActions = (this.totalActions || 0) + 1;
        this.lastActionTime = Date.now();
        
        // Track by action type
        this.actionCounts = this.actionCounts || {};
        this.actionCounts[action] = (this.actionCounts[action] || 0) + 1;
        
        // Track by menu type
        this.menuTypeCounts = this.menuTypeCounts || {};
        this.menuTypeCounts[menuType] = (this.menuTypeCounts[menuType] || 0) + 1;
    }
    
    /**
     * Get context menu metrics
     * @returns {Object} Metrics data
     */
    getContextMenuMetrics() {
        return {
            totalActions: this.totalActions || 0,
            activeMenuCount: this.activeMenus.size,
            actionCounts: { ...this.actionCounts } || {},
            menuTypeCounts: { ...this.menuTypeCounts } || {},
            lastActionTime: this.lastActionTime || null,
            menuCounter: this.menuCounter
        };
    }
    
    /**
     * Validate menu configuration
     * @param {Object} menuConfig - Menu configuration to validate
     * @returns {boolean} True if valid
     */
    validateMenuConfig(menuConfig) {
        if (!menuConfig || typeof menuConfig !== 'object') {
            return false;
        }
        
        if (!menuConfig.id || !menuConfig.type || !Array.isArray(menuConfig.items)) {
            return false;
        }
        
        // Validate items
        for (const item of menuConfig.items) {
            if (item.type === 'separator') continue;
            
            if (!item.id || !item.label) {
                return false;
            }
            
            if (item.action && !item.data) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Cleanup context menu provider resources
     */
    cleanup() {
        this.closeAllMenus();
        this.logger.log('🎯 ContextMenuProvider: Cleanup completed');
        this.eventBus = null;
        this.logger = null;
    }
}

export default ContextMenuProvider;