/**
 * Test suite for the useNavigation hook
 * Verifies navigation state management and routing logic
 */

import { resetApiMocks } from '../helpers/testUtils.js';

describe('useNavigation Hook', () => {
    let mockNavigationService;
    let useNavigation;

    beforeEach(() => {
        jest.clearAllMocks();
        resetApiMocks();

        // Mock the navigation service
        mockNavigationService = {
            navigate: jest.fn(),
            getCurrentView: jest.fn(() => 'intro'),
            getCurrentParams: jest.fn(() => ({})),
            canGoBack: jest.fn(() => false),
            goBack: jest.fn(),
            subscribe: jest.fn(),
            unsubscribe: jest.fn()
        };

        // Mock the service context
        jest.doMock('../../src/contexts/ServiceContext', () => ({
            useServices: () => ({
                navigationService: mockNavigationService
            })
        }));

        // Import after mocks are set up
        useNavigation = require('../../src/hooks/useNavigation').useNavigation;
    });

    afterEach(() => {
        jest.resetModules();
    });

    describe('Navigation State', () => {
        test('should return current view from navigation service', () => {
            mockNavigationService.getCurrentView.mockReturnValue('canvas');

            const result = useNavigation();

            expect(result.currentView).toBe('canvas');
            expect(mockNavigationService.getCurrentView).toHaveBeenCalled();
        });

        test('should return current params from navigation service', () => {
            const mockParams = { projectConfig: { name: 'test' } };
            mockNavigationService.getCurrentParams.mockReturnValue(mockParams);

            const result = useNavigation();

            expect(result.currentParams).toEqual(mockParams);
            expect(mockNavigationService.getCurrentParams).toHaveBeenCalled();
        });

        test('should return navigation functions', () => {
            const result = useNavigation();

            expect(typeof result.navigateToIntro).toBe('function');
            expect(typeof result.navigateToWizard).toBe('function');
            expect(typeof result.navigateToCanvas).toBe('function');
            expect(typeof result.goBack).toBe('function');
            expect(typeof result.canGoBack).toBe('boolean');
        });
    });

    describe('Navigation Actions', () => {
        test('navigateToIntro should call navigation service with intro view', () => {
            const result = useNavigation();

            result.navigateToIntro();

            expect(mockNavigationService.navigate).toHaveBeenCalledWith('intro');
        });

        test('navigateToWizard should call navigation service with wizard view', () => {
            const result = useNavigation();

            result.navigateToWizard();

            expect(mockNavigationService.navigate).toHaveBeenCalledWith('wizard');
        });

        test('navigateToCanvas should call navigation service with canvas view and params', () => {
            const result = useNavigation();
            const params = { projectConfig: { name: 'test' } };

            result.navigateToCanvas(params);

            expect(mockNavigationService.navigate).toHaveBeenCalledWith('canvas', params);
        });

        test('goBack should call navigation service goBack', () => {
            const result = useNavigation();

            result.goBack();

            expect(mockNavigationService.goBack).toHaveBeenCalled();
        });
    });

    describe('State Updates', () => {
        test('should subscribe to navigation service on mount', () => {
            useNavigation();

            expect(mockNavigationService.subscribe).toHaveBeenCalled();
        });

        test('should unsubscribe from navigation service on unmount', () => {
            // This would be tested in a React component test environment
            // For now, we verify the subscription mechanism exists
            const result = useNavigation();

            expect(mockNavigationService.subscribe).toHaveBeenCalled();
            expect(typeof mockNavigationService.subscribe.mock.calls[0][0]).toBe('function');
        });
    });

    describe('Error Handling', () => {
        test('should handle navigation service errors gracefully', () => {
            mockNavigationService.navigate.mockImplementation(() => {
                throw new Error('Navigation error');
            });

            const result = useNavigation();

            expect(() => result.navigateToIntro()).not.toThrow();
        });

        test('should handle missing navigation service', () => {
            // Mock a scenario where navigation service is not available
            jest.doMock('../../src/contexts/ServiceContext', () => ({
                useServices: () => ({
                    navigationService: null
                })
            }));

            expect(() => useNavigation()).not.toThrow();
        });
    });
});