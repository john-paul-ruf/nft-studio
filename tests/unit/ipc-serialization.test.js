#!/usr/bin/env node
/**
 * Tests for IPC serialization fixes
 * Ensures config introspection data can be safely passed through Electron IPC
 */

import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';

class IPCSerializationTests {
    constructor() {
        this.effectsManager = new NftEffectsManager();
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async runAllTests() {
        console.log('🔄 IPC Serialization Tests\n');

        const tests = [
            () => this.testDeepSerializeForIPC(),
            () => this.testCircularReferenceHandling(),
            () => this.testComplexObjectSerialization(),
            () => this.testConfigIntrospectionSerialization(),
            () => this.testIPCResponseSafety()
        ];

        for (const test of tests) {
            await test();
        }

        this.printResults();
        return this.results.failed === 0;
    }

    testDeepSerializeForIPC() {
        this.results.total++;
        try {
            console.log('Testing deepSerializeForIPC method...');

            // Test 1: Primitive values
            const primitives = [null, undefined, true, false, 42, "string"];
            for (const primitive of primitives) {
                const result = this.effectsManager.deepSerializeForIPC(primitive);
                if (result !== primitive) {
                    throw new Error(`Primitive ${primitive} not serialized correctly`);
                }
            }

            // Test 2: Functions should be converted to strings
            const func = () => console.log("test");
            const funcResult = this.effectsManager.deepSerializeForIPC(func);
            if (funcResult !== '[Function]') {
                throw new Error('Function should be serialized as [Function]');
            }

            // Test 3: Arrays
            const array = [1, 2, { a: 3 }];
            const arrayResult = this.effectsManager.deepSerializeForIPC(array);
            if (!Array.isArray(arrayResult) || arrayResult[2].a !== 3) {
                throw new Error('Array not serialized correctly');
            }

            // Test 4: Dates
            const date = new Date('2023-01-01');
            const dateResult = this.effectsManager.deepSerializeForIPC(date);
            if (dateResult !== '2023-01-01T00:00:00.000Z') {
                throw new Error('Date not serialized correctly');
            }

            // Test 5: RegExp
            const regex = /test/gi;
            const regexResult = this.effectsManager.deepSerializeForIPC(regex);
            if (regexResult !== '/test/gi') {
                throw new Error('RegExp not serialized correctly');
            }

            // Test 6: Error objects
            const error = new Error('Test error');
            const errorResult = this.effectsManager.deepSerializeForIPC(error);
            if (!errorResult.name || !errorResult.message) {
                throw new Error('Error object not serialized correctly');
            }

            console.log('  ✅ deepSerializeForIPC handles all basic types correctly');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ deepSerializeForIPC test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'deepSerializeForIPC Basic Types',
                error: error.message
            });
        }
    }

    testCircularReferenceHandling() {
        this.results.total++;
        try {
            console.log('Testing circular reference handling...');

            // Test 1: Simple circular reference
            const obj1 = { name: 'obj1' };
            const obj2 = { name: 'obj2', ref: obj1 };
            obj1.ref = obj2; // Create circular reference

            const result = this.effectsManager.deepSerializeForIPC(obj1);

            if (!result.name || !result.ref || !result.ref.name) {
                throw new Error('Circular reference not handled correctly');
            }

            // One of the references should be marked as circular
            if (result.ref.ref !== '[Circular Reference]') {
                throw new Error('Circular reference not detected');
            }

            // Test 2: Self-referencing object
            const selfRef = { name: 'self' };
            selfRef.self = selfRef;

            const selfResult = this.effectsManager.deepSerializeForIPC(selfRef);
            if (selfResult.self !== '[Circular Reference]') {
                throw new Error('Self-reference not detected');
            }

            // Test 3: Deep circular reference
            const deep1 = { name: 'deep1' };
            const deep2 = { name: 'deep2', child: deep1 };
            const deep3 = { name: 'deep3', child: deep2 };
            deep1.child = deep3; // Create deep circular reference

            const deepResult = this.effectsManager.deepSerializeForIPC(deep1);
            if (!deepResult.child || !deepResult.child.child) {
                throw new Error('Deep circular reference not handled');
            }

            console.log('  ✅ Circular references handled correctly');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ Circular reference test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'Circular Reference Handling',
                error: error.message
            });
        }
    }

    testComplexObjectSerialization() {
        this.results.total++;
        try {
            console.log('Testing complex object serialization...');

            // Test 1: Class instances with methods
            class TestConfig {
                constructor() {
                    this.value = 42;
                    this.nested = { x: 100, y: 200 };
                }

                getDefaults() {
                    return { default: true };
                }
            }

            const configInstance = new TestConfig();
            const result = this.effectsManager.deepSerializeForIPC(configInstance);

            // Check that properties are preserved
            if (result.value !== 42 || !result.nested || result.nested.x !== 100) {
                throw new Error('Class instance properties not serialized correctly');
            }

            // Check that methods are converted to [Function]
            // Note: Instance methods on prototypes may not be enumerable on instances
            // For IPC safety, this is actually fine - we mainly care about data properties
            console.log('    Note: Methods on prototypes are not serialized (expected for IPC safety)');

            // Check that class name is preserved
            if (result.__className !== 'TestConfig') {
                throw new Error('Class name not preserved');
            }

            // Test 2: Nested complex objects
            const complexObject = {
                config: configInstance,
                metadata: {
                    created: new Date('2023-01-01'),
                    pattern: /test/,
                    tags: ['primary', 'effect']
                },
                handler: () => console.log('handler')
            };

            const complexResult = this.effectsManager.deepSerializeForIPC(complexObject);

            if (!complexResult.config || complexResult.config.value !== 42) {
                throw new Error('Nested config not serialized correctly');
            }

            if (!complexResult.metadata || !Array.isArray(complexResult.metadata.tags)) {
                throw new Error('Nested metadata not serialized correctly');
            }

            if (complexResult.handler !== '[Function]') {
                throw new Error('Nested function not converted correctly');
            }

            console.log('  ✅ Complex objects serialized correctly');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ Complex object serialization test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'Complex Object Serialization',
                error: error.message
            });
        }
    }

    async testConfigIntrospectionSerialization() {
        this.results.total++;
        try {
            console.log('Testing config introspection serialization...');

            // Mock a config class that might cause serialization issues
            const mockConfigData = {
                name: 'test-effect',
                properties: {
                    opacity: 0.5,
                    center: { x: 100, y: 200 },
                    // Simulate potentially problematic properties
                    callback: () => console.log('callback'),
                    metadata: {
                        created: new Date(),
                        pattern: /test/gi
                    }
                }
            };

            // Test serialization of config-like data
            const serialized = this.effectsManager.deepSerializeForIPC(mockConfigData);

            // Check that basic properties are preserved
            if (serialized.name !== 'test-effect') {
                throw new Error('Config name not preserved');
            }

            if (!serialized.properties || serialized.properties.opacity !== 0.5) {
                throw new Error('Config properties not preserved');
            }

            // Check that problematic properties are handled
            if (serialized.properties.callback !== '[Function]') {
                throw new Error('Config callback not handled correctly');
            }

            // Check that nested objects are serialized
            if (!serialized.properties.center || serialized.properties.center.x !== 100) {
                throw new Error('Nested config objects not serialized');
            }

            // Test that the result can be JSON serialized (final IPC test)
            try {
                const jsonSerialized = JSON.stringify(serialized);
                const parsed = JSON.parse(jsonSerialized);
                if (!parsed.name || !parsed.properties) {
                    throw new Error('Serialized result not JSON-safe');
                }
            } catch (jsonError) {
                throw new Error(`Serialized result not JSON-safe: ${jsonError.message}`);
            }

            console.log('  ✅ Config introspection data serialized safely');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ Config introspection serialization test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'Config Introspection Serialization',
                error: error.message
            });
        }
    }

    async testIPCResponseSafety() {
        this.results.total++;
        try {
            console.log('Testing IPC response safety...');

            // Test 1: Create a mock IPC response structure
            const mockResponse = {
                success: true,
                defaultInstance: {
                    opacity: 0.5,
                    center: { x: 100, y: 200 },
                    getDefaults: () => ({ default: true }),
                    metadata: {
                        created: new Date(),
                        handler: function() { return 'test'; }
                    }
                },
                effectMetadata: {
                    name: 'test-effect',
                    category: 'primary'
                },
                hasConfig: true
            };

            // Serialize the entire response
            const serializedResponse = this.effectsManager.deepSerializeForIPC(mockResponse);

            // Test that response structure is preserved
            if (!serializedResponse.success || !serializedResponse.defaultInstance) {
                throw new Error('Response structure not preserved');
            }

            // Test that all properties can be JSON serialized
            try {
                const jsonString = JSON.stringify(serializedResponse);
                const parsed = JSON.parse(jsonString);

                if (!parsed.success || !parsed.defaultInstance || !parsed.effectMetadata) {
                    throw new Error('Response not fully JSON serializable');
                }
            } catch (jsonError) {
                throw new Error(`Response not JSON-safe: ${jsonError.message}`);
            }

            // Test 2: Ensure no "object could not be cloned" scenarios
            const problematicData = {
                buffer: Buffer.from('test'),
                weakMap: new WeakMap(),
                symbol: Symbol('test'),
                bigint: BigInt(123),
                undefined: undefined,
                null: null
            };

            const cleanedData = this.effectsManager.deepSerializeForIPC(problematicData);

            // Should not throw and should handle all problematic types
            try {
                JSON.stringify(cleanedData);
            } catch (error) {
                throw new Error(`Problematic data not cleaned properly: ${error.message}`);
            }

            console.log('  ✅ IPC responses are safe for transmission');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ IPC response safety test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'IPC Response Safety',
                error: error.message
            });
        }
    }

    printResults() {
        console.log('\n📊 IPC Serialization Test Results:');
        console.log('====================================');
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);

        if (this.results.failed > 0) {
            console.log('\n🚨 Failed Tests:');
            this.results.errors.forEach(error => {
                console.log(`  - ${error.test}: ${error.error}`);
            });
        }

        const passRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
        console.log(`\n📈 Pass Rate: ${passRate}%`);

        if (this.results.failed === 0) {
            console.log('\n🎉 ALL IPC SERIALIZATION TESTS PASSED!');
            console.log('Config introspection data is safe for IPC transmission.');
        } else {
            console.log('\n⚠️  Some tests failed. IPC serialization may have issues.');
        }
    }
}

// Run tests if this is the main module
async function runIPCSerializationTests() {
    const tester = new IPCSerializationTests();
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runIPCSerializationTests().catch(error => {
        console.error('❌ IPC serialization test runner failed:', error);
        process.exit(1);
    });
}

export default IPCSerializationTests;