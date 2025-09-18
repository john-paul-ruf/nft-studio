import { useState, useEffect } from 'react';
import PreferencesService from '../services/PreferencesService.js';
import ResolutionMapper from '../utils/ResolutionMapper.js';

/**
 * Custom hook to load initial resolution from preferences
 * Returns null until loaded to prevent rendering with wrong resolution
 */
export function useInitialResolution(projectConfig) {
    const [initialResolution, setInitialResolution] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const loadInitialResolution = async () => {
            try {
                // If projectConfig has a resolution, use it
                if (projectConfig?.targetResolution) {
                    setInitialResolution(projectConfig.targetResolution);
                    setIsLoaded(true);
                    return;
                }

                // Load from preferences
                const lastProjectInfo = await PreferencesService.getLastProjectInfo();
                const savedResolution = lastProjectInfo.lastResolution;

                let targetResolution;
                if (savedResolution) {
                    const parsed = parseInt(savedResolution);
                    targetResolution = ResolutionMapper.isValidResolution(parsed)
                        ? parsed
                        : ResolutionMapper.getDefaultResolution();
                } else {
                    targetResolution = ResolutionMapper.getDefaultResolution();
                }

                console.log('📏 Initial resolution loaded:', targetResolution, 'from saved:', savedResolution);
                setInitialResolution(targetResolution);
                setIsLoaded(true);
            } catch (error) {
                console.error('❌ Failed to load initial resolution:', error);
                setInitialResolution(ResolutionMapper.getDefaultResolution());
                setIsLoaded(true);
            }
        };

        loadInitialResolution();
    }, [projectConfig]);

    return { initialResolution, isLoaded };
}