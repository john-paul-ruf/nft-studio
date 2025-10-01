/**
 * DragDropHandler Service
 * Handles all drag and drop operations for effects panel
 * Follows Single Responsibility Principle
 * 
 * Extracted from EffectsPanel god object as part of Phase 3 refactoring
 */

import SafeConsole from '../main/utils/SafeConsole.js';

class DragDropHandler {
    constructor(eventBus, logger) {
        this.eventBus = eventBus;
        this.logger = logger || SafeConsole;
        
        // Drag state management
        this.draggedIndex = null;
        this.draggedSecondaryIndex = null;
        this.draggedKeyframeIndex = null;
        
        // Bind methods to preserve context
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleSecondaryDragStart = this.handleSecondaryDragStart.bind(this);
        this.handleSecondaryDragOver = this.handleSecondaryDragOver.bind(this);
        this.handleSecondaryDrop = this.handleSecondaryDrop.bind(this);
        this.handleKeyframeDragStart = this.handleKeyframeDragStart.bind(this);
        this.handleKeyframeDragOver = this.handleKeyframeDragOver.bind(this);
        this.handleKeyframeDrop = this.handleKeyframeDrop.bind(this);
        
        this.logger.log('🎯 DragDropHandler initialized');
    }
    
    /**
     * Get current drag state
     * @returns {Object} Current drag state
     */
    getDragState() {
        return {
            draggedIndex: this.draggedIndex,
            draggedSecondaryIndex: this.draggedSecondaryIndex,
            draggedKeyframeIndex: this.draggedKeyframeIndex,
            isDragging: this.isDragging()
        };
    }
    
    /**
     * Check if any drag operation is in progress
     * @returns {boolean} True if dragging
     */
    isDragging() {
        return this.draggedIndex !== null || 
               this.draggedSecondaryIndex !== null || 
               this.draggedKeyframeIndex !== null;
    }
    
    /**
     * Reset all drag states
     */
    resetDragState() {
        this.draggedIndex = null;
        this.draggedSecondaryIndex = null;
        this.draggedKeyframeIndex = null;
        this.logger.log('🎯 DragDropHandler: All drag states reset');
    }
    
    // Primary Effect Drag Handlers
    
    /**
     * Handle primary effect drag start
     * @param {Event} e - Drag event
     * @param {number} index - Effect index
     * @param {string} section - Section identifier
     */
    handleDragStart(e, index, section) {
        this.draggedIndex = { index, section };
        e.dataTransfer.effectAllowed = 'move';
        
        this.logger.log('🎯 DragDropHandler: Primary drag started', { index, section });
        
        // Emit drag start event
        this.eventBus?.emit('dragdrop:primary:start', {
            index,
            section,
            dragState: this.getDragState()
        }, {
            source: 'DragDropHandler',
            component: 'PrimaryEffects'
        });
    }
    
    /**
     * Handle primary effect drag over
     * @param {Event} e - Drag event
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    /**
     * Handle primary effect drop
     * @param {Event} e - Drop event
     * @param {number} dropIndex - Drop target index
     * @param {string} section - Section identifier
     * @param {Function} onReorder - Reorder callback
     */
    handleDrop(e, dropIndex, section, onReorder) {
        e.preventDefault();
        
        if (this.draggedIndex !== null &&
            this.draggedIndex.index !== dropIndex &&
            this.draggedIndex.section === section) {
            
            const fromIndex = this.draggedIndex.index;
            
            this.logger.log('🎯 DragDropHandler: Primary drop executed', {
                from: fromIndex,
                to: dropIndex,
                section
            });
            
            // Execute reorder callback
            if (onReorder && typeof onReorder === 'function') {
                onReorder(fromIndex, dropIndex);
            }
            
            // Emit drop event
            this.eventBus?.emit('dragdrop:primary:drop', {
                fromIndex,
                toIndex: dropIndex,
                section,
                dragState: this.getDragState()
            }, {
                source: 'DragDropHandler',
                component: 'PrimaryEffects'
            });
        }
        
        this.draggedIndex = null;
    }
    
    // Secondary Effect Drag Handlers
    
    /**
     * Handle secondary effect drag start
     * @param {Event} e - Drag event
     * @param {number} parentIndex - Parent effect index
     * @param {number} subIndex - Secondary effect index
     */
    handleSecondaryDragStart(e, parentIndex, subIndex) {
        this.draggedSecondaryIndex = { parentIndex, subIndex };
        e.dataTransfer.effectAllowed = 'move';
        e.stopPropagation(); // Prevent parent drag
        
        this.logger.log('🎯 DragDropHandler: Secondary drag started', { parentIndex, subIndex });
        
        // Emit drag start event
        this.eventBus?.emit('dragdrop:secondary:start', {
            parentIndex,
            subIndex,
            dragState: this.getDragState()
        }, {
            source: 'DragDropHandler',
            component: 'SecondaryEffects'
        });
    }
    
    /**
     * Handle secondary effect drag over
     * @param {Event} e - Drag event
     */
    handleSecondaryDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.stopPropagation();
    }
    
    /**
     * Handle secondary effect drop
     * @param {Event} e - Drop event
     * @param {number} parentIndex - Parent effect index
     * @param {number} dropIndex - Drop target index
     * @param {Function} onReorder - Reorder callback
     */
    handleSecondaryDrop(e, parentIndex, dropIndex, onReorder) {
        e.preventDefault();
        e.stopPropagation();
        
        if (this.draggedSecondaryIndex !== null &&
            this.draggedSecondaryIndex.parentIndex === parentIndex &&
            this.draggedSecondaryIndex.subIndex !== dropIndex) {
            
            const fromIndex = this.draggedSecondaryIndex.subIndex;
            
            this.logger.log('🎯 DragDropHandler: Secondary drop executed', {
                parentIndex,
                from: fromIndex,
                to: dropIndex
            });
            
            // Execute reorder callback
            if (onReorder && typeof onReorder === 'function') {
                onReorder(parentIndex, fromIndex, dropIndex);
            }
            
            // Emit drop event
            this.eventBus?.emit('dragdrop:secondary:drop', {
                parentIndex,
                fromIndex,
                toIndex: dropIndex,
                dragState: this.getDragState()
            }, {
                source: 'DragDropHandler',
                component: 'SecondaryEffects'
            });
        }
        
        this.draggedSecondaryIndex = null;
    }
    
    // Keyframe Effect Drag Handlers
    
    /**
     * Handle keyframe effect drag start
     * @param {Event} e - Drag event
     * @param {number} parentIndex - Parent effect index
     * @param {number} subIndex - Keyframe effect index
     */
    handleKeyframeDragStart(e, parentIndex, subIndex) {
        this.draggedKeyframeIndex = { parentIndex, subIndex };
        e.dataTransfer.effectAllowed = 'move';
        e.stopPropagation(); // Prevent parent drag
        
        this.logger.log('🎯 DragDropHandler: Keyframe drag started', { parentIndex, subIndex });
        
        // Emit drag start event
        this.eventBus?.emit('dragdrop:keyframe:start', {
            parentIndex,
            subIndex,
            dragState: this.getDragState()
        }, {
            source: 'DragDropHandler',
            component: 'KeyframeEffects'
        });
    }
    
    /**
     * Handle keyframe effect drag over
     * @param {Event} e - Drag event
     */
    handleKeyframeDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.stopPropagation();
    }
    
    /**
     * Handle keyframe effect drop
     * @param {Event} e - Drop event
     * @param {number} parentIndex - Parent effect index
     * @param {number} dropIndex - Drop target index
     * @param {Function} onReorder - Reorder callback
     */
    handleKeyframeDrop(e, parentIndex, dropIndex, onReorder) {
        e.preventDefault();
        e.stopPropagation();
        
        if (this.draggedKeyframeIndex !== null &&
            this.draggedKeyframeIndex.parentIndex === parentIndex &&
            this.draggedKeyframeIndex.subIndex !== dropIndex) {
            
            const fromIndex = this.draggedKeyframeIndex.subIndex;
            
            this.logger.log('🎯 DragDropHandler: Keyframe drop executed', {
                parentIndex,
                from: fromIndex,
                to: dropIndex
            });
            
            // Execute reorder callback
            if (onReorder && typeof onReorder === 'function') {
                onReorder(parentIndex, fromIndex, dropIndex);
            }
            
            // Emit drop event
            this.eventBus?.emit('dragdrop:keyframe:drop', {
                parentIndex,
                fromIndex,
                toIndex: dropIndex,
                dragState: this.getDragState()
            }, {
                source: 'DragDropHandler',
                component: 'KeyframeEffects'
            });
        }
        
        this.draggedKeyframeIndex = null;
    }
    
    // Utility Methods
    
    /**
     * Validate drag operation
     * @param {string} type - Drag type ('primary', 'secondary', 'keyframe')
     * @param {Object} params - Drag parameters
     * @returns {boolean} True if valid
     */
    validateDragOperation(type, params) {
        switch (type) {
            case 'primary':
                return params.index !== undefined && params.section !== undefined;
            case 'secondary':
            case 'keyframe':
                return params.parentIndex !== undefined && params.subIndex !== undefined;
            default:
                return false;
        }
    }
    
    /**
     * Get drag operation metrics
     * @returns {Object} Drag operation metrics
     */
    getDragMetrics() {
        return {
            totalDragOperations: this.totalDragOperations || 0,
            primaryDrags: this.primaryDrags || 0,
            secondaryDrags: this.secondaryDrags || 0,
            keyframeDrags: this.keyframeDrags || 0,
            lastDragTime: this.lastDragTime || null
        };
    }
    
    /**
     * Update drag metrics
     * @param {string} type - Drag type
     */
    updateDragMetrics(type) {
        this.totalDragOperations = (this.totalDragOperations || 0) + 1;
        this.lastDragTime = Date.now();
        
        switch (type) {
            case 'primary':
                this.primaryDrags = (this.primaryDrags || 0) + 1;
                break;
            case 'secondary':
                this.secondaryDrags = (this.secondaryDrags || 0) + 1;
                break;
            case 'keyframe':
                this.keyframeDrags = (this.keyframeDrags || 0) + 1;
                break;
        }
    }
    
    /**
     * Cleanup drag handler resources
     */
    cleanup() {
        this.resetDragState();
        this.logger.log('🎯 DragDropHandler: Cleanup completed');
        this.eventBus = null;
        this.logger = null;
    }
}

export default DragDropHandler;