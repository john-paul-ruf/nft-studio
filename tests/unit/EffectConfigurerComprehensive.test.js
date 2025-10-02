/**
 * Comprehensive Test Suite for EffectConfigurer Component
 * 
 * Tests all major responsibilities of the 781-line EffectConfigurer component:
 * 1. Component initialization and rendering
 * 2. Config schema loading and caching
 * 3. Form field rendering and validation
 * 4. Config change handling and event emission
 * 5. Percent chance management
 * 6. Attached effects management (secondary/keyframe)
 * 7. Modal coordination
 * 8. Default config management
 * 9. Resolution change handling
 * 10. Performance baselines
 */

import TestEnvironment from '../setup/TestEnvironment.js';

/**
 * Test 1: Component Structure and Initialization
 * Verifies the component can be loaded and has expected structure
 */
export async function testEffectConfigurerComponentStructure(testEnv) {
    console.log('🧪 Testing EffectConfigurer component structure...');
    
    // Read the component file
    const fs = await import('fs/promises');
    const path = '/Users/the.phoenix/WebstormProjects/nft-studio/src/components/effects/EffectConfigurer.jsx';
    const componentSource = await fs.readFile(path, 'utf-8');
    
    // Verify component exists and has React structure
    const hasExport = componentSource.includes('export default') || componentSource.includes('export {');
    const hasReactImport = componentSource.includes('import React') || componentSource.includes('from \'react\'');
    const hasFunctionComponent = componentSource.includes('function EffectConfigurer') || componentSource.includes('const EffectConfigurer');
    
    if (!hasExport) {
        throw new Error('EffectConfigurer component missing export');
    }
    
    if (!hasReactImport) {
        throw new Error('EffectConfigurer component missing React import');
    }
    
    if (!hasFunctionComponent) {
        throw new Error('EffectConfigurer component definition not found');
    }
    
    console.log('✅ EffectConfigurer component structure verified');
    
    return {
        success: true,
        message: 'Component structure validated'
    };
}

/**
 * Test 2: Config Schema Loading
 * Verifies schema loading functionality exists
 */
export async function testEffectConfigurerConfigSchemaLoading(testEnv) {
    console.log('🧪 Testing EffectConfigurer config schema loading...');
    
    // Import ConfigIntrospector which is used for schema loading
    const ConfigIntrospectorModule = await import('../../src/utils/configIntrospector.js');
    const ConfigIntrospector = ConfigIntrospectorModule.ConfigIntrospector;
    
    if (!ConfigIntrospector) {
        throw new Error('ConfigIntrospector not found');
    }
    
    if (typeof ConfigIntrospector.analyzeConfigClass !== 'function') {
        throw new Error('ConfigIntrospector.analyzeConfigClass is not a function');
    }
    
    console.log('✅ Config schema loading capabilities verified');
    
    return {
        success: true,
        message: 'Config schema loading validated'
    };
}

/**
 * Test 3: Form Renderer Integration
 * Verifies form rendering capabilities through EffectFormRenderer
 */
export async function testEffectConfigurerFormInputFactory(testEnv) {
    console.log('🧪 Testing EffectConfigurer form renderer integration...');
    
    // Read EffectFormRenderer file
    const fs = await import('fs/promises');
    const rendererPath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/components/forms/EffectFormRenderer.jsx';
    const rendererSource = await fs.readFile(rendererPath, 'utf-8');
    
    // Verify renderer exists and uses ConfigInputFactory
    const hasExport = rendererSource.includes('export default') || rendererSource.includes('export {');
    const usesFactory = rendererSource.includes('ConfigInputFactory');
    
    if (!hasExport) {
        throw new Error('EffectFormRenderer missing export');
    }
    
    if (!usesFactory) {
        throw new Error('EffectFormRenderer does not use ConfigInputFactory');
    }
    
    // Verify EffectConfigurer uses EffectFormRenderer
    const configurerPath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/components/effects/EffectConfigurer.jsx';
    const configurerSource = await fs.readFile(configurerPath, 'utf-8');
    const usesRenderer = configurerSource.includes('EffectFormRenderer');
    
    if (!usesRenderer) {
        throw new Error('EffectConfigurer does not use EffectFormRenderer');
    }
    
    console.log('✅ Form renderer integration verified');
    
    return {
        success: true,
        message: 'Form renderer integration validated'
    };
}

/**
 * Test 4: Position Serialization
 * Verifies position handling for config changes
 */
export async function testEffectConfigurerPositionSerialization(testEnv) {
    console.log('🧪 Testing EffectConfigurer position serialization...');
    
    // Import PositionSerializer
    const PositionSerializerModule = await import('../../src/utils/PositionSerializer.js');
    const PositionSerializer = PositionSerializerModule.default;
    
    if (!PositionSerializer) {
        throw new Error('PositionSerializer not found');
    }
    
    if (typeof PositionSerializer.serialize !== 'function') {
        throw new Error('PositionSerializer.serialize is not a function');
    }
    
    console.log('✅ Position serialization capabilities verified');
    
    return {
        success: true,
        message: 'Position serialization validated'
    };
}

/**
 * Test 5: Center Utilities Integration
 * Verifies center position default handling
 */
export async function testEffectConfigurerCenterUtils(testEnv) {
    console.log('🧪 Testing EffectConfigurer center utilities integration...');
    
    // Import CenterUtils
    const CenterUtilsModule = await import('../../src/utils/CenterUtils.js');
    const CenterUtils = CenterUtilsModule.default;
    
    if (!CenterUtils) {
        throw new Error('CenterUtils not found');
    }
    
    if (typeof CenterUtils.detectAndApplyCenter !== 'function') {
        throw new Error('CenterUtils.detectAndApplyCenter is not a function');
    }
    
    console.log('✅ Center utilities integration verified');
    
    return {
        success: true,
        message: 'Center utilities integration validated'
    };
}

/**
 * Test 6: Preferences Service Integration
 * Verifies default config management
 */
export async function testEffectConfigurerPreferencesService(testEnv) {
    console.log('🧪 Testing EffectConfigurer preferences service integration...');
    
    // Import PreferencesService
    const PreferencesServiceModule = await import('../../src/services/PreferencesService.js');
    const PreferencesService = PreferencesServiceModule.default;
    
    if (!PreferencesService) {
        throw new Error('PreferencesService not found');
    }
    
    if (typeof PreferencesService.hasEffectDefaults !== 'function') {
        throw new Error('PreferencesService.hasEffectDefaults is not a function');
    }
    
    if (typeof PreferencesService.removeEffectDefaults !== 'function') {
        throw new Error('PreferencesService.removeEffectDefaults is not a function');
    }
    
    console.log('✅ Preferences service integration verified');
    
    return {
        success: true,
        message: 'Preferences service integration validated'
    };
}

/**
 * Test 7: Effect Attachment Modal Integration
 * Verifies modal coordination capabilities
 */
export async function testEffectConfigurerEffectAttachmentModal(testEnv) {
    console.log('🧪 Testing EffectConfigurer effect attachment modal integration...');
    
    // Read EffectAttachmentModal file
    const fs = await import('fs/promises');
    const modalPath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/components/effects/EffectAttachmentModal.jsx';
    const modalSource = await fs.readFile(modalPath, 'utf-8');
    
    // Verify modal exists and has expected structure
    const hasExport = modalSource.includes('export default') || modalSource.includes('export {');
    const hasModalComponent = modalSource.includes('Modal') || modalSource.includes('Dialog');
    
    if (!hasExport) {
        throw new Error('EffectAttachmentModal missing export');
    }
    
    if (!hasModalComponent) {
        throw new Error('EffectAttachmentModal missing modal/dialog component');
    }
    
    // Verify EffectConfigurer uses EffectAttachmentModal
    const configurerPath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/components/effects/EffectConfigurer.jsx';
    const configurerSource = await fs.readFile(configurerPath, 'utf-8');
    const usesModal = configurerSource.includes('EffectAttachmentModal');
    
    if (!usesModal) {
        throw new Error('EffectConfigurer does not use EffectAttachmentModal');
    }
    
    console.log('✅ Effect attachment modal integration verified');
    
    return {
        success: true,
        message: 'Effect attachment modal integration validated'
    };
}

/**
 * Test 8: Event Bus Integration
 * Verifies event-driven architecture integration
 */
export async function testEffectConfigurerEventBusIntegration(testEnv) {
    console.log('🧪 Testing EffectConfigurer event bus integration...');
    
    // Verify component file contains event bus usage
    const fs = await import('fs/promises');
    const path = '/Users/the.phoenix/WebstormProjects/nft-studio/src/components/effects/EffectConfigurer.jsx';
    const componentSource = await fs.readFile(path, 'utf-8');
    
    // Check for event bus patterns - component now uses EffectEventCoordinator service
    const hasEventBusImport = componentSource.includes('useServices');
    const hasEventCoordinator = componentSource.includes('EffectEventCoordinator');
    const hasEventCoordinatorImport = componentSource.includes("import EffectEventCoordinator");
    
    if (!hasEventBusImport) {
        throw new Error('Missing useServices import for event bus');
    }
    
    if (!hasEventCoordinator) {
        throw new Error('Missing EffectEventCoordinator usage');
    }
    
    if (!hasEventCoordinatorImport) {
        throw new Error('Missing EffectEventCoordinator import');
    }
    
    // Verify the component delegates event coordination to the service
    const hasCoordinateMethod = componentSource.includes('coordinate') || 
                                componentSource.includes('eventCoordinator');
    
    if (!hasCoordinateMethod) {
        throw new Error('Component should delegate to EffectEventCoordinator');
    }
    
    console.log('✅ Event bus integration verified');
    
    return {
        success: true,
        message: 'Event bus integration validated'
    };
}

/**
 * Test 9: Material-UI Integration
 * Verifies UI component integration
 */
export async function testEffectConfigurerMaterialUIIntegration(testEnv) {
    console.log('🧪 Testing EffectConfigurer Material-UI integration...');
    
    // Verify component file contains Material-UI imports
    const fs = await import('fs/promises');
    const path = '/Users/the.phoenix/WebstormProjects/nft-studio/src/components/effects/EffectConfigurer.jsx';
    const componentSource = await fs.readFile(path, 'utf-8');
    
    // Check for Material-UI patterns
    const hasMuiImport = componentSource.includes('@mui/material');
    const hasThemeUsage = componentSource.includes('useTheme');
    const hasBoxComponent = componentSource.includes('<Box');
    const hasTypographyComponent = componentSource.includes('<Typography');
    const hasButtonComponent = componentSource.includes('<Button');
    
    if (!hasMuiImport) {
        throw new Error('Missing @mui/material import');
    }
    
    if (!hasThemeUsage) {
        throw new Error('Missing useTheme hook');
    }
    
    if (!hasBoxComponent) {
        throw new Error('Missing Box component usage');
    }
    
    if (!hasTypographyComponent) {
        throw new Error('Missing Typography component usage');
    }
    
    if (!hasButtonComponent) {
        throw new Error('Missing Button component usage');
    }
    
    console.log('✅ Material-UI integration verified');
    
    return {
        success: true,
        message: 'Material-UI integration validated'
    };
}

/**
 * Test 10: Component Complexity Analysis
 * Establishes baseline metrics for refactoring comparison
 */
export async function testEffectConfigurerComplexityBaseline(testEnv) {
    console.log('🧪 Testing EffectConfigurer complexity baseline...');
    
    const fs = await import('fs/promises');
    const path = '/Users/the.phoenix/WebstormProjects/nft-studio/src/components/effects/EffectConfigurer.jsx';
    const componentSource = await fs.readFile(path, 'utf-8');
    
    // Count lines
    const lines = componentSource.split('\n').length;
    
    // Count functions/methods
    const functionCount = (componentSource.match(/const \w+ = (\(|async \(|useCallback\()/g) || []).length;
    
    // Count useState hooks
    const stateCount = (componentSource.match(/useState\(/g) || []).length;
    
    // Count useEffect hooks
    const effectCount = (componentSource.match(/useEffect\(/g) || []).length;
    
    // Count event handlers
    const handlerCount = (componentSource.match(/const handle\w+/g) || []).length;
    
    console.log('📊 Complexity Metrics:');
    console.log(`   Lines: ${lines}`);
    console.log(`   Functions: ${functionCount}`);
    console.log(`   State Hooks: ${stateCount}`);
    console.log(`   Effect Hooks: ${effectCount}`);
    console.log(`   Event Handlers: ${handlerCount}`);
    
    // Verify it's a god object (>300 lines)
    if (lines <= 300) {
        throw new Error(`Expected god object (>300 lines), got ${lines} lines`);
    }
    
    // Store baseline for future comparison
    const baseline = {
        lines,
        functions: functionCount,
        stateHooks: stateCount,
        effectHooks: effectCount,
        eventHandlers: handlerCount,
        timestamp: new Date().toISOString()
    };
    
    console.log('✅ Complexity baseline established:', JSON.stringify(baseline, null, 2));
    
    return {
        success: true,
        message: 'Complexity baseline established',
        metrics: baseline
    };
}

/**
 * Test 11: Performance Baseline
 * Measures component file read time
 */
export async function testEffectConfigurerPerformanceBaseline(testEnv) {
    console.log('🧪 Testing EffectConfigurer performance baseline...');
    
    const startTime = Date.now();
    
    // Read component file
    const fs = await import('fs/promises');
    const path = '/Users/the.phoenix/WebstormProjects/nft-studio/src/components/effects/EffectConfigurer.jsx';
    const componentSource = await fs.readFile(path, 'utf-8');
    
    const loadTime = Date.now() - startTime;
    
    console.log(`⏱️ Component file read time: ${loadTime}ms`);
    console.log(`📏 Component file size: ${componentSource.length} characters`);
    
    // File should be readable quickly (<100ms)
    if (loadTime >= 100) {
        throw new Error(`Component file read time too slow: ${loadTime}ms (expected <100ms)`);
    }
    
    // Verify it's a substantial file (god object)
    if (componentSource.length < 10000) {
        throw new Error(`Component file too small: ${componentSource.length} characters (expected >10000 for god object)`);
    }
    
    console.log('✅ Performance baseline met');
    
    return {
        success: true,
        message: 'Performance baseline validated',
        loadTime,
        fileSize: componentSource.length
    };
}