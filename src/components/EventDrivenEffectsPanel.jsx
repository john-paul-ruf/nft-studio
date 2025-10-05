/**
 * EventDrivenEffectsPanel - Wrapper that converts callback props to events
 * Eliminates ALL callback props by emitting events instead
 */

import React, { useCallback, useState, useEffect } from 'react';
import EffectsPanel from './EffectsPanel.jsx';
import { useServices } from '../contexts/ServiceContext.js';

export default function EventDrivenEffectsPanel({
    effects,
    availableEffects,
    effectsLoaded,
    currentTheme,
    projectState,
    isReadOnly = false,
    refreshAvailableEffects
}) {
    const { eventBusService, pinSettingService } = useServices();
    const [isPinned, setIsPinned] = useState(false);

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

    // Event-emitting callback converters
    const handleEffectDelete = useCallback((effectIndex) => {
        eventBusService.emit('effectspanel:effect:delete', { effectIndex }, {
            source: 'EventDrivenEffectsPanel',
            component: 'EventDrivenEffectsPanel'
        });
    }, [eventBusService]);

    const handleEffectReorder = useCallback((dragIndex, hoverIndex) => {
        eventBusService.emit('effectspanel:effect:reorder', { dragIndex, hoverIndex }, {
            source: 'EventDrivenEffectsPanel',
            component: 'EventDrivenEffectsPanel'
        });
    }, [eventBusService]);

    const handleEffectRightClick = useCallback((effect, index, position) => {
        eventBusService.emit('effectspanel:effect:rightclick', { effect, index, position }, {
            source: 'EventDrivenEffectsPanel',
            component: 'EventDrivenEffectsPanel'
        });
    }, [eventBusService]);

    const handleEffectToggleVisibility = useCallback((effectIndex) => {
        eventBusService.emit('effectspanel:effect:togglevisibility', { effectIndex }, {
            source: 'EventDrivenEffectsPanel',
            component: 'EventDrivenEffectsPanel'
        });
    }, [eventBusService]);

    const handleEffectEdit = useCallback((effectIndex, effectType = 'primary', subIndex = null) => {
        eventBusService.emit('effectspanel:effect:edit', { effectIndex, effectType, subIndex }, {
            source: 'EventDrivenEffectsPanel',
            component: 'EventDrivenEffectsPanel'
        });
    }, [eventBusService]);

    const handleEffectAddSecondary = useCallback((effectName, effectType, parentIndex) => {
        eventBusService.emit('effectspanel:effect:addsecondary', { effectName, effectType, parentIndex }, {
            source: 'EventDrivenEffectsPanel',
            component: 'EventDrivenEffectsPanel'
        });
    }, [eventBusService]);

    const handleEffectAddKeyframe = useCallback((effectName, effectType, parentIndex) => {
        eventBusService.emit('effectspanel:effect:addkeyframe', { effectName, effectType, parentIndex }, {
            source: 'EventDrivenEffectsPanel',
            component: 'EventDrivenEffectsPanel'
        });
    }, [eventBusService]);

    const handleSecondaryEffectReorder = useCallback((parentIndex, dragIndex, hoverIndex) => {
        eventBusService.emit('effectspanel:secondary:reorder', { parentIndex, dragIndex, hoverIndex }, {
            source: 'EventDrivenEffectsPanel',
            component: 'EventDrivenEffectsPanel'
        });
    }, [eventBusService]);

    const handleKeyframeEffectReorder = useCallback((parentIndex, dragIndex, hoverIndex) => {
        eventBusService.emit('effectspanel:keyframe:reorder', { parentIndex, dragIndex, hoverIndex }, {
            source: 'EventDrivenEffectsPanel',
            component: 'EventDrivenEffectsPanel'
        });
    }, [eventBusService]);

    const handleSecondaryEffectDelete = useCallback((parentIndex, secondaryIndex) => {
        eventBusService.emit('effectspanel:secondary:delete', { parentIndex, secondaryIndex }, {
            source: 'EventDrivenEffectsPanel',
            component: 'EventDrivenEffectsPanel'
        });
    }, [eventBusService]);

    const handleKeyframeEffectDelete = useCallback((parentIndex, keyframeIndex) => {
        eventBusService.emit('effectspanel:keyframe:delete', { parentIndex, keyframeIndex }, {
            source: 'EventDrivenEffectsPanel',
            component: 'EventDrivenEffectsPanel'
        });
    }, [eventBusService]);

    return (
        <EffectsPanel
            effects={effects}
            onEffectDelete={handleEffectDelete}
            onEffectReorder={handleEffectReorder}
            onEffectRightClick={handleEffectRightClick}
            onEffectToggleVisibility={handleEffectToggleVisibility}
            onEffectEdit={handleEffectEdit}
            onEffectAddSecondary={handleEffectAddSecondary}
            onEffectAddKeyframe={handleEffectAddKeyframe}
            onSecondaryEffectReorder={handleSecondaryEffectReorder}
            onKeyframeEffectReorder={handleKeyframeEffectReorder}
            onSecondaryEffectDelete={handleSecondaryEffectDelete}
            onKeyframeEffectDelete={handleKeyframeEffectDelete}
            availableEffects={availableEffects}
            effectsLoaded={effectsLoaded}
            currentTheme={currentTheme}
            projectState={projectState}
            isReadOnly={isReadOnly || isPinned}
            refreshAvailableEffects={refreshAvailableEffects}
        />
    );
}