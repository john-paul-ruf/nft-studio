/**
 * Real Objects Tests for DialogService
 * Tests all 3 methods with real dialog operations
 */

import TestEnvironment from '../setup/TestEnvironment.js';

/**
 * Test showFolderDialog method
 * Tests folder selection dialog with real dialog operations
 */
export async function testShowFolderDialog() {
    const testEnv = new TestEnvironment();
    
    try {
        await testEnv.setup();
        const dialogService = testEnv.getService('dialogService');
        
        // Test basic folder dialog operation
        const result = await dialogService.showFolderDialog();
        
        // Verify dialog result structure
        if (!result || typeof result !== 'object') {
            throw new Error('showFolderDialog should return an object');
        }
        
        if (!result.hasOwnProperty('canceled')) {
            throw new Error('Dialog result should have canceled property');
        }
        
        if (typeof result.canceled !== 'boolean') {
            throw new Error('canceled property should be boolean');
        }
        
        // For successful selection, should have filePaths
        if (!result.canceled) {
            if (!result.hasOwnProperty('filePaths')) {
                throw new Error('Non-canceled result should have filePaths property');
            }
            
            if (!Array.isArray(result.filePaths)) {
                throw new Error('filePaths should be an array');
            }
            
            if (result.filePaths.length === 0) {
                throw new Error('filePaths should not be empty for successful selection');
            }
            
            if (typeof result.filePaths[0] !== 'string') {
                throw new Error('filePaths should contain strings');
            }
        }
        
        console.log('✅ showFolderDialog test passed');
        
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test showFileDialog method
 * Tests file selection dialog with various options
 */
export async function testShowFileDialog() {
    const testEnv = new TestEnvironment();
    
    try {
        await testEnv.setup();
        const dialogService = testEnv.getService('dialogService');
        
        // Test 1: Default options
        const defaultResult = await dialogService.showFileDialog();
        
        if (!defaultResult || typeof defaultResult !== 'object') {
            throw new Error('showFileDialog should return an object');
        }
        
        if (!defaultResult.hasOwnProperty('canceled')) {
            throw new Error('Dialog result should have canceled property');
        }
        
        if (typeof defaultResult.canceled !== 'boolean') {
            throw new Error('canceled property should be boolean');
        }
        
        // Test 2: Custom options
        const customOptions = {
            filters: [
                { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg'] },
                { name: 'Text Files', extensions: ['txt', 'md'] }
            ],
            properties: ['openFile'],
            title: 'Select Image File'
        };
        
        const customResult = await dialogService.showFileDialog(customOptions);
        
        if (!customResult || typeof customResult !== 'object') {
            throw new Error('showFileDialog with custom options should return an object');
        }
        
        if (typeof customResult.canceled !== 'boolean') {
            throw new Error('Custom options result should have boolean canceled property');
        }
        
        // Test 3: Empty options object
        const emptyResult = await dialogService.showFileDialog({});
        
        if (!emptyResult || typeof emptyResult !== 'object') {
            throw new Error('showFileDialog with empty options should return an object');
        }
        
        if (typeof emptyResult.canceled !== 'boolean') {
            throw new Error('Empty options result should have boolean canceled property');
        }
        
        // Test 4: Null options
        const nullResult = await dialogService.showFileDialog(null);
        
        if (!nullResult || typeof nullResult !== 'object') {
            throw new Error('showFileDialog with null options should return an object');
        }
        
        if (typeof nullResult.canceled !== 'boolean') {
            throw new Error('Null options result should have boolean canceled property');
        }
        
        console.log('✅ showFileDialog test passed');
        
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test showSaveDialog method
 * Tests save dialog with various options
 */
export async function testShowSaveDialog() {
    const testEnv = new TestEnvironment();
    
    try {
        await testEnv.setup();
        const dialogService = testEnv.getService('dialogService');
        
        // Test 1: Default options
        const defaultResult = await dialogService.showSaveDialog();
        
        if (!defaultResult || typeof defaultResult !== 'object') {
            throw new Error('showSaveDialog should return an object');
        }
        
        if (!defaultResult.hasOwnProperty('canceled')) {
            throw new Error('Dialog result should have canceled property');
        }
        
        if (typeof defaultResult.canceled !== 'boolean') {
            throw new Error('canceled property should be boolean');
        }
        
        // For successful save, should have filePath
        if (!defaultResult.canceled) {
            if (!defaultResult.hasOwnProperty('filePath')) {
                throw new Error('Non-canceled save result should have filePath property');
            }
            
            if (typeof defaultResult.filePath !== 'string') {
                throw new Error('filePath should be a string');
            }
            
            if (defaultResult.filePath.length === 0) {
                throw new Error('filePath should not be empty for successful save');
            }
        }
        
        // Test 2: Custom options
        const customOptions = {
            title: 'Save Project File',
            defaultPath: 'my-project.nftproject',
            filters: [
                { name: 'NFT Project Files', extensions: ['nftproject'] },
                { name: 'JSON Files', extensions: ['json'] }
            ]
        };
        
        const customResult = await dialogService.showSaveDialog(customOptions);
        
        if (!customResult || typeof customResult !== 'object') {
            throw new Error('showSaveDialog with custom options should return an object');
        }
        
        if (typeof customResult.canceled !== 'boolean') {
            throw new Error('Custom options result should have boolean canceled property');
        }
        
        // Test 3: Various option combinations
        const testCases = [
            { defaultPath: 'test.json' },
            { title: 'Custom Save Title' },
            { filters: [{ name: 'All Files', extensions: ['*'] }] },
            { defaultPath: 'project.nftproject', title: 'Save NFT Project' }
        ];
        
        for (const options of testCases) {
            const result = await dialogService.showSaveDialog(options);
            
            if (!result || typeof result !== 'object') {
                throw new Error(`showSaveDialog with options ${JSON.stringify(options)} should return an object`);
            }
            
            if (typeof result.canceled !== 'boolean') {
                throw new Error(`Result for options ${JSON.stringify(options)} should have boolean canceled property`);
            }
        }
        
        console.log('✅ showSaveDialog test passed');
        
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test DialogService integration workflows
 * Tests complete dialog workflows and multiple operations
 */
export async function testDialogServiceIntegration() {
    const testEnv = new TestEnvironment();
    
    try {
        await testEnv.setup();
        const dialogService = testEnv.getService('dialogService');
        
        // Test 1: Complete file selection workflow
        const folderResult = await dialogService.showFolderDialog();
        const fileResult = await dialogService.showFileDialog({
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });
        const saveResult = await dialogService.showSaveDialog({
            defaultPath: 'processed-file.json'
        });
        
        // Verify all operations completed
        if (typeof folderResult.canceled !== 'boolean') {
            throw new Error('Folder dialog should return boolean canceled property');
        }
        
        if (typeof fileResult.canceled !== 'boolean') {
            throw new Error('File dialog should return boolean canceled property');
        }
        
        if (typeof saveResult.canceled !== 'boolean') {
            throw new Error('Save dialog should return boolean canceled property');
        }
        
        // Test 2: Multiple dialog operations in sequence
        const operations = [];
        
        for (let i = 0; i < 3; i++) {
            const folderOp = dialogService.showFolderDialog();
            const fileOp = dialogService.showFileDialog();
            const saveOp = dialogService.showSaveDialog({ defaultPath: `file-${i}.txt` });
            
            operations.push(folderOp, fileOp, saveOp);
        }
        
        const results = await Promise.all(operations);
        
        if (results.length !== 9) {
            throw new Error('Should have 9 results from 3 operations × 3 types');
        }
        
        results.forEach((result, index) => {
            if (!result || typeof result !== 'object') {
                throw new Error(`Result ${index} should be an object`);
            }
            
            if (typeof result.canceled !== 'boolean') {
                throw new Error(`Result ${index} should have boolean canceled property`);
            }
        });
        
        console.log('✅ DialogService integration test passed');
        
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test DialogService error handling and edge cases
 * Tests malformed options and error conditions
 */
export async function testDialogServiceErrorHandling() {
    const testEnv = new TestEnvironment();
    
    try {
        await testEnv.setup();
        const dialogService = testEnv.getService('dialogService');
        
        // Test 1: Malformed options
        const malformedOptions = [
            { filters: 'not-an-array' },
            { properties: 'not-an-array' },
            { defaultPath: 123 },
            { title: null }
        ];
        
        for (const options of malformedOptions) {
            const result = await dialogService.showFileDialog(options);
            
            if (!result || typeof result !== 'object') {
                throw new Error(`Malformed options ${JSON.stringify(options)} should still return an object`);
            }
            
            if (typeof result.canceled !== 'boolean') {
                throw new Error(`Malformed options ${JSON.stringify(options)} should still return boolean canceled property`);
            }
        }
        
        // Test 2: Consistent behavior across all methods
        const folderResult = await dialogService.showFolderDialog();
        const fileResult = await dialogService.showFileDialog();
        const saveResult = await dialogService.showSaveDialog();
        
        const allResults = [folderResult, fileResult, saveResult];
        
        allResults.forEach((result, index) => {
            const methodNames = ['showFolderDialog', 'showFileDialog', 'showSaveDialog'];
            
            if (!result || typeof result !== 'object') {
                throw new Error(`${methodNames[index]} should return an object`);
            }
            
            if (typeof result.canceled !== 'boolean') {
                throw new Error(`${methodNames[index]} should return boolean canceled property`);
            }
        });
        
        // Verify specific result structures
        if (!folderResult.canceled && folderResult.filePaths) {
            if (!Array.isArray(folderResult.filePaths)) {
                throw new Error('Folder dialog filePaths should be an array');
            }
        }
        
        if (!fileResult.canceled && fileResult.filePaths) {
            if (!Array.isArray(fileResult.filePaths)) {
                throw new Error('File dialog filePaths should be an array');
            }
        }
        
        if (!saveResult.canceled && saveResult.filePath) {
            if (typeof saveResult.filePath !== 'string') {
                throw new Error('Save dialog filePath should be a string');
            }
        }
        
        console.log('✅ DialogService error handling test passed');
        
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test DialogService method consistency
 * Tests that all methods follow consistent patterns
 */
export async function testDialogServiceConsistency() {
    const testEnv = new TestEnvironment();
    
    try {
        await testEnv.setup();
        const dialogService = testEnv.getService('dialogService');
        
        // Test that all methods exist and are functions
        if (typeof dialogService.showFolderDialog !== 'function') {
            throw new Error('showFolderDialog should be a function');
        }
        
        if (typeof dialogService.showFileDialog !== 'function') {
            throw new Error('showFileDialog should be a function');
        }
        
        if (typeof dialogService.showSaveDialog !== 'function') {
            throw new Error('showSaveDialog should be a function');
        }
        
        // Test that all methods return promises
        const folderPromise = dialogService.showFolderDialog();
        const filePromise = dialogService.showFileDialog();
        const savePromise = dialogService.showSaveDialog();
        
        if (!(folderPromise instanceof Promise)) {
            throw new Error('showFolderDialog should return a Promise');
        }
        
        if (!(filePromise instanceof Promise)) {
            throw new Error('showFileDialog should return a Promise');
        }
        
        if (!(savePromise instanceof Promise)) {
            throw new Error('showSaveDialog should return a Promise');
        }
        
        // Wait for all promises to resolve
        const [folderResult, fileResult, saveResult] = await Promise.all([
            folderPromise, filePromise, savePromise
        ]);
        
        // Verify all results have consistent structure
        const results = [
            { name: 'showFolderDialog', result: folderResult },
            { name: 'showFileDialog', result: fileResult },
            { name: 'showSaveDialog', result: saveResult }
        ];
        
        results.forEach(({ name, result }) => {
            if (!result || typeof result !== 'object') {
                throw new Error(`${name} should return an object`);
            }
            
            if (!result.hasOwnProperty('canceled')) {
                throw new Error(`${name} result should have canceled property`);
            }
            
            if (typeof result.canceled !== 'boolean') {
                throw new Error(`${name} result canceled property should be boolean`);
            }
        });
        
        console.log('✅ DialogService consistency test passed');
        
    } finally {
        await testEnv.cleanup();
    }
}