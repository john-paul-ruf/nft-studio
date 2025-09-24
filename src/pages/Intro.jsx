import React, { useEffect, useState } from 'react';
import PreferencesService from '../services/PreferencesService.js';
import { useServices } from '../contexts/ServiceContext.js';
import './Intro.css';

export default function Intro({ onNewProject, onEditProject }) {
    const { eventBusService } = useServices();
    const [preferencesInitialized, setPreferencesInitialized] = useState(false);

    useEffect(() => {
        // Initialize default preferences on app startup
        initializeDefaultPreferences();
    }, []);

    const initializeDefaultPreferences = async () => {
        try {
            // This will automatically create default preferences if they don't exist
            const prefs = await PreferencesService.getPreferences();
            setPreferencesInitialized(true);
        } catch (error) {
            console.error('Failed to initialize preferences:', error);
            setPreferencesInitialized(true); // Continue anyway
        }
    };

    const handleResumeLoop = async () => {
        try {
            // Open file dialog for *-settings.json files
            const result = await window.api.selectFile({
                filters: [
                    { name: 'Settings Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
            });

            if (!result.canceled && result.filePaths?.[0]) {
                const settingsPath = result.filePaths[0];

                // Validate it's a settings file
                if (!settingsPath.includes('-settings.json')) {
                    console.warn('⚠️ Selected file is not a settings file:', settingsPath);
                    // Still proceed - user might have renamed the file
                }

                // Emit event for resume loop
                console.log('🎨 Intro: About to emit project:resume event with settingsPath:', settingsPath);
                eventBusService.emit('project:resume', { settingsPath }, {
                    source: 'Intro',
                    component: 'Intro'
                });
                console.log('🎨 Intro: project:resume event emitted');
            }
        } catch (error) {
            console.error('❌ Error resuming loop:', error);
        }
    };


    return (
        <div className="intro-screen">
            <div className="intro-content">
                <h1 className="intro-title">NFT Studio</h1>
                <div className="intro-buttons">
                    <button
                        className="intro-button new-project"
                        onClick={onNewProject}
                        disabled={!preferencesInitialized}
                    >
                        <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                        <span>New Project</span>
                    </button>
                    <button
                        className="intro-button edit-project"
                        onClick={onEditProject}
                        disabled={!preferencesInitialized}
                    >
                        <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        <span>Edit Project</span>
                    </button>
                    <button
                        className="intro-button resume-loop"
                        onClick={handleResumeLoop}
                        disabled={!preferencesInitialized}
                    >
                        <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span>Resume Loop</span>
                    </button>
                </div>
            </div>
        </div>
    );
}