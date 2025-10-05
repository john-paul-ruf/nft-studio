/**
 * RenderPipelineService - Single Source of Truth for All Rendering
 * Eliminates manual render triggers and provides automatic rendering on data changes
 */

import ResolutionMapper from '../utils/ResolutionMapper.js';

export class RenderPipelineService {
    constructor() {
        this.isInitialized = false;
        this.renderQueue = [];
        this.isRendering = false;
        this.renderResult = null;
        this.renderCallbacks = new Set();
        this.projectStateManager = null;
        this.pinSettingService = null;
        this.lastRenderConfig = null;
        this.renderDebounceTimer = null;
        this.DEBOUNCE_MS = 50; // Batch rapid changes

        console.log('🎯 RenderPipelineService created');
    }

    /**
     * Initialize the render pipeline with required dependencies
     * @param {ProjectStateManager} projectStateManager - State manager to observe
     * @param {PinSettingService} pinSettingService - Pin setting service (optional)
     */
    initialize(projectStateManager, pinSettingService = null) {
        if (this.isInitialized) {
            console.warn('RenderPipelineService already initialized');
            return;
        }

        this.projectStateManager = projectStateManager;
        this.pinSettingService = pinSettingService;

        // DISABLED: Auto-rendering on ProjectState changes
        // Only render when manually triggered via triggerRender() method
        // this.unsubscribeFromProjectState = projectStateManager.onUpdate((newState) => {
        //     console.log('🎯 RenderPipeline: ProjectState changed, queuing render');
        //     this.queueRender(0); // Default to frame 0
        // });
        console.log('🎯 RenderPipeline: Auto-rendering DISABLED - only manual triggers will render');

        this.isInitialized = true;
        console.log('✅ RenderPipelineService initialized and subscribed to ProjectState');
    }

    /**
     * Queue a render operation (with debouncing)
     * @param {number} selectedFrame - Frame to render
     */
    queueRender(selectedFrame = 0) {
        console.log('📋 RenderPipeline: Queueing render for frame:', selectedFrame);

        // Clear existing debounce
        if (this.renderDebounceTimer) {
            clearTimeout(this.renderDebounceTimer);
        }

        // Debounce rapid render requests
        this.renderDebounceTimer = setTimeout(() => {
            this.executeRender(selectedFrame);
        }, this.DEBOUNCE_MS);
    }

    /**
     * Execute the actual render operation
     * @param {number} selectedFrame - Frame to render
     */
    async executeRender(selectedFrame) {
        if (this.isRendering) {
            console.log('⏳ RenderPipeline: Already rendering, skipping');
            return;
        }

        if (!this.projectStateManager) {
            console.warn('⚠️ RenderPipeline: No ProjectStateManager available');
            return;
        }

        const projectState = this.projectStateManager.getProjectState();
        if (!projectState) {
            console.warn('⚠️ RenderPipeline: No ProjectState available');
            return;
        }

        const config = projectState.getState();
        
        if (!config || !config.effects || config.effects.length === 0) {
            console.log('ℹ️ RenderPipeline: No effects to render');
            return;
        }

        this.isRendering = true;
        console.log('🚀 RenderPipeline: Executing render for frame:', selectedFrame);

        // Get settings file if pinned
        let settingsFile = null;
        if (this.pinSettingService && this.pinSettingService.isPinned()) {
            settingsFile = this.pinSettingService.getSettingsFilePath();
            console.log('📌 RenderPipeline: Using pinned settings file:', settingsFile);
        }

        try {
            const renderResult = await this.performRender(config, selectedFrame, settingsFile);
            this.renderResult = renderResult;
            this.notifyRenderComplete(renderResult);
        } catch (error) {
            console.error('❌ RenderPipeline: Render failed:', error);
            this.notifyRenderError(error);
        } finally {
            this.isRendering = false;
        }
    }

    /**
     * Perform the actual render using existing render logic
     * @param {Object} config - Project configuration
     * @param {number} selectedFrame - Frame to render
     * @param {string|null} settingsFile - Optional settings file path for pinned rendering
     * @returns {Promise<Object>} Render result object with { imageData: string, settingsFile: string|null, isPinned: boolean }
     */
    async performRender(config, selectedFrame, settingsFile = null) {
        // Get resolution dimensions
        const dimensions = this.getResolutionDimensions();

        // Prepare color scheme data
        let colorSchemeData = null;

        // First, check if we already have colorSchemeData (e.g., from imported project)
        if (config.colorSchemeData) {
            console.log('🎨 RenderPipelineService: Using existing colorSchemeData from config');
            console.log('🎨 RenderPipelineService: colorSchemeData:', config.colorSchemeData);
            colorSchemeData = config.colorSchemeData;
        }
        // Otherwise, try to load color scheme by name
        else if (config.colorScheme) {
            try {
                const ColorSchemeService = (await import('./ColorSchemeService.js')).default;
                const fullScheme = await ColorSchemeService.getColorScheme(config.colorScheme);
                if (fullScheme) {
                    // The backend expects 'colors' array - use lights as the main colors
                    colorSchemeData = {
                        name: fullScheme.name,
                        colors: fullScheme.lights || [],  // Backend expects 'colors'
                        lights: fullScheme.lights || [],
                        neutrals: fullScheme.neutrals || [],
                        backgrounds: fullScheme.backgrounds || []
                    };
                    console.log('🎨 RenderPipelineService: Loaded color scheme by ID:', config.colorScheme);
                    console.log('🎨 RenderPipelineService: colorSchemeData:', colorSchemeData);
                }
            } catch (error) {
                console.warn('Warning: Could not load color scheme by name:', error);
            }
        }

        // Filter visible effects
        const visibleEffects = (config.effects || []).filter(effect => effect.visible !== false);

        // DEBUG: Log effect filtering details
        console.log('🔍 RenderPipelineService: Effect filtering debug:');
        console.log('🔍 Total effects in config:', config.effects?.length || 0);
        console.log('🔍 Effects before filtering:', config.effects?.map(e => ({
            name: e.name || e.className || e.registryKey,
            registryKey: e.registryKey,
            visible: e.visible,
            visibleCheck: e.visible !== false
        })) || []);
        console.log('🔍 Visible effects after filtering:', visibleEffects.length);
        console.log('🔍 Visible effects details:', visibleEffects.map(e => ({
            name: e.name || e.className || e.registryKey,
            registryKey: e.registryKey,
            visible: e.visible,
            hasConfig: !!e.config
        })));

        if (visibleEffects.length === 0) {
            console.warn('⚠️ RenderPipelineService: No visible effects to render!');
            if (config.effects && config.effects.length > 0) {
                console.warn('⚠️ All effects were filtered out. Check effect visibility settings.');
            }
        }

        // Get orientation from ProjectState
        const isHorizontal = this.projectStateManager.getProjectState().getIsHorizontal();

        // Prepare render config
        const renderConfig = {
            ...config,
            isHorizontal: isHorizontal,
            effects: visibleEffects,
            width: dimensions.w,
            height: dimensions.h,
            renderStartFrame: selectedFrame,
            renderJumpFrames: config.numFrames + 1,
            colorSchemeData: colorSchemeData
        };

        // DEBUG: Log final render config
        console.log('🚀 RenderPipelineService: Final render config:');
        console.log('🚀 Dimensions:', { width: dimensions.w, height: dimensions.h });
        console.log('🚀 Frame:', selectedFrame);
        console.log('🚀 Settings file:', settingsFile || 'none (unpinned)');
        console.log('🚀 Effects count:', renderConfig.effects.length);
        console.log('🚀 Effects to render:', renderConfig.effects.map(e => e.registryKey || e.name || e.className));

        // Execute render via IPC (pass settings file for pin mode)
        const result = await window.api.renderFrame(renderConfig, selectedFrame, settingsFile);

        if (result.success && (result.frameBuffer || result.fileUrl)) {
            let imageData;
            
            // Handle different result formats
            if (result.method === 'filesystem' || result.bufferType === 'filesystem') {
                imageData = result.fileUrl;
            } else if (result.bufferType === 'base64' || typeof result.frameBuffer === 'string') {
                if (result.frameBuffer.startsWith('data:image')) {
                    imageData = result.frameBuffer;
                } else {
                    imageData = `data:image/png;base64,${result.frameBuffer}`;
                }
            } else if (result.frameBuffer instanceof ArrayBuffer || result.frameBuffer instanceof Uint8Array) {
                // Convert binary to base64
                let uint8Array;
                if (result.frameBuffer instanceof ArrayBuffer) {
                    uint8Array = new Uint8Array(result.frameBuffer);
                } else {
                    uint8Array = result.frameBuffer;
                }

                let binary = '';
                const chunkSize = 8192;
                for (let i = 0; i < uint8Array.length; i += chunkSize) {
                    const chunk = uint8Array.slice(i, i + chunkSize);
                    binary += String.fromCharCode.apply(null, chunk);
                }
                const base64 = btoa(binary);
                imageData = `data:image/png;base64,${base64}`;
            }
            
            // Return object with both image data and settings file path
            return {
                imageData: imageData,
                settingsFile: result.settingsFile || null,
                isPinned: !!settingsFile
            };
        }

        throw new Error(result.error || 'Render failed with no error message');
    }

    /**
     * Get resolution dimensions from ProjectState
     * @returns {Object} Dimensions with w and h properties
     */
    getResolutionDimensions() {
        if (!this.projectStateManager) {
            console.warn('RenderPipelineService: No ProjectStateManager available, using fallback');
            return { w: 1920, h: 1080 };
        }

        const projectState = this.projectStateManager.getProjectState();
        if (!projectState) {
            console.warn('RenderPipelineService: No ProjectState available, using fallback');
            return { w: 1920, h: 1080 };
        }

        const dimensions = projectState.getResolutionDimensions();
        console.log('🎯 RenderPipelineService: Using dimensions from ProjectState:', dimensions);
        return dimensions;
    }

    /**
     * Register a callback for render completion
     * @param {Function} callback - Callback function
     * @returns {Function} Unregister function
     */
    onRenderComplete(callback) {
        this.renderCallbacks.add(callback);
        return () => {
            this.renderCallbacks.delete(callback);
        };
    }

    /**
     * Notify all callbacks of render completion
     * @param {Object} renderResult - Render result object with { imageData, settingsFile, isPinned }
     */
    notifyRenderComplete(renderResult) {
        console.log('✅ RenderPipeline: Render complete, notifying callbacks');
        this.renderCallbacks.forEach(callback => {
            try {
                callback(renderResult, null);
            } catch (error) {
                console.error('Error in render callback:', error);
            }
        });
    }

    /**
     * Notify all callbacks of render error
     * @param {Error} error - Render error
     */
    notifyRenderError(error) {
        console.error('❌ RenderPipeline: Render error, notifying callbacks');
        this.renderCallbacks.forEach(callback => {
            try {
                callback(null, error);
            } catch (callbackError) {
                console.error('Error in render error callback:', callbackError);
            }
        });
    }

    /**
     * Get current render result
     * @returns {string|null} Current render result
     */
    getCurrentRenderResult() {
        return this.renderResult;
    }

    /**
     * Check if currently rendering
     * @returns {boolean} True if rendering
     */
    getIsRendering() {
        return this.isRendering;
    }

    /**
     * Manual render trigger (for user-initiated renders)
     * @param {number} selectedFrame - Frame to render
     */
    triggerRender(selectedFrame = 0) {
        console.log('🎯 RenderPipeline: Manual render triggered');
        this.queueRender(selectedFrame);
    }

    /**
     * Cleanup and destroy the service
     */
    destroy() {
        // No longer auto-subscribing to ProjectState, so no cleanup needed
        // if (this.unsubscribeFromProjectState) {
        //     this.unsubscribeFromProjectState();
        // }
        if (this.renderDebounceTimer) {
            clearTimeout(this.renderDebounceTimer);
        }
        this.renderCallbacks.clear();
        this.isInitialized = false;
        console.log('💀 RenderPipelineService destroyed');
    }
}

export default RenderPipelineService;