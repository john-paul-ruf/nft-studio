import React, { useState } from 'react';

const { ipcRenderer } = window.require('electron');

function EditProject({ onBack, onProjectLoaded }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [projectData, setProjectData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSelectFile = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await ipcRenderer.invoke('select-file', {
                filters: [
                    { name: 'Project Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                setSelectedFile(filePath);

                // Read and parse the project file
                const fileResult = await ipcRenderer.invoke('read-file', filePath);
                if (fileResult.success) {
                    const data = JSON.parse(fileResult.content);
                    setProjectData(data);
                } else {
                    setError(`Failed to read project file: ${fileResult.error}`);
                }
            }
        } catch (err) {
            setError(`Failed to load project: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleEditProject = () => {
        if (projectData) {
            onProjectLoaded(projectData);
        }
    };

    return (
        <div className="wizard">
            <div className="wizard-header">
                <h2>Edit Project</h2>
                <p>Load an existing project file to modify and regenerate</p>
            </div>

            {error && (
                <div style={{
                    background: '#fed7d7',
                    color: '#c53030',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                }}>
                    {error}
                </div>
            )}

            <div className="form-group">
                <label>Project File</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        value={selectedFile || ''}
                        placeholder="No file selected"
                        readOnly
                        style={{ flex: 1 }}
                    />
                    <button
                        type="button"
                        className="btn"
                        onClick={handleSelectFile}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Browse'}
                    </button>
                </div>
            </div>

            {projectData && (
                <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    marginTop: '1rem'
                }}>
                    <h3>Project Preview</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <p><strong>Name:</strong> {projectData.config?.finalFileName || 'Unknown'}</p>
                            <p><strong>Artist:</strong> {projectData.config?.artist || 'Unknown'}</p>
                            <p><strong>Frames:</strong> {projectData.config?.numberOfFrame || 'Unknown'}</p>
                        </div>
                        <div>
                            <p><strong>Resolution:</strong> {projectData.config?.longestSideInPixels}x{projectData.config?.shortestSideInPixels}</p>
                            <p><strong>Effects:</strong> {projectData.effects?.length || 0} primary, {projectData.finalImageEffects?.length || 0} final</p>
                        </div>
                    </div>

                    {projectData.effects && projectData.effects.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            <h4>Primary Effects:</h4>
                            <ul style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
                                {projectData.effects.map((effect, index) => (
                                    <li key={index}>
                                        {effect.effect?.name || effect.name || `Effect ${index + 1}`}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {projectData.finalImageEffects && projectData.finalImageEffects.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            <h4>Final Effects:</h4>
                            <ul style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
                                {projectData.finalImageEffects.map((effect, index) => (
                                    <li key={index}>
                                        {effect.effect?.name || effect.name || `Final Effect ${index + 1}`}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div className="wizard-navigation">
                <button className="btn btn-secondary" onClick={onBack}>
                    Back to Home
                </button>
                <button
                    className="btn"
                    onClick={handleEditProject}
                    disabled={!projectData}
                >
                    Edit in Wizard
                </button>
            </div>
        </div>
    );
}

export default EditProject;