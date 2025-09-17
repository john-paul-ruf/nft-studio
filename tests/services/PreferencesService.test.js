/**
 * Test suite for the PreferencesService
 * Verifies preferences loading, saving, and management functionality
 */

import { createMockApiResponse, resetApiMocks } from '../helpers/testUtils.js';

describe('PreferencesService', () => {
    let PreferencesService;

    beforeEach(() => {
        jest.clearAllMocks();
        resetApiMocks();

        // Import after mocks are set up
        PreferencesService = require('../../src/services/PreferencesService').default;
    });

    afterEach(() => {
        jest.resetModules();
    });

    describe('Preferences Loading', () => {
        test('should load preferences successfully', async () => {
            const mockPreferences = {
                colorSchemes: {
                    favorites: ['synthwave'],
                    defaultScheme: 'neon-cyberpunk'
                },
                project: {
                    lastProjectName: 'Test Project',
                    lastArtist: 'Test Artist',
                    lastResolution: 'hd',
                    lastProjectDirectory: '/test/path'
                }
            };

            window.api.readFile.mockResolvedValue(createMockApiResponse(true, mockPreferences));

            const result = await PreferencesService.getPreferences();

            expect(window.api.readFile).toHaveBeenCalledWith(PreferencesService.PREFERENCES_FILE);
            expect(result).toEqual(mockPreferences);
        });

        test('should return default preferences when file does not exist', async () => {
            window.api.readFile.mockResolvedValue(createMockApiResponse(false, null, 'File not found'));

            const result = await PreferencesService.getPreferences();

            expect(result).toEqual(PreferencesService.getDefaultPreferences());
        });

        test('should return default preferences when API is not available', async () => {
            // Mock window.api as undefined
            const originalApi = window.api;
            window.api = undefined;

            const result = await PreferencesService.getPreferences();

            expect(result).toEqual(PreferencesService.getDefaultPreferences());

            // Restore API
            window.api = originalApi;
        });

        test('should handle JSON parsing errors', async () => {
            window.api.readFile.mockResolvedValue(createMockApiResponse(true, 'invalid json'));

            const result = await PreferencesService.getPreferences();

            expect(result).toEqual(PreferencesService.getDefaultPreferences());
        });

        test('should handle API errors gracefully', async () => {
            window.api.readFile.mockRejectedValue(new Error('API Error'));

            const result = await PreferencesService.getPreferences();

            expect(result).toEqual(PreferencesService.getDefaultPreferences());
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('Preferences Saving', () => {
        test('should save preferences successfully', async () => {
            const preferences = {
                colorSchemes: { favorites: ['test'] },
                project: { lastProjectName: 'Test' }
            };

            window.api.writeFile.mockResolvedValue(createMockApiResponse(true));

            const result = await PreferencesService.savePreferences(preferences);

            expect(window.api.writeFile).toHaveBeenCalledWith(
                PreferencesService.PREFERENCES_FILE,
                JSON.stringify(preferences, null, 2)
            );
            expect(result).toBe(true);
        });

        test('should handle save errors', async () => {
            window.api.writeFile.mockRejectedValue(new Error('Write failed'));

            const result = await PreferencesService.savePreferences({});

            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalled();
        });

        test('should handle missing API during save', async () => {
            const originalApi = window.api;
            window.api = undefined;

            const result = await PreferencesService.savePreferences({});

            expect(result).toBe(false);

            window.api = originalApi;
        });
    });

    describe('Color Scheme Management', () => {
        test('should add favorite color scheme', async () => {
            const mockPreferences = {
                colorSchemes: { favorites: ['existing'] },
                project: {}
            };

            window.api.readFile.mockResolvedValue(createMockApiResponse(true, mockPreferences));
            window.api.writeFile.mockResolvedValue(createMockApiResponse(true));

            const result = await PreferencesService.addFavoriteColorScheme('newScheme');

            expect(result).toBe(true);
            expect(window.api.writeFile).toHaveBeenCalled();

            // Verify the scheme was added
            const saveCall = window.api.writeFile.mock.calls[0];
            const savedData = JSON.parse(saveCall[1]);
            expect(savedData.colorSchemes.favorites).toContain('newScheme');
        });

        test('should not add duplicate favorite color schemes', async () => {
            const mockPreferences = {
                colorSchemes: { favorites: ['existing'] },
                project: {}
            };

            window.api.readFile.mockResolvedValue(createMockApiResponse(true, mockPreferences));
            window.api.writeFile.mockResolvedValue(createMockApiResponse(true));

            const result = await PreferencesService.addFavoriteColorScheme('existing');

            expect(result).toBe(true);

            // Verify no duplicate was added
            const saveCall = window.api.writeFile.mock.calls[0];
            const savedData = JSON.parse(saveCall[1]);
            expect(savedData.colorSchemes.favorites.filter(s => s === 'existing')).toHaveLength(1);
        });

        test('should remove favorite color scheme', async () => {
            const mockPreferences = {
                colorSchemes: { favorites: ['scheme1', 'scheme2'] },
                project: {}
            };

            window.api.readFile.mockResolvedValue(createMockApiResponse(true, mockPreferences));
            window.api.writeFile.mockResolvedValue(createMockApiResponse(true));

            const result = await PreferencesService.removeFavoriteColorScheme('scheme1');

            expect(result).toBe(true);

            // Verify the scheme was removed
            const saveCall = window.api.writeFile.mock.calls[0];
            const savedData = JSON.parse(saveCall[1]);
            expect(savedData.colorSchemes.favorites).not.toContain('scheme1');
            expect(savedData.colorSchemes.favorites).toContain('scheme2');
        });

        test('should set default color scheme', async () => {
            const mockPreferences = {
                colorSchemes: { favorites: [], defaultScheme: 'old' },
                project: {}
            };

            window.api.readFile.mockResolvedValue(createMockApiResponse(true, mockPreferences));
            window.api.writeFile.mockResolvedValue(createMockApiResponse(true));

            const result = await PreferencesService.setDefaultColorScheme('newDefault');

            expect(result).toBe(true);

            // Verify the default was changed
            const saveCall = window.api.writeFile.mock.calls[0];
            const savedData = JSON.parse(saveCall[1]);
            expect(savedData.colorSchemes.defaultScheme).toBe('newDefault');
        });
    });

    describe('Project Information Management', () => {
        test('should save last project info', async () => {
            const mockPreferences = {
                colorSchemes: { favorites: [] },
                project: {}
            };

            const projectInfo = {
                projectName: 'New Project',
                artistName: 'New Artist',
                resolution: 'full-hd',
                projectDirectory: '/new/path'
            };

            window.api.readFile.mockResolvedValue(createMockApiResponse(true, mockPreferences));
            window.api.writeFile.mockResolvedValue(createMockApiResponse(true));

            const result = await PreferencesService.saveLastProjectInfo(projectInfo);

            expect(result).toBe(true);

            // Verify project info was saved
            const saveCall = window.api.writeFile.mock.calls[0];
            const savedData = JSON.parse(saveCall[1]);
            expect(savedData.project.lastProjectName).toBe('New Project');
            expect(savedData.project.lastArtist).toBe('New Artist');
            expect(savedData.project.lastResolution).toBe('full-hd');
            expect(savedData.project.lastProjectDirectory).toBe('/new/path');
        });

        test('should handle partial project info', async () => {
            const mockPreferences = {
                colorSchemes: { favorites: [] },
                project: { lastProjectName: 'Existing' }
            };

            window.api.readFile.mockResolvedValue(createMockApiResponse(true, mockPreferences));
            window.api.writeFile.mockResolvedValue(createMockApiResponse(true));

            const result = await PreferencesService.saveLastProjectInfo({
                artistName: 'New Artist'
            });

            expect(result).toBe(true);

            // Verify existing data was preserved and new data added
            const saveCall = window.api.writeFile.mock.calls[0];
            const savedData = JSON.parse(saveCall[1]);
            expect(savedData.project.lastProjectName).toBe('Existing');
            expect(savedData.project.lastArtist).toBe('New Artist');
        });
    });

    describe('Default Preferences', () => {
        test('should return valid default preferences structure', () => {
            const defaults = PreferencesService.getDefaultPreferences();

            expect(defaults).toHaveProperty('colorSchemes');
            expect(defaults).toHaveProperty('project');
            expect(defaults.colorSchemes).toHaveProperty('favorites');
            expect(defaults.colorSchemes).toHaveProperty('defaultScheme');
            expect(Array.isArray(defaults.colorSchemes.favorites)).toBe(true);
            expect(typeof defaults.colorSchemes.defaultScheme).toBe('string');
        });

        test('should have consistent default values', () => {
            const defaults1 = PreferencesService.getDefaultPreferences();
            const defaults2 = PreferencesService.getDefaultPreferences();

            expect(defaults1).toEqual(defaults2);
        });
    });

    describe('Error Recovery', () => {
        test('should recover from corrupted preferences file', async () => {
            window.api.readFile.mockResolvedValue(createMockApiResponse(true, '{ invalid json'));

            const result = await PreferencesService.getPreferences();

            expect(result).toEqual(PreferencesService.getDefaultPreferences());
        });

        test('should handle multiple concurrent save operations', async () => {
            window.api.writeFile.mockResolvedValue(createMockApiResponse(true));

            const promises = [
                PreferencesService.savePreferences({ test: 1 }),
                PreferencesService.savePreferences({ test: 2 }),
                PreferencesService.savePreferences({ test: 3 })
            ];

            const results = await Promise.all(promises);

            expect(results.every(r => r === true)).toBe(true);
            expect(window.api.writeFile).toHaveBeenCalledTimes(3);
        });
    });
});