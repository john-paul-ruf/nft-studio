/**
 * Test suite for the main App component
 * Verifies routing, navigation, and component rendering
 */

import { createMockProjectConfig, createMockFileResult, createMockApiResponse, resetApiMocks, setupSuccessfulApiMocks } from './helpers/testUtils.js';

describe('App Component', () => {
    let mockUseNavigation;
    let App;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        resetApiMocks();

        // Mock the navigation hook
        mockUseNavigation = {
            currentView: 'intro',
            currentParams: {},
            navigateToWizard: jest.fn(),
            navigateToCanvas: jest.fn(),
            navigateToIntro: jest.fn()
        };

        // Mock the useNavigation hook
        jest.doMock('../src/hooks/useNavigation', () => ({
            useNavigation: () => mockUseNavigation
        }));

        // Mock the ApplicationFactory
        jest.doMock('../src/ApplicationFactory', () => ({
            createReactContextValue: jest.fn(() => ({
                projectService: {},
                effectService: {},
                fileService: {},
                navigationService: {},
                colorSchemeService: {},
                preferencesService: {}
            }))
        }));

        // Mock React components to avoid rendering complexity
        jest.doMock('../src/pages/Intro', () => {
            return function MockIntro({ onNewProject, onEditProject }) {
                return {
                    type: 'MockIntro',
                    props: { onNewProject, onEditProject }
                };
            };
        });

        jest.doMock('../src/pages/ProjectWizard', () => {
            return function MockProjectWizard({ onComplete, onCancel }) {
                return {
                    type: 'MockProjectWizard',
                    props: { onComplete, onCancel }
                };
            };
        });

        jest.doMock('../src/pages/Canvas', () => {
            return function MockCanvas({ projectConfig }) {
                return {
                    type: 'MockCanvas',
                    props: { projectConfig }
                };
            };
        });

        // Import App after mocks are set up
        App = require('../src/App.jsx').default;
    });

    afterEach(() => {
        jest.resetModules();
    });

    describe('Routing', () => {
        test('should render Intro component when currentView is intro', () => {
            mockUseNavigation.currentView = 'intro';

            const result = App();
            const router = result.props.children;
            const view = router.props.children();

            expect(view.type).toBe('MockIntro');
            expect(typeof view.props.onNewProject).toBe('function');
            expect(typeof view.props.onEditProject).toBe('function');
        });

        test('should render ProjectWizard component when currentView is wizard', () => {
            mockUseNavigation.currentView = 'wizard';

            const result = App();
            const router = result.props.children;
            const view = router.props.children();

            expect(view.type).toBe('MockProjectWizard');
            expect(typeof view.props.onComplete).toBe('function');
            expect(typeof view.props.onCancel).toBe('function');
        });

        test('should render Canvas component when currentView is canvas', () => {
            const mockConfig = createMockProjectConfig();
            mockUseNavigation.currentView = 'canvas';
            mockUseNavigation.currentParams = { projectConfig: mockConfig };

            const result = App();
            const router = result.props.children;
            const view = router.props.children();

            expect(view.type).toBe('MockCanvas');
            expect(view.props.projectConfig).toEqual(mockConfig);
        });

        test('should render Intro component for unknown currentView', () => {
            mockUseNavigation.currentView = 'unknown';

            const result = App();
            const router = result.props.children;
            const view = router.props.children();

            expect(view.type).toBe('MockIntro');
        });
    });

    describe('Navigation Handlers', () => {
        test('onNewProject should call navigateToWizard', () => {
            mockUseNavigation.currentView = 'intro';

            const result = App();
            const router = result.props.children;
            const view = router.props.children();

            // Call the onNewProject handler
            view.props.onNewProject();

            expect(mockUseNavigation.navigateToWizard).toHaveBeenCalled();
        });

        test('wizard onComplete should call navigateToCanvas with config', () => {
            mockUseNavigation.currentView = 'wizard';
            const mockConfig = createMockProjectConfig();

            const result = App();
            const router = result.props.children;
            const view = router.props.children();

            // Call the onComplete handler
            view.props.onComplete(mockConfig);

            expect(mockUseNavigation.navigateToCanvas).toHaveBeenCalledWith({
                projectConfig: mockConfig
            });
        });

        test('wizard onCancel should call navigateToIntro', () => {
            mockUseNavigation.currentView = 'wizard';

            const result = App();
            const router = result.props.children;
            const view = router.props.children();

            // Call the onCancel handler
            view.props.onCancel();

            expect(mockUseNavigation.navigateToIntro).toHaveBeenCalled();
        });
    });

    describe('Edit Project Functionality', () => {
        test('onEditProject should open file dialog and navigate to canvas on success', async () => {
            setupSuccessfulApiMocks();
            mockUseNavigation.currentView = 'intro';

            const mockConfig = createMockProjectConfig();
            window.api.selectFile.mockResolvedValue(createMockFileResult());
            window.api.loadProject.mockResolvedValue(createMockApiResponse(true, mockConfig));

            const result = App();
            const router = result.props.children;
            const view = router.props.children();

            // Call the onEditProject handler
            await view.props.onEditProject();

            expect(window.api.selectFile).toHaveBeenCalledWith({
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            expect(window.api.loadProject).toHaveBeenCalledWith('/test/path/project.json');

            expect(mockUseNavigation.navigateToCanvas).toHaveBeenCalledWith({
                projectConfig: mockConfig,
                loadedFromFile: true,
                filePath: '/test/path/project.json'
            });
        });

        test('onEditProject should handle canceled file dialog', async () => {
            mockUseNavigation.currentView = 'intro';

            window.api.selectFile.mockResolvedValue({ canceled: true });

            const result = App();
            const router = result.props.children;
            const view = router.props.children();

            // Call the onEditProject handler
            await view.props.onEditProject();

            expect(window.api.selectFile).toHaveBeenCalled();
            expect(window.api.loadProject).not.toHaveBeenCalled();
            expect(mockUseNavigation.navigateToCanvas).not.toHaveBeenCalled();
        });

        test('onEditProject should handle file loading errors', async () => {
            mockUseNavigation.currentView = 'intro';

            window.api.selectFile.mockResolvedValue(createMockFileResult());
            window.api.loadProject.mockResolvedValue(createMockApiResponse(false, null, 'File not found'));

            const result = App();
            const router = result.props.children;
            const view = router.props.children();

            // Call the onEditProject handler
            await view.props.onEditProject();

            expect(window.api.selectFile).toHaveBeenCalled();
            expect(window.api.loadProject).toHaveBeenCalled();
            expect(mockUseNavigation.navigateToCanvas).not.toHaveBeenCalled();
        });

        test('onEditProject should handle API errors gracefully', async () => {
            mockUseNavigation.currentView = 'intro';

            window.api.selectFile.mockRejectedValue(new Error('API Error'));

            const result = App();
            const router = result.props.children;
            const view = router.props.children();

            // Call the onEditProject handler
            await view.props.onEditProject();

            expect(window.api.selectFile).toHaveBeenCalled();
            expect(mockUseNavigation.navigateToCanvas).not.toHaveBeenCalled();
            // Should log error but not crash
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('Service Context Integration', () => {
        test('should provide service context to components', () => {
            const result = App();

            expect(result.type.name).toBe('ServiceProvider');
            expect(result.props.value).toBeDefined();
            expect(typeof result.props.children).toBe('object');
        });
    });
});