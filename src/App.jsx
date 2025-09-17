import React from 'react';
import { ServiceProvider } from './contexts/ServiceContext';
import { useNavigation } from './hooks/useNavigation';
import Intro from './pages/Intro';
import ProjectWizard from './pages/ProjectWizard';
import Canvas from './pages/Canvas';
const ApplicationFactory = require('./ApplicationFactory');

/**
 * Main application router component
 * Follows Single Responsibility Principle - only handles view routing
 */
function AppRouter() {
    const { currentView, currentParams, navigateToWizard, navigateToCanvas, navigateToIntro } = useNavigation();

    const renderCurrentView = () => {
        switch (currentView) {
            case 'intro':
                return (
                    <Intro
                        onNewProject={navigateToWizard}
                        onEditProject={async () => {
                            try {
                                const result = await window.api.selectFile({
                                    filters: [
                                        { name: 'JSON Files', extensions: ['json'] },
                                        { name: 'All Files', extensions: ['*'] }
                                    ]
                                });

                                if (!result.canceled && result.filePaths?.[0]) {
                                    const filePath = result.filePaths[0];
                                    const projectResult = await window.api.loadProject(filePath);

                                    if (projectResult.success) {
                                        navigateToCanvas({
                                            projectConfig: projectResult.config,
                                            loadedFromFile: true,
                                            filePath
                                        });
                                    }
                                }
                            } catch (error) {
                                console.error('Error loading project:', error);
                            }
                        }}
                    />
                );
            case 'wizard':
                return (
                    <ProjectWizard
                        onComplete={(config) => {
                            navigateToCanvas({ projectConfig: config });
                        }}
                        onCancel={navigateToIntro}
                    />
                );
            case 'canvas':
                return <Canvas
                    projectConfig={currentParams.projectConfig}
                    onUpdateConfig={(updatedConfig) => {
                        // Update the current params with the new config
                        // This ensures the config changes are maintained during the session
                        currentParams.projectConfig = updatedConfig;
                    }}
                />;
            default:
                return (
                    <Intro
                        onNewProject={navigateToWizard}
                        onEditProject={async () => {
                            try {
                                const result = await window.api.selectFile({
                                    filters: [
                                        { name: 'JSON Files', extensions: ['json'] },
                                        { name: 'All Files', extensions: ['*'] }
                                    ]
                                });

                                if (!result.canceled && result.filePaths?.[0]) {
                                    const filePath = result.filePaths[0];
                                    const projectResult = await window.api.loadProject(filePath);

                                    if (projectResult.success) {
                                        navigateToCanvas({
                                            projectConfig: projectResult.config,
                                            loadedFromFile: true,
                                            filePath
                                        });
                                    }
                                }
                            } catch (error) {
                                console.error('Error loading project:', error);
                            }
                        }}
                    />
                );
        }
    };

    return (
        <div className="app">
            {renderCurrentView()}
        </div>
    );
}

/**
 * SOLID-compliant App component
 * Follows Dependency Inversion Principle - depends on abstractions (ApplicationFactory)
 * Follows Single Responsibility Principle - only provides services and renders router
 */
function App() {
    // Initialize application factory
    const contextValue = ApplicationFactory.createReactContextValue();

    return (
        <ServiceProvider value={contextValue}>
            <AppRouter />
        </ServiceProvider>
    );
}

export default App;