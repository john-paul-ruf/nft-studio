/**
 * useEffectPanelModals Hook
 * 
 * Manages modal and dropdown UI state for the Effects Panel.
 * 
 * Manages:
 * - Specialty Effects modal (for adding specialty effects)
 * - Bulk Add Keyframes modal (for batch keyframe addition)
 * - Add Effect dropdown menu
 * 
 * Emits events:
 * - SPECIALTY_MODAL_OPEN/CLOSE
 * - BULK_ADD_MODAL_OPEN/CLOSE
 * 
 * @returns {Object} Modal state and handlers
 *   - specialtyModalOpen: boolean
 *   - bulkAddModalOpen: boolean
 *   - addEffectMenuOpen: boolean
 *   - openSpecialtyModal: Function
 *   - closeSpecialtyModal: Function
 *   - openBulkAddModal: Function
 *   - closeBulkAddModal: Function
 *   - toggleAddEffectMenu: Function
 *   - setAddEffectMenuOpen: Function
 *   - bulkAddTargetIndex: number or null
 *   - setBulkAddTargetIndex: Function
 */

import { useState, useCallback } from 'react';
import { useServices } from '../../contexts/ServiceContext.js';
import { EVENTS } from '../effects/EffectsPanelConstants.js';
import PropTypes from 'prop-types';

export function useEffectPanelModals() {
  const { eventBusService } = useServices();

  // Specialty effects modal state
  const [specialtyModalOpen, setSpecialtyModalOpen] = useState(false);

  // Bulk add keyframes modal state
  const [bulkAddModalOpen, setBulkAddModalOpen] = useState(false);
  const [bulkAddTargetIndex, setBulkAddTargetIndex] = useState(null);

  // Add effect dropdown menu state
  const [addEffectMenuOpen, setAddEffectMenuOpen] = useState(false);

  /**
   * Open the specialty effects modal
   * 
   * Emits SPECIALTY_MODAL_OPEN event.
   */
  const openSpecialtyModal = useCallback(() => {
    try {
      console.log('📋 useEffectPanelModals: Opening specialty modal');
      setSpecialtyModalOpen(true);

      if (eventBusService) {
        eventBusService.emit(
          EVENTS.SPECIALTY_MODAL_OPEN,
          { timestamp: Date.now() },
          {
            source: 'useEffectPanelModals',
            component: 'EffectsPanel'
          }
        );
      }
    } catch (error) {
      console.error('useEffectPanelModals: Error opening specialty modal:', error);
    }
  }, [eventBusService]);

  /**
   * Close the specialty effects modal
   * 
   * Emits SPECIALTY_MODAL_CLOSE event.
   */
  const closeSpecialtyModal = useCallback(() => {
    try {
      console.log('📋 useEffectPanelModals: Closing specialty modal');
      setSpecialtyModalOpen(false);

      if (eventBusService) {
        eventBusService.emit(
          EVENTS.SPECIALTY_MODAL_CLOSE,
          { timestamp: Date.now() },
          {
            source: 'useEffectPanelModals',
            component: 'EffectsPanel'
          }
        );
      }
    } catch (error) {
      console.error('useEffectPanelModals: Error closing specialty modal:', error);
    }
  }, [eventBusService]);

  /**
   * Open the bulk add keyframes modal for a specific effect
   * 
   * @param {number} [effectIndex=null] - Index of target effect for bulk keyframe addition
   * 
   * Emits BULK_ADD_MODAL_OPEN event.
   */
  const openBulkAddModal = useCallback((effectIndex = null) => {
    try {
      console.log('📋 useEffectPanelModals: Opening bulk add modal', { effectIndex });
      setBulkAddModalOpen(true);
      setBulkAddTargetIndex(effectIndex);

      if (eventBusService) {
        eventBusService.emit(
          EVENTS.BULK_ADD_MODAL_OPEN,
          {
            effectIndex,
            timestamp: Date.now()
          },
          {
            source: 'useEffectPanelModals',
            component: 'EffectsPanel'
          }
        );
      }
    } catch (error) {
      console.error('useEffectPanelModals: Error opening bulk add modal:', error);
    }
  }, [eventBusService]);

  /**
   * Close the bulk add keyframes modal
   * 
   * Emits BULK_ADD_MODAL_CLOSE event.
   * Clears the target effect index.
   */
  const closeBulkAddModal = useCallback(() => {
    try {
      console.log('📋 useEffectPanelModals: Closing bulk add modal');
      setBulkAddModalOpen(false);
      setBulkAddTargetIndex(null);

      if (eventBusService) {
        eventBusService.emit(
          EVENTS.BULK_ADD_MODAL_CLOSE,
          { timestamp: Date.now() },
          {
            source: 'useEffectPanelModals',
            component: 'EffectsPanel'
          }
        );
      }
    } catch (error) {
      console.error('useEffectPanelModals: Error closing bulk add modal:', error);
      // Clear state even on error
      setBulkAddModalOpen(false);
      setBulkAddTargetIndex(null);
    }
  }, [eventBusService]);

  /**
   * Toggle the add effect dropdown menu open/closed
   */
  const toggleAddEffectMenu = useCallback(() => {
    console.log('📋 useEffectPanelModals: Toggling add effect menu');
    setAddEffectMenuOpen(prev => !prev);
  }, []);

  /**
   * Manually set the add effect menu state
   * 
   * @param {boolean} isOpen - Whether menu should be open
   */
  const setAddEffectMenuOpenState = useCallback((isOpen) => {
    console.log('📋 useEffectPanelModals: Setting add effect menu to', isOpen);
    setAddEffectMenuOpen(isOpen);
  }, []);

  /**
   * Close all modals and menus
   * 
   * Useful for cleanup when navigating away or changing modes.
   */
  const closeAllModals = useCallback(() => {
    console.log('📋 useEffectPanelModals: Closing all modals');
    setSpecialtyModalOpen(false);
    setBulkAddModalOpen(false);
    setBulkAddTargetIndex(null);
    setAddEffectMenuOpen(false);
  }, []);

  /**
   * Get current modal state
   * @returns {Object} All current modal states
   */
  const getModalStates = useCallback(() => {
    return {
      specialtyModalOpen,
      bulkAddModalOpen,
      addEffectMenuOpen,
      bulkAddTargetIndex,
      anyModalOpen:
        specialtyModalOpen || bulkAddModalOpen || addEffectMenuOpen
    };
  }, [specialtyModalOpen, bulkAddModalOpen, addEffectMenuOpen, bulkAddTargetIndex]);

  return {
    // Specialty modal
    specialtyModalOpen,
    openSpecialtyModal,
    closeSpecialtyModal,

    // Bulk add modal
    bulkAddModalOpen,
    bulkAddTargetIndex,
    openBulkAddModal,
    closeBulkAddModal,

    // Add effect menu
    addEffectMenuOpen,
    toggleAddEffectMenu,
    setAddEffectMenuOpen: setAddEffectMenuOpenState,

    // Utilities
    closeAllModals,
    getModalStates
  };
}

/**
 * PropTypes for hook parameters (none currently)
 */
useEffectPanelModals.propTypes = {};

export default useEffectPanelModals;