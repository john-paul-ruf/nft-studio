import TestEnvironment from '../setup/TestEnvironment.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * PHASE 6: EDGE CASES & SPECIAL SCENARIOS
 * Tests error handling, edge cases, and special scenarios
 * Real objects, real file system operations, full cleanup
 */

/**
 * Helper: Create test plugin
 */
async function createTestPlugin(tempDir, pluginName = 'test-plugin') {
    const pluginDir = path.join(tempDir, pluginName);
    await fs.mkdir(pluginDir, { recursive: true });
    
    const packageJson = {
        name: pluginName,
        version: '1.0.0',
        type: 'module',
        main: 'index.js'
    };
    await fs.writeFile(
        path.join(pluginDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );
    
    const indexContent = `
export class TestEffect {
    constructor(config = {}) {
        this.config = config;
    }
    static get configClass() {
        return class Config { };
    }
    apply(context) { return context; }
}
export default TestEffect;
`;
    
    await fs.writeFile(path.join(pluginDir, 'index.js'), indexContent);
    return pluginDir;
}

/**
 * Test 1: Concurrent Plugin Operations
 * Tests handling of concurrent install/uninstall operations
 */
export async function testConcurrentPluginOperations() {
    const testEnv = await new TestEnvironment().setup();
    
    try {
        console.log('\n🧪 Test 1: Concurrent Plugin Operations\n');
        
        const pluginManager = testEnv.getService('PluginManagerService');
        if (!pluginManager) {
            throw new Error('PluginManagerService not available');
        }
        
        console.log('📦 Phase 1: Create Multiple Plugins');
        console.log('─'.repeat(40));
        
        // Create multiple plugins
        const pluginDirs = [];
        for (let i = 0; i < 3; i++) {
            const dir = await createTestPlugin(testEnv.testDirectory, `concurrent-${i}`);
            pluginDirs.push(dir);
        }
        console.log(`✅ Created ${pluginDirs.length} test plugins`);
        
        console.log('\n⚡ Phase 2: Install Concurrently');
        console.log('─'.repeat(40));
        
        // Install all concurrently
        const installPromises = pluginDirs.map((dir, idx) =>
            pluginManager.addPlugin({
                name: `concurrent-${idx}`,
                path: dir,
                enabled: true
            })
        );
        
        const installResults = await Promise.all(installPromises);
        
        const allSuccessful = installResults.every(r => r.success);
        if (!allSuccessful) {
            const failures = installResults.filter(r => !r.success);
            throw new Error(`${failures.length} plugins failed to install concurrently`);
        }
        console.log('✅ All plugins installed concurrently');
        
        console.log('\n🔍 Phase 3: Verify All Installed');
        console.log('─'.repeat(40));
        
        const plugins = await pluginManager.getPlugins();
        const concurrent = plugins.filter(p => p.name.startsWith('concurrent-'));
        
        if (concurrent.length !== 3) {
            throw new Error(`Expected 3 concurrent plugins, found ${concurrent.length}`);
        }
        console.log(`✅ All 3 plugins verified in registry`);
        
        console.log('\n⚡ Phase 4: Uninstall Concurrently');
        console.log('─'.repeat(40));
        
        // Uninstall all concurrently
        const uninstallPromises = [0, 1, 2].map(idx =>
            pluginManager.removePlugin(`concurrent-${idx}`)
        );
        
        const uninstallResults = await Promise.all(uninstallPromises);
        
        const allRemoved = uninstallResults.every(r => r.success);
        if (!allRemoved) {
            throw new Error('Some plugins failed to uninstall concurrently');
        }
        console.log('✅ All plugins uninstalled concurrently');
        
        console.log('\n✨ Test 1 PASSED: Concurrent operations handled safely\n');
        
    } catch (error) {
        console.error('\n❌ Test 1 FAILED:', error.message);
        throw error;
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 2: Plugin Reinstall (Install → Uninstall → Install Again)
 * Tests handling of reinstalling the same plugin
 */
export async function testPluginReinstallScenario() {
    const testEnv = await new TestEnvironment().setup();
    
    try {
        console.log('\n🧪 Test 2: Plugin Reinstall Scenario\n');
        
        const pluginManager = testEnv.getService('PluginManagerService');
        if (!pluginManager) {
            throw new Error('PluginManagerService not available');
        }
        
        const pluginDir = await createTestPlugin(testEnv.testDirectory, 'reinstall-plugin');
        
        console.log('📦 Phase 1: First Install');
        console.log('─'.repeat(40));
        
        const install1 = await pluginManager.addPlugin({
            name: 'reinstall-plugin',
            path: pluginDir,
            enabled: true
        });
        
        if (!install1.success) {
            throw new Error(`First install failed: ${install1.error}`);
        }
        console.log('✅ First installation successful');
        
        console.log('\n🗑️  Phase 2: Uninstall');
        console.log('─'.repeat(40));
        
        const uninstall = await pluginManager.removePlugin('reinstall-plugin');
        if (!uninstall.success) {
            throw new Error(`Uninstall failed: ${uninstall.error}`);
        }
        console.log('✅ Uninstall successful');
        
        // Verify removed
        let plugins = await pluginManager.getPlugins();
        if (plugins.find(p => p.name === 'reinstall-plugin')) {
            throw new Error('Plugin should be removed');
        }
        console.log('✅ Plugin confirmed removed from registry');
        
        console.log('\n📦 Phase 3: Second Install (Same Plugin)');
        console.log('─'.repeat(40));
        
        const install2 = await pluginManager.addPlugin({
            name: 'reinstall-plugin',
            path: pluginDir,
            enabled: true
        });
        
        if (!install2.success) {
            throw new Error(`Second install failed: ${install2.error}`);
        }
        console.log('✅ Second installation successful');
        
        // Verify reinstalled
        plugins = await pluginManager.getPlugins();
        const reinstalled = plugins.find(p => p.name === 'reinstall-plugin');
        if (!reinstalled) {
            throw new Error('Plugin should be reinstalled');
        }
        console.log('✅ Plugin confirmed reinstalled');
        
        console.log('\n🗑️  Phase 4: Final Cleanup');
        console.log('─'.repeat(40));
        
        const finalUninstall = await pluginManager.removePlugin('reinstall-plugin');
        if (!finalUninstall.success) {
            throw new Error('Final uninstall failed');
        }
        console.log('✅ Plugin removed');
        
        console.log('\n✨ Test 2 PASSED: Reinstall scenario works correctly\n');
        
    } catch (error) {
        console.error('\n❌ Test 2 FAILED:', error.message);
        throw error;
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 3: Plugin Enable/Disable Toggle Sequence
 * Tests multiple enable/disable cycles
 */
export async function testPluginToggleSequence() {
    const testEnv = await new TestEnvironment().setup();
    
    try {
        console.log('\n🧪 Test 3: Plugin Toggle Sequence\n');
        
        const pluginManager = testEnv.getService('PluginManagerService');
        if (!pluginManager) {
            throw new Error('PluginManagerService not available');
        }
        
        const pluginDir = await createTestPlugin(testEnv.testDirectory, 'toggle-plugin');
        
        console.log('📦 Phase 1: Install Plugin (Enabled)');
        console.log('─'.repeat(40));
        
        await pluginManager.addPlugin({
            name: 'toggle-plugin',
            path: pluginDir,
            enabled: true
        });
        console.log('✅ Plugin installed and enabled');
        
        console.log('\n🔄 Phase 2: Toggle Sequence');
        console.log('─'.repeat(40));
        
        const toggleSequence = ['disable', 'enable', 'disable', 'enable', 'disable'];
        let currentState = true; // Started enabled
        
        for (const action of toggleSequence) {
            const result = await pluginManager.togglePlugin('toggle-plugin');
            if (!result.success) {
                throw new Error(`Toggle failed: ${result.error}`);
            }
            
            currentState = !currentState;
            const expectedState = currentState; // Expected state is what we toggled to
            
            // Verify state matches expectation
            const plugins = await pluginManager.getPlugins();
            const plugin = plugins.find(p => p.name === 'toggle-plugin');
            const actualState = plugin?.enabled ?? false;
            
            if (actualState !== expectedState) {
                throw new Error(`Toggle ${action} failed: expected ${expectedState}, got ${actualState}`);
            }
            
            console.log(`   ✅ ${action.toUpperCase()}: plugin is now ${actualState ? 'enabled' : 'disabled'}`);
        }
        
        console.log('\n✅ Phase 3: Final State Verification');
        console.log('─'.repeat(40));
        
        const plugins = await pluginManager.getPlugins();
        const plugin = plugins.find(p => p.name === 'toggle-plugin');
        const finalState = plugin?.enabled ?? false;
        
        console.log(`   Final state: ${finalState ? 'enabled' : 'disabled'}`);
        console.log('✅ Toggle sequence completed successfully');
        
        console.log('\n🗑️  Phase 4: Cleanup');
        console.log('─'.repeat(40));
        
        await pluginManager.removePlugin('toggle-plugin');
        console.log('✅ Plugin removed');
        
        console.log('\n✨ Test 3 PASSED: Toggle sequence works reliably\n');
        
    } catch (error) {
        console.error('\n❌ Test 3 FAILED:', error.message);
        throw error;
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 4: Cache Checksum Accuracy
 * Tests that cache checksums detect all changes correctly
 */
export async function testCacheChecksumAccuracy() {
    const testEnv = await new TestEnvironment().setup();
    
    try {
        console.log('\n🧪 Test 4: Cache Checksum Accuracy\n');
        
        const registryCache = testEnv.getService('RegistryCacheService');
        if (!registryCache) {
            throw new Error('RegistryCacheService not available');
        }
        
        console.log('📊 Phase 1: Create Initial Cache');
        console.log('─'.repeat(40));
        
        const registry1 = {
            coreEffects: { primary: ['blur', 'glow'] },
            plugins: [
                { name: 'plugin-a', path: '/path/a', updatedAt: '2024-01-01' },
                { name: 'plugin-b', path: '/path/b', updatedAt: '2024-01-02' }
            ]
        };
        
        await registryCache.saveCache(registry1);
        const stats1 = registryCache.getCacheStats();
        const checksum1 = registryCache.cache.checksum;
        console.log(`✅ Initial cache saved with checksum: ${checksum1.substring(0, 8)}...`);
        
        console.log('\n🔍 Phase 2: Verify Same Plugins Have Same Checksum');
        console.log('─'.repeat(40));
        
        // Same registry should have same checksum
        const registry2 = JSON.parse(JSON.stringify(registry1));
        const checksum2Calc = registryCache._calculateChecksum(registry2);
        
        if (checksum1 !== checksum2Calc) {
            throw new Error('Identical registries should have same checksum');
        }
        console.log(`✅ Identical registry has same checksum: ${checksum2Calc.substring(0, 8)}...`);
        
        console.log('\n🔍 Phase 3: Verify Different Plugins Have Different Checksum');
        console.log('─'.repeat(40));
        
        // Add new plugin
        const registry3 = {
            coreEffects: { primary: ['blur', 'glow'] },
            plugins: [
                { name: 'plugin-a', path: '/path/a', updatedAt: '2024-01-01' },
                { name: 'plugin-b', path: '/path/b', updatedAt: '2024-01-02' },
                { name: 'plugin-c', path: '/path/c', updatedAt: '2024-01-03' }  // New!
            ]
        };
        
        const checksum3 = registryCache._calculateChecksum(registry3);
        
        if (checksum1 === checksum3) {
            throw new Error('Different registries should have different checksums');
        }
        console.log(`✅ Modified registry has different checksum: ${checksum3.substring(0, 8)}...`);
        
        console.log('\n🔍 Phase 4: Verify Plugin Path Changes Are Detected');
        console.log('─'.repeat(40));
        
        // Change plugin path
        const registry4 = {
            coreEffects: { primary: ['blur', 'glow'] },
            plugins: [
                { name: 'plugin-a', path: '/new/path/a', updatedAt: '2024-01-01' },  // Changed!
                { name: 'plugin-b', path: '/path/b', updatedAt: '2024-01-02' }
            ]
        };
        
        const checksum4 = registryCache._calculateChecksum(registry4);
        
        if (checksum1 === checksum4) {
            throw new Error('Plugin path change should change checksum');
        }
        console.log(`✅ Plugin path change detected in checksum: ${checksum4.substring(0, 8)}...`);
        
        console.log('\n✨ Test 4 PASSED: Cache checksums are accurate\n');
        
    } catch (error) {
        console.error('\n❌ Test 4 FAILED:', error.message);
        throw error;
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 5: Large Plugin Set Performance
 * Tests system behavior with many plugins installed
 */
export async function testLargePluginSetPerformance() {
    const testEnv = await new TestEnvironment().setup();
    
    try {
        console.log('\n🧪 Test 5: Large Plugin Set Performance\n');
        
        const pluginManager = testEnv.getService('PluginManagerService');
        if (!pluginManager) {
            throw new Error('PluginManagerService not available');
        }
        
        const pluginCount = 10; // Test with 10 plugins
        
        console.log(`📦 Phase 1: Install ${pluginCount} Plugins`);
        console.log('─'.repeat(40));
        
        const startTime = Date.now();
        const pluginDirs = [];
        
        for (let i = 0; i < pluginCount; i++) {
            const dir = await createTestPlugin(testEnv.testDirectory, `perf-plugin-${i}`);
            pluginDirs.push(dir);
            
            const result = await pluginManager.addPlugin({
                name: `perf-plugin-${i}`,
                path: dir,
                enabled: i % 2 === 0  // Alternate enabled/disabled
            });
            
            if (!result.success) {
                throw new Error(`Failed to install plugin ${i}: ${result.error}`);
            }
            
            if (i % 2 === 0) {
                process.stdout.write('.');
            }
        }
        
        const installTime = Date.now() - startTime;
        console.log(`\n✅ All ${pluginCount} plugins installed in ${installTime}ms`);
        console.log(`   Average per plugin: ${Math.round(installTime / pluginCount)}ms`);
        
        console.log(`\n🔍 Phase 2: Verify All Plugins`);
        console.log('─'.repeat(40));
        
        const queryStart = Date.now();
        const plugins = await pluginManager.getPlugins();
        const queryTime = Date.now() - queryStart;
        
        const perfPlugins = plugins.filter(p => p.name.startsWith('perf-plugin-'));
        if (perfPlugins.length !== pluginCount) {
            throw new Error(`Expected ${pluginCount} plugins, found ${perfPlugins.length}`);
        }
        
        console.log(`✅ All ${pluginCount} plugins verified in ${queryTime}ms`);
        
        console.log(`\n🗑️  Phase 3: Uninstall All Plugins`);
        console.log('─'.repeat(40));
        
        const uninstallStart = Date.now();
        
        for (let i = 0; i < pluginCount; i++) {
            const result = await pluginManager.removePlugin(`perf-plugin-${i}`);
            if (!result.success) {
                throw new Error(`Failed to uninstall plugin ${i}`);
            }
            
            if (i % 2 === 0) {
                process.stdout.write('.');
            }
        }
        
        const uninstallTime = Date.now() - uninstallStart;
        console.log(`\n✅ All ${pluginCount} plugins uninstalled in ${uninstallTime}ms`);
        console.log(`   Average per plugin: ${Math.round(uninstallTime / pluginCount)}ms`);
        
        console.log('\n✨ Test 5 PASSED: Large plugin set handled efficiently\n');
        
    } catch (error) {
        console.error('\n❌ Test 5 FAILED:', error.message);
        throw error;
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 6: Plugin Registry Consistency Under Load
 * Tests that registry remains consistent under rapid operations
 */
export async function testRegistryConsistencyUnderLoad() {
    const testEnv = await new TestEnvironment().setup();
    
    try {
        console.log('\n🧪 Test 6: Registry Consistency Under Load\n');
        
        const pluginManager = testEnv.getService('PluginManagerService');
        if (!pluginManager) {
            throw new Error('PluginManagerService not available');
        }
        
        console.log('📦 Phase 1: Install 5 Plugins');
        console.log('─'.repeat(40));
        
        const baseName = 'load-consistency';
        for (let i = 0; i < 5; i++) {
            const dir = await createTestPlugin(testEnv.testDirectory, `${baseName}-${i}`);
            await pluginManager.addPlugin({
                name: `${baseName}-${i}`,
                path: dir,
                enabled: true
            });
        }
        console.log('✅ 5 plugins installed');
        
        console.log('\n⚡ Phase 2: Rapid Toggle Operations');
        console.log('─'.repeat(40));
        
        // Perform rapid toggle operations
        const operations = 20;
        for (let op = 0; op < operations; op++) {
            const pluginIdx = op % 5;
            const result = await pluginManager.togglePlugin(`${baseName}-${pluginIdx}`);
            
            if (!result.success) {
                throw new Error(`Toggle operation ${op} failed: ${result.error}`);
            }
            
            if (op % 5 === 0) process.stdout.write('.');
        }
        
        console.log(`\n✅ Completed ${operations} rapid toggle operations`);
        
        console.log('\n🔍 Phase 3: Verify Registry Integrity');
        console.log('─'.repeat(40));
        
        const plugins = await pluginManager.getPlugins();
        const consistentPlugins = plugins.filter(p => p.name.startsWith(baseName));
        
        if (consistentPlugins.length !== 5) {
            throw new Error(`Registry corrupted: expected 5 plugins, found ${consistentPlugins.length}`);
        }
        
        // Verify each plugin has valid state
        for (const plugin of consistentPlugins) {
            if (typeof plugin.enabled !== 'boolean') {
                throw new Error(`Plugin ${plugin.name} has invalid enabled state`);
            }
            if (!plugin.name || !plugin.path) {
                throw new Error(`Plugin ${plugin.name} has missing metadata`);
            }
        }
        
        console.log('✅ Registry integrity verified');
        console.log(`   - All 5 plugins present`);
        console.log(`   - All plugins have valid state`);
        console.log(`   - All plugins have complete metadata`);
        
        console.log('\n🗑️  Phase 4: Cleanup');
        console.log('─'.repeat(40));
        
        for (let i = 0; i < 5; i++) {
            await pluginManager.removePlugin(`${baseName}-${i}`);
        }
        console.log('✅ All plugins removed');
        
        console.log('\n✨ Test 6 PASSED: Registry remains consistent under load\n');
        
    } catch (error) {
        console.error('\n❌ Test 6 FAILED:', error.message);
        throw error;
    } finally {
        await testEnv.cleanup();
    }
}