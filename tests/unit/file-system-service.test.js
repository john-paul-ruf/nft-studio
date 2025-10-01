import TestEnvironment from '../setup/TestEnvironment.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * FileSystemService Method Testing
 * Tests all 5 FileSystemService methods with real file I/O operations
 * 
 * Methods Under Test:
 * 1. readFile(filePath) - File reading with userData path resolution
 * 2. writeFile(filePath, content) - File writing with userData path resolution
 * 3. fileExists(filePath) - File existence checking
 * 4. listFiles(directoryPath, filter) - Directory listing with optional filtering
 * 5. ensureDirectory(directoryPath) - Directory creation with recursive support
 */

/**
 * Test: FileSystemService.readFile() - Valid File Reading
 * Validates reading existing files with various path types
 */
async function testReadFileValidFiles() {
    const env = await new TestEnvironment().setup();
    
    try {
        const fileService = env.getFileSystemService();
        
        // Test 1: Read file with absolute path
        const testContent = JSON.stringify({ test: 'data', timestamp: Date.now() });
        const absolutePath = path.join(env.tempManager.tempDirectories[0], 'test-absolute.json');
        await fs.writeFile(absolutePath, testContent, 'utf8');
        
        const absoluteResult = await fileService.readFile(absolutePath);
        if (!absoluteResult.success) {
            throw new Error(`Absolute path read failed: ${absoluteResult.error}`);
        }
        if (absoluteResult.content !== testContent) {
            throw new Error('Absolute path content mismatch');
        }
        
        // Test 2: Read file with relative path (userData resolution)
        const relativeContent = JSON.stringify({ relative: 'test', id: 'userData-test' });
        const relativePath = 'test-relative.json';
        await fileService.writeFile(relativePath, relativeContent);
        
        const relativeResult = await fileService.readFile(relativePath);
        if (!relativeResult.success) {
            throw new Error(`Relative path read failed: ${relativeResult.error}`);
        }
        if (relativeResult.content !== relativeContent) {
            throw new Error('Relative path content mismatch');
        }
        
        // Test 3: Read complex JSON file
        const complexData = {
            project: {
                name: 'Test NFT Project',
                version: '1.0.0',
                effects: [
                    { type: 'blur', intensity: 0.5 },
                    { type: 'glow', color: '#ff0000' }
                ],
                metadata: {
                    created: new Date().toISOString(),
                    author: 'Test Suite'
                }
            }
        };
        const complexContent = JSON.stringify(complexData, null, 2);
        const complexPath = 'complex-project.json';
        await fileService.writeFile(complexPath, complexContent);
        
        const complexResult = await fileService.readFile(complexPath);
        if (!complexResult.success) {
            throw new Error(`Complex file read failed: ${complexResult.error}`);
        }
        
        const parsedComplex = JSON.parse(complexResult.content);
        if (parsedComplex.project.name !== complexData.project.name) {
            throw new Error('Complex file content parsing failed');
        }
        
        return { success: true, testsRun: 3 };
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test: FileSystemService.readFile() - Error Conditions
 * Validates error handling for non-existent files and invalid paths
 */
async function testReadFileErrorConditions() {
    const env = await new TestEnvironment().setup();
    
    try {
        const fileService = env.getFileSystemService();
        
        // Test 1: Non-existent file with absolute path
        const nonExistentAbsolute = path.join(env.tempManager.tempDirectories[0], 'does-not-exist.json');
        const absoluteResult = await fileService.readFile(nonExistentAbsolute);
        if (absoluteResult.success) {
            throw new Error('Should fail for non-existent absolute file');
        }
        if (!absoluteResult.error) {
            throw new Error('Should provide error message for non-existent file');
        }
        
        // Test 2: Non-existent file with relative path
        const relativeResult = await fileService.readFile('non-existent-relative.json');
        if (relativeResult.success) {
            throw new Error('Should fail for non-existent relative file');
        }
        if (!relativeResult.error) {
            throw new Error('Should provide error message for non-existent relative file');
        }
        
        // Test 3: Invalid path (directory instead of file)
        const dirPath = env.tempManager.tempDirectories[0];
        const dirResult = await fileService.readFile(dirPath);
        if (dirResult.success) {
            throw new Error('Should fail when trying to read directory as file');
        }
        
        return { success: true, testsRun: 3 };
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test: FileSystemService.writeFile() - Valid File Writing
 * Validates writing files with various content types and path types
 */
async function testWriteFileValidOperations() {
    const env = await new TestEnvironment().setup();
    
    try {
        const fileService = env.getFileSystemService();
        
        // Test 1: Write file with absolute path
        const absolutePath = path.join(env.tempManager.tempDirectories[0], 'write-absolute.txt');
        const absoluteContent = 'Test content for absolute path writing';
        
        const absoluteResult = await fileService.writeFile(absolutePath, absoluteContent);
        if (!absoluteResult.success) {
            throw new Error(`Absolute path write failed: ${absoluteResult.error}`);
        }
        
        // Verify file was actually written
        const verifyAbsolute = await fs.readFile(absolutePath, 'utf8');
        if (verifyAbsolute !== absoluteContent) {
            throw new Error('Absolute path write verification failed');
        }
        
        // Test 2: Write file with relative path (userData resolution)
        const relativeContent = JSON.stringify({
            preferences: {
                theme: 'dark',
                autoSave: true,
                recentProjects: ['project1.nft', 'project2.nft']
            }
        });
        
        const relativeResult = await fileService.writeFile('user-preferences.json', relativeContent);
        if (!relativeResult.success) {
            throw new Error(`Relative path write failed: ${relativeResult.error}`);
        }
        
        // Verify relative file was written and can be read back
        const verifyRelative = await fileService.readFile('user-preferences.json');
        if (!verifyRelative.success || verifyRelative.content !== relativeContent) {
            throw new Error('Relative path write verification failed');
        }
        
        // Test 3: Write large content
        const largeContent = 'x'.repeat(10000); // 10KB of data
        const largeResult = await fileService.writeFile('large-file.txt', largeContent);
        if (!largeResult.success) {
            throw new Error(`Large file write failed: ${largeResult.error}`);
        }
        
        // Verify large file
        const verifyLarge = await fileService.readFile('large-file.txt');
        if (!verifyLarge.success || verifyLarge.content.length !== 10000) {
            throw new Error('Large file write verification failed');
        }
        
        // Test 4: Overwrite existing file
        const overwriteContent = 'New content overwrites old content';
        const overwriteResult = await fileService.writeFile('user-preferences.json', overwriteContent);
        if (!overwriteResult.success) {
            throw new Error(`File overwrite failed: ${overwriteResult.error}`);
        }
        
        // Verify overwrite
        const verifyOverwrite = await fileService.readFile('user-preferences.json');
        if (!verifyOverwrite.success || verifyOverwrite.content !== overwriteContent) {
            throw new Error('File overwrite verification failed');
        }
        
        return { success: true, testsRun: 4 };
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test: FileSystemService.writeFile() - Directory Creation
 * Validates automatic directory creation for nested paths
 */
async function testWriteFileDirectoryCreation() {
    const env = await new TestEnvironment().setup();
    
    try {
        const fileService = env.getFileSystemService();
        
        // Test 1: Write to nested directory that doesn't exist
        const nestedPath = path.join(env.tempManager.tempDirectories[0], 'nested', 'deep', 'structure', 'file.json');
        const nestedContent = JSON.stringify({ nested: true, depth: 3 });
        
        const nestedResult = await fileService.writeFile(nestedPath, nestedContent);
        if (!nestedResult.success) {
            throw new Error(`Nested directory write failed: ${nestedResult.error}`);
        }
        
        // Verify nested file exists and directories were created
        const verifyNested = await fs.readFile(nestedPath, 'utf8');
        if (verifyNested !== nestedContent) {
            throw new Error('Nested directory write verification failed');
        }
        
        // Verify intermediate directories exist
        const deepDir = path.join(env.tempManager.tempDirectories[0], 'nested', 'deep');
        const deepDirStats = await fs.stat(deepDir);
        if (!deepDirStats.isDirectory()) {
            throw new Error('Intermediate directories were not created');
        }
        
        return { success: true, testsRun: 1 };
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test: FileSystemService.fileExists() - File Existence Checking
 * Validates file existence checking for various scenarios
 */
async function testFileExistsOperations() {
    const env = await new TestEnvironment().setup();
    
    try {
        const fileService = env.getFileSystemService();
        
        // Test 1: Check non-existent file
        const nonExistentPath = path.join(env.tempManager.tempDirectories[0], 'does-not-exist.txt');
        const nonExistentResult = await fileService.fileExists(nonExistentPath);
        if (nonExistentResult !== false) {
            throw new Error('Should return false for non-existent file');
        }
        
        // Test 2: Create file and check existence
        const existingPath = path.join(env.tempManager.tempDirectories[0], 'existing-file.txt');
        await fs.writeFile(existingPath, 'File exists', 'utf8');
        
        const existingResult = await fileService.fileExists(existingPath);
        if (existingResult !== true) {
            throw new Error('Should return true for existing file');
        }
        
        // Test 3: Check directory existence (should return true for directories too)
        const dirResult = await fileService.fileExists(env.tempManager.tempDirectories[0]);
        if (dirResult !== true) {
            throw new Error('Should return true for existing directory');
        }
        
        // Test 4: Check file after deletion
        await fs.unlink(existingPath);
        const deletedResult = await fileService.fileExists(existingPath);
        if (deletedResult !== false) {
            throw new Error('Should return false for deleted file');
        }
        
        return { success: true, testsRun: 4 };
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test: FileSystemService.listFiles() - Directory Listing
 * Validates directory listing with and without filters
 */
async function testListFilesOperations() {
    const env = await new TestEnvironment().setup();
    
    try {
        const fileService = env.getFileSystemService();
        const testDir = env.tempManager.tempDirectories[0];
        
        // Create test files with various extensions
        const testFiles = [
            'document.txt',
            'image.png',
            'config.json',
            'script.js',
            'style.css',
            'data.xml',
            'readme.md'
        ];
        
        for (const fileName of testFiles) {
            await fs.writeFile(path.join(testDir, fileName), `Content of ${fileName}`, 'utf8');
        }
        
        // Test 1: List all files (no filter)
        const allFiles = await fileService.listFiles(testDir);
        if (allFiles.length !== testFiles.length) {
            throw new Error(`Expected ${testFiles.length} files, got ${allFiles.length}`);
        }
        
        // Verify all test files are present
        for (const fileName of testFiles) {
            if (!allFiles.includes(fileName)) {
                throw new Error(`Missing file in listing: ${fileName}`);
            }
        }
        
        // Test 2: Filter for JSON files
        const jsonFilter = /\.json$/;
        const jsonFiles = await fileService.listFiles(testDir, jsonFilter);
        if (jsonFiles.length !== 1 || !jsonFiles.includes('config.json')) {
            throw new Error('JSON filter failed');
        }
        
        // Test 3: Filter for image files
        const imageFilter = /\.(png|jpg|jpeg|gif)$/i;
        const imageFiles = await fileService.listFiles(testDir, imageFilter);
        if (imageFiles.length !== 1 || !imageFiles.includes('image.png')) {
            throw new Error('Image filter failed');
        }
        
        // Test 4: Filter for text-based files
        const textFilter = /\.(txt|md|js|css)$/;
        const textFiles = await fileService.listFiles(testDir, textFilter);
        const expectedTextFiles = ['document.txt', 'script.js', 'style.css', 'readme.md'];
        if (textFiles.length !== expectedTextFiles.length) {
            throw new Error(`Text filter failed: expected ${expectedTextFiles.length}, got ${textFiles.length}`);
        }
        
        // Test 5: Filter that matches nothing
        const noMatchFilter = /\.xyz$/;
        const noMatchFiles = await fileService.listFiles(testDir, noMatchFilter);
        if (noMatchFiles.length !== 0) {
            throw new Error('No-match filter should return empty array');
        }
        
        return { success: true, testsRun: 5 };
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test: FileSystemService.listFiles() - Error Conditions
 * Validates error handling for invalid directories
 */
async function testListFilesErrorConditions() {
    const env = await new TestEnvironment().setup();
    
    try {
        const fileService = env.getFileSystemService();
        
        // Test 1: List files in non-existent directory
        const nonExistentDir = path.join(env.tempManager.tempDirectories[0], 'does-not-exist');
        const nonExistentResult = await fileService.listFiles(nonExistentDir);
        if (!Array.isArray(nonExistentResult) || nonExistentResult.length !== 0) {
            throw new Error('Should return empty array for non-existent directory');
        }
        
        // Test 2: List files on a file (not directory)
        const filePath = path.join(env.tempManager.tempDirectories[0], 'not-a-directory.txt');
        await fs.writeFile(filePath, 'This is a file', 'utf8');
        
        const fileResult = await fileService.listFiles(filePath);
        if (!Array.isArray(fileResult) || fileResult.length !== 0) {
            throw new Error('Should return empty array when trying to list files on a file');
        }
        
        return { success: true, testsRun: 2 };
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test: FileSystemService.ensureDirectory() - Directory Creation
 * Validates directory creation with recursive support
 */
async function testEnsureDirectoryOperations() {
    const env = await new TestEnvironment().setup();
    
    try {
        const fileService = env.getFileSystemService();
        const baseDir = env.tempManager.tempDirectories[0];
        
        // Test 1: Create single-level directory
        const singleDir = path.join(baseDir, 'single-level');
        const singleResult = await fileService.ensureDirectory(singleDir);
        if (singleResult !== true) {
            throw new Error('Single-level directory creation failed');
        }
        
        // Verify directory exists
        const singleStats = await fs.stat(singleDir);
        if (!singleStats.isDirectory()) {
            throw new Error('Single-level directory was not created');
        }
        
        // Test 2: Create multi-level directory (recursive)
        const multiDir = path.join(baseDir, 'level1', 'level2', 'level3', 'level4');
        const multiResult = await fileService.ensureDirectory(multiDir);
        if (multiResult !== true) {
            throw new Error('Multi-level directory creation failed');
        }
        
        // Verify all levels exist
        const multiStats = await fs.stat(multiDir);
        if (!multiStats.isDirectory()) {
            throw new Error('Multi-level directory was not created');
        }
        
        // Verify intermediate levels
        const level2 = path.join(baseDir, 'level1', 'level2');
        const level2Stats = await fs.stat(level2);
        if (!level2Stats.isDirectory()) {
            throw new Error('Intermediate directory level2 was not created');
        }
        
        // Test 3: Ensure existing directory (should succeed)
        const existingResult = await fileService.ensureDirectory(singleDir);
        if (existingResult !== true) {
            throw new Error('Ensuring existing directory should succeed');
        }
        
        // Test 4: Create directory with complex path
        const complexDir = path.join(baseDir, 'projects', 'nft-studio', 'effects', 'custom', 'user-defined');
        const complexResult = await fileService.ensureDirectory(complexDir);
        if (complexResult !== true) {
            throw new Error('Complex directory path creation failed');
        }
        
        // Verify complex directory exists
        const complexStats = await fs.stat(complexDir);
        if (!complexStats.isDirectory()) {
            throw new Error('Complex directory was not created');
        }
        
        return { success: true, testsRun: 4 };
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test: FileSystemService Integration - Complete Workflow
 * Tests all methods working together in realistic scenarios
 */
async function testFileSystemServiceIntegration() {
    const env = await new TestEnvironment().setup();
    
    try {
        const fileService = env.getFileSystemService();
        
        // Scenario: Project setup workflow
        // 1. Ensure project directory structure
        const projectDir = path.join(env.tempManager.tempDirectories[0], 'nft-project');
        const framesDir = path.join(projectDir, 'frames');
        const effectsDir = path.join(projectDir, 'effects');
        const outputDir = path.join(projectDir, 'output');
        
        const dirResults = await Promise.all([
            fileService.ensureDirectory(projectDir),
            fileService.ensureDirectory(framesDir),
            fileService.ensureDirectory(effectsDir),
            fileService.ensureDirectory(outputDir)
        ]);
        
        if (!dirResults.every(result => result === true)) {
            throw new Error('Project directory structure creation failed');
        }
        
        // 2. Create project configuration file
        const projectConfig = {
            name: 'Integration Test Project',
            version: '1.0.0',
            resolution: { width: 1920, height: 1080 },
            frameRate: 30,
            effects: [
                { type: 'blur', intensity: 0.3 },
                { type: 'glow', color: '#00ff00', strength: 0.7 }
            ],
            metadata: {
                created: new Date().toISOString(),
                author: 'FileSystem Integration Test'
            }
        };
        
        const configPath = path.join(projectDir, 'project.json');
        const configContent = JSON.stringify(projectConfig, null, 2);
        const writeResult = await fileService.writeFile(configPath, configContent);
        if (!writeResult.success) {
            throw new Error(`Project config write failed: ${writeResult.error}`);
        }
        
        // 3. Verify project file exists
        const configExists = await fileService.fileExists(configPath);
        if (!configExists) {
            throw new Error('Project config file should exist');
        }
        
        // 4. Read and validate project configuration
        const readResult = await fileService.readFile(configPath);
        if (!readResult.success) {
            throw new Error(`Project config read failed: ${readResult.error}`);
        }
        
        const parsedConfig = JSON.parse(readResult.content);
        if (parsedConfig.name !== projectConfig.name) {
            throw new Error('Project config validation failed');
        }
        
        // 5. Create sample frame files
        const frameFiles = ['frame001.png', 'frame002.png', 'frame003.png'];
        for (let i = 0; i < frameFiles.length; i++) {
            const frameContent = `Frame ${i + 1} data - ${Date.now()}`;
            const framePath = path.join(framesDir, frameFiles[i]);
            const frameResult = await fileService.writeFile(framePath, frameContent);
            if (!frameResult.success) {
                throw new Error(`Frame file ${frameFiles[i]} write failed`);
            }
        }
        
        // 6. List and verify frame files
        const framesList = await fileService.listFiles(framesDir);
        if (framesList.length !== frameFiles.length) {
            throw new Error(`Expected ${frameFiles.length} frame files, found ${framesList.length}`);
        }
        
        // 7. Filter for PNG files only
        const pngFilter = /\.png$/;
        const pngFiles = await fileService.listFiles(framesDir, pngFilter);
        if (pngFiles.length !== frameFiles.length) {
            throw new Error('PNG filter should match all frame files');
        }
        
        // 8. Create effect configuration files
        const effectConfigs = [
            { name: 'blur-config.json', data: { type: 'blur', intensity: 0.5, radius: 10 } },
            { name: 'glow-config.json', data: { type: 'glow', color: '#ff0000', strength: 0.8 } }
        ];
        
        for (const effect of effectConfigs) {
            const effectPath = path.join(effectsDir, effect.name);
            const effectContent = JSON.stringify(effect.data, null, 2);
            const effectResult = await fileService.writeFile(effectPath, effectContent);
            if (!effectResult.success) {
                throw new Error(`Effect config ${effect.name} write failed`);
            }
        }
        
        // 9. Verify complete project structure
        const allProjectFiles = await fileService.listFiles(projectDir);
        if (!allProjectFiles.includes('project.json')) {
            throw new Error('Project structure validation failed - missing project.json');
        }
        
        const allFrameFiles = await fileService.listFiles(framesDir);
        if (allFrameFiles.length !== 3) {
            throw new Error('Project structure validation failed - incorrect frame count');
        }
        
        const allEffectFiles = await fileService.listFiles(effectsDir);
        if (allEffectFiles.length !== 2) {
            throw new Error('Project structure validation failed - incorrect effect count');
        }
        
        return { success: true, testsRun: 9 };
        
    } finally {
        await env.cleanup();
    }
}

// Export all test functions
export {
    testReadFileValidFiles,
    testReadFileErrorConditions,
    testWriteFileValidOperations,
    testWriteFileDirectoryCreation,
    testFileExistsOperations,
    testListFilesOperations,
    testListFilesErrorConditions,
    testEnsureDirectoryOperations,
    testFileSystemServiceIntegration
};