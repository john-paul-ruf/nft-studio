import React, { useState } from 'react';
import ColorSchemeDropdown from '../components/ColorSchemeDropdown';
import EffectWizard from '../components/EffectWizard';

const { ipcRenderer } = window.require('electron');

function NewProjectWizard({ onBack, onProjectCreated, onEventBusCreated }) {
    const [step, setStep] = useState(1);
    const [projectData, setProjectData] = useState({
        projectName: '',
        artist: '',
        colorScheme: 'neon',
        numberOfFrames: 1800,
        resolution: 'hd',
        projectDirectory: '',
        customColors: {
            neutrals: ['#FFFFFF'],
            backgrounds: ['#000000'],
            lights: ['#FFFF00', '#FF00FF', '#00FFFF', '#FF0000', '#00FF00', '#0000FF']
        }
    });
    const [showColorCreator, setShowColorCreator] = useState(false);
    const [effects, setEffects] = useState({
        primary: [],
        secondary: [],
        keyFrame: [],
        final: []
    });

    const colorSchemes = [
        { id: 'neon', name: 'Neon Lights', description: 'Vibrant cyberpunk colors' },
        { id: 'earth', name: 'Earthen Tones', description: 'Natural, organic colors' },
        { id: 'celestial', name: 'Celestial Vault', description: 'Deep space colors' },
        { id: 'custom', name: 'Custom', description: 'Define your own colors' }
    ];

    const resolutions = [
        { id: 'hd', name: '1920x1080 (HD)', width: 1920, height: 1080 },
        { id: 'square', name: '1080x1080 (Square)', width: 1080, height: 1080 },
        { id: '4k', name: '3840x2160 (4K)', width: 3840, height: 2160 }
    ];

    const handleSelectDirectory = async () => {
        try {
            const result = await ipcRenderer.invoke('select-folder');
            if (!result.canceled && result.filePaths.length > 0) {
                setProjectData({...projectData, projectDirectory: result.filePaths[0]});
            }
        } catch (error) {
            console.error('Failed to select directory:', error);
        }
    };

    const handleNext = () => {
        if (step < 5) {
            setStep(step + 1);
        } else {
            // Final step - create and save project
            createProject();
        }
    };

    const createProject = async () => {
        try {
            const fullProjectData = {
                ...projectData,
                effects,
                createdAt: new Date().toISOString()
            };

            // Save project configuration
            const projectConfigPath = `${projectData.projectDirectory}/${projectData.projectName}-config.json`;
            const saveResult = await ipcRenderer.invoke('write-file', projectConfigPath, JSON.stringify(fullProjectData, null, 2));

            if (saveResult.success) {
                onProjectCreated(fullProjectData);
            } else {
                console.error('Failed to save project:', saveResult.error);
                alert('Failed to save project configuration: ' + saveResult.error);
            }
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Error creating project: ' + error.message);
        }
    };

    const handlePrevious = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            onBack();
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h3>Project Settings</h3>
                        <div className="form-group">
                            <label>Project Name</label>
                            <input
                                type="text"
                                value={projectData.projectName}
                                onChange={(e) => setProjectData({...projectData, projectName: e.target.value})}
                                placeholder="My Awesome NFT Project"
                            />
                        </div>
                        <div className="form-group">
                            <label>Artist Name</label>
                            <input
                                type="text"
                                value={projectData.artist}
                                onChange={(e) => setProjectData({...projectData, artist: e.target.value})}
                                placeholder="Your Name"
                            />
                        </div>
                        <div className="form-group">
                            <label>Number of Frames</label>
                            <select
                                value={projectData.numberOfFrames}
                                onChange={(e) => setProjectData({...projectData, numberOfFrames: parseInt(e.target.value)})}
                            >
                                <option value={900}>900 frames (30s at 30fps)</option>
                                <option value={1800}>1800 frames (60s at 30fps)</option>
                                <option value={3600}>3600 frames (120s at 30fps)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Resolution</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {resolutions.map(res => (
                                    <div
                                        key={res.id}
                                        className={`welcome-card ${projectData.resolution === res.id ? 'selected' : ''}`}
                                        onClick={() => setProjectData({...projectData, resolution: res.id})}
                                        style={{ padding: '1rem', cursor: 'pointer' }}
                                    >
                                        <h4>{res.name}</h4>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div>
                        <h3>Project Location</h3>
                        <p>Choose where to save your NFT project files</p>
                        <div className="form-group">
                            <label>Project Directory</label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={projectData.projectDirectory}
                                    placeholder="No directory selected"
                                    readOnly
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={handleSelectDirectory}
                                >
                                    Browse
                                </button>
                            </div>
                            {!projectData.projectDirectory && (
                                <p style={{ color: '#e53e3e', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                    Please select a directory to save your project files
                                </p>
                            )}
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div>
                        <h3>Color Scheme</h3>
                        <p>Choose a color palette for your NFT project:</p>
                        <div style={{ marginTop: '1.5rem', maxWidth: '500px' }}>
                            <ColorSchemeDropdown
                                value={projectData.colorScheme}
                                onChange={(schemeId) => setProjectData({...projectData, colorScheme: schemeId})}
                                projectData={projectData}
                                showPreview={true}
                            />
                        </div>

                        {projectData.colorScheme && (
                            <div style={{
                                marginTop: '2rem',
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                border: '1px solid #333'
                            }}>
                                <h4 style={{ margin: '0 0 1rem 0' }}>Selected Color Scheme Preview</h4>
                                <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                                    Your chosen colors will be used throughout the NFT generation process.
                                    Effects will randomly select from these color buckets to create dynamic variations.
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 4:
                return (
                    <EffectWizard
                        onBack={() => setStep(3)}
                        onEffectsCreated={(createdEffects) => {
                            setEffects(createdEffects);
                            setStep(5);
                        }}
                        projectData={projectData}
                    />
                );
            case 5:
                const totalEffects = Object.values(effects).flat().length;
                return (
                    <div>
                        <h3>Review & Create Project</h3>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '8px' }}>
                            <h4>Project Summary</h4>
                            <p><strong>Name:</strong> {projectData.projectName}</p>
                            <p><strong>Artist:</strong> {projectData.artist}</p>
                            <p><strong>Directory:</strong> {projectData.projectDirectory}</p>
                            <p><strong>Frames:</strong> {projectData.numberOfFrames}</p>
                            <p><strong>Resolution:</strong> {resolutions.find(r => r.id === projectData.resolution)?.name}</p>
                            <p><strong>Color Scheme:</strong> {projectData.colorScheme}</p>
                            <p><strong>Effects:</strong> {totalEffects} total effects configured</p>
                        </div>

                        {totalEffects > 0 ? (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,255,0,0.1)', borderRadius: '8px' }}>
                                <p><strong>✅ Ready to Generate!</strong></p>
                                <p>Your project is fully configured with {totalEffects} effects. Click "Create Project" to save the configuration and start generation.</p>
                            </div>
                        ) : (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,0,0.1)', borderRadius: '8px' }}>
                                <p><strong>⚠️ No Effects Configured</strong></p>
                                <p>Your project will generate, but it may appear blank without any effects. You can add effects later or go back to configure them now.</p>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="wizard">
            <div className="wizard-header">
                <h2>New Project Wizard</h2>
                <div className="wizard-steps">
                    <div className={`wizard-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                        1. Project Settings
                    </div>
                    <div className={`wizard-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                        2. Location
                    </div>
                    <div className={`wizard-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
                        3. Color Scheme
                    </div>
                    <div className={`wizard-step ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}>
                        4. Effects
                    </div>
                    <div className={`wizard-step ${step >= 5 ? 'active' : ''}`}>
                        5. Review
                    </div>
                </div>
            </div>

            {renderStep()}

            <div className="wizard-navigation">
                <button className="btn btn-secondary" onClick={handlePrevious}>
                    {step === 1 ? 'Back to Home' : 'Previous'}
                </button>
                <button
                    className="btn"
                    onClick={handleNext}
                    disabled={
                        (step === 1 && (!projectData.projectName || !projectData.artist)) ||
                        (step === 2 && !projectData.projectDirectory)
                    }
                >
                    {step === 4 ? 'Create Project' : 'Next'}
                </button>
            </div>
        </div>
    );
}

export default NewProjectWizard;