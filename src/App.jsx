import React from 'react';
import { ServiceProvider, useServices } from './contexts/ServiceContext.js';
import { ResolutionTrackingProvider } from './hooks/useGlobalResolutionTracking.js';
import { useNavigation } from './hooks/useNavigation.js';
import Intro from './pages/Intro.jsx';
import ProjectWizard from './pages/ProjectWizard.jsx';
import Canvas from './pages/Canvas.jsx';
import ProjectState from './models/ProjectState.js';
import ProjectPersistenceService from './services/ProjectPersistenceService.js';
import ApplicationFactory from './ApplicationFactory.js';

/**
 * Main application router component
 * Follows Single Responsibility Principle - only handles view routing
 */
function AppRouter() {
    const { currentView, currentParams, navigateToWizard, navigateToCanvas, navigateToIntro } = useNavigation();
    const { projectStateManager } = useServices();

    // Debug logging for router state
    console.log('🔍 App Router:', { currentView, currentParams });
    console.log('🔍 ProjectStateManager availability:', {
        projectStateManager: !!projectStateManager,
        type: typeof projectStateManager,
        methods: projectStateManager ? Object.getOwnPropertyNames(Object.getPrototypeOf(projectStateManager)) : 'N/A'
    });

    const renderCurrentView = () => {
        switch (currentView) {
            case 'intro':
                return (
                    <Intro
                        onNewProject={navigateToWizard}
                        onEditProject={async () => {
                            try {
                                console.log('🔍 Opening file dialog for project selection...');

                                const result = await window.api.selectFile({
                                    filters: [
                                        { name: 'NFT Project Files', extensions: ['nftproject'] },
                                        { name: 'JSON Files', extensions: ['json'] },
                                        { name: 'All Files', extensions: ['*'] }
                                    ]
                                });

                                if (!result.canceled && result.filePaths?.[0]) {
                                    const filePath = result.filePaths[0];
                                    console.log('📁 Selected project file:', filePath);

                                    try {
                                        // Load the project into the shared ProjectStateManager
                                        const projectState = await ProjectState.loadFromFile(filePath);

                                        if (projectState) {
                                            console.log('✅ Project loaded successfully:', projectState.getProjectName());

                                            // Get the directory from the file path
                                            const projectDirectory = filePath.substring(0, filePath.lastIndexOf('/'));

                                            // Initialize the shared ProjectStateManager with the loaded project
                                            await projectStateManager.initialize(projectState, projectDirectory);

                                            // Navigate to Canvas (manager is already initialized)
                                            console.log('🚀 Loading existing project - navigating to Canvas with params:', {
                                                projectInitialized: true,
                                                loadedFromFile: true,
                                                filePath
                                            });
                                            navigateToCanvas({
                                                projectInitialized: true,
                                                loadedFromFile: true,
                                                filePath
                                            });
                                        } else {
                                            // Fallback: try legacy loading for old JSON files
                                            console.log('🔄 Attempting legacy project loading...');
                                            const projectResult = await window.api.loadProject(filePath);

                                            if (projectResult.success) {
                                                const projectState = ProjectState.fromLegacyConfig(projectResult.config);

                                                // Get the directory from the file path
                                                const projectDirectory = filePath.substring(0, filePath.lastIndexOf('/'));

                                                // Initialize the shared ProjectStateManager with the loaded project
                                                await projectStateManager.initialize(projectState, projectDirectory);

                                                console.log('🚀 Legacy project loading - navigating to Canvas with params:', {
                                                    projectInitialized: true,
                                                    loadedFromFile: true,
                                                    filePath
                                                });
                                                navigateToCanvas({
                                                    projectInitialized: true,
                                                    loadedFromFile: true,
                                                    filePath
                                                });
                                            } else {
                                                console.error('❌ Failed to load project:', projectResult.error);
                                                alert('Failed to load project: ' + projectResult.error);
                                            }
                                        }
                                    } catch (loadError) {
                                        console.error('❌ Error loading project file:', loadError);
                                        alert('Error loading project: ' + loadError.message);
                                    }
                                }
                            } catch (error) {
                                console.error('❌ Error opening file dialog:', error);
                                alert('Error opening file dialog: ' + error.message);
                            }
                        }}
                    />
                );
            case 'wizard':
                return (
                    <ProjectWizard
                        projectStateManager={projectStateManager}
                        onComplete={(config) => {
                            console.log('🚀 ProjectWizard onComplete - navigating to Canvas with config:', config);
                            navigateToCanvas({ projectConfig: config });
                        }}
                        onCancel={navigateToIntro}
                    />
                );
            case 'canvas':
                return <Canvas
                    projectStateManager={projectStateManager}
                    projectData={currentParams}
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
            <ResolutionTrackingProvider>
                <AppRouter />
            </ResolutionTrackingProvider>
        </ServiceProvider>
    );
}

export default App;