/**
 * EventDrivenEffectsPanel - Wrapper that integrates refactored EffectsPanel
 * 
 * Bridges the old callback-based API with the new event-driven refactored architecture.
 * Uses EffectsPanel with error boundary for stability.
 * All state changes flow through EventBusService (never direct callbacks).
 */

import React, { useCallback, useState, useEffect } from 'react';
import EffectsPanel from './effects/EffectsPanel.jsx';
import EffectsPanelErrorBoundary from './effects/EffectsPanelErrorBoundary.jsx';
import { useServices } from '../contexts/ServiceContext.js';

export default function EventDrivenEffectsPanel({
    effects,
    availableEffects,
    effectsLoaded,
    currentTheme,
    projectState,
    isReadOnly = false,
    isRenderLoopActive = false,
    isRendering = false,
    refreshAvailableEffects
}) {
    const { eventBusService, pinSettingService, effectRegistry } = useServices();
    const [isPinned, setIsPinned] = useState(false);
    const [logger, setLogger] = useState(null);

    // Debug logging for wrapper state
    useEffect(() => {
        console.log('🎛️ EventDrivenEffectsPanel: Props received and wrapper state:', {
            effectsCount: effects?.length || 0,
            availableEffects: {
                primary: availableEffects?.primary?.length || 0,
                secondary: availableEffects?.secondary?.length || 0,
                finalImage: availableEffects?.finalImage?.length || 0,
                keyFrame: availableEffects?.keyFrame?.length || 0
            },
            effectsLoaded,
            isReadOnly,
            isRenderLoopActive,
            isRendering,
            isPinned,
            finalReadOnly: isReadOnly || isPinned || isRenderLoopActive || isRendering
        });
    }, [isReadOnly, isRenderLoopActive, isRendering, isPinned, effects, availableEffects, effectsLoaded]);

    // Subscribe to pin state changes
    useEffect(() => {
        // Initialize with current pin state
        setIsPinned(pinSettingService.isPinned());

        // Subscribe to pin state changes
        const unsubscribe = eventBusService.subscribe(
            'pin:state:changed',
            (payload) => {
                setIsPinned(payload.isPinned);
            },
            { component: 'EventDrivenEffectsPanel' }
        );

        return unsubscribe;
    }, [eventBusService, pinSettingService]);

    // Initialize logger for error boundary (on first render)
    useEffect(() => {
        if (!logger) {
            const { EffectsPanelLogger } = require('../services/EffectsPanelLogger.js');
            setLogger(new EffectsPanelLogger({
                eventBusService,
                enableDebug: process.env.NODE_ENV === 'development',
            }));
        }
    }, [logger, eventBusService]);

    // Render refactored panel with error boundary
    // Note: All event handling is now internal to EffectsPanel and its sub-components.
    // They communicate via EventBusService (no callbacks needed).
    return (
        <EffectsPanelErrorBoundary logger={logger}>
            <EffectsPanel
                projectState={projectState}
                effectRegistry={effectRegistry}
                availableEffects={availableEffects}
                effectsLoaded={effectsLoaded}
                currentTheme={currentTheme}
                isReadOnly={isReadOnly || isPinned || isRenderLoopActive || isRendering}
                refreshAvailableEffects={refreshAvailableEffects}
            />
        </EffectsPanelErrorBoundary>
    );
}