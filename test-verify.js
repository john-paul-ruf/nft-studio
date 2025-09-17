#!/usr/bin/env node
/**
 * Simple verification script for NFT Studio
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function verifyAppStructure() {
    console.log(`${colors.bold}NFT Studio App Verification${colors.reset}\n`);

    const checks = [
        { name: 'App.jsx exists', path: './src/App.jsx' },
        { name: 'main.js exists', path: './main.js' },
        { name: 'preload.js exists', path: './preload.js' },
        { name: 'package.json exists', path: './package.json' },
        { name: 'index.template.html exists', path: './index.template.html' },
        { name: 'Intro component exists', path: './src/pages/Intro.jsx' },
        { name: 'ProjectWizard component exists', path: './src/pages/ProjectWizard.jsx' },
        { name: 'Canvas component exists', path: './src/pages/Canvas.jsx' },
        { name: 'ApplicationFactory exists', path: './src/ApplicationFactory.js' },
        { name: 'ServiceContext exists', path: './src/contexts/ServiceContext.js' },
        { name: 'useNavigation hook exists', path: './src/hooks/useNavigation.js' },
        { name: 'PreferencesService exists', path: './src/services/PreferencesService.js' }
    ];

    let passed = 0;
    let failed = 0;

    console.log(`${colors.blue}Checking app structure...${colors.reset}`);

    for (const check of checks) {
        try {
            if (fs.existsSync(check.path)) {
                console.log(`  ${colors.green}✓${colors.reset} ${check.name}`);
                passed++;
            } else {
                console.log(`  ${colors.red}✗${colors.reset} ${check.name} - Missing`);
                failed++;
            }
        } catch (error) {
            console.log(`  ${colors.red}✗${colors.reset} ${check.name} - Error: ${error.message}`);
            failed++;
        }
    }

    console.log();

    // Check test files
    console.log(`${colors.blue}Checking test files...${colors.reset}`);

    const testChecks = [
        { name: 'Test setup exists', path: './tests/setup.js' },
        { name: 'Test utilities exist', path: './tests/helpers/testUtils.js' },
        { name: 'App tests exist', path: './tests/App.test.js' },
        { name: 'Canvas tests exist', path: './tests/pages/Canvas.test.js' },
        { name: 'ProjectWizard tests exist', path: './tests/pages/ProjectWizard.test.js' },
        { name: 'Service tests exist', path: './tests/services/PreferencesService.test.js' },
        { name: 'IPC tests exist', path: './tests/integration/ipc.test.js' }
    ];

    for (const check of testChecks) {
        try {
            if (fs.existsSync(check.path)) {
                console.log(`  ${colors.green}✓${colors.reset} ${check.name}`);
                passed++;
            } else {
                console.log(`  ${colors.red}✗${colors.reset} ${check.name} - Missing`);
                failed++;
            }
        } catch (error) {
            console.log(`  ${colors.red}✗${colors.reset} ${check.name} - Error: ${error.message}`);
            failed++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`${colors.bold}Verification Results${colors.reset}`);
    console.log('='.repeat(50));

    const total = passed + failed;
    const passRate = (passed / total * 100).toFixed(1);

    console.log(`Total checks: ${total}`);
    console.log(`Passed: ${colors.green}${passed}${colors.reset}`);
    console.log(`Failed: ${colors.red}${failed}${colors.reset}`);
    console.log(`Pass rate: ${passRate}%`);

    if (failed === 0) {
        console.log(`\n${colors.green}${colors.bold}✓ All verification checks passed!${colors.reset}`);
        console.log(`${colors.green}The app structure is intact and ready for development.${colors.reset}`);
        return true;
    } else {
        console.log(`\n${colors.red}${colors.bold}✗ ${failed} verification check(s) failed${colors.reset}`);
        console.log(`${colors.yellow}Please ensure all required files are in place before making changes.${colors.reset}`);
        return false;
    }
}

// Additional quick functionality checks
function verifyBasicFunctionality() {
    console.log(`\n${colors.blue}Running basic functionality checks...${colors.reset}`);

    const checks = [];

    // Check if App.jsx has required imports
    try {
        const appContent = fs.readFileSync('./src/App.jsx', 'utf8');
        checks.push({
            name: 'App imports React',
            passed: appContent.includes('import React')
        });
        checks.push({
            name: 'App imports navigation hook',
            passed: appContent.includes('useNavigation')
        });
        checks.push({
            name: 'App has ApplicationFactory',
            passed: appContent.includes('ApplicationFactory')
        });
    } catch (error) {
        checks.push({
            name: 'App.jsx readable',
            passed: false,
            error: error.message
        });
    }

    // Check if package.json has test scripts
    try {
        const packageContent = fs.readFileSync('./package.json', 'utf8');
        const packageData = JSON.parse(packageContent);
        checks.push({
            name: 'Has test scripts in package.json',
            passed: packageData.scripts && packageData.scripts.test && !packageData.scripts.test.includes('Error: no test specified')
        });
    } catch (error) {
        checks.push({
            name: 'package.json readable',
            passed: false,
            error: error.message
        });
    }

    let passed = 0;
    for (const check of checks) {
        if (check.passed) {
            console.log(`  ${colors.green}✓${colors.reset} ${check.name}`);
            passed++;
        } else {
            console.log(`  ${colors.red}✗${colors.reset} ${check.name}${check.error ? ` - ${check.error}` : ''}`);
        }
    }

    return passed === checks.length;
}

// Main execution
function main() {
    const structureValid = verifyAppStructure();
    const functionalityValid = verifyBasicFunctionality();

    const allValid = structureValid && functionalityValid;

    if (allValid) {
        console.log(`\n${colors.green}${colors.bold}🎉 All verifications passed! App is ready for development.${colors.reset}`);
        process.exit(0);
    } else {
        console.log(`\n${colors.red}${colors.bold}❌ Some verifications failed. Please fix issues before proceeding.${colors.reset}`);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { verifyAppStructure, verifyBasicFunctionality };