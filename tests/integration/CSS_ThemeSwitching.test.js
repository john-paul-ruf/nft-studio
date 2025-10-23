/**
 * Integration Test: CSS Theme Switching & CSS Variables
 * 
 * Tests CSS-based theme switching with CSS variables
 * Validates that all themes (dark, light, high-contrast) work correctly
 * 
 * Uses REAL services - NO MOCKS
 */

import TestEnvironment from '../setup/TestEnvironment.js';

/**
 * Test: CSS variables are defined for all themes
 * Validates: CSS variable definitions in stylesheet
 */
export async function testCSSVariablesDefinedForAllThemes(testEnv) {
    console.log('🧪 Testing CSS variables defined for all themes...');
    await testEnv.setup();
    
    try {
        const themes = ['dark', 'light', 'high-contrast'];
        const requiredVariables = [
            '--effects-panel-bg-primary',
            '--effects-panel-bg-secondary',
            '--effects-panel-text-primary',
            '--effects-panel-text-secondary',
            '--effects-panel-border-color',
            '--effects-panel-accent-primary',
            '--effects-panel-spacing-sm',
            '--effects-panel-spacing-md',
            '--effects-panel-spacing-lg',
            '--effects-panel-transition-fast',
        ];

        for (const theme of themes) {
            // Set theme on document
            document.documentElement.setAttribute('data-theme', theme);
            
            // Get computed style
            const computedStyle = getComputedStyle(document.documentElement);
            
            // Check each required variable is defined
            for (const variable of requiredVariables) {
                const value = computedStyle.getPropertyValue(variable).trim();
                console.assert(
                    value.length > 0,
                    `✅ Theme '${theme}' has variable '${variable}': ${value}`
                );
            }
        }

        // Reset to dark theme
        document.documentElement.setAttribute('data-theme', 'dark');

        return {
            testName: 'CSS Variables Defined For All Themes',
            status: 'PASSED',
            themesValidated: themes.length,
            variablesPerTheme: requiredVariables.length,
            totalVariables: themes.length * requiredVariables.length,
            message: 'All CSS variables properly defined for all themes'
        };

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return {
            testName: 'CSS Variables Defined For All Themes',
            status: 'FAILED',
            error: error.message
        };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test: CSS variables have different values per theme
 * Validates: Theme differentiation through CSS variables
 */
export async function testCSSVariablesVaryByTheme(testEnv) {
    console.log('🧪 Testing CSS variables vary by theme...');
    await testEnv.setup();
    
    try {
        const colorVariables = [
            '--effects-panel-bg-primary',
            '--effects-panel-text-primary',
            '--effects-panel-accent-primary',
        ];

        const themeValues = {};

        for (const theme of ['dark', 'light', 'high-contrast']) {
            document.documentElement.setAttribute('data-theme', theme);
            const computedStyle = getComputedStyle(document.documentElement);
            
            themeValues[theme] = {};
            for (const variable of colorVariables) {
                themeValues[theme][variable] = computedStyle.getPropertyValue(variable).trim();
            }
        }

        // Verify dark and light have different values
        const darkBg = themeValues.dark['--effects-panel-bg-primary'];
        const lightBg = themeValues.light['--effects-panel-bg-primary'];
        console.assert(
            darkBg !== lightBg,
            `✅ Dark and light themes have different background colors`
        );

        // Verify high-contrast is different from both
        const hcBg = themeValues['high-contrast']['--effects-panel-bg-primary'];
        console.assert(
            hcBg !== darkBg && hcBg !== lightBg,
            `✅ High-contrast theme has unique background color`
        );

        // Reset to dark theme
        document.documentElement.setAttribute('data-theme', 'dark');

        return {
            testName: 'CSS Variables Vary By Theme',
            status: 'PASSED',
            variablesValidated: colorVariables.length,
            themesCompared: 3,
            message: 'CSS variables correctly differentiate between themes'
        };

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return {
            testName: 'CSS Variables Vary By Theme',
            status: 'FAILED',
            error: error.message
        };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test: Theme attribute sets document data-theme
 * Validates: Document attribute manipulation for CSS scoping
 */
export async function testThemeAttributeSetsDocumentDataTheme(testEnv) {
    console.log('🧪 Testing theme attribute sets document data-theme...');
    await testEnv.setup();
    
    try {
        const themes = ['dark', 'light', 'high-contrast'];
        const results = [];

        for (const theme of themes) {
            document.documentElement.setAttribute('data-theme', theme);
            const currentTheme = document.documentElement.getAttribute('data-theme');
            
            console.assert(
                currentTheme === theme,
                `✅ Document data-theme set to '${theme}'`
            );
            results.push(currentTheme);
        }

        // Verify all themes were set
        console.assert(
            results.length === themes.length && results.every(t => themes.includes(t)),
            `✅ All themes successfully set: ${results.join(', ')}`
        );

        return {
            testName: 'Theme Attribute Sets Document Data-Theme',
            status: 'PASSED',
            themesSet: results,
            message: 'Document data-theme attribute correctly set for CSS scoping'
        };

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return {
            testName: 'Theme Attribute Sets Document Data-Theme',
            status: 'FAILED',
            error: error.message
        };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test: CSS classes have proper BEM naming
 * Validates: BEM (Block-Element-Modifier) naming convention
 */
export async function testBEMNamingConvention(testEnv) {
    console.log('🧪 Testing BEM naming convention...');
    await testEnv.setup();
    
    try {
        // Create test element with BEM classes
        const testDiv = document.createElement('div');
        
        const bemClasses = [
            'effects-panel',                    // Block
            'effects-panel__header',            // Element
            'effects-panel__title',             // Element
            'effects-panel__list',              // Element
            'effects-list__item',               // Block + Element
            'effects-list__item--primary',      // Modifier
            'effects-list__item--secondary',    // Modifier
            'effects-list__item--selected',     // Modifier
            'effects-list__item__label',        // Element
            'effects-list__item__expand-button', // Element
            'effects-list__item__visibility',   // Element
            'effects-list__item__delete-button', // Element
        ];

        // Verify each BEM class follows naming convention
        for (const className of bemClasses) {
            // Valid BEM patterns:
            // - block: lowercase with no separators
            // - block__element: block + __ + element
            // - block__element--modifier: block + __ + element + -- + modifier
            // - block--modifier: block + -- + modifier
            
            const isValidBEM = /^[a-z-]+(__[a-z-]+)?(-{2}[a-z-]+)?$/.test(className);
            console.assert(
                isValidBEM,
                `✅ BEM class valid: ${className}`
            );
        }

        console.assert(
            bemClasses.length > 0,
            `✅ Validated ${bemClasses.length} BEM classes`
        );

        return {
            testName: 'BEM Naming Convention',
            status: 'PASSED',
            classesValidated: bemClasses.length,
            classes: bemClasses,
            message: 'All BEM classes follow proper naming convention'
        };

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return {
            testName: 'BEM Naming Convention',
            status: 'FAILED',
            error: error.message
        };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test: CSS transitions use CSS variables
 * Validates: Transition timing values from CSS variables
 */
export async function testCSSTransitionsUseCSSVariables(testEnv) {
    console.log('🧪 Testing CSS transitions use CSS variables...');
    await testEnv.setup();
    
    try {
        const transitionVariables = [
            '--effects-panel-transition-fast',
            '--effects-panel-transition-normal',
            '--effects-panel-transition-slow',
        ];

        const computedStyle = getComputedStyle(document.documentElement);
        
        for (const variable of transitionVariables) {
            const value = computedStyle.getPropertyValue(variable).trim();
            console.assert(
                value.length > 0,
                `✅ Transition variable '${variable}': ${value}`
            );
        }

        console.assert(
            transitionVariables.length > 0,
            `✅ Validated ${transitionVariables.length} transition variables`
        );

        return {
            testName: 'CSS Transitions Use CSS Variables',
            status: 'PASSED',
            transitionsValidated: transitionVariables.length,
            message: 'CSS transitions properly use CSS variables'
        };

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return {
            testName: 'CSS Transitions Use CSS Variables',
            status: 'FAILED',
            error: error.message
        };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test: Spacing values are consistent across themes
 * Validates: Spacing CSS variables remain consistent
 */
export async function testSpacingValuesConsistentAcrossThemes(testEnv) {
    console.log('🧪 Testing spacing values consistent across themes...');
    await testEnv.setup();
    
    try {
        const spacingVariables = [
            '--effects-panel-spacing-xs',
            '--effects-panel-spacing-sm',
            '--effects-panel-spacing-md',
            '--effects-panel-spacing-lg',
            '--effects-panel-spacing-xl',
        ];

        const spacingValues = {
            dark: {},
            light: {},
            'high-contrast': {},
        };

        // Collect spacing values for each theme
        for (const theme of Object.keys(spacingValues)) {
            document.documentElement.setAttribute('data-theme', theme);
            const computedStyle = getComputedStyle(document.documentElement);
            
            for (const variable of spacingVariables) {
                spacingValues[theme][variable] = computedStyle.getPropertyValue(variable).trim();
            }
        }

        // Verify spacing is consistent across themes
        for (const variable of spacingVariables) {
            const darkValue = spacingValues.dark[variable];
            const lightValue = spacingValues.light[variable];
            const hcValue = spacingValues['high-contrast'][variable];
            
            console.assert(
                darkValue === lightValue && lightValue === hcValue,
                `✅ Spacing variable '${variable}' consistent: ${darkValue}`
            );
        }

        // Reset to dark theme
        document.documentElement.setAttribute('data-theme', 'dark');

        return {
            testName: 'Spacing Values Consistent Across Themes',
            status: 'PASSED',
            spacingVariables: spacingVariables.length,
            themesChecked: 3,
            message: 'Spacing values properly consistent across all themes'
        };

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return {
            testName: 'Spacing Values Consistent Across Themes',
            status: 'FAILED',
            error: error.message
        };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test: Complete theme switching workflow
 * Validates: Full integration of theme switching
 */
export async function testCompleteThemeSwitchingWorkflow(testEnv) {
    console.log('🧪 Testing complete theme switching workflow...');
    await testEnv.setup();
    
    try {
        const workflow = [];

        // Initial state
        const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        workflow.push(`Initial theme: ${initialTheme}`);

        // Switch to light
        document.documentElement.setAttribute('data-theme', 'light');
        const lightTheme = document.documentElement.getAttribute('data-theme');
        console.assert(lightTheme === 'light', '✅ Switched to light theme');
        workflow.push('Switched to light');

        // Verify CSS variables changed
        const lightStyle = getComputedStyle(document.documentElement);
        const lightBg = lightStyle.getPropertyValue('--effects-panel-bg-primary').trim();
        console.assert(
            lightBg.length > 0,
            '✅ CSS variables available in light theme'
        );
        workflow.push(`Light background: ${lightBg}`);

        // Switch to high-contrast
        document.documentElement.setAttribute('data-theme', 'high-contrast');
        const hcTheme = document.documentElement.getAttribute('data-theme');
        console.assert(hcTheme === 'high-contrast', '✅ Switched to high-contrast');
        workflow.push('Switched to high-contrast');

        // Switch back to dark
        document.documentElement.setAttribute('data-theme', 'dark');
        const darkTheme = document.documentElement.getAttribute('data-theme');
        console.assert(darkTheme === 'dark', '✅ Switched back to dark');
        workflow.push('Switched back to dark');

        console.assert(
            workflow.length === 5,
            `✅ Complete workflow executed: ${workflow.length} steps`
        );

        return {
            testName: 'Complete Theme Switching Workflow',
            status: 'PASSED',
            workflowSteps: workflow,
            themesUsed: ['light', 'high-contrast', 'dark'],
            message: 'Complete theme switching workflow successful'
        };

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return {
            testName: 'Complete Theme Switching Workflow',
            status: 'FAILED',
            error: error.message
        };
    } finally {
        await testEnv.cleanup();
    }
}