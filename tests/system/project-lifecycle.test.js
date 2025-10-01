import TestEnvironment from '../setup/TestEnvironment.js';

/**
 * Real Objects System Tests - Project Lifecycle
 * Tests complete project workflows with real services and real data
 * NO MOCKS - only real objects and real behavior
 */

/**
 * Test complete project creation and persistence workflow
 */
async function testProjectCreationLifecycle() {
    const env = await new TestEnvironment().setup();
    
    try {
        console.log('🔄 Testing complete project creation lifecycle...');
        
        // Get real services
        const fileService = env.getFileSystemService();
        
        // Create real project data
        const projectData = {
            name: 'System Test Project',
            artist: 'Test Artist',
            description: 'A comprehensive system test project',
            version: '1.0.0',
            resolution: '1080p',
            isHorizontal: true,
            targetFrames: 60,
            effects: [
                {
                    id: 'effect_blur_001',
                    type: 'blur',
                    enabled: true,
                    properties: {
                        intensity: 0.75,
                        radius: 8,
                        quality: 'high'
                    }
                },
                {
                    id: 'effect_glow_001',
                    type: 'glow',
                    enabled: true,
                    properties: {
                        color: '#00ff88',
                        strength: 0.9,
                        spread: 12
                    }
                },
                {
                    id: 'effect_noise_001',
                    type: 'noise',
                    enabled: false,
                    properties: {
                        amount: 0.3,
                        type: 'gaussian'
                    }
                }
            ],
            metadata: {
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                tags: ['test', 'system', 'lifecycle']
            }
        };
        
        // Test real project file creation
        console.log('📝 Creating project file with real file service...');
        const projectFileName = 'system-test-project.nftproject';
        const writeResult = await fileService.writeFile(
            projectFileName, 
            JSON.stringify(projectData, null, 2)
        );
        
        if (!writeResult.success) {
            throw new Error(`Project creation failed: ${writeResult.error}`);
        }
        console.log('✅ Project file created successfully');
        
        // Verify real file existence
        console.log('🔍 Verifying project file exists...');
        const fileExists = await fileService.fileExists(projectFileName);
        if (!fileExists) {
            throw new Error('Project file should exist after creation');
        }
        console.log('✅ Project file existence verified');
        
        // Test real project loading
        console.log('📖 Loading project with real file service...');
        const readResult = await fileService.readFile(projectFileName);
        if (!readResult.success) {
            throw new Error(`Project loading failed: ${readResult.error}`);
        }
        
        const loadedProject = JSON.parse(readResult.content);
        console.log('✅ Project loaded successfully');
        
        // Verify complete data integrity
        console.log('🔍 Verifying complete data integrity...');
        
        // Basic project properties
        if (loadedProject.name !== projectData.name) {
            throw new Error(`Name mismatch: expected "${projectData.name}", got "${loadedProject.name}"`);
        }
        
        if (loadedProject.artist !== projectData.artist) {
            throw new Error(`Artist mismatch: expected "${projectData.artist}", got "${loadedProject.artist}"`);
        }
        
        if (loadedProject.resolution !== projectData.resolution) {
            throw new Error(`Resolution mismatch: expected "${projectData.resolution}", got "${loadedProject.resolution}"`);
        }
        
        if (loadedProject.targetFrames !== projectData.targetFrames) {
            throw new Error(`Target frames mismatch: expected ${projectData.targetFrames}, got ${loadedProject.targetFrames}`);
        }
        
        // Effects verification
        if (!loadedProject.effects || loadedProject.effects.length !== projectData.effects.length) {
            throw new Error(`Effects count mismatch: expected ${projectData.effects.length}, got ${loadedProject.effects?.length || 0}`);
        }
        
        for (let i = 0; i < projectData.effects.length; i++) {
            const originalEffect = projectData.effects[i];
            const loadedEffect = loadedProject.effects[i];
            
            if (loadedEffect.id !== originalEffect.id) {
                throw new Error(`Effect ${i} ID mismatch: expected "${originalEffect.id}", got "${loadedEffect.id}"`);
            }
            
            if (loadedEffect.type !== originalEffect.type) {
                throw new Error(`Effect ${i} type mismatch: expected "${originalEffect.type}", got "${loadedEffect.type}"`);
            }
            
            if (loadedEffect.enabled !== originalEffect.enabled) {
                throw new Error(`Effect ${i} enabled mismatch: expected ${originalEffect.enabled}, got ${loadedEffect.enabled}`);
            }
            
            // Verify properties deep equality
            const originalProps = JSON.stringify(originalEffect.properties);
            const loadedProps = JSON.stringify(loadedEffect.properties);
            if (originalProps !== loadedProps) {
                throw new Error(`Effect ${i} properties mismatch`);
            }
        }
        
        // Metadata verification
        if (!loadedProject.metadata) {
            throw new Error('Metadata should be preserved');
        }
        
        if (loadedProject.metadata.tags.length !== projectData.metadata.tags.length) {
            throw new Error('Metadata tags should be preserved');
        }
        
        console.log('✅ Complete data integrity verified');
        
        // Test project modification workflow
        console.log('🔄 Testing project modification workflow...');
        
        // Modify project data
        loadedProject.name = 'Modified System Test Project';
        loadedProject.effects.push({
            id: 'effect_sepia_001',
            type: 'sepia',
            enabled: true,
            properties: {
                intensity: 0.6
            }
        });
        loadedProject.metadata.lastModified = new Date().toISOString();
        loadedProject.metadata.tags.push('modified');
        
        // Save modified project
        const modifiedWriteResult = await fileService.writeFile(
            projectFileName,
            JSON.stringify(loadedProject, null, 2)
        );
        
        if (!modifiedWriteResult.success) {
            throw new Error(`Modified project save failed: ${modifiedWriteResult.error}`);
        }
        
        // Reload and verify modifications
        const reloadResult = await fileService.readFile(projectFileName);
        if (!reloadResult.success) {
            throw new Error(`Modified project reload failed: ${reloadResult.error}`);
        }
        
        const reloadedProject = JSON.parse(reloadResult.content);
        
        if (reloadedProject.name !== 'Modified System Test Project') {
            throw new Error('Project name modification not persisted');
        }
        
        if (reloadedProject.effects.length !== 4) {
            throw new Error('Added effect not persisted');
        }
        
        if (!reloadedProject.metadata.tags.includes('modified')) {
            throw new Error('Modified tag not persisted');
        }
        
        console.log('✅ Project modification workflow verified');
        
        console.log('🎉 Complete project lifecycle test passed');
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test project backup and recovery workflow
 */
async function testProjectBackupRecovery() {
    const env = await new TestEnvironment().setup();
    
    try {
        console.log('🔄 Testing project backup and recovery workflow...');
        
        const fileService = env.getFileSystemService();
        
        // Create original project
        const originalProject = {
            name: 'Backup Test Project',
            version: '1.0.0',
            effects: [
                { id: 'effect_1', type: 'blur', properties: { intensity: 0.5 } }
            ]
        };
        
        const projectFile = 'backup-test.nftproject';
        await fileService.writeFile(projectFile, JSON.stringify(originalProject, null, 2));
        
        // Create backup
        console.log('💾 Creating project backup...');
        const backupFile = 'backup-test.backup.nftproject';
        const readResult = await fileService.readFile(projectFile);
        await fileService.writeFile(backupFile, readResult.content);
        
        // Verify backup exists
        const backupExists = await fileService.fileExists(backupFile);
        if (!backupExists) {
            throw new Error('Backup file should exist');
        }
        
        // Simulate project corruption (modify original)
        console.log('💥 Simulating project corruption...');
        await fileService.writeFile(projectFile, 'corrupted data');
        
        // Attempt to load corrupted project
        const corruptedRead = await fileService.readFile(projectFile);
        try {
            JSON.parse(corruptedRead.content);
            throw new Error('Should not be able to parse corrupted data');
        } catch (error) {
            if (error.message.includes('Should not be able')) {
                throw error;
            }
            // Expected JSON parse error
        }
        
        // Recover from backup
        console.log('🔄 Recovering from backup...');
        const backupRead = await fileService.readFile(backupFile);
        await fileService.writeFile(projectFile, backupRead.content);
        
        // Verify recovery
        const recoveredRead = await fileService.readFile(projectFile);
        const recoveredProject = JSON.parse(recoveredRead.content);
        
        if (recoveredProject.name !== originalProject.name) {
            throw new Error('Recovery failed - project name mismatch');
        }
        
        if (recoveredProject.effects.length !== originalProject.effects.length) {
            throw new Error('Recovery failed - effects count mismatch');
        }
        
        console.log('✅ Project backup and recovery verified');
        
    } finally {
        await env.cleanup();
    }
}

/**
 * Test concurrent project operations
 */
async function testConcurrentProjectOperations() {
    const env = await new TestEnvironment().setup();
    
    try {
        console.log('🔄 Testing concurrent project operations...');
        
        const fileService = env.getFileSystemService();
        
        // Create multiple projects concurrently
        const projectPromises = [];
        for (let i = 1; i <= 5; i++) {
            const projectData = {
                name: `Concurrent Project ${i}`,
                id: `project_${i}`,
                effects: [
                    { id: `effect_${i}_1`, type: 'blur', properties: { intensity: i * 0.1 } }
                ]
            };
            
            const promise = fileService.writeFile(
                `concurrent-project-${i}.nftproject`,
                JSON.stringify(projectData, null, 2)
            );
            projectPromises.push(promise);
        }
        
        // Wait for all writes to complete
        const writeResults = await Promise.all(projectPromises);
        
        // Verify all writes succeeded
        for (let i = 0; i < writeResults.length; i++) {
            if (!writeResults[i].success) {
                throw new Error(`Concurrent write ${i + 1} failed: ${writeResults[i].error}`);
            }
        }
        
        // Read all projects concurrently
        const readPromises = [];
        for (let i = 1; i <= 5; i++) {
            readPromises.push(fileService.readFile(`concurrent-project-${i}.nftproject`));
        }
        
        const readResults = await Promise.all(readPromises);
        
        // Verify all reads succeeded and data integrity
        for (let i = 0; i < readResults.length; i++) {
            if (!readResults[i].success) {
                throw new Error(`Concurrent read ${i + 1} failed: ${readResults[i].error}`);
            }
            
            const project = JSON.parse(readResults[i].content);
            const expectedName = `Concurrent Project ${i + 1}`;
            if (project.name !== expectedName) {
                throw new Error(`Concurrent project ${i + 1} name mismatch: expected "${expectedName}", got "${project.name}"`);
            }
        }
        
        console.log('✅ Concurrent project operations verified');
        
    } finally {
        await env.cleanup();
    }
}

// Export test functions
export {
    testProjectCreationLifecycle,
    testProjectBackupRecovery,
    testConcurrentProjectOperations
};

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🧪 Running Real Objects System Tests - Project Lifecycle\n');
    
    const tests = [
        { name: 'Project Creation Lifecycle', fn: testProjectCreationLifecycle },
        { name: 'Project Backup Recovery', fn: testProjectBackupRecovery },
        { name: 'Concurrent Project Operations', fn: testConcurrentProjectOperations }
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
    
    console.log(`\n📊 System Test Results: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}