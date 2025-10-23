import React, { useState, useEffect } from 'react';
import PreferencesService from '../services/PreferencesService.js';
import ResolutionMapper from '../utils/ResolutionMapper.js';
import ProjectState from '../models/ProjectState.js';
import useDebounce from '../hooks/useDebounce.js';
import './ProjectWizard.bem.css';

export default function ProjectWizard({ projectStateManager, onComplete, onCancel }) {
    const [step, setStep] = useState(1);
    const [artistName, setArtistName] = useState('artist');
    const [projectName, setProjectName] = useState('nft-studio-project');
    const [projectDirectory, setProjectDirectory] = useState('');
    const [isCompleting, setIsCompleting] = useState(false);

    // Debounced handlers for text inputs (300ms delay)
    const debouncedSetArtistName = useDebounce(setArtistName, 300);
    const debouncedSetProjectName = useDebounce(setProjectName, 300);

    // Load directory from preferences (artist and project use hardcoded defaults)
    useEffect(() => {
        const loadDefaults = async () => {
            try {
                // Clean up any corrupted preferences structure first
                await PreferencesService.cleanupPreferences();

                const lastDirectory = await PreferencesService.getLastProjectDirectory();

                console.log('🔍 Loading directory preference:', { lastDirectory });

                // Only load directory from preferences, artist and project use hardcoded defaults
                setProjectDirectory(lastDirectory || '');
            } catch (error) {
                console.error('Error loading defaults:', error);
            }
        };

        loadDefaults();
    }, []);

    const handleNext = () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleComplete = async () => {
        if (artistName && projectName && projectDirectory) {
            setIsCompleting(true);
            try {
                // Get user's preferred resolution
                const lastProjectInfo = await PreferencesService.getLastProjectInfo();
                const preferredResolution = lastProjectInfo.lastResolution
                    ? parseInt(lastProjectInfo.lastResolution)
                    : ResolutionMapper.getDefaultResolution();

                // Create ProjectState and initialize it in the ProjectStateManager
                const projectState = new ProjectState();
                projectState.setArtist(artistName);
                projectState.setProjectName(projectName);
                projectState.setOutputDirectory(projectDirectory);
                projectState.setTargetResolution(ResolutionMapper.isValidResolution(preferredResolution)
                    ? preferredResolution
                    : ResolutionMapper.getDefaultResolution());
                projectState.setIsHorizontal(false);
                projectState.setNumFrames(100);

                console.log('🚀 ProjectWizard created ProjectState with resolution:', projectState.getTargetResolution());

                // Initialize the shared ProjectStateManager with this project
                await projectStateManager.initialize(projectState, projectDirectory);

                // Save these values as preferences for next time
                await PreferencesService.saveLastProjectInfo(
                    projectName,
                    artistName,
                    null, // resolution
                    projectDirectory
                );

                // Pass a flag indicating the projectStateManager has been initialized
                onComplete({
                    projectInitialized: true,
                    projectConfig: projectState.exportForBackend() // Legacy compatibility if needed
                });
            } finally {
                setIsCompleting(false);
            }
        }
    };

    const selectDirectory = async () => {
        try {
            const result = await window.api.selectDirectory();
            if (result && !result.canceled && result.filePaths[0]) {
                setProjectDirectory(result.filePaths[0]);
            }
        } catch (error) {
            console.error('Error selecting directory:', error);
        }
    };

    const canProceed = () => {
        switch (step) {
            case 1:
                return artistName.trim() !== '';
            case 2:
                return projectName.trim() !== '';
            case 3:
                return projectDirectory !== '';
            default:
                return false;
        }
    };

    return (
        <div className="page-wizard">
            <div className="page-wizard__dialog">
                <div className="page-wizard__header">
                    <h2 className="page-wizard__title">New Project</h2>
                    <div className="page-wizard__steps">
                        <div className={`page-wizard__step ${step >= 1 ? 'page-wizard__step--active' : ''}`}>1</div>
                        <div className={`page-wizard__line ${step >= 2 ? 'page-wizard__line--active' : ''}`}></div>
                        <div className={`page-wizard__step ${step >= 2 ? 'page-wizard__step--active' : ''}`}>2</div>
                        <div className={`page-wizard__line ${step >= 3 ? 'page-wizard__line--active' : ''}`}></div>
                        <div className={`page-wizard__step ${step >= 3 ? 'page-wizard__step--active' : ''}`}>3</div>
                    </div>
                </div>

                <div className="page-wizard__body">
                    {step === 1 && (
                        <div className="page-wizard__content">
                            <label className="page-wizard__label">Artist Name</label>
                            <input
                                type="text"
                                className="page-wizard__input"
                                value={artistName}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setArtistName(value);
                                    debouncedSetArtistName(value);
                                }}
                                placeholder="Enter your artist name"
                                autoFocus
                            />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="page-wizard__content">
                            <label className="page-wizard__label">Project Name</label>
                            <input
                                type="text"
                                className="page-wizard__input"
                                value={projectName}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setProjectName(value);
                                    debouncedSetProjectName(value);
                                }}
                                placeholder="Enter project name"
                                autoFocus
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="page-wizard__content">
                            <label className="page-wizard__label">Project Directory</label>
                            <div className="page-wizard__directory-selector">
                                <input
                                    type="text"
                                    className="page-wizard__input"
                                    value={projectDirectory}
                                    readOnly
                                    placeholder="Select project directory"
                                />
                                <button
                                    className="page-wizard__browse-button"
                                    onClick={selectDirectory}
                                >
                                    Browse
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="page-wizard__footer">
                    <button className="page-wizard__button page-wizard__button--cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <div className="page-wizard__nav-buttons">
                        {step > 1 && (
                            <button className="page-wizard__button page-wizard__button--back" onClick={handleBack}>
                                Back
                            </button>
                        )}
                        <button
                            className="page-wizard__button page-wizard__button--next"
                            onClick={handleNext}
                            disabled={!canProceed() || isCompleting}
                        >
                            {isCompleting ? 'Creating...' : (step === 3 ? 'Create' : 'Next')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}