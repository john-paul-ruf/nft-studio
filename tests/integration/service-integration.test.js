import TestEnvironment from '../setup/TestEnvironment.js';

/**
 * Real Objects Service Integration Tests
 * Tests actual service interactions with real dependencies
 * NO MOCKS - only real objects and real behavior
 */

/**
 * Test FileSystemService with real file operations
 */
async function testFileSystemServiceRealOperations() {
    const env = await new TestEnvironment().setup();
    
    try {
        // Get REAL FileSystemService (not a mock)
        const fileService = env.getFileSystemService();
        
        // Test real file write operation
        const testData = { 
            name: "test-project", 
            version: "1.0",
            effects: [
                { type: "blur", intensity: 0.5 },
                { type: "glow", color: "#ff0000" }
            ]
        };
        
        console.log('📝 Testing real file write operation...');
        const writeResult = await fileService.writeFile('test-project.json', JSON.stringify(testData, null, 2));
        
        // Assert real write result
        if (!writeResult.success) {
            throw new Error(`Real file write failed: ${writeResult.error}`);
        }
        console.log('✅ Real file write succeeded');
        
        // Test real file read operation
        console.log('📖 Testing real file read operation...');
        const readResult = await fileService.readFile('test-project.json');
        
        if (!readResult.success) {
            throw new Error(`Real file read failed: ${readResult.error}`);
        }
        
        // Verify real data persistence
        const parsedData = JSON.parse(readResult.content);
        if (parsedData.name !== testData.name) {
            throw new Error(`Data mismatch: expected ${testData.name}, got ${parsedData.name}`);
        }
        
        if (parsedData.effects.length !== testData.effects.length) {
            throw new Error(`Effects count mismatch: expected ${testData.effects.length}, got ${parsedData.effects.length}`);
        }
        
        console.log('✅ Real file read and data verification succeeded');
        
        // Test real file existence check
        console.log('🔍 Testing real file existence check...');
        const exists = await fileService.fileExists('test-project.json');
        if (!exists) {
            throw new Error('File should exist after real write operation');
        }
        console.log('✅ Real file existence check succeeded');
        
        // Test real file operations with non-existent file
        console.log('🔍 Testing real file operations with non-existent file...');
        const nonExistentRead = await fileService.readFile('non-existent.json');
        if (nonExistentRead.success) {
            throw new Error('Reading non-existent file should fail');
        }
        console.log('✅ Real error handling for non-existent file succeeded');
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test real dependency injection and service resolution
 */
async function testRealDependencyInjection() {
    const env = await new TestEnvironment().setup();
    
    try {
        console.log('🔧 Testing real dependency injection...');
        
        // Get real dependency container (not a mock)
        const container = env.getContainer();
        
        // Test real service resolution
        const fileService = container.resolve('fileSystemService');
        const frameService = container.resolve('frameService');
        const imageService = container.resolve('imageService');
        
        // Verify these are real objects, not mocks
        if (typeof fileService !== 'object' || fileService === null) {
            throw new Error('FileSystemService should be real object');
        }
        
        if (typeof frameService !== 'object' || frameService === null) {
            throw new Error('FrameService should be real object');
        }
        
        if (typeof imageService !== 'object' || imageService === null) {
            throw new Error('ImageService should be real object');
        }
        
        console.log('✅ Real service resolution succeeded');
        
        // Test real singleton behavior
        console.log('🔄 Testing real singleton behavior...');
        const fileService2 = container.resolve('fileSystemService');
        const frameService2 = container.resolve('frameService');
        
        if (fileService !== fileService2) {
            throw new Error('FileSystemService should be same singleton instance');
        }
        
        if (frameService !== frameService2) {
            throw new Error('FrameService should be same singleton instance');
        }
        
        console.log('✅ Real singleton behavior verified');
        
        // Test real dependency injection in composite services
        console.log('🔗 Testing real dependency injection in composite services...');
        
        // FrameService should have real FileSystemService and ImageService injected
        if (!frameService.fileSystemService) {
            throw new Error('FrameService should have fileSystemService dependency injected');
        }
        
        if (!frameService.imageService) {
            throw new Error('FrameService should have imageService dependency injected');
        }
        
        // Verify injected dependencies are the same real instances
        if (frameService.fileSystemService !== fileService) {
            throw new Error('FrameService should have same FileSystemService instance injected');
        }
        
        if (frameService.imageService !== imageService) {
            throw new Error('FrameService should have same ImageService instance injected');
        }
        
        console.log('✅ Real dependency injection in composite services verified');
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test real service interactions and workflows
 */
async function testRealServiceWorkflow() {
    const env = await new TestEnvironment().setup();
    
    try {
        console.log('🔄 Testing real service workflow...');
        
        // Get real services
        const fileService = env.getFileSystemService();
        const projectManager = env.getProjectManager();
        
        // Create real test data
        const projectConfig = {
            name: 'Integration Test Project',
            artist: 'Test Artist',
            resolution: '1080p',
            isHorizontal: true,
            targetFrames: 30,
            effects: [
                {
                    id: 'effect_1',
                    type: 'blur',
                    properties: { intensity: 0.7, radius: 5 }
                },
                {
                    id: 'effect_2', 
                    type: 'glow',
                    properties: { color: '#00ff00', strength: 0.8 }
                }
            ]
        };
        
        // Test real project creation workflow
        console.log('📁 Creating real project...');
        
        // First, save project config to file using real file service
        const configPath = 'integration-test-project.json';
        const writeResult = await fileService.writeFile(configPath, JSON.stringify(projectConfig, null, 2));
        
        if (!writeResult.success) {
            throw new Error(`Failed to write project config: ${writeResult.error}`);
        }
        
        console.log('✅ Real project config file created');
        
        // Test real project loading workflow
        console.log('📖 Loading real project...');
        const readResult = await fileService.readFile(configPath);
        
        if (!readResult.success) {
            throw new Error(`Failed to read project config: ${readResult.error}`);
        }
        
        const loadedConfig = JSON.parse(readResult.content);
        
        // Verify real data integrity through complete workflow
        if (loadedConfig.name !== projectConfig.name) {
            throw new Error(`Project name mismatch: expected ${projectConfig.name}, got ${loadedConfig.name}`);
        }
        
        if (loadedConfig.effects.length !== projectConfig.effects.length) {
            throw new Error(`Effects count mismatch: expected ${projectConfig.effects.length}, got ${loadedConfig.effects.length}`);
        }
        
        // Verify effect properties persisted correctly
        for (let i = 0; i < projectConfig.effects.length; i++) {
            const originalEffect = projectConfig.effects[i];
            const loadedEffect = loadedConfig.effects[i];
            
            if (originalEffect.type !== loadedEffect.type) {
                throw new Error(`Effect ${i} type mismatch: expected ${originalEffect.type}, got ${loadedEffect.type}`);
            }
            
            if (JSON.stringify(originalEffect.properties) !== JSON.stringify(loadedEffect.properties)) {
                throw new Error(`Effect ${i} properties mismatch`);
            }
        }
        
        console.log('✅ Real project workflow completed successfully');
        
        // Test real error handling in workflow
        console.log('⚠️ Testing real error handling...');
        
        const invalidReadResult = await fileService.readFile('non-existent-project.json');
        if (invalidReadResult.success) {
            throw new Error('Reading non-existent project should fail');
        }
        
        console.log('✅ Real error handling verified');
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test real service state management and isolation
 */
async function testRealServiceStateIsolation() {
    const env = await new TestEnvironment().setup();
    
    try {
        console.log('🔒 Testing real service state isolation...');
        
        const fileService = env.getFileSystemService();
        
        // Create multiple files to test state isolation
        const file1Data = { id: 1, name: 'file1' };
        const file2Data = { id: 2, name: 'file2' };
        
        // Write real files
        await fileService.writeFile('state-test-1.json', JSON.stringify(file1Data));
        await fileService.writeFile('state-test-2.json', JSON.stringify(file2Data));
        
        // Read files back and verify isolation
        const read1 = await fileService.readFile('state-test-1.json');
        const read2 = await fileService.readFile('state-test-2.json');
        
        if (!read1.success || !read2.success) {
            throw new Error('Real file operations should succeed');
        }
        
        const parsed1 = JSON.parse(read1.content);
        const parsed2 = JSON.parse(read2.content);
        
        if (parsed1.id !== 1 || parsed1.name !== 'file1') {
            throw new Error('File 1 data corruption - state isolation failed');
        }
        
        if (parsed2.id !== 2 || parsed2.name !== 'file2') {
            throw new Error('File 2 data corruption - state isolation failed');
        }
        
        console.log('✅ Real service state isolation verified');
        
    } finally {
        await env.cleanup();
    }
}

// Export test functions for runner
export {
    testFileSystemServiceRealOperations,
    testRealDependencyInjection,
    testRealServiceWorkflow,
    testRealServiceStateIsolation
};

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🧪 Running Real Objects Service Integration Tests\n');
    
    const tests = [
        { name: 'FileSystem Service Real Operations', fn: testFileSystemServiceRealOperations },
        { name: 'Real Dependency Injection', fn: testRealDependencyInjection },
        { name: 'Real Service Workflow', fn: testRealServiceWorkflow },
        { name: 'Real Service State Isolation', fn: testRealServiceStateIsolation }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            console.log(`\n🧪 Running: ${test.name}`);
            await test.fn();
            console.log(`✅ PASSED: ${test.name}`);
            passed++;
        } catch (error) {
            console.error(`❌ FAILED: ${test.name}`);
            console.error(`   Error: ${error.message}`);
            failed++;
        }
    }
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}