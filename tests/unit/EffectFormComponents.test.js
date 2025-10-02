/**
 * Comprehensive Test Suite for Effect Form Components
 * 
 * Tests the extracted form components from EffectConfigurer decomposition:
 * - EffectFormRenderer.jsx
 * - EffectFormValidator.js
 * - EffectFormSubmitter.js
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test 1: EffectFormRenderer Component Structure
 */
export async function testEffectFormRendererStructure(testEnv) {
    console.log('🧪 Test 1: EffectFormRenderer component structure');
    
    const componentPath = path.resolve(__dirname, '../../src/components/forms/EffectFormRenderer.jsx');
    const componentSource = await fs.readFile(componentPath, 'utf-8');
    
    // Verify component exists and has proper structure
    if (!componentSource.includes('function EffectFormRenderer')) {
        throw new Error('EffectFormRenderer function not found');
    }
    
    // Verify Material-UI imports
    if (!componentSource.includes('@mui/material')) {
        throw new Error('Material-UI imports not found');
    }
    
    // Verify ConfigInputFactory integration
    if (!componentSource.includes('ConfigInputFactory')) {
        throw new Error('ConfigInputFactory integration not found');
    }
    
    // Verify loading state handling
    if (!componentSource.includes('CircularProgress')) {
        throw new Error('Loading state handling not found');
    }
    
    // Verify form rendering logic
    if (!componentSource.includes('configSchema.fields.map')) {
        throw new Error('Form field rendering logic not found');
    }
    
    console.log('✅ EffectFormRenderer structure verified');
}

/**
 * Test 2: EffectFormRenderer Props Handling
 */
export async function testEffectFormRendererProps(testEnv) {
    console.log('🧪 Test 2: EffectFormRenderer props handling');
    
    const componentPath = path.resolve(__dirname, '../../src/components/forms/EffectFormRenderer.jsx');
    const componentSource = await fs.readFile(componentPath, 'utf-8');
    
    // Verify required props
    const requiredProps = ['configSchema', 'effectConfig', 'onConfigChange', 'projectState'];
    for (const prop of requiredProps) {
        if (!componentSource.includes(prop)) {
            throw new Error(`Required prop '${prop}' not found`);
        }
    }
    
    // Verify props are passed to ConfigInputFactory
    if (!componentSource.includes('field={field}')) {
        throw new Error('Field prop not passed to ConfigInputFactory');
    }
    
    if (!componentSource.includes('value={effectConfig[field.name]}')) {
        throw new Error('Value prop not passed to ConfigInputFactory');
    }
    
    if (!componentSource.includes('onChange={onConfigChange}')) {
        throw new Error('onChange prop not passed to ConfigInputFactory');
    }
    
    console.log('✅ EffectFormRenderer props handling verified');
}

/**
 * Test 3: EffectFormValidator Structure
 */
export async function testEffectFormValidatorStructure(testEnv) {
    console.log('🧪 Test 3: EffectFormValidator structure');
    
    const validatorPath = path.resolve(__dirname, '../../src/components/forms/EffectFormValidator.js');
    const validatorSource = await fs.readFile(validatorPath, 'utf-8');
    
    // Verify main validation function
    if (!validatorSource.includes('export function validateEffectConfig')) {
        throw new Error('validateEffectConfig function not found');
    }
    
    // Verify field validation function
    if (!validatorSource.includes('export function validateField')) {
        throw new Error('validateField function not found');
    }
    
    // Verify validation logic
    if (!validatorSource.includes('isValid')) {
        throw new Error('Validation result structure not found');
    }
    
    if (!validatorSource.includes('errors')) {
        throw new Error('Error collection not found');
    }
    
    console.log('✅ EffectFormValidator structure verified');
}

/**
 * Test 4: EffectFormValidator Type Validation
 */
export async function testEffectFormValidatorTypes(testEnv) {
    console.log('🧪 Test 4: EffectFormValidator type validation');
    
    const validatorPath = path.resolve(__dirname, '../../src/components/forms/EffectFormValidator.js');
    const validatorSource = await fs.readFile(validatorPath, 'utf-8');
    
    // Verify type-specific validation
    const types = ['number', 'string', 'boolean', 'array', 'object'];
    for (const type of types) {
        if (!validatorSource.includes(`case '${type}':`)) {
            throw new Error(`Type validation for '${type}' not found`);
        }
    }
    
    // Verify constraint validation
    if (!validatorSource.includes('field.min') || !validatorSource.includes('field.max')) {
        throw new Error('Min/max constraint validation not found');
    }
    
    if (!validatorSource.includes('field.required')) {
        throw new Error('Required field validation not found');
    }
    
    console.log('✅ EffectFormValidator type validation verified');
}

/**
 * Test 5: EffectFormValidator Functional Tests
 */
export async function testEffectFormValidatorFunctionality(testEnv) {
    console.log('🧪 Test 5: EffectFormValidator functionality');
    
    // Import the validator
    const validatorModule = await import('../../src/components/forms/EffectFormValidator.js');
    const { validateEffectConfig, validateField } = validatorModule;
    
    // Test valid configuration
    const validConfig = {
        name: 'Test Effect',
        value: 42,
        enabled: true
    };
    
    const validSchema = {
        fields: [
            { name: 'name', type: 'string', required: true },
            { name: 'value', type: 'number', required: true },
            { name: 'enabled', type: 'boolean', required: false }
        ]
    };
    
    const validResult = validateEffectConfig(validConfig, validSchema);
    if (!validResult.isValid) {
        throw new Error('Valid configuration failed validation');
    }
    
    // Test invalid configuration (missing required field)
    const invalidConfig = {
        value: 42
    };
    
    const invalidResult = validateEffectConfig(invalidConfig, validSchema);
    if (invalidResult.isValid) {
        throw new Error('Invalid configuration passed validation');
    }
    
    if (invalidResult.errors.length === 0) {
        throw new Error('No errors reported for invalid configuration');
    }
    
    console.log('✅ EffectFormValidator functionality verified');
}

/**
 * Test 6: EffectFormSubmitter Structure
 */
export async function testEffectFormSubmitterStructure(testEnv) {
    console.log('🧪 Test 6: EffectFormSubmitter structure');
    
    const submitterPath = path.resolve(__dirname, '../../src/components/forms/EffectFormSubmitter.js');
    const submitterSource = await fs.readFile(submitterPath, 'utf-8');
    
    // Verify main functions
    const functions = [
        'prepareConfigForSubmission',
        'serializeFieldValue',
        'createEffectData',
        'createEffectContext',
        'createAttachmentData'
    ];
    
    for (const func of functions) {
        if (!submitterSource.includes(`export function ${func}`)) {
            throw new Error(`Function '${func}' not found`);
        }
    }
    
    // Verify PositionSerializer integration
    if (!submitterSource.includes('PositionSerializer')) {
        throw new Error('PositionSerializer integration not found');
    }
    
    console.log('✅ EffectFormSubmitter structure verified');
}

/**
 * Test 7: EffectFormSubmitter Serialization
 */
export async function testEffectFormSubmitterSerialization(testEnv) {
    console.log('🧪 Test 7: EffectFormSubmitter serialization');
    
    const submitterPath = path.resolve(__dirname, '../../src/components/forms/EffectFormSubmitter.js');
    const submitterSource = await fs.readFile(submitterPath, 'utf-8');
    
    // Verify position serialization logic
    if (!submitterSource.includes('value.name === \'position\'')) {
        throw new Error('Position serialization check not found');
    }
    
    if (!submitterSource.includes('value.name === \'arc-path\'')) {
        throw new Error('Arc-path serialization check not found');
    }
    
    if (!submitterSource.includes('PositionSerializer.serialize')) {
        throw new Error('PositionSerializer.serialize call not found');
    }
    
    console.log('✅ EffectFormSubmitter serialization verified');
}

/**
 * Test 8: EffectFormSubmitter Functional Tests
 */
export async function testEffectFormSubmitterFunctionality(testEnv) {
    console.log('🧪 Test 8: EffectFormSubmitter functionality');
    
    // Import the submitter
    const submitterModule = await import('../../src/components/forms/EffectFormSubmitter.js');
    const { prepareConfigForSubmission, createEffectData, createEffectContext } = submitterModule;
    
    // Test config preparation
    const config = {
        name: 'Test Effect',
        value: 42,
        enabled: true
    };
    
    const preparedConfig = prepareConfigForSubmission(config);
    if (!preparedConfig.name || preparedConfig.name !== 'Test Effect') {
        throw new Error('Config preparation failed');
    }
    
    // Test effect data creation
    const selectedEffect = {
        registryKey: 'test-effect',
        name: 'Test Effect'
    };
    
    const effectData = createEffectData(selectedEffect, config, 75);
    if (!effectData.effectClass || effectData.percentChance !== 75) {
        throw new Error('Effect data creation failed');
    }
    
    // Test effect context creation
    const effectContext = createEffectContext(selectedEffect, config);
    if (!effectContext.config || effectContext.effectType !== 'primary') {
        throw new Error('Effect context creation failed');
    }
    
    console.log('✅ EffectFormSubmitter functionality verified');
}

/**
 * Test 9: Component Integration Patterns
 */
export async function testComponentIntegrationPatterns(testEnv) {
    console.log('🧪 Test 9: Component integration patterns');
    
    const rendererPath = path.resolve(__dirname, '../../src/components/forms/EffectFormRenderer.jsx');
    const rendererSource = await fs.readFile(rendererPath, 'utf-8');
    
    // Verify export pattern
    if (!rendererSource.includes('export default EffectFormRenderer')) {
        throw new Error('Default export not found in EffectFormRenderer');
    }
    
    // Verify React imports
    if (!rendererSource.includes('import React')) {
        throw new Error('React import not found');
    }
    
    // Verify component is a function component
    if (!rendererSource.includes('function EffectFormRenderer({')) {
        throw new Error('Function component pattern not found');
    }
    
    console.log('✅ Component integration patterns verified');
}

/**
 * Test 10: Component Complexity Baseline
 */
export async function testComponentComplexityBaseline(testEnv) {
    console.log('🧪 Test 10: Component complexity baseline');
    
    const rendererPath = path.resolve(__dirname, '../../src/components/forms/EffectFormRenderer.jsx');
    const validatorPath = path.resolve(__dirname, '../../src/components/forms/EffectFormValidator.js');
    const submitterPath = path.resolve(__dirname, '../../src/components/forms/EffectFormSubmitter.js');
    
    const rendererSource = await fs.readFile(rendererPath, 'utf-8');
    const validatorSource = await fs.readFile(validatorPath, 'utf-8');
    const submitterSource = await fs.readFile(submitterPath, 'utf-8');
    
    // Count lines
    const rendererLines = rendererSource.split('\n').length;
    const validatorLines = validatorSource.split('\n').length;
    const submitterLines = submitterSource.split('\n').length;
    
    console.log('📊 Complexity Metrics:');
    console.log(`   EffectFormRenderer: ${rendererLines} lines`);
    console.log(`   EffectFormValidator: ${validatorLines} lines`);
    console.log(`   EffectFormSubmitter: ${submitterLines} lines`);
    console.log(`   Total: ${rendererLines + validatorLines + submitterLines} lines`);
    
    // Verify components are reasonably sized (not god objects)
    if (rendererLines > 300) {
        throw new Error(`EffectFormRenderer too large: ${rendererLines} lines`);
    }
    
    if (validatorLines > 300) {
        throw new Error(`EffectFormValidator too large: ${validatorLines} lines`);
    }
    
    if (submitterLines > 300) {
        throw new Error(`EffectFormSubmitter too large: ${submitterLines} lines`);
    }
    
    console.log('✅ Component complexity baseline verified');
}

/**
 * Test 11: Performance Baseline
 */
export async function testPerformanceBaseline(testEnv) {
    console.log('🧪 Test 11: Performance baseline');
    
    const startTime = Date.now();
    
    // Read component files (file-based testing, no JSX imports)
    const rendererPath = path.resolve(__dirname, '../../src/components/forms/EffectFormRenderer.jsx');
    const validatorPath = path.resolve(__dirname, '../../src/components/forms/EffectFormValidator.js');
    const submitterPath = path.resolve(__dirname, '../../src/components/forms/EffectFormSubmitter.js');
    
    await fs.readFile(rendererPath, 'utf-8');
    await fs.readFile(validatorPath, 'utf-8');
    await fs.readFile(submitterPath, 'utf-8');
    
    // Import JS modules only (not JSX)
    await import('../../src/components/forms/EffectFormValidator.js');
    await import('../../src/components/forms/EffectFormSubmitter.js');
    
    const loadTime = Date.now() - startTime;
    
    console.log(`⏱️ Components load time: ${loadTime}ms`);
    
    // Components should load quickly (<100ms)
    if (loadTime >= 100) {
        throw new Error(`Components load time too slow: ${loadTime}ms`);
    }
    
    console.log('✅ Performance baseline met');
}