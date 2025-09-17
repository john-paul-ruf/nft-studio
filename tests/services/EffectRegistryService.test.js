/**
 * Test suite for EffectRegistryService
 * Verifies effect discovery and registry functionality
 */

import { resetApiMocks } from '../helpers/testUtils.js';

describe('EffectRegistryService', () => {
    let EffectRegistryService;
    let mockEffectRegistry;
    let mockEffectCategories;
    let mockRegisterCoreEffects;

    beforeEach(() => {
        jest.clearAllMocks();
        resetApiMocks();

        // Mock the my-nft-gen imports
        mockEffectRegistry = {
            getByCategory: jest.fn(),
            getEffect: jest.fn(),
            getAllEffects: jest.fn()
        };

        mockEffectCategories = {
            PRIMARY: 'primary',
            SECONDARY: 'secondary',
            KEY_FRAME: 'keyFrame',
            FINAL_IMAGE: 'finalImage'
        };

        mockRegisterCoreEffects = jest.fn();

        // Mock dynamic imports
        jest.doMock('my-nft-gen/src/core/registry/EffectRegistry.js', () => ({
            EffectRegistry: mockEffectRegistry
        }));

        jest.doMock('my-nft-gen/src/core/registry/EffectCategories.js', () => ({
            EffectCategories: mockEffectCategories
        }));

        jest.doMock('my-nft-gen/src/core/registry/CoreEffectsRegistration.js', () => ({
            registerCoreEffects: mockRegisterCoreEffects
        }));

        // Import after mocks are set up
        EffectRegistryService = require('../../src/main/services/EffectRegistryService');
    });

    afterEach(() => {
        jest.resetModules();
    });

    describe('Constructor', () => {
        test('should initialize with core effects not registered', () => {
            const service = new EffectRegistryService();
            expect(service.areCoreEffectsRegistered()).toBe(false);
        });
    });

    describe('ensureCoreEffectsRegistered', () => {
        test('should register core effects only once', async () => {
            const service = new EffectRegistryService();

            // First call should register
            await service.ensureCoreEffectsRegistered();
            expect(mockRegisterCoreEffects).toHaveBeenCalledTimes(1);
            expect(service.areCoreEffectsRegistered()).toBe(true);

            // Second call should not register again
            await service.ensureCoreEffectsRegistered();
            expect(mockRegisterCoreEffects).toHaveBeenCalledTimes(1);
        });
    });

    describe('getEffectRegistry', () => {
        test('should ensure core effects are registered and return registry', async () => {
            const service = new EffectRegistryService();

            const registry = await service.getEffectRegistry();

            expect(mockRegisterCoreEffects).toHaveBeenCalled();
            expect(registry).toBe(mockEffectRegistry);
        });
    });

    describe('getAllEffects', () => {
        test('should return effects organized by category', async () => {
            const service = new EffectRegistryService();

            const mockPrimaryEffects = [
                { name: 'BlurEffect', effectClass: {}, category: 'primary', metadata: {} }
            ];
            const mockSecondaryEffects = [
                { name: 'ColorEffect', effectClass: {}, category: 'secondary', metadata: {} }
            ];
            const mockKeyFrameEffects = [
                { name: 'MoveEffect', effectClass: {}, category: 'keyFrame', metadata: {} }
            ];
            const mockFinalEffects = [
                { name: 'WatermarkEffect', effectClass: {}, category: 'finalImage', metadata: {} }
            ];

            mockEffectRegistry.getByCategory.mockImplementation((category) => {
                switch (category) {
                    case 'primary': return mockPrimaryEffects;
                    case 'secondary': return mockSecondaryEffects;
                    case 'keyFrame': return mockKeyFrameEffects;
                    case 'finalImage': return mockFinalEffects;
                    default: return [];
                }
            });

            const result = await service.getAllEffects();

            expect(result).toEqual({
                primary: mockPrimaryEffects,
                secondary: mockSecondaryEffects,
                keyFrame: mockKeyFrameEffects,
                final: mockFinalEffects
            });

            expect(mockEffectRegistry.getByCategory).toHaveBeenCalledWith('primary');
            expect(mockEffectRegistry.getByCategory).toHaveBeenCalledWith('secondary');
            expect(mockEffectRegistry.getByCategory).toHaveBeenCalledWith('keyFrame');
            expect(mockEffectRegistry.getByCategory).toHaveBeenCalledWith('finalImage');
        });

        test('should handle empty categories', async () => {
            const service = new EffectRegistryService();

            mockEffectRegistry.getByCategory.mockReturnValue([]);

            const result = await service.getAllEffects();

            expect(result).toEqual({
                primary: [],
                secondary: [],
                keyFrame: [],
                final: []
            });
        });

        test('should handle registry errors gracefully', async () => {
            const service = new EffectRegistryService();

            mockEffectRegistry.getByCategory.mockImplementation((category) => {
                if (category === 'primary') {
                    throw new Error('Registry error');
                }
                return [];
            });

            // Should propagate the error for proper handling
            await expect(service.getAllEffects()).rejects.toThrow('Registry error');
        });
    });

    describe('getEffect', () => {
        test('should return specific effect by name', async () => {
            const service = new EffectRegistryService();
            const mockEffect = { name: 'BlurEffect', effectClass: {}, metadata: {} };

            mockEffectRegistry.getEffect.mockReturnValue(mockEffect);

            const result = await service.getEffect('BlurEffect');

            expect(result).toBe(mockEffect);
            expect(mockEffectRegistry.getEffect).toHaveBeenCalledWith('BlurEffect');
        });

        test('should return null for non-existent effect', async () => {
            const service = new EffectRegistryService();

            mockEffectRegistry.getEffect.mockReturnValue(null);

            const result = await service.getEffect('NonExistentEffect');

            expect(result).toBeNull();
            expect(mockEffectRegistry.getEffect).toHaveBeenCalledWith('NonExistentEffect');
        });
    });

    describe('Integration with my-nft-gen', () => {
        test('should work with real effect categories', async () => {
            // Test that our service works with the actual category constants
            const service = new EffectRegistryService();

            mockEffectRegistry.getByCategory.mockReturnValue([]);

            await service.getAllEffects();

            // Verify it uses the correct category values
            expect(mockEffectRegistry.getByCategory).toHaveBeenCalledWith('primary');
            expect(mockEffectRegistry.getByCategory).toHaveBeenCalledWith('secondary');
            expect(mockEffectRegistry.getByCategory).toHaveBeenCalledWith('keyFrame');
            expect(mockEffectRegistry.getByCategory).toHaveBeenCalledWith('finalImage');
        });
    });

    describe('Error Handling', () => {
        test('should handle import errors for EffectRegistry', async () => {
            const service = new EffectRegistryService();

            jest.doMock('my-nft-gen/src/core/registry/EffectRegistry.js', () => {
                throw new Error('Import failed');
            });

            await expect(service.getEffectRegistry()).rejects.toThrow('Import failed');
        });

        test('should handle import errors for EffectCategories', async () => {
            const service = new EffectRegistryService();

            jest.doMock('my-nft-gen/src/core/registry/EffectCategories.js', () => {
                throw new Error('Categories import failed');
            });

            await expect(service.getAllEffects()).rejects.toThrow('Categories import failed');
        });

        test('should handle core effects registration failure', async () => {
            const service = new EffectRegistryService();

            mockRegisterCoreEffects.mockRejectedValue(new Error('Registration failed'));

            await expect(service.ensureCoreEffectsRegistered()).rejects.toThrow('Registration failed');
            expect(service.areCoreEffectsRegistered()).toBe(false);
        });
    });
});

/**
 * Integration test helpers for EffectRegistryService
 */
export const EffectRegistryServiceTestHelpers = {
    /**
     * Creates a mock effect object
     */
    createMockEffect(name, category = 'primary', metadata = {}) {
        return {
            name,
            effectClass: {
                _name_: name,
                configClass: null
            },
            category,
            metadata: {
                description: `Test effect: ${name}`,
                version: '1.0.0',
                author: 'test',
                tags: ['test'],
                ...metadata
            }
        };
    },

    /**
     * Creates a mock effects structure by category
     */
    createMockEffectsStructure() {
        return {
            primary: [
                this.createMockEffect('BlurEffect', 'primary'),
                this.createMockEffect('NoiseEffect', 'primary')
            ],
            secondary: [
                this.createMockEffect('ColorShiftEffect', 'secondary')
            ],
            keyFrame: [
                this.createMockEffect('MoveEffect', 'keyFrame')
            ],
            final: [
                this.createMockEffect('WatermarkEffect', 'finalImage')
            ]
        };
    },

    /**
     * Verifies effect structure format
     */
    verifyEffectStructure(effect) {
        expect(effect).toHaveProperty('name');
        expect(effect).toHaveProperty('effectClass');
        expect(effect).toHaveProperty('category');
        expect(effect).toHaveProperty('metadata');
        expect(typeof effect.name).toBe('string');
        expect(typeof effect.category).toBe('string');
        expect(typeof effect.metadata).toBe('object');
    }
};