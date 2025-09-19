import React, { useState, useEffect } from 'react';
import PreferencesService from '../services/PreferencesService.js';
import ResolutionMapper from '../utils/ResolutionMapper.js';
import ProjectState from '../models/ProjectState.js';
import ProjectPersistenceService from '../services/ProjectPersistenceService.js';
import './ProjectWizard.css';

export default function ProjectWizard({ onComplete, onCancel }) {
    const [step, setStep] = useState(1);
    const [artistName, setArtistName] = useState('');
    const [projectName, setProjectName] = useState('');
    const [projectDirectory, setProjectDirectory] = useState('');
    const [isCompleting, setIsCompleting] = useState(false);

    // Load default values from preferences
    useEffect(() => {
        const loadDefaults = async () => {
            try {
                // Clean up any corrupted preferences structure first
                await PreferencesService.cleanupPreferences();

                const lastArtist = await PreferencesService.getLastArtist();
                const lastProjectName = await PreferencesService.getLastProjectName();
                const lastDirectory = await PreferencesService.getLastProjectDirectory();

                console.log('🔍 Loading preferences:', { lastArtist, lastProjectName, lastDirectory });

                // Set values even if they're empty strings (user might have cleared them intentionally)
                setArtistName(lastArtist || '');
                setProjectName(lastProjectName || '');
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

                // Create ProjectState instead of plain config
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

                // Create persistence service and save project
                const persistenceService = new ProjectPersistenceService();
                persistenceService.setCurrentProject(projectState, projectDirectory);

                // Save these values as preferences for next time
                await PreferencesService.saveLastProjectInfo(
                    projectName,
                    artistName,
                    null, // resolution
                    projectDirectory
                );

                // Pass the ProjectState to the completion handler
                onComplete({
                    projectState: projectState.toJSON(),
                    projectConfig: projectState.exportForBackend(), // Legacy compatibility
                    persistenceService: persistenceService
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
        <div className="wizard-container">
            <div className="wizard-content">
                <div className="wizard-header">
                    <h2>New Project</h2>
                    <div className="wizard-steps">
                        <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
                        <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
                        <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
                        <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
                        <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
                    </div>
                </div>

                <div className="wizard-body">
                    {step === 1 && (
                        <div className="wizard-step-content">
                            <label className="wizard-label">Artist Name</label>
                            <input
                                type="text"
                                className="wizard-input"
                                value={artistName}
                                onChange={(e) => setArtistName(e.target.value)}
                                placeholder="Enter your artist name"
                                autoFocus
                            />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="wizard-step-content">
                            <label className="wizard-label">Project Name</label>
                            <input
                                type="text"
                                className="wizard-input"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="Enter project name"
                                autoFocus
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="wizard-step-content">
                            <label className="wizard-label">Project Directory</label>
                            <div className="directory-selector">
                                <input
                                    type="text"
                                    className="wizard-input"
                                    value={projectDirectory}
                                    readOnly
                                    placeholder="Select project directory"
                                />
                                <button
                                    className="browse-button"
                                    onClick={selectDirectory}
                                >
                                    Browse
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="wizard-footer">
                    <button className="wizard-button cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <div className="wizard-nav-buttons">
                        {step > 1 && (
                            <button className="wizard-button back" onClick={handleBack}>
                                Back
                            </button>
                        )}
                        <button
                            className="wizard-button next"
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