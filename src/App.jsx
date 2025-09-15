import React, { useState } from 'react';
import WelcomeScreen from './pages/WelcomeScreen';
import NewProjectWizard from './pages/NewProjectWizard';
import ResumeProject from './pages/ResumeProject';
import EditProject from './pages/EditProject';
import EventBusDisplay from './components/EventBusDisplay';

const { ipcRenderer } = window.require('electron');

function App() {
    const [currentView, setCurrentView] = useState('welcome');
    const [projectData, setProjectData] = useState(null);
    const [eventBus, setEventBus] = useState(null);

    const renderCurrentView = () => {
        switch (currentView) {
            case 'welcome':
                return <WelcomeScreen onNavigate={setCurrentView} />;
            case 'new':
                return (
                    <NewProjectWizard
                        onBack={() => setCurrentView('welcome')}
                        onProjectCreated={(data) => {
                            setProjectData(data);
                            // Don't start generation here - it's already started in NewProjectWizard step 6
                            // This was causing duplicate generations
                        }}
                        onEventBusCreated={setEventBus}
                    />
                );
            case 'resume':
                return (
                    <ResumeProject
                        onBack={() => setCurrentView('welcome')}
                        onEventBusCreated={setEventBus}
                    />
                );
            case 'edit':
                return (
                    <EditProject
                        onBack={() => setCurrentView('welcome')}
                        onProjectLoaded={(data) => {
                            setProjectData(data);
                            setCurrentView('wizard');
                        }}
                    />
                );
            case 'generation':
                return (
                    <div className="generation-view">
                        <div className="generation-header">
                            <h2>Generating: {projectData?.projectName}</h2>
                            <button onClick={() => setCurrentView('welcome')}>
                                Back to Home
                            </button>
                        </div>
                        <EventBusDisplay eventBus={eventBus} />
                    </div>
                );
            default:
                return <WelcomeScreen onNavigate={setCurrentView} />;
        }
    };

    return (
        <div className="app">
            <div className="app-header">
                <h1>🎨 NFT Studio</h1>
                <p>Professional NFT Generation Suite</p>
            </div>
            <div className="app-content">
                {renderCurrentView()}
            </div>
        </div>
    );
}

export default App;