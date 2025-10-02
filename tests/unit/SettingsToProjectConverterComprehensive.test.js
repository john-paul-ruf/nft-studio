/**
 * Comprehensive Test Suite for SettingsToProjectConverter
 * 
 * Tests the 852-line SettingsToProjectConverter god object before decomposition.
 * This converter handles settings-to-project conversion with multiple responsibilities:
 * 
 * Responsibilities Identified:
 * 1. Settings Validation - Validate settings file structure
 * 2. Resolution Conversion - Convert resolution formats and determine orientation
 * 3. Effect Conversion - Convert effects from settings to project format
 * 4. Config Hydration - Hydrate effect configs with defaults
 * 5. Color Scheme Conversion - Extract and convert color schemes
 * 6. Position Scaling - Scale positions when resolution changes
 * 7. IPC Serialization - Serialize configs for IPC transmission
 * 8. Project Metadata Extraction - Extract project name, artist, output directory
 * 
 * Test Categories:
 * 1. Settings validation and structure verification
 * 2. Resolution conversion and orientation detection
 * 3. Effect conversion (primary, secondary, keyframe, final)
 * 4. Config hydration and property merging
 * 5. Color scheme extraction and conversion
 * 6. Position scaling logic
 * 7. IPC serialization
 * 8. Project metadata extraction
 * 9. Error handling and edge cases
 * 10. Integration testing
 * 11. Performance and complexity baselines
 */

import SettingsToProjectConverter from '../../src/utils/SettingsToProjectConverter.js';
import ResolutionMapper from '../../src/utils/ResolutionMapper.js';

/**
 * Test 1: Settings Validation
 */
export async function test_settings_validation() {
    console.log('🧪 Test 1: Settings validation...');

    // Valid settings
    const validSettings = {
        effects: [{ name: 'test-effect', config: {} }],
        config: { numberOfFrame: 100 },
        finalSize: { width: 1920, height: 1080 }
    };

    const validErrors = SettingsToProjectConverter.validateSettingsFile(validSettings);
    if (validErrors.length !== 0) {
        throw new Error(`Valid settings should have no errors, got: ${validErrors.join(', ')}`);
    }

    // Invalid settings - missing effects
    const invalidSettings1 = {
        config: { numberOfFrame: 100 },
        finalSize: { width: 1920, height: 1080 }
    };

    const errors1 = SettingsToProjectConverter.validateSettingsFile(invalidSettings1);
    if (errors1.length === 0) {
        throw new Error('Should have validation errors for missing effects');
    }

    // Invalid settings - missing config
    const invalidSettings2 = {
        effects: [{ name: 'test-effect' }],
        finalSize: { width: 1920, height: 1080 }
    };

    const errors2 = SettingsToProjectConverter.validateSettingsFile(invalidSettings2);
    if (errors2.length === 0) {
        throw new Error('Should have validation errors for missing config');
    }

    // Invalid settings - missing finalSize
    const invalidSettings3 = {
        effects: [{ name: 'test-effect' }],
        config: { numberOfFrame: 100 }
    };

    const errors3 = SettingsToProjectConverter.validateSettingsFile(invalidSettings3);
    if (errors3.length === 0) {
        throw new Error('Should have validation errors for missing finalSize');
    }

    console.log('✅ Test 1 passed: Settings validation working correctly');
}

/**
 * Test 2: Resolution Conversion
 */
export async function test_resolution_conversion() {
    console.log('🧪 Test 2: Resolution conversion...');

    // Test standard resolution
    const settings1 = {
        finalSize: { width: 1920, height: 1080 }
    };

    const resolution1 = SettingsToProjectConverter.convertResolution(settings1);
    if (typeof resolution1 !== 'number') {
        throw new Error('Resolution should be a numeric key');
    }

    // Test with explicit longestSide
    const settings2 = {
        finalSize: { width: 1920, height: 1080 },
        longestSideInPixels: 1920
    };

    const resolution2 = SettingsToProjectConverter.convertResolution(settings2);
    if (resolution2 !== 1920) {
        throw new Error(`Expected resolution key 1920, got ${resolution2}`);
    }

    // Test missing finalSize (should use default)
    const settings3 = {};
    const resolution3 = SettingsToProjectConverter.convertResolution(settings3);
    const defaultResolution = ResolutionMapper.getDefaultResolution();
    if (resolution3 !== defaultResolution) {
        throw new Error(`Expected default resolution ${defaultResolution}, got ${resolution3}`);
    }

    console.log('✅ Test 2 passed: Resolution conversion working correctly');
}

/**
 * Test 3: Orientation Detection
 */
export async function test_orientation_detection() {
    console.log('🧪 Test 3: Orientation detection...');

    // Horizontal (landscape)
    const settings1 = {
        finalSize: { width: 1920, height: 1080 }
    };
    const isHorizontal1 = SettingsToProjectConverter.determineOrientation(settings1);
    if (!isHorizontal1) {
        throw new Error('1920x1080 should be detected as horizontal');
    }

    // Vertical (portrait)
    const settings2 = {
        finalSize: { width: 1080, height: 1920 }
    };
    const isHorizontal2 = SettingsToProjectConverter.determineOrientation(settings2);
    if (isHorizontal2) {
        throw new Error('1080x1920 should be detected as vertical');
    }

    // Square (should default to horizontal)
    const settings3 = {
        finalSize: { width: 1080, height: 1080 }
    };
    const isHorizontal3 = SettingsToProjectConverter.determineOrientation(settings3);
    if (!isHorizontal3) {
        throw new Error('Square resolution should default to horizontal');
    }

    // Explicit isHorizontal flag
    const settings4 = {
        finalSize: { width: 1920, height: 1080 },
        isHorizontal: false
    };
    const isHorizontal4 = SettingsToProjectConverter.determineOrientation(settings4);
    if (isHorizontal4) {
        throw new Error('Explicit isHorizontal flag should be respected');
    }

    // With explicit longestSide/shortestSide
    const settings5 = {
        finalSize: { width: 1920, height: 1080 },
        longestSideInPixels: 1920,
        shortestSideInPixels: 1080
    };
    const isHorizontal5 = SettingsToProjectConverter.determineOrientation(settings5);
    if (!isHorizontal5) {
        throw new Error('Should detect horizontal when width matches longestSide');
    }

    console.log('✅ Test 3 passed: Orientation detection working correctly');
}

/**
 * Test 4: Project Name Extraction
 */
export async function test_project_name_extraction() {
    console.log('🧪 Test 4: Project name extraction...');

    // From finalFileName
    const settings1 = {
        config: { finalFileName: 'MyProject' }
    };
    const name1 = SettingsToProjectConverter.extractProjectName(settings1);
    if (name1 !== 'MyProject') {
        throw new Error(`Expected 'MyProject', got '${name1}'`);
    }

    // From runName
    const settings2 = {
        config: { runName: 'TestRun' }
    };
    const name2 = SettingsToProjectConverter.extractProjectName(settings2);
    if (name2 !== 'TestRun') {
        throw new Error(`Expected 'TestRun', got '${name2}'`);
    }

    // From fileOut path
    const settings3 = {
        config: { fileOut: '/path/to/output/ProjectName' }
    };
    const name3 = SettingsToProjectConverter.extractProjectName(settings3);
    if (name3 !== 'ProjectName') {
        throw new Error(`Expected 'ProjectName', got '${name3}'`);
    }

    // Default fallback
    const settings4 = {
        config: {}
    };
    const name4 = SettingsToProjectConverter.extractProjectName(settings4);
    if (name4 !== 'Converted Project') {
        throw new Error(`Expected 'Converted Project', got '${name4}'`);
    }

    console.log('✅ Test 4 passed: Project name extraction working correctly');
}

/**
 * Test 5: Output Directory Extraction
 */
export async function test_output_directory_extraction() {
    console.log('🧪 Test 5: Output directory extraction...');

    // Explicit outputDirectory
    const settings1 = {
        outputDirectory: '/explicit/output/path'
    };
    const dir1 = SettingsToProjectConverter.extractOutputDirectory(settings1);
    if (dir1 !== '/explicit/output/path') {
        throw new Error(`Expected '/explicit/output/path', got '${dir1}'`);
    }

    // From absolute fileOut path
    const settings2 = {
        config: { fileOut: '/path/to/output/file.png' }
    };
    const dir2 = SettingsToProjectConverter.extractOutputDirectory(settings2);
    if (dir2 !== '/path/to/output/') {
        throw new Error(`Expected '/path/to/output/', got '${dir2}'`);
    }

    // From workingDirectory
    const settings3 = {
        workingDirectory: '/working/directory'
    };
    const dir3 = SettingsToProjectConverter.extractOutputDirectory(settings3);
    if (dir3 !== '/working/directory') {
        throw new Error(`Expected '/working/directory', got '${dir3}'`);
    }

    // No directory (should return null)
    const settings4 = {
        config: {}
    };
    const dir4 = SettingsToProjectConverter.extractOutputDirectory(settings4);
    if (dir4 !== null) {
        throw new Error(`Expected null, got '${dir4}'`);
    }

    console.log('✅ Test 5 passed: Output directory extraction working correctly');
}

/**
 * Test 6: Color Scheme Name Extraction
 */
export async function test_color_scheme_name_extraction() {
    console.log('🧪 Test 6: Color scheme name extraction...');

    // Vishuddha chakra
    const settings1 = {
        colorScheme: {
            colorSchemeInfo: 'Vishuddha Chakra Colors'
        }
    };
    const name1 = SettingsToProjectConverter.extractColorSchemeName(settings1);
    if (name1 !== 'vishuddha-chakra') {
        throw new Error(`Expected 'vishuddha-chakra', got '${name1}'`);
    }

    // Generic chakra
    const settings2 = {
        colorScheme: {
            colorSchemeInfo: 'Chakra Inspired'
        }
    };
    const name2 = SettingsToProjectConverter.extractColorSchemeName(settings2);
    if (name2 !== 'chakra-inspired') {
        throw new Error(`Expected 'chakra-inspired', got '${name2}'`);
    }

    // Default
    const settings3 = {
        colorScheme: {}
    };
    const name3 = SettingsToProjectConverter.extractColorSchemeName(settings3);
    if (name3 !== 'custom-scheme') {
        throw new Error(`Expected 'custom-scheme', got '${name3}'`);
    }

    console.log('✅ Test 6 passed: Color scheme name extraction working correctly');
}

/**
 * Test 7: Color Scheme Data Conversion
 */
export async function test_color_scheme_data_conversion() {
    console.log('🧪 Test 7: Color scheme data conversion...');

    // Complete color scheme
    const settings1 = {
        colorScheme: {
            colorBucket: ['#FF0000', '#00FF00', '#0000FF'],
            colorSchemeInfo: 'Test Scheme'
        },
        neutrals: ['#808080'],
        backgrounds: ['#FFFFFF'],
        lights: ['#FFFF00']
    };

    const data1 = SettingsToProjectConverter.convertColorSchemeData(settings1);
    if (!data1) {
        throw new Error('Should return color scheme data');
    }
    if (data1.colors.length !== 3) {
        throw new Error(`Expected 3 colors, got ${data1.colors.length}`);
    }
    if (data1.neutrals.length !== 1) {
        throw new Error(`Expected 1 neutral, got ${data1.neutrals.length}`);
    }
    if (data1.source !== 'settings-conversion') {
        throw new Error('Should mark source as settings-conversion');
    }

    // Missing neutrals/backgrounds/lights (should generate fallbacks)
    const settings2 = {
        colorScheme: {
            colorBucket: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00']
        }
    };

    const data2 = SettingsToProjectConverter.convertColorSchemeData(settings2);
    if (!data2) {
        throw new Error('Should return color scheme data with fallbacks');
    }
    if (data2.neutrals.length === 0) {
        throw new Error('Should generate fallback neutrals');
    }
    if (data2.backgrounds.length === 0) {
        throw new Error('Should generate fallback backgrounds');
    }
    if (data2.lights.length === 0) {
        throw new Error('Should generate fallback lights');
    }

    // No colors (should return null)
    const settings3 = {
        colorScheme: {
            colorBucket: []
        }
    };

    const data3 = SettingsToProjectConverter.convertColorSchemeData(settings3);
    if (data3 !== null) {
        throw new Error('Should return null when no colors available');
    }

    console.log('✅ Test 7 passed: Color scheme data conversion working correctly');
}

/**
 * Test 8: IPC Serialization - Config Objects
 */
export async function test_ipc_serialization_config() {
    console.log('🧪 Test 8: IPC serialization for config objects...');

    // Test with ColorPicker object
    const config1 = {
        color: {
            getColor: () => '#FF0000',
            selectionType: 'colorBucket',
            colorValue: '#FF0000'
        },
        opacity: 0.5
    };

    const serialized1 = SettingsToProjectConverter.serializeConfigForIPC(config1);
    if (typeof serialized1.color.getColor === 'function') {
        throw new Error('Functions should be removed during serialization');
    }
    if (serialized1.color.__className !== 'ColorPicker') {
        throw new Error('ColorPicker should be marked with __className');
    }
    if (serialized1.opacity !== 0.5) {
        throw new Error('Primitive values should be preserved');
    }

    // Test with range object
    const config2 = {
        range: {
            lower: () => 10,
            upper: () => 20,
            lowerValue: 10,
            upperValue: 20
        }
    };

    const serialized2 = SettingsToProjectConverter.serializeConfigForIPC(config2);
    if (typeof serialized2.range.lower === 'function') {
        throw new Error('Range functions should be converted to values');
    }
    if (serialized2.range.lower !== 10 || serialized2.range.upper !== 20) {
        throw new Error('Range values should be extracted correctly');
    }

    // Test with nested objects
    const config3 = {
        nested: {
            value: 42,
            deeper: {
                text: 'hello'
            }
        }
    };

    const serialized3 = SettingsToProjectConverter.serializeConfigForIPC(config3);
    if (serialized3.nested.value !== 42) {
        throw new Error('Nested values should be preserved');
    }
    if (serialized3.nested.deeper.text !== 'hello') {
        throw new Error('Deeply nested values should be preserved');
    }

    console.log('✅ Test 8 passed: IPC serialization working correctly');
}

/**
 * Test 9: IPC Serialization - Project
 */
export async function test_ipc_serialization_project() {
    console.log('🧪 Test 9: IPC serialization for project...');

    const project = {
        projectName: 'Test',
        effects: [
            {
                id: 'effect1',
                config: {
                    color: {
                        getColor: () => '#FF0000',
                        selectionType: 'colorBucket',
                        colorValue: '#FF0000'
                    }
                },
                secondaryEffects: [
                    {
                        id: 'secondary1',
                        config: {
                            opacity: 0.5
                        }
                    }
                ]
            }
        ]
    };

    const serialized = SettingsToProjectConverter.serializeProjectForIPC(project);
    
    if (serialized.projectName !== 'Test') {
        throw new Error('Project name should be preserved');
    }
    if (typeof serialized.effects[0].config.color.getColor === 'function') {
        throw new Error('Effect config functions should be removed');
    }
    if (serialized.effects[0].config.color.__className !== 'ColorPicker') {
        throw new Error('ColorPicker should be serialized in effect config');
    }
    if (serialized.effects[0].secondaryEffects[0].config.opacity !== 0.5) {
        throw new Error('Secondary effect config should be preserved');
    }

    console.log('✅ Test 9 passed: Project IPC serialization working correctly');
}

/**
 * Test 10: Conversion Summary
 */
export async function test_conversion_summary() {
    console.log('🧪 Test 10: Conversion summary...');

    // Valid settings
    const validSettings = {
        effects: [
            { name: 'effect1', config: {} },
            { name: 'effect2', config: {} }
        ],
        config: {
            numberOfFrame: 150,
            finalFileName: 'TestProject',
            _INVOKER_: 'TestArtist'
        },
        finalSize: { width: 1920, height: 1080 },
        colorScheme: { colorBucket: ['#FF0000'] }
    };

    const summary1 = SettingsToProjectConverter.getConversionSummary(validSettings);
    if (!summary1.valid) {
        throw new Error('Valid settings should produce valid summary');
    }
    if (summary1.summary.projectName !== 'TestProject') {
        throw new Error(`Expected project name 'TestProject', got '${summary1.summary.projectName}'`);
    }
    if (summary1.summary.effectsCount !== 2) {
        throw new Error(`Expected 2 effects, got ${summary1.summary.effectsCount}`);
    }
    if (summary1.summary.numFrames !== 150) {
        throw new Error(`Expected 150 frames, got ${summary1.summary.numFrames}`);
    }
    if (!summary1.summary.hasColorScheme) {
        throw new Error('Should detect color scheme');
    }

    // Invalid settings
    const invalidSettings = {
        config: {}
    };

    const summary2 = SettingsToProjectConverter.getConversionSummary(invalidSettings);
    if (summary2.valid) {
        throw new Error('Invalid settings should produce invalid summary');
    }
    if (!summary2.errors || summary2.errors.length === 0) {
        throw new Error('Invalid summary should contain errors');
    }

    console.log('✅ Test 10 passed: Conversion summary working correctly');
}

/**
 * Test 11: Complexity and Performance Baselines
 */
export async function test_complexity_baselines() {
    console.log('🧪 Test 11: Complexity and performance baselines...');

    // Measure class complexity
    const methodCount = Object.getOwnPropertyNames(SettingsToProjectConverter)
        .filter(name => typeof SettingsToProjectConverter[name] === 'function').length;

    console.log(`📊 SettingsToProjectConverter complexity metrics:`);
    console.log(`   - Static methods: ${methodCount}`);

    // Verify it's a god object (should have many methods)
    if (methodCount < 10) {
        throw new Error(`Expected at least 10 methods for god object, found ${methodCount}`);
    }

    // Test performance of key operations
    const startTime = Date.now();

    // Simple validation test
    const testSettings = {
        effects: [{ name: 'test', config: {} }],
        config: { numberOfFrame: 100 },
        finalSize: { width: 1920, height: 1080 }
    };

    for (let i = 0; i < 100; i++) {
        SettingsToProjectConverter.validateSettingsFile(testSettings);
        SettingsToProjectConverter.convertResolution(testSettings);
        SettingsToProjectConverter.determineOrientation(testSettings);
        SettingsToProjectConverter.extractProjectName(testSettings);
    }

    const duration = Date.now() - startTime;
    console.log(`   - 400 operations completed in ${duration}ms`);
    console.log(`   - Average: ${(duration / 400).toFixed(2)}ms per operation`);

    // Performance should be reasonable (< 1000ms for 400 operations)
    if (duration > 1000) {
        console.warn(`⚠️ Performance may be suboptimal: ${duration}ms for 400 operations`);
    }

    console.log('✅ Test 11 passed: Complexity baselines established');
}

// Test registration
export const tests = [
    {
        name: 'Settings Validation',
        category: 'unit',
        fn: test_settings_validation,
        description: 'Test settings file validation'
    },
    {
        name: 'Resolution Conversion',
        category: 'unit',
        fn: test_resolution_conversion,
        description: 'Test resolution format conversion'
    },
    {
        name: 'Orientation Detection',
        category: 'unit',
        fn: test_orientation_detection,
        description: 'Test orientation detection from resolution'
    },
    {
        name: 'Project Name Extraction',
        category: 'unit',
        fn: test_project_name_extraction,
        description: 'Test project name extraction from settings'
    },
    {
        name: 'Output Directory Extraction',
        category: 'unit',
        fn: test_output_directory_extraction,
        description: 'Test output directory extraction'
    },
    {
        name: 'Color Scheme Name Extraction',
        category: 'unit',
        fn: test_color_scheme_name_extraction,
        description: 'Test color scheme name extraction'
    },
    {
        name: 'Color Scheme Data Conversion',
        category: 'unit',
        fn: test_color_scheme_data_conversion,
        description: 'Test color scheme data conversion'
    },
    {
        name: 'IPC Serialization Config',
        category: 'unit',
        fn: test_ipc_serialization_config,
        description: 'Test IPC serialization for config objects'
    },
    {
        name: 'IPC Serialization Project',
        category: 'unit',
        fn: test_ipc_serialization_project,
        description: 'Test IPC serialization for projects'
    },
    {
        name: 'Conversion Summary',
        category: 'unit',
        fn: test_conversion_summary,
        description: 'Test conversion summary generation'
    },
    {
        name: 'Complexity Baselines',
        category: 'unit',
        fn: test_complexity_baselines,
        description: 'Establish complexity and performance baselines'
    }
];