/**
 * EventDrivenToolbarActions - Pure Event-Driven Component
 * Listens to toolbar events and executes commands
 * ELIMINATES callback props completely
 */

import { useEffect, useRef } from 'react';
import { useServices } from '../contexts/ServiceContext.js';
import {
    ChangeResolutionCommand,
    ToggleOrientationCommand,
    ChangeFramesCommand
} from '../commands/ProjectCommands.js';

export default function EventDrivenToolbarActions({ projectState }) {
    const { eventBusService, commandService, renderPipelineService, pinSettingService } = useServices();

    // Circuit breaker to prevent infinite resolution loops
    const lastResolutionRef = useRef(null);
    
    // Store last generated settings file for pin feature
    const lastSettingsFileRef = useRef(null);

    useEffect(() => {
        console.log('🔥 EventDrivenToolbarActions: Subscribing to all toolbar events');

        // Resolution change events with circuit breaker
        const unsubscribeResolution = eventBusService.subscribe(
            'toolbar:resolution:change',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Resolution change event:', payload);

                // Circuit breaker: prevent processing identical resolution changes
                if (lastResolutionRef.current === payload.resolution) {
                    console.log('🔥 EventDrivenToolbarActions: Ignoring duplicate resolution change:', payload.resolution);
                    return;
                }

                lastResolutionRef.current = payload.resolution;
                const command = new ChangeResolutionCommand(projectState, payload.resolution);
                commandService.execute(command);

                // Clear render result so canvas goes black until new render
                renderPipelineService.clearRenderResult();

                console.log('✅ EventDrivenToolbarActions: Resolution command executed - ProjectState handled auto-scaling');
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Orientation toggle events
        const unsubscribeOrientation = eventBusService.subscribe(
            'toolbar:orientation:toggle',
            () => {
                console.log('🔥 EventDrivenToolbarActions: Orientation toggle event');
                const command = new ToggleOrientationCommand(projectState);
                const result = commandService.execute(command);

                // Clear render result so canvas goes black until new render
                renderPipelineService.clearRenderResult();

                console.log('✅ EventDrivenToolbarActions: Orientation command executed - ProjectState handled auto-scaling');
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Frame count change events
        const unsubscribeFrames = eventBusService.subscribe(
            'toolbar:frames:change',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Frames change event:', payload);
                const command = new ChangeFramesCommand(projectState, payload.frameCount);
                commandService.execute(command);
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Render events
        const unsubscribeRender = eventBusService.subscribe(
            'toolbar:render:trigger',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Manual render event:', payload);
                
                // Check if pin is active and pass settingsFile
                const settingsFile = pinSettingService.isPinned() ? pinSettingService.getSettingsFilePath() : null;
                if (settingsFile) {
                    console.log('📌 EventDrivenToolbarActions: Rendering with pinned settings:', settingsFile);
                }
                
                renderPipelineService.triggerRender(payload.selectedFrame || 0, settingsFile);
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Render loop events
        const unsubscribeRenderLoop = eventBusService.subscribe(
            'toolbar:renderloop:toggle',
            async (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Render loop toggle event:', payload);

                try {
                    if (payload.isActive) {
                        // Check if pin is active
                        const isPinned = pinSettingService.isPinned();
                        const settingsFile = isPinned ? pinSettingService.getSettingsFilePath() : null;
                        
                        if (isPinned && settingsFile) {
                            // Use resume loop with pinned settings
                            console.log('📌 EventDrivenToolbarActions: Starting render loop with pinned settings:', settingsFile);
                            const result = await window.api.startResumeLoop(settingsFile);
                            console.log('✅ EventDrivenToolbarActions: Render loop started with pinned settings:', result);
                        } else {
                            // Start render loop with proper color scheme data
                            console.log('🔥 EventDrivenToolbarActions: Starting render loop');
                            const config = projectState ? projectState.getState() : {};

                            // Process color scheme data like RenderPipelineService does
                            let colorSchemeData = null;

                            // First, check if we already have colorSchemeData (e.g., from imported project)
                            if (config.colorSchemeData) {
                                console.log('🎨 EventDrivenToolbarActions: Using existing colorSchemeData from config');
                                colorSchemeData = config.colorSchemeData;
                            }
                            // Otherwise, try to load color scheme by name
                            else if (config.colorScheme) {
                                try {
                                    const ColorSchemeService = (await import('../services/ColorSchemeService.js')).default;
                                    const fullScheme = await ColorSchemeService.getColorScheme(config.colorScheme);
                                    if (fullScheme) {
                                        colorSchemeData = {
                                            name: fullScheme.name,
                                            colors: fullScheme.lights || [],
                                            lights: fullScheme.lights || [],
                                            neutrals: fullScheme.neutrals || [],
                                            backgrounds: fullScheme.backgrounds || []
                                        };
                                        console.log('🎨 EventDrivenToolbarActions: Loaded color scheme by name:', colorSchemeData);
                                    }
                                } catch (error) {
                                    console.warn('⚠️ EventDrivenToolbarActions: Could not load color scheme by name:', error);
                                }
                            }

                            // Enhance config with color scheme data
                            const enhancedConfig = {
                                ...config,
                                colorSchemeData: colorSchemeData
                            };

                            console.log('🔥 EventDrivenToolbarActions: Starting render loop with enhanced config:', {
                                colorScheme: config.colorScheme,
                                hasColorSchemeData: !!colorSchemeData,
                                effectsCount: config.effects?.length || 0
                            });

                            const result = await window.api.startRenderLoop(enhancedConfig);
                            console.log('✅ EventDrivenToolbarActions: Render loop started:', result);
                        }
                    } else {
                        // Stop render loop using new event-driven system
                        console.log('🔥 EventDrivenToolbarActions: Stopping render loop using event-driven system');

                        try {
                            // Try the new event-driven approach first
                            const { killAllWorkers } = await import('../core/events/LoopTerminator.js');
                            console.log('🔥 EventDrivenToolbarActions: Using event-driven worker termination');
                            killAllWorkers('SIGTERM');

                            // Also call the API and wait for confirmation
                            const result = await window.api.stopRenderLoop();
                            console.log('✅ EventDrivenToolbarActions: Render loop stopped via event system:', result);

                            // Only update UI state if stop was successful
                            if (result && result.success) {
                                // Emit the toggle event to update UI state
                                eventBusService.emit('renderloop:toggled', {
                                    isActive: false
                                }, { source: 'EventDrivenToolbarActions' });
                            } else {
                                throw new Error(result?.message || 'Failed to stop render loop');
                            }
                        } catch (importError) {
                            console.warn('⚠️ EventDrivenToolbarActions: Event-driven termination not available, using fallback:', importError);
                            // Fallback to old method
                            const result = await window.api.stopRenderLoop();
                            console.log('✅ EventDrivenToolbarActions: Render loop stopped via fallback:', result);

                            // Only update UI state if stop was successful
                            if (result && result.success) {
                                eventBusService.emit('renderloop:toggled', {
                                    isActive: false
                                }, { source: 'EventDrivenToolbarActions' });
                            } else {
                                throw new Error(result?.message || 'Failed to stop render loop');
                            }
                        }
                    }

                    // If we're starting the loop, emit the toggle event
                    if (payload.isActive) {
                        eventBusService.emit('renderloop:toggled', {
                            isActive: true
                        }, { source: 'EventDrivenToolbarActions' });
                    }
                } catch (error) {
                    console.error('❌ EventDrivenToolbarActions: Render loop operation failed:', error);
                    // Emit error event to potentially revert UI state
                    eventBusService.emit('renderloop:error', {
                        error: error.message,
                        wasAttemptingToStart: payload.isActive
                    }, { source: 'EventDrivenToolbarActions' });
                }
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Frame selection events
        const unsubscribeFrameSelection = eventBusService.subscribe(
            'toolbar:frame:select',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Frame selection event:', payload);
                eventBusService.emit('frame:selected', {
                    frameIndex: payload.frameIndex
                }, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Zoom events
        const unsubscribeZoomIn = eventBusService.subscribe(
            'toolbar:zoom:in',
            () => {
                console.log('🔥 EventDrivenToolbarActions: Zoom in event');
                eventBusService.emit('zoom:in', {}, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        const unsubscribeZoomOut = eventBusService.subscribe(
            'toolbar:zoom:out',
            () => {
                console.log('🔥 EventDrivenToolbarActions: Zoom out event');
                eventBusService.emit('zoom:out', {}, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        const unsubscribeZoomReset = eventBusService.subscribe(
            'toolbar:zoom:reset',
            () => {
                console.log('🔥 EventDrivenToolbarActions: Zoom reset event');
                eventBusService.emit('zoom:reset', {}, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Theme change events
        const unsubscribeTheme = eventBusService.subscribe(
            'toolbar:theme:change',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Theme change event:', payload);
                eventBusService.emit('theme:changed', {
                    themeKey: payload.themeKey
                }, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Color scheme change events from toolbar
        const unsubscribeColorScheme = eventBusService.subscribe(
            'toolbar:colorscheme:change',
            async (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Color scheme change event:', payload);
                if (projectState) {
                    // Import ColorSchemeService dynamically
                    const ColorSchemeService = (await import('../services/ColorSchemeService.js')).default;
                    const fullScheme = await ColorSchemeService.getColorScheme(payload.schemeId);

                    if (fullScheme) {
                        // The backend expects 'colors' array - use lights as the main colors
                        const colorSchemeData = {
                            name: fullScheme.name,
                            colors: fullScheme.lights || [],  // Backend expects 'colors'
                            lights: fullScheme.lights || [],
                            neutrals: fullScheme.neutrals || [],
                            backgrounds: fullScheme.backgrounds || [],
                            metadata: fullScheme.metadata || {}
                        };

                        // Update both colorScheme ID and colorSchemeData
                        projectState.update({
                            colorScheme: payload.schemeId,
                            colorSchemeData: colorSchemeData
                        });
                        console.log('✅ EventDrivenToolbarActions: Updated color scheme and data');
                    } else {
                        // Fallback to just updating the ID if scheme not found
                        projectState.update({ colorScheme: payload.schemeId });
                        console.warn('⚠️ EventDrivenToolbarActions: Color scheme not found:', payload.schemeId);
                    }
                }
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Color scheme change events from ColorSchemeDropdown directly
        const unsubscribeColorSchemeDropdown = eventBusService.subscribe(
            'colorscheme:change',
            async (payload) => {
                console.log('🔥 EventDrivenToolbarActions: ColorSchemeDropdown change event:', payload);
                if (projectState) {
                    // Import ColorSchemeService dynamically
                    const ColorSchemeService = (await import('../services/ColorSchemeService.js')).default;
                    const fullScheme = await ColorSchemeService.getColorScheme(payload.schemeId);

                    if (fullScheme) {
                        // The backend expects 'colors' array - use lights as the main colors
                        const colorSchemeData = {
                            name: fullScheme.name,
                            colors: fullScheme.lights || [],  // Backend expects 'colors'
                            lights: fullScheme.lights || [],
                            neutrals: fullScheme.neutrals || [],
                            backgrounds: fullScheme.backgrounds || [],
                            metadata: fullScheme.metadata || {}
                        };

                        // Update both colorScheme ID and colorSchemeData
                        projectState.update({
                            colorScheme: payload.schemeId,
                            colorSchemeData: colorSchemeData
                        });
                        console.log('✅ EventDrivenToolbarActions: Updated color scheme and data');
                    } else {
                        // Fallback to just updating the ID if scheme not found
                        projectState.update({ colorScheme: payload.schemeId });
                        console.warn('⚠️ EventDrivenToolbarActions: Color scheme not found:', payload.schemeId);
                    }
                }
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Add effect events from toolbar
        const unsubscribeAddEffect = eventBusService.subscribe(
            'toolbar:effect:add',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Add effect event:', payload);
                // This will trigger through the useEffectManagement hook
                // We emit a generic effect:add event that useEffectManagement can handle
                eventBusService.emit('effect:add', {
                    effectName: payload.effectName,
                    effectType: payload.effectType || 'primary'
                }, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Add effect events from EffectsPanel
        const unsubscribeEffectsPanelAddEffect = eventBusService.subscribe(
            'effectspanel:effect:add',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: EffectsPanel add effect event:', payload);
                // Convert EffectsPanel events to the standard effect:add event
                // Preserve all payload data including config for specialty effects
                eventBusService.emit('effect:add', {
                    effectName: payload.effectName,
                    effectType: payload.effectType || 'primary',
                    config: payload.config, // Preserve config data for specialty effects
                    percentChance: payload.percentChance
                }, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Effect delete events from EffectsPanel
        const unsubscribeEffectDelete = eventBusService.subscribe(
            'effectspanel:effect:delete',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Effect delete event:', payload);
                eventBusService.emit('effect:delete', {
                    effectIndex: payload.effectIndex
                }, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Effect reorder events from EffectsPanel
        const unsubscribeEffectReorder = eventBusService.subscribe(
            'effectspanel:effect:reorder',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Effect reorder event:', payload);
                eventBusService.emit('effect:reorder', {
                    dragIndex: payload.dragIndex,
                    hoverIndex: payload.hoverIndex
                }, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Effect right click events from EffectsPanel
        const unsubscribeEffectRightClick = eventBusService.subscribe(
            'effectspanel:effect:rightclick',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Effect right click event:', payload);
                eventBusService.emit('effect:rightclick', {
                    effect: payload.effect,
                    index: payload.index,
                    position: payload.position
                }, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Effect toggle visibility events from EffectsPanel
        const unsubscribeEffectToggleVisibility = eventBusService.subscribe(
            'effectspanel:effect:togglevisibility',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Effect toggle visibility event:', payload);
                eventBusService.emit('effect:togglevisibility', {
                    effectIndex: payload.effectIndex
                }, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Effect edit events from EffectsPanel
        const unsubscribeEffectEdit = eventBusService.subscribe(
            'effectspanel:effect:edit',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Effect edit event:', payload);
                eventBusService.emit('effect:edit', {
                    effectIndex: payload.effectIndex,
                    effectType: payload.effectType || 'primary',
                    subIndex: payload.subIndex !== undefined ? payload.subIndex : null
                }, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Effect add secondary events from EffectsPanel
        const unsubscribeEffectAddSecondary = eventBusService.subscribe(
            'effectspanel:effect:addsecondary',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Effect add secondary event:', payload);
                eventBusService.emit('effect:addsecondary', {
                    effectName: payload.effectName,
                    effectType: payload.effectType,
                    parentIndex: payload.parentIndex
                }, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Effect add keyframe events from EffectsPanel
        const unsubscribeEffectAddKeyframe = eventBusService.subscribe(
            'effectspanel:effect:addkeyframe',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Effect add keyframe event:', payload);
                eventBusService.emit('effect:addkeyframe', {
                    effectName: payload.effectName,
                    effectType: payload.effectType,
                    parentIndex: payload.parentIndex,
                    frame: payload.frame,
                    config: payload.config
                }, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // EffectConfigurer config change events
        const unsubscribeEffectConfigurerConfig = eventBusService.subscribe(
            'effectconfigurer:config:change',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: EffectConfigurer config change event:', payload);
                eventBusService.emit('effect:config:change', payload, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // EffectConfigurer add effect events
        const unsubscribeEffectConfigurerAdd = eventBusService.subscribe(
            'effectconfigurer:effect:add',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: EffectConfigurer add effect event:', payload);
                eventBusService.emit('effect:add', {
                    effectName: payload.effect?.name || payload.effect?.className,
                    effectType: 'primary',
                    config: payload.config,
                    percentChance: payload.percentChance
                }, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // EffectConfigurer attach effect events
        const unsubscribeEffectConfigurerAttach = eventBusService.subscribe(
            'effectconfigurer:effect:attach',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: EffectConfigurer attach effect event:', payload);
                eventBusService.emit('effect:attach', {
                    effectData: payload.effectData,
                    attachmentType: payload.attachmentType,
                    isEditing: payload.isEditing,
                    parentEffect: payload.parentEffect
                }, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Pin toggle events
        const unsubscribePinToggle = eventBusService.subscribe(
            'toolbar:pin:toggle',
            async (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Pin toggle event:', payload);
                
                try {
                    if (pinSettingService.isPinned()) {
                        // Unpin: Exit audit mode
                        console.log('📌 EventDrivenToolbarActions: Unpinning settings');
                        await pinSettingService.unpinSettings();
                        
                        // Emit success event
                        eventBusService.emit('pin:unpinned', {}, { source: 'EventDrivenToolbarActions' });
                    } else {
                        // Pin: Enter audit mode - use last generated settings file
                        console.log('📌 EventDrivenToolbarActions: Pinning settings');
                        
                        // Check if we have a settings file from the last render
                        const settingsFile = lastSettingsFileRef.current;
                        
                        if (!settingsFile) {
                            throw new Error('No settings file available. Please render a frame first before pinning.');
                        }
                        
                        console.log('📌 EventDrivenToolbarActions: Using settings file from last render:', settingsFile);
                        
                        // Pin the settings file (no need to save data - it's already in the file)
                        await pinSettingService.pinSettings(settingsFile);
                        
                        // Emit success event
                        eventBusService.emit('pin:pinned', {
                            settingsFile: settingsFile
                        }, { source: 'EventDrivenToolbarActions' });
                    }
                } catch (error) {
                    console.error('❌ EventDrivenToolbarActions: Pin toggle error:', error);
                    eventBusService.emit('pin:error', {
                        message: 'Failed to toggle pin state',
                        error: error.message
                    }, { source: 'EventDrivenToolbarActions' });
                }
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Project import events
        const unsubscribeProjectImport = eventBusService.subscribe(
            'project:import',
            (payload) => {
                console.log('🔥 EventDrivenToolbarActions: Project import event:', payload);
                eventBusService.emit('ui:show-import-wizard', {}, { source: 'EventDrivenToolbarActions' });
            },
            { component: 'EventDrivenToolbarActions' }
        );

        // Subscribe to render completion to capture settings file
        const unsubscribeRenderComplete = renderPipelineService.onRenderComplete((result, error) => {
            if (!error && result) {
                // Capture settings file from render result
                const settingsFile = result?.settingsFile;
                if (settingsFile) {
                    console.log('📄 EventDrivenToolbarActions: Captured settings file from render:', settingsFile);
                    lastSettingsFileRef.current = settingsFile;
                } else {
                    console.log('⚠️ EventDrivenToolbarActions: No settings file in render result');
                }
            }
        });

        // Cleanup all subscriptions
        return () => {
            console.log('🔥 EventDrivenToolbarActions: Cleaning up subscriptions');
            unsubscribeResolution();
            unsubscribeOrientation();
            unsubscribeFrames();
            unsubscribeRender();
            unsubscribeRenderLoop();
            unsubscribeFrameSelection();
            unsubscribeZoomIn();
            unsubscribeZoomOut();
            unsubscribeZoomReset();
            unsubscribeTheme();
            unsubscribeColorScheme();
            unsubscribeColorSchemeDropdown();
            unsubscribeAddEffect();
            unsubscribeEffectsPanelAddEffect();
            unsubscribeEffectDelete();
            unsubscribeEffectReorder();
            unsubscribeEffectRightClick();
            unsubscribeEffectToggleVisibility();
            unsubscribeEffectEdit();
            unsubscribeEffectAddSecondary();
            unsubscribeEffectAddKeyframe();
            unsubscribeEffectConfigurerConfig();
            unsubscribeEffectConfigurerAdd();
            unsubscribeEffectConfigurerAttach();
            unsubscribePinToggle();
            unsubscribeProjectImport();
            unsubscribeRenderComplete();
        };
    }, [eventBusService, commandService, renderPipelineService, pinSettingService, projectState]);

    // This component has no render - it's pure event handling
    return null;
}