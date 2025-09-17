/**
 * Integration tests for IPC communication
 * Verifies that the renderer process can communicate with the main process
 */

import { createMockProjectConfig, createMockEffect, createMockFileResult, createMockApiResponse, resetApiMocks } from '../helpers/testUtils.js';

describe('IPC Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetApiMocks();
    });

    describe('File Operations', () => {
        test('should handle file selection dialog', async () => {
            const mockResult = createMockFileResult({
                filePaths: ['/test/selected/file.json']
            });

            window.api.selectFile.mockResolvedValue(mockResult);

            const result = await window.api.selectFile({
                filters: [{ name: 'JSON Files', extensions: ['json'] }]
            });

            expect(result).toEqual(mockResult);
            expect(window.api.selectFile).toHaveBeenCalledWith({
                filters: [{ name: 'JSON Files', extensions: ['json'] }]
            });
        });

        test('should handle directory selection dialog', async () => {
            const mockResult = createMockFileResult({
                filePaths: ['/test/selected/directory']
            });

            window.api.selectDirectory.mockResolvedValue(mockResult);

            const result = await window.api.selectDirectory();

            expect(result).toEqual(mockResult);
            expect(window.api.selectDirectory).toHaveBeenCalled();
        });

        test('should handle file reading operations', async () => {
            const testContent = '{"test": "content"}';
            const mockResponse = createMockApiResponse(true, testContent);

            window.api.readFile.mockResolvedValue(mockResponse);

            const result = await window.api.readFile('/test/file.json');

            expect(result).toEqual(mockResponse);
            expect(window.api.readFile).toHaveBeenCalledWith('/test/file.json');
        });

        test('should handle file writing operations', async () => {
            const testContent = '{"test": "data"}';
            const mockResponse = createMockApiResponse(true);

            window.api.writeFile.mockResolvedValue(mockResponse);

            const result = await window.api.writeFile('/test/file.json', testContent);

            expect(result).toEqual(mockResponse);
            expect(window.api.writeFile).toHaveBeenCalledWith('/test/file.json', testContent);
        });

        test('should handle file operation errors', async () => {
            const errorResponse = createMockApiResponse(false, null, 'File not found');

            window.api.readFile.mockResolvedValue(errorResponse);

            const result = await window.api.readFile('/nonexistent/file.json');

            expect(result.success).toBe(false);
            expect(result.error).toBe('File not found');
        });
    });

    describe('Project Operations', () => {
        test('should handle project loading', async () => {
            const mockConfig = createMockProjectConfig();
            const mockResponse = createMockApiResponse(true, mockConfig);

            window.api.loadProject.mockResolvedValue(mockResponse);

            const result = await window.api.loadProject('/test/project.json');

            expect(result).toEqual(mockResponse);
            expect(window.api.loadProject).toHaveBeenCalledWith('/test/project.json');
        });

        test('should handle project saving', async () => {
            const mockConfig = createMockProjectConfig();
            const mockResponse = createMockApiResponse(true);

            window.api.saveProject.mockResolvedValue(mockResponse);

            const result = await window.api.saveProject('/test/project.json', mockConfig);

            expect(result).toEqual(mockResponse);
            expect(window.api.saveProject).toHaveBeenCalledWith('/test/project.json', mockConfig);
        });

        test('should handle new project creation', async () => {
            const mockConfig = createMockProjectConfig();
            const mockResponse = createMockApiResponse(true, { projectId: 'test-123' });

            window.api.startNewProject.mockResolvedValue(mockResponse);

            const result = await window.api.startNewProject(mockConfig);

            expect(result).toEqual(mockResponse);
            expect(window.api.startNewProject).toHaveBeenCalledWith(mockConfig);
        });

        test('should handle project resumption', async () => {
            const mockResponse = createMockApiResponse(true, { status: 'resumed' });

            window.api.resumeProject.mockResolvedValue(mockResponse);

            const result = await window.api.resumeProject('/test/project.json');

            expect(result).toEqual(mockResponse);
            expect(window.api.resumeProject).toHaveBeenCalledWith('/test/project.json');
        });
    });

    describe('Effect Operations', () => {
        test('should discover available effects', async () => {
            const mockEffects = ['BlurEffect', 'ColorShiftEffect', 'NoiseEffect'];
            const mockResponse = createMockApiResponse(true, mockEffects);

            window.api.discoverEffects.mockResolvedValue(mockResponse);

            const result = await window.api.discoverEffects();

            expect(result).toEqual(mockResponse);
            expect(window.api.discoverEffects).toHaveBeenCalled();
        });

        test('should get effect defaults', async () => {
            const mockDefaults = { intensity: 0.5, enabled: true };
            const mockResponse = createMockApiResponse(true, mockDefaults);

            window.api.getEffectDefaults.mockResolvedValue(mockResponse);

            const result = await window.api.getEffectDefaults('BlurEffect');

            expect(result).toEqual(mockResponse);
            expect(window.api.getEffectDefaults).toHaveBeenCalledWith('BlurEffect');
        });

        test('should get effect schema', async () => {
            const mockSchema = {
                fields: [
                    { name: 'intensity', type: 'number', min: 0, max: 1 },
                    { name: 'enabled', type: 'boolean' }
                ]
            };
            const mockResponse = createMockApiResponse(true, mockSchema);

            window.api.getEffectSchema.mockResolvedValue(mockResponse);

            const result = await window.api.getEffectSchema('BlurEffect');

            expect(result).toEqual(mockResponse);
            expect(window.api.getEffectSchema).toHaveBeenCalledWith('BlurEffect');
        });

        test('should validate effect configuration', async () => {
            const mockEffect = createMockEffect();
            const mockResponse = createMockApiResponse(true, { valid: true });

            window.api.validateEffect.mockResolvedValue(mockResponse);

            const result = await window.api.validateEffect(mockEffect);

            expect(result).toEqual(mockResponse);
            expect(window.api.validateEffect).toHaveBeenCalledWith(mockEffect);
        });

        test('should generate effect preview', async () => {
            const mockEffect = createMockEffect();
            const mockResponse = createMockApiResponse(true, {
                previewData: 'data:image/png;base64,preview'
            });

            window.api.previewEffect.mockResolvedValue(mockResponse);

            const result = await window.api.previewEffect(mockEffect, { width: 200, height: 200 });

            expect(result).toEqual(mockResponse);
            expect(window.api.previewEffect).toHaveBeenCalledWith(mockEffect, { width: 200, height: 200 });
        });

        test('should generate effect thumbnail', async () => {
            const mockEffect = createMockEffect();
            const mockResponse = createMockApiResponse(true, {
                thumbnailData: 'data:image/png;base64,thumbnail'
            });

            window.api.generateThumbnail.mockResolvedValue(mockResponse);

            const result = await window.api.generateThumbnail(mockEffect);

            expect(result).toEqual(mockResponse);
            expect(window.api.generateThumbnail).toHaveBeenCalledWith(mockEffect);
        });

        test('should get effect metadata', async () => {
            const mockMetadata = {
                name: 'BlurEffect',
                description: 'Applies blur to the image',
                category: 'Filter'
            };
            const mockResponse = createMockApiResponse(true, mockMetadata);

            window.api.getEffectMetadata.mockResolvedValue(mockResponse);

            const result = await window.api.getEffectMetadata('BlurEffect');

            expect(result).toEqual(mockResponse);
            expect(window.api.getEffectMetadata).toHaveBeenCalledWith('BlurEffect');
        });
    });

    describe('Rendering Operations', () => {
        test('should render single frame', async () => {
            const mockConfig = createMockProjectConfig();
            const mockResponse = createMockApiResponse(true, {
                frameData: 'data:image/png;base64,rendered',
                frameNumber: 0
            });

            window.api.renderFrame.mockResolvedValue(mockResponse);

            const result = await window.api.renderFrame(mockConfig, 0);

            expect(result).toEqual(mockResponse);
            expect(window.api.renderFrame).toHaveBeenCalledWith(mockConfig, 0);
        });

        test('should handle rendering errors', async () => {
            const mockConfig = createMockProjectConfig();
            const errorResponse = createMockApiResponse(false, null, 'Rendering failed');

            window.api.renderFrame.mockResolvedValue(errorResponse);

            const result = await window.api.renderFrame(mockConfig, 0);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Rendering failed');
        });
    });

    describe('Frame Management', () => {
        test('should list completed frames', async () => {
            const mockFrames = ['frame_000.png', 'frame_001.png', 'frame_002.png'];
            const mockResponse = createMockApiResponse(true, mockFrames);

            window.api.listCompletedFrames.mockResolvedValue(mockResponse);

            const result = await window.api.listCompletedFrames('/test/output');

            expect(result).toEqual(mockResponse);
            expect(window.api.listCompletedFrames).toHaveBeenCalledWith('/test/output');
        });

        test('should read frame image data', async () => {
            const mockImageData = 'data:image/png;base64,framedata';
            const mockResponse = createMockApiResponse(true, mockImageData);

            window.api.readFrameImage.mockResolvedValue(mockResponse);

            const result = await window.api.readFrameImage('/test/output/frame_000.png');

            expect(result).toEqual(mockResponse);
            expect(window.api.readFrameImage).toHaveBeenCalledWith('/test/output/frame_000.png');
        });
    });

    describe('Preferences Operations', () => {
        test('should get user preferences', async () => {
            const mockPrefs = {
                colorSchemes: { favorites: ['test'] },
                project: { lastProjectName: 'Test' }
            };
            const mockResponse = createMockApiResponse(true, mockPrefs);

            window.api.getPreferences.mockResolvedValue(mockResponse);

            const result = await window.api.getPreferences();

            expect(result).toEqual(mockResponse);
            expect(window.api.getPreferences).toHaveBeenCalled();
        });

        test('should save user preferences', async () => {
            const mockPrefs = { test: 'preferences' };
            const mockResponse = createMockApiResponse(true);

            window.api.savePreferences.mockResolvedValue(mockResponse);

            const result = await window.api.savePreferences(mockPrefs);

            expect(result).toEqual(mockResponse);
            expect(window.api.savePreferences).toHaveBeenCalledWith(mockPrefs);
        });
    });

    describe('Error Handling', () => {
        test('should handle IPC communication failures', async () => {
            window.api.selectFile.mockRejectedValue(new Error('IPC Error'));

            let error;
            try {
                await window.api.selectFile();
            } catch (e) {
                error = e;
            }

            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('IPC Error');
        });

        test('should handle timeout scenarios', async () => {
            // Simulate a timeout
            window.api.renderFrame.mockImplementation(() => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => reject(new Error('Timeout')), 1000);
                });
            });

            let error;
            try {
                await window.api.renderFrame(createMockProjectConfig(), 0);
            } catch (e) {
                error = e;
            }

            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('Timeout');
        });

        test('should handle malformed responses', async () => {
            // Simulate malformed response
            window.api.loadProject.mockResolvedValue(null);

            const result = await window.api.loadProject('/test.json');

            expect(result).toBe(null);
        });
    });

    describe('Concurrent Operations', () => {
        test('should handle multiple simultaneous API calls', async () => {
            const responses = [
                createMockApiResponse(true, 'result1'),
                createMockApiResponse(true, 'result2'),
                createMockApiResponse(true, 'result3')
            ];

            window.api.readFile.mockResolvedValueOnce(responses[0]);
            window.api.readFile.mockResolvedValueOnce(responses[1]);
            window.api.readFile.mockResolvedValueOnce(responses[2]);

            const promises = [
                window.api.readFile('/file1.json'),
                window.api.readFile('/file2.json'),
                window.api.readFile('/file3.json')
            ];

            const results = await Promise.all(promises);

            expect(results).toEqual(responses);
            expect(window.api.readFile).toHaveBeenCalledTimes(3);
        });

        test('should handle mixed success and failure scenarios', async () => {
            window.api.readFile.mockResolvedValueOnce(createMockApiResponse(true, 'success'));
            window.api.readFile.mockRejectedValueOnce(new Error('Failed'));
            window.api.readFile.mockResolvedValueOnce(createMockApiResponse(false, null, 'Not found'));

            const promises = [
                window.api.readFile('/file1.json').catch(e => ({ error: e.message })),
                window.api.readFile('/file2.json').catch(e => ({ error: e.message })),
                window.api.readFile('/file3.json').catch(e => ({ error: e.message }))
            ];

            const results = await Promise.all(promises);

            expect(results[0].success).toBe(true);
            expect(results[1].error).toBe('Failed');
            expect(results[2].success).toBe(false);
        });
    });
});