/**
 * ModalCoordinator - Manages modal state and operations for EffectsPanel
 * Follows Single Responsibility Principle
 * 
 * Responsibilities:
 * - Modal state management (specialty, bulk add)
 * - Modal event coordination
 * - Modal validation and error handling
 * - Modal metrics and performance tracking
 */

class ModalCoordinator {
    constructor(eventBus, logger) {
        // Validate dependencies
        if (!eventBus) {
            throw new Error('ModalCoordinator requires eventBus dependency');
        }
        if (!logger) {
            throw new Error('ModalCoordinator requires logger dependency');
        }

        this.eventBus = eventBus;
        this.logger = logger;
        
        // Modal state management
        this.modalStates = {
            specialty: {
                isOpen: false,
                data: null,
                openedAt: null
            },
            bulkAdd: {
                isOpen: false,
                targetIndex: null,
                data: null,
                openedAt: null
            }
        };

        // Modal metrics
        this.metrics = {
            modalsOpened: 0,
            modalsClosed: 0,
            specialtyCreated: 0,
            bulkAddsCompleted: 0,
            averageOpenTime: 0,
            totalOpenTime: 0
        };

        // Bind methods to preserve context
        this.openSpecialtyModal = this.openSpecialtyModal.bind(this);
        this.closeSpecialtyModal = this.closeSpecialtyModal.bind(this);
        this.openBulkAddModal = this.openBulkAddModal.bind(this);
        this.closeBulkAddModal = this.closeBulkAddModal.bind(this);
        this.handleSpecialtyCreation = this.handleSpecialtyCreation.bind(this);
        this.handleBulkAddKeyframes = this.handleBulkAddKeyframes.bind(this);

        this.logger.info('ModalCoordinator initialized successfully');
    }

    /**
     * Open specialty effects modal
     * @param {Object} options - Modal options
     * @returns {boolean} Success status
     */
    openSpecialtyModal(options = {}) {
        try {
            if (this.modalStates.specialty.isOpen) {
                this.logger.warn('Specialty modal is already open');
                return false;
            }

            // Prevent opening if any other modal is open
            if (this.isAnyModalOpen()) {
                this.logger.warn('Cannot open specialty modal - another modal is already open');
                return false;
            }

            this.modalStates.specialty = {
                isOpen: true,
                data: options.data || null,
                openedAt: Date.now()
            };

            this.metrics.modalsOpened++;
            
            // Emit modal opened event
            this.eventBus.emit('modal:specialty:opened', {
                modalType: 'specialty',
                data: options.data,
                timestamp: Date.now()
            }, {
                source: 'ModalCoordinator',
                component: 'SpecialtyModal'
            });

            this.logger.info('Specialty modal opened successfully', { options });
            return true;

        } catch (error) {
            this.logger.error('Failed to open specialty modal:', error);
            return false;
        }
    }

    /**
     * Close specialty effects modal
     * @returns {boolean} Success status
     */
    closeSpecialtyModal() {
        try {
            if (!this.modalStates.specialty.isOpen) {
                this.logger.warn('Specialty modal is not open');
                return false;
            }

            const openTime = Date.now() - this.modalStates.specialty.openedAt;
            this.updateOpenTimeMetrics(openTime);

            this.modalStates.specialty = {
                isOpen: false,
                data: null,
                openedAt: null
            };

            this.metrics.modalsClosed++;

            // Emit modal closed event
            this.eventBus.emit('modal:specialty:closed', {
                modalType: 'specialty',
                openTime,
                timestamp: Date.now()
            }, {
                source: 'ModalCoordinator',
                component: 'SpecialtyModal'
            });

            this.logger.info('Specialty modal closed successfully', { openTime });
            return true;

        } catch (error) {
            this.logger.error('Failed to close specialty modal:', error);
            return false;
        }
    }

    /**
     * Open bulk add keyframes modal
     * @param {number} targetIndex - Target effect index
     * @param {Object} options - Modal options
     * @returns {boolean} Success status
     */
    openBulkAddModal(targetIndex, options = {}) {
        try {
            if (this.modalStates.bulkAdd.isOpen) {
                this.logger.warn('Bulk add modal is already open');
                return false;
            }

            // Prevent opening if any other modal is open
            if (this.isAnyModalOpen()) {
                this.logger.warn('Cannot open bulk add modal - another modal is already open');
                return false;
            }

            if (typeof targetIndex !== 'number' || targetIndex < 0) {
                this.logger.error('Invalid target index for bulk add modal:', targetIndex);
                return false;
            }

            this.modalStates.bulkAdd = {
                isOpen: true,
                targetIndex,
                data: options.data || null,
                openedAt: Date.now()
            };

            this.metrics.modalsOpened++;

            // Emit modal opened event
            this.eventBus.emit('modal:bulkadd:opened', {
                modalType: 'bulkAdd',
                targetIndex,
                data: options.data,
                timestamp: Date.now()
            }, {
                source: 'ModalCoordinator',
                component: 'BulkAddModal'
            });

            this.logger.info('Bulk add modal opened successfully', { targetIndex, options });
            return true;

        } catch (error) {
            this.logger.error('Failed to open bulk add modal:', error);
            return false;
        }
    }

    /**
     * Close bulk add keyframes modal
     * @returns {boolean} Success status
     */
    closeBulkAddModal() {
        try {
            if (!this.modalStates.bulkAdd.isOpen) {
                this.logger.warn('Bulk add modal is not open');
                return false;
            }

            const openTime = Date.now() - this.modalStates.bulkAdd.openedAt;
            this.updateOpenTimeMetrics(openTime);

            this.modalStates.bulkAdd = {
                isOpen: false,
                targetIndex: null,
                data: null,
                openedAt: null
            };

            this.metrics.modalsClosed++;

            // Emit modal closed event
            this.eventBus.emit('modal:bulkadd:closed', {
                modalType: 'bulkAdd',
                openTime,
                timestamp: Date.now()
            }, {
                source: 'ModalCoordinator',
                component: 'BulkAddModal'
            });

            this.logger.info('Bulk add modal closed successfully', { openTime });
            return true;

        } catch (error) {
            this.logger.error('Failed to close bulk add modal:', error);
            return false;
        }
    }

    /**
     * Handle specialty effect creation
     * @param {Array} specialtyEffects - Array of specialty effects to create
     * @returns {boolean} Success status
     */
    handleSpecialtyCreation(specialtyEffects) {
        try {
            if (!Array.isArray(specialtyEffects) || specialtyEffects.length === 0) {
                this.logger.warn('Invalid specialty effects data:', specialtyEffects);
                return false;
            }

            // Validate each specialty effect
            for (const effect of specialtyEffects) {
                if (!this.validateSpecialtyEffect(effect)) {
                    this.logger.error('Invalid specialty effect:', effect);
                    return false;
                }
            }

            // Emit events for each specialty effect
            specialtyEffects.forEach(effect => {
                this.eventBus.emit('effectspanel:effect:addspecialty', {
                    effectName: effect.registryKey,
                    effectType: 'specialty',
                    config: effect.config
                }, {
                    source: 'ModalCoordinator',
                    component: 'SpecialtyCreator'
                });
            });

            this.metrics.specialtyCreated += specialtyEffects.length;

            // Close the modal after successful creation
            this.closeSpecialtyModal();

            this.logger.info('Specialty effects created successfully', { 
                count: specialtyEffects.length,
                effects: specialtyEffects.map(e => e.registryKey)
            });

            return true;

        } catch (error) {
            this.logger.error('Failed to handle specialty creation:', error);
            return false;
        }
    }

    /**
     * Handle bulk add keyframes
     * @param {Array} keyframeEffectsData - Array of keyframe effects to add
     * @returns {boolean} Success status
     */
    handleBulkAddKeyframes(keyframeEffectsData) {
        try {
            const targetIndex = this.modalStates.bulkAdd.targetIndex;
            
            if (targetIndex === null || typeof targetIndex !== 'number') {
                this.logger.error('No valid target index for bulk add');
                return false;
            }

            if (!Array.isArray(keyframeEffectsData) || keyframeEffectsData.length === 0) {
                this.logger.warn('Invalid keyframe effects data:', keyframeEffectsData);
                return false;
            }

            // Validate each keyframe effect
            for (const keyframe of keyframeEffectsData) {
                if (!this.validateKeyframeEffect(keyframe)) {
                    this.logger.error('Invalid keyframe effect:', keyframe);
                    return false;
                }
            }

            // Emit events for each keyframe effect
            keyframeEffectsData.forEach(keyframeData => {
                this.eventBus.emit('effectspanel:effect:addkeyframe', {
                    effectName: keyframeData.registryKey,
                    effectType: 'keyframe',
                    parentIndex: targetIndex,
                    frame: keyframeData.frame,
                    config: keyframeData.config
                }, {
                    source: 'ModalCoordinator',
                    component: 'BulkAddKeyframes'
                });
            });

            this.metrics.bulkAddsCompleted++;

            // Close the modal after successful bulk add
            this.closeBulkAddModal();

            this.logger.info('Bulk add keyframes completed successfully', {
                targetIndex,
                count: keyframeEffectsData.length,
                frames: keyframeEffectsData.map(k => k.frame)
            });

            return true;

        } catch (error) {
            this.logger.error('Failed to handle bulk add keyframes:', error);
            return false;
        }
    }

    /**
     * Get current modal states
     * @returns {Object} Current modal states
     */
    getModalStates() {
        return {
            specialty: { ...this.modalStates.specialty },
            bulkAdd: { ...this.modalStates.bulkAdd }
        };
    }

    /**
     * Check if any modal is currently open
     * @returns {boolean} True if any modal is open
     */
    isAnyModalOpen() {
        return this.modalStates.specialty.isOpen || this.modalStates.bulkAdd.isOpen;
    }

    /**
     * Get modal metrics
     * @returns {Object} Modal metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Validate specialty effect data
     * @param {Object} effect - Specialty effect to validate
     * @returns {boolean} Validation result
     */
    validateSpecialtyEffect(effect) {
        if (!effect || typeof effect !== 'object') {
            return false;
        }

        if (!effect.registryKey || typeof effect.registryKey !== 'string') {
            return false;
        }

        // Config is optional but should be an object if present
        if (effect.config && typeof effect.config !== 'object') {
            return false;
        }

        return true;
    }

    /**
     * Validate keyframe effect data
     * @param {Object} keyframe - Keyframe effect to validate
     * @returns {boolean} Validation result
     */
    validateKeyframeEffect(keyframe) {
        if (!keyframe || typeof keyframe !== 'object') {
            return false;
        }

        if (!keyframe.registryKey || typeof keyframe.registryKey !== 'string') {
            return false;
        }

        if (typeof keyframe.frame !== 'number' || keyframe.frame < 0) {
            return false;
        }

        // Config is optional but should be an object if present
        if (keyframe.config && typeof keyframe.config !== 'object') {
            return false;
        }

        return true;
    }

    /**
     * Update open time metrics
     * @param {number} openTime - Time modal was open in milliseconds
     */
    updateOpenTimeMetrics(openTime) {
        this.metrics.totalOpenTime += openTime;
        const totalModals = this.metrics.modalsClosed + 1; // +1 for current closing
        this.metrics.averageOpenTime = this.metrics.totalOpenTime / totalModals;
    }

    /**
     * Reset all modal states (for cleanup/testing)
     */
    reset() {
        this.modalStates = {
            specialty: {
                isOpen: false,
                data: null,
                openedAt: null
            },
            bulkAdd: {
                isOpen: false,
                targetIndex: null,
                data: null,
                openedAt: null
            }
        };

        this.metrics = {
            modalsOpened: 0,
            modalsClosed: 0,
            specialtyCreated: 0,
            bulkAddsCompleted: 0,
            averageOpenTime: 0,
            totalOpenTime: 0
        };

        this.logger.info('ModalCoordinator reset successfully');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.reset();
        this.logger.info('ModalCoordinator cleanup completed');
    }
}

export default ModalCoordinator;