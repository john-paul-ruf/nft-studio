import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ResolutionMapper from '../utils/ResolutionMapper.js';

const ResolutionTrackingContext = createContext();

export function ResolutionTrackingProvider({ children }) {
    // Store complete resolution state
    const [resolutionState, setResolutionState] = useState({
        resolution: null,
        isHorizontal: false,
        width: null,
        height: null,
        resolutionKey: null
    });

    const [resolutionHistory, setResolutionHistory] = useState(new Map());

    // Store the last valid resolution state for scaling purposes
    const lastValidResolution = useRef(null);

    // Store callbacks for when resolution changes
    const scalingCallbacks = useRef(new Set());

    // Register a callback to be called when resolution changes
    const registerScalingCallback = useCallback((callback) => {
        scalingCallbacks.current.add(callback);
        console.log('📝 Registered scaling callback, total callbacks:', scalingCallbacks.current.size);

        // Return unregister function
        return () => {
            scalingCallbacks.current.delete(callback);
            console.log('🗑️ Unregistered scaling callback, remaining:', scalingCallbacks.current.size);
        };
    }, []);

    // Update resolution and trigger callbacks
    const updateResolution = useCallback((resolution, isHorizontal) => {
        // Get dimensions using ResolutionMapper for consistency
        const dimensions = ResolutionMapper.getDimensions(resolution, isHorizontal);
        const newResolutionKey = `${resolution}-${dimensions.w}x${dimensions.h}-${isHorizontal ? 'h' : 'v'}`;

        console.log('🌐 Global resolution update:', {
            resolution,
            isHorizontal,
            dimensions,
            key: newResolutionKey,
            previousKey: resolutionState.resolutionKey
        });

        // Check if resolution actually changed
        if (newResolutionKey !== resolutionState.resolutionKey) {
            const oldState = { ...resolutionState };

            // Update history
            setResolutionHistory(prev => {
                const newHistory = new Map(prev);
                newHistory.set(newResolutionKey, {
                    setAt: Date.now(),
                    previousKey: resolutionState.resolutionKey,
                    dimensions
                });
                return newHistory;
            });

            // Update state
            const newState = {
                resolution,
                isHorizontal,
                width: dimensions.w,
                height: dimensions.h,
                resolutionKey: newResolutionKey
            };
            setResolutionState(newState);

            // Trigger all registered callbacks with old and new dimensions
            console.log('🔍 Scaling callback condition check:', {
                hasOldWidth: !!oldState.width,
                hasOldHeight: !!oldState.height,
                oldState: {
                    width: oldState.width,
                    height: oldState.height,
                    resolution: oldState.resolution,
                    isHorizontal: oldState.isHorizontal,
                    resolutionKey: oldState.resolutionKey
                },
                newState: {
                    width: newState.width,
                    height: newState.height,
                    resolution: newState.resolution,
                    isHorizontal: newState.isHorizontal,
                    resolutionKey: newState.resolutionKey
                },
                callbacks: scalingCallbacks.current.size
            });

            // Only trigger scaling callbacks if we have them registered AND valid previous dimensions
            if (scalingCallbacks.current.size > 0) {
                // Try to get valid previous dimensions
                let scalingOldState = null;

                if (oldState.width && oldState.height) {
                    scalingOldState = oldState;
                } else if (lastValidResolution.current) {
                    scalingOldState = lastValidResolution.current;
                } else {
                    // No valid previous resolution - cannot scale without source dimensions
                    console.warn('❌ Cannot scale: No valid previous resolution state available');
                    return; // Exit early - no scaling possible
                }

                const scaleFactors = {
                    scaleX: dimensions.width / scalingOldState.width,
                    scaleY: dimensions.height / scalingOldState.height
                };

                console.log('🔄 FORCING scaling callbacks:', {
                    callbacks: scalingCallbacks.current.size,
                    oldDimensions: { width: scalingOldState.width, height: scalingOldState.height },
                    newDimensions: dimensions,
                    scaleFactors,
                    source: oldState.width && oldState.height ? 'oldState' :
                           lastValidResolution.current ? 'lastValid' : 'fallback'
                });

                scalingCallbacks.current.forEach(callback => {
                    try {
                        // Ensure we pass properly formatted state objects with numeric dimensions
                        // Handle both .width/.height and .w/.h formats from ResolutionMapper
                        const oldWidth = Number(scalingOldState.width || scalingOldState.w);
                        const oldHeight = Number(scalingOldState.height || scalingOldState.h);
                        const newWidth = Number(dimensions.width || dimensions.w);
                        const newHeight = Number(dimensions.height || dimensions.h);

                        const normalizedOldState = {
                            ...scalingOldState,
                            width: oldWidth,
                            height: oldHeight
                        };
                        const normalizedNewState = {
                            ...newState,
                            width: newWidth,
                            height: newHeight
                        };

                        console.log('🔧 Dimension extraction debug:', {
                            scalingOldState,
                            dimensions,
                            extracted: { oldWidth, oldHeight, newWidth, newHeight },
                            areValid: {
                                oldWidth: !isNaN(oldWidth),
                                oldHeight: !isNaN(oldHeight),
                                newWidth: !isNaN(newWidth),
                                newHeight: !isNaN(newHeight)
                            }
                        });

                        console.log('🎯 Calling scaling callback with normalized states:', {
                            oldState: normalizedOldState,
                            newState: normalizedNewState,
                            scaleFactors
                        });

                        callback(normalizedOldState, normalizedNewState, scaleFactors);
                    } catch (error) {
                        console.error('❌ Error in scaling callback:', error);
                    }
                });
            } else {
                console.log('⚠️ No scaling callbacks registered yet');
            }

            // Update last valid resolution for future scaling operations
            if (dimensions.width && dimensions.height) {
                lastValidResolution.current = {
                    width: dimensions.width,
                    height: dimensions.height,
                    resolution,
                    isHorizontal,
                    resolutionKey: newResolutionKey
                };
                console.log('💾 Updated last valid resolution:', lastValidResolution.current);
            }

            return true; // Resolution changed
        }
        return false; // No change
    }, [resolutionState]);

    // Check if resolution has changed
    const hasResolutionChanged = useCallback((currentResolutionKey) => {
        const changed = currentResolutionKey !== resolutionState.resolutionKey;
        console.log('🔍 Global resolution change check:', {
            current: currentResolutionKey,
            stored: resolutionState.resolutionKey,
            changed
        });
        return changed;
    }, [resolutionState.resolutionKey]);

    // Initialize resolution on first load - support both parameter formats
    const initializeResolution = useCallback((resolutionOrKey, isHorizontal) => {
        if (resolutionState.resolutionKey === null) {
            let resolution, dimensions, resolutionKey;

            // Support two calling patterns:
            // 1. initializeResolution(resolution, isHorizontal) - legacy format
            // 2. initializeResolution(resolutionKey) - new format from PositionInput
            if (typeof resolutionOrKey === 'string' && resolutionOrKey.includes('-') && resolutionOrKey.includes('x')) {
                // New format: "svga-600x800-v"
                resolutionKey = resolutionOrKey;
                const parts = resolutionKey.split('-');
                resolution = parts[0];
                const dimensionStr = parts[1];
                const orientationStr = parts[2];

                if (dimensionStr && dimensionStr.includes('x') && !dimensionStr.includes('undefined')) {
                    const [widthStr, heightStr] = dimensionStr.split('x');
                    const width = parseInt(widthStr);
                    const height = parseInt(heightStr);

                    // Validate parsed dimensions
                    if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
                        dimensions = { width, height };
                        isHorizontal = orientationStr === 'h';
                    } else {
                        console.warn('Invalid dimensions in resolution key:', resolutionKey, 'parsed:', { width, height });
                        // Fallback to ResolutionMapper
                        isHorizontal = orientationStr === 'h';
                        dimensions = ResolutionMapper.getDimensions(resolution, isHorizontal);
                    }
                } else {
                    console.warn('Invalid dimension string in resolution key:', resolutionKey, 'dimensionStr:', dimensionStr);
                    // Fallback to ResolutionMapper if parsing fails
                    isHorizontal = orientationStr === 'h';
                    dimensions = ResolutionMapper.getDimensions(resolution, isHorizontal);
                }
            } else {
                // Legacy format: initializeResolution(resolution, isHorizontal)
                resolution = resolutionOrKey;
                dimensions = ResolutionMapper.getDimensions(resolution, isHorizontal);

                // Ensure dimensions are valid
                if (!dimensions || !dimensions.w || !dimensions.h) {
                    console.error('Invalid dimensions from ResolutionMapper:', dimensions, 'for resolution:', resolution);
                    dimensions = { w: 1920, h: 1080 }; // Hard fallback
                }

                resolutionKey = `${resolution}-${dimensions.w}x${dimensions.h}-${isHorizontal ? 'h' : 'v'}`;
            }

            console.log('🏁 Global resolution initialization:', {
                resolution,
                isHorizontal,
                dimensions,
                key: resolutionKey,
                inputFormat: typeof resolutionOrKey === 'string' && resolutionOrKey.includes('-') ? 'resolutionKey' : 'legacy'
            });

            // Use ResolutionMapper format consistently
            const normalizedWidth = dimensions.w;
            const normalizedHeight = dimensions.h;

            setResolutionState({
                resolution,
                isHorizontal,
                width: normalizedWidth,
                height: normalizedHeight,
                resolutionKey
            });

            // Also initialize lastValidResolution during initial setup
            if (!lastValidResolution.current && normalizedWidth && normalizedHeight) {
                lastValidResolution.current = {
                    width: normalizedWidth,
                    height: normalizedHeight,
                    resolution,
                    isHorizontal,
                    resolutionKey
                };
                console.log('🏁 Initialized lastValidResolution:', lastValidResolution.current);
            }

            setResolutionHistory(prev => {
                const newHistory = new Map(prev);
                newHistory.set(resolutionKey, {
                    setAt: Date.now(),
                    previousKey: null,
                    dimensions: {
                        width: normalizedWidth,
                        height: normalizedHeight
                    },
                    isInitial: true
                });
                return newHistory;
            });
        }
    }, [resolutionState.resolutionKey]);

    // Get current dimensions
    const getCurrentDimensions = useCallback(() => {
        return {
            width: resolutionState.width,
            height: resolutionState.height
        };
    }, [resolutionState.width, resolutionState.height]);

    const contextValue = {
        // State
        resolutionState,
        resolutionHistory,

        // Legacy support (for existing components)
        lastResolutionKey: resolutionState.resolutionKey,

        // Methods
        updateResolution,
        hasResolutionChanged,
        initializeResolution,
        getCurrentDimensions,
        registerScalingCallback
    };

    return (
        <ResolutionTrackingContext.Provider value={contextValue}>
            {children}
        </ResolutionTrackingContext.Provider>
    );
}

export function useGlobalResolutionTracking() {
    const context = useContext(ResolutionTrackingContext);
    if (!context) {
        throw new Error('useGlobalResolutionTracking must be used within a ResolutionTrackingProvider');
    }
    return context;
}