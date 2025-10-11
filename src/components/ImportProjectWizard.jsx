import React, { useState } from 'react';
import SettingsToProjectConverter from '../utils/SettingsToProjectConverter.js';
import ProjectState from '../models/ProjectState.js';
import useDebounce from '../hooks/useDebounce.js';
import './ImportProjectWizard.css';

export default function ImportProjectWizard({ onComplete, onCancel }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [projectName, setProjectName] = useState('');
    const [projectLocation, setProjectLocation] = useState('');
    const [settingsFile, setSettingsFile] = useState('');
    const [converting, setConverting] = useState(false);
    const [error, setError] = useState('');

    // Debounced handler for project name input (300ms delay)
    const debouncedSetProjectName = useDebounce(setProjectName, 300);

    const steps = [
        { title: 'Project Name', description: 'Enter a name for your new project' },
        { title: 'Project Location', description: 'Choose where to save your project' },
        { title: 'Settings File', description: 'Select the settings file to import from' }
    ];

    const handleNext = async () => {
        setError('');

        if (currentStep === 0) {
            if (!projectName.trim()) {
                setError('Project name is required');
                return;
            }
        } else if (currentStep === 1) {
            if (!projectLocation) {
                setError('Project location is required');
                return;
            }
        } else if (currentStep === 2) {
            if (!settingsFile) {
                setError('Settings file is required');
                return;
            }

            // Final step - perform conversion
            await handleImport();
            return;
        }

        setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        setError('');
        setCurrentStep(prev => prev - 1);
    };

    const handleSelectProjectLocation = async () => {
        try {
            const result = await window.api.selectDirectory();
            if (!result.canceled && result.filePaths?.[0]) {
                setProjectLocation(result.filePaths[0]);
                setError('');
            }
        } catch (error) {
            setError('Failed to select directory: ' + error.message);
        }
    };

    const handleSelectSettingsFile = async () => {
        try {
            const result = await window.api.selectFile({
                filters: [
                    { name: 'Settings Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
            });

            if (!result.canceled && result.filePaths?.[0]) {
                const filePath = result.filePaths[0];
                setSettingsFile(filePath);
                setError('');

                // Auto-populate project name if not set
                if (!projectName.trim()) {
                    const fileName = filePath.split('/').pop();
                    const nameFromFile = fileName.replace('-settings.json', '').replace('.json', '');
                    setProjectName(nameFromFile);
                }
            }
        } catch (error) {
            setError('Failed to select file: ' + error.message);
        }
    };

    const handleImport = async () => {
        setConverting(true);
        setError('');

        try {
            // Read and validate settings file
            const fileResult = await window.api.readFile(settingsFile);

            if (!fileResult.success) {
                throw new Error(fileResult.error || 'Failed to read settings file');
            }

            const settings = JSON.parse(fileResult.content);

            // Validate settings file
            const validation = SettingsToProjectConverter.validateSettingsFile(settings);
            if (validation.length > 0) {
                throw new Error('Invalid settings file: ' + validation.join(', '));
            }

            // Convert settings to project format with custom name
            // Skip position scaling for imported projects - positions are already correct
            const projectData = await SettingsToProjectConverter.convertSettingsToProject(
                settings,
                projectName.trim(),
                false,  // serializeForIPC
                true    // skipPositionScaling - important for imports!
            );

            // Override the output directory to match the selected project location
            // This ensures renders go to the user's chosen directory, not the original settings location
            projectData.outputDirectory = projectLocation;
            console.log('📁 Set output directory to project location:', projectLocation);

            // Create project state
            const projectState = new ProjectState(projectData);

            // Save project file
            const projectFilePath = `${projectLocation}/${projectName.trim()}.nftproject`;
            await projectState.saveToFile(projectFilePath);

            // Complete the wizard
            onComplete({
                projectState,
                projectDirectory: projectLocation,
                filePath: projectFilePath,
                convertedFromSettings: true,
                settingsFile
            });

        } catch (error) {
            setError('Import failed: ' + error.message);
            setConverting(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="wizard-step">
                        <label className="form-label">
                            Project Name:
                            <input
                                type="text"
                                className="form-input"
                                value={projectName}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setProjectName(value);
                                    debouncedSetProjectName(value);
                                }}
                                placeholder="Enter project name"
                                autoFocus
                            />
                        </label>
                    </div>
                );

            case 1:
                return (
                    <div className="wizard-step">
                        <label className="form-label">
                            Project Location:
                            <div className="file-picker">
                                <input
                                    type="text"
                                    className="form-input"
                                    value={projectLocation}
                                    placeholder="Select folder..."
                                    readOnly
                                />
                                <button
                                    className="select-button"
                                    onClick={handleSelectProjectLocation}
                                    type="button"
                                >
                                    Browse
                                </button>
                            </div>
                        </label>
                    </div>
                );

            case 2:
                return (
                    <div className="wizard-step">
                        <label className="form-label">
                            Settings File:
                            <div className="file-picker">
                                <input
                                    type="text"
                                    className="form-input"
                                    value={settingsFile}
                                    placeholder="Select settings file..."
                                    readOnly
                                />
                                <button
                                    className="select-button"
                                    onClick={handleSelectSettingsFile}
                                    type="button"
                                >
                                    Browse
                                </button>
                            </div>
                        </label>
                        {settingsFile && (
                            <div className="file-info">
                                <small>Selected: {settingsFile.split('/').pop()}</small>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="import-wizard-overlay">
            <div className="import-wizard">
                <div className="wizard-header">
                    <h2>Import Project from Settings</h2>
                    <button className="close-button" onClick={onCancel}>×</button>
                </div>

                <div className="wizard-progress">
                    {steps.map((step, index) => (
                        <div
                            key={index}
                            className={`progress-step ${index <= currentStep ? 'active' : ''} ${index === currentStep ? 'current' : ''}`}
                        >
                            <div className="step-number">{index + 1}</div>
                            <div className="step-info">
                                <div className="step-title">{step.title}</div>
                                <div className="step-description">{step.description}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="wizard-content">
                    {renderStepContent()}

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}
                </div>

                <div className="wizard-actions">
                    <button
                        className="wizard-button secondary"
                        onClick={onCancel}
                        disabled={converting}
                    >
                        Cancel
                    </button>

                    {currentStep > 0 && (
                        <button
                            className="wizard-button secondary"
                            onClick={handleBack}
                            disabled={converting}
                        >
                            Back
                        </button>
                    )}

                    <button
                        className="wizard-button primary"
                        onClick={handleNext}
                        disabled={converting}
                    >
                        {converting ? 'Converting...' : currentStep === steps.length - 1 ? 'Import' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
}