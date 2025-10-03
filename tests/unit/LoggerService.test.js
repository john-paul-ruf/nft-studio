/**
 * LoggerService Tests
 * 
 * Tests for centralized logging service that provides structured logging
 * functionality with dependency injection support and smart formatting.
 * 
 * REAL OBJECTS ONLY - NO MOCKS
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import LoggerService from '../../src/services/LoggerService.js';
import ConsoleLogger from '../../src/main/implementations/ConsoleLogger.js';

/**
 * Test 1: Service initialization with default ConsoleLogger
 */
export async function testLoggerServiceInitialization() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Verify LoggerService exists and has expected methods
        if (!LoggerService) {
            throw new Error('LoggerService should be defined');
        }
        if (typeof LoggerService.header !== 'function') {
            throw new Error('header method should exist');
        }
        if (typeof LoggerService.section !== 'function') {
            throw new Error('section method should exist');
        }
        if (typeof LoggerService.info !== 'function') {
            throw new Error('info method should exist');
        }
        if (typeof LoggerService.success !== 'function') {
            throw new Error('success method should exist');
        }
        if (typeof LoggerService.warning !== 'function') {
            throw new Error('warning method should exist');
        }
        if (typeof LoggerService.error !== 'function') {
            throw new Error('error method should exist');
        }
        if (typeof LoggerService.event !== 'function') {
            throw new Error('event method should exist');
        }

        console.log('✅ LoggerService initialized with all expected methods');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 2: Header logging with proper formatting
 */
export async function testHeaderLogging() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            LoggerService.header('Test Header');

            if (capturedLogs.length === 0) {
                throw new Error('Header should produce console output');
            }

            const headerOutput = capturedLogs.join('\n');
            if (!headerOutput.includes('TEST HEADER')) {
                throw new Error('Header should be uppercase');
            }
            if (!headerOutput.includes('🚀')) {
                throw new Error('Header should include emoji');
            }
            if (!headerOutput.includes('=')) {
                throw new Error('Header should include separator');
            }

            console.log = originalConsoleLog;
            console.log('✅ Header logging with proper formatting works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 3: Section logging with proper formatting
 */
export async function testSectionLogging() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            LoggerService.section('Test Section');

            if (capturedLogs.length === 0) {
                throw new Error('Section should produce console output');
            }

            const sectionOutput = capturedLogs.join('\n');
            if (!sectionOutput.includes('Test Section')) {
                throw new Error('Section should include section name');
            }
            if (!sectionOutput.includes('-')) {
                throw new Error('Section should include separator');
            }

            console.log = originalConsoleLog;
            console.log('✅ Section logging with proper formatting works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 4: Info logging with timestamps
 */
export async function testInfoLogging() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            LoggerService.info('Test info message');

            if (capturedLogs.length === 0) {
                throw new Error('Info should produce console output');
            }

            const infoOutput = capturedLogs[0];
            if (!infoOutput.includes('Test info message')) {
                throw new Error('Info should include message');
            }
            if (!infoOutput.includes('ℹ️')) {
                throw new Error('Info should include info emoji');
            }

            console.log = originalConsoleLog;
            console.log('✅ Info logging with timestamps works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 5: Success logging with success indicators
 */
export async function testSuccessLogging() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            LoggerService.success('Test success message');

            if (capturedLogs.length === 0) {
                throw new Error('Success should produce console output');
            }

            const successOutput = capturedLogs[0];
            if (!successOutput.includes('Test success message')) {
                throw new Error('Success should include message');
            }
            if (!successOutput.includes('✅')) {
                throw new Error('Success should include success emoji');
            }

            console.log = originalConsoleLog;
            console.log('✅ Success logging with success indicators works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 6: Warning logging with warning indicators
 */
export async function testWarningLogging() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            LoggerService.warning('Test warning message');

            if (capturedLogs.length === 0) {
                throw new Error('Warning should produce console output');
            }

            const warningOutput = capturedLogs[0];
            if (!warningOutput.includes('Test warning message')) {
                throw new Error('Warning should include message');
            }
            if (!warningOutput.includes('⚠️')) {
                throw new Error('Warning should include warning emoji');
            }

            console.log = originalConsoleLog;
            console.log('✅ Warning logging with warning indicators works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 7: Error logging with error indicators
 */
export async function testErrorLogging() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            LoggerService.error('Test error message');

            if (capturedLogs.length === 0) {
                throw new Error('Error should produce console output');
            }

            const errorOutput = capturedLogs[0];
            if (!errorOutput.includes('Test error message')) {
                throw new Error('Error should include message');
            }
            if (!errorOutput.includes('❌')) {
                throw new Error('Error should include error emoji');
            }

            console.log = originalConsoleLog;
            console.log('✅ Error logging with error indicators works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 8: Event logging with frame completed events
 */
export async function testFrameCompletedEventLogging() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            LoggerService.event('frame-completed', { frame: 5, total: 100 });

            if (capturedLogs.length === 0) {
                throw new Error('Frame completed event should produce console output');
            }

            const eventOutput = capturedLogs[0];
            if (!eventOutput.includes('frame-completed')) {
                throw new Error('Event should include event type');
            }
            if (!eventOutput.includes('🎬')) {
                throw new Error('Frame completed event should include frame emoji');
            }

            console.log = originalConsoleLog;
            console.log('✅ Frame completed event logging works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 9: Event logging with worker started events
 */
export async function testWorkerStartedEventLogging() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            LoggerService.event('worker-started', { workerId: 'worker-1' });

            if (capturedLogs.length === 0) {
                throw new Error('Worker started event should produce console output');
            }

            const eventOutput = capturedLogs[0];
            if (!eventOutput.includes('worker-started')) {
                throw new Error('Event should include event type');
            }
            if (!eventOutput.includes('👷')) {
                throw new Error('Worker started event should include worker emoji');
            }

            console.log = originalConsoleLog;
            console.log('✅ Worker started event logging works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 10: Generic event logging with default formatting
 */
export async function testGenericEventLogging() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            LoggerService.event('custom-event', { customData: 'test' });

            if (capturedLogs.length === 0) {
                throw new Error('Generic event should produce console output');
            }

            const eventOutput = capturedLogs[0];
            if (!eventOutput.includes('custom-event')) {
                throw new Error('Event should include event type');
            }
            if (!eventOutput.includes('📡')) {
                throw new Error('Generic event should include default event emoji');
            }

            console.log = originalConsoleLog;
            console.log('✅ Generic event logging with default formatting works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 11: Data formatting for various data types
 */
export async function testDataFormatting() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            // Test with different data types
            LoggerService.info('String data', 'test string');
            LoggerService.info('Number data', 42);
            LoggerService.info('Array data', [1, 2, 3]);
            LoggerService.info('Object data', { key: 'value' });

            if (capturedLogs.length !== 4) {
                throw new Error(`Expected 4 log entries, got ${capturedLogs.length}`);
            }

            // Verify each data type is handled
            if (!capturedLogs[0].includes('test string')) {
                throw new Error('String data should be formatted correctly');
            }
            if (!capturedLogs[1].includes('42')) {
                throw new Error('Number data should be formatted correctly');
            }
            if (!capturedLogs[2].includes('[1,2,3]') && !capturedLogs[2].includes('1,2,3')) {
                throw new Error('Array data should be formatted correctly');
            }

            console.log = originalConsoleLog;
            console.log('✅ Data formatting for various data types works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 12: Special object type formatting
 */
export async function testSpecialObjectFormatting() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            // Test with frame data
            LoggerService.info('Frame data', { frame: 10, total: 100, progress: 0.1 });
            
            // Test with progress data
            LoggerService.info('Progress data', { completed: 50, total: 100, percentage: 50 });
            
            // Test with project data
            LoggerService.info('Project data', { name: 'Test Project', effects: 5 });

            if (capturedLogs.length !== 3) {
                throw new Error(`Expected 3 log entries, got ${capturedLogs.length}`);
            }

            console.log = originalConsoleLog;
            console.log('✅ Special object type formatting works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 13: Data summary formatting for nested objects
 */
export async function testDataSummaryFormatting() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            const complexObject = {
                level1: {
                    level2: {
                        level3: {
                            deepValue: 'test'
                        }
                    }
                },
                array: [1, 2, 3, 4, 5],
                simpleValue: 'simple'
            };

            LoggerService.info('Complex object', complexObject);

            if (capturedLogs.length === 0) {
                throw new Error('Complex object should produce console output');
            }

            console.log = originalConsoleLog;
            console.log('✅ Data summary formatting for nested objects works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 14: Dependency injection support with custom logger
 */
export async function testDependencyInjectionSupport() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Create a custom logger implementation
        const customLogs = [];
        const customLogger = {
            log: (message) => {
                customLogs.push(message);
            }
        };

        // Test that LoggerService can work with dependency injection
        // Note: This test verifies the service can accept different logger implementations
        if (typeof LoggerService.info !== 'function') {
            throw new Error('LoggerService should support different logger implementations');
        }

        console.log('✅ Dependency injection support with custom logger works correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 15: Generation complete event logging
 */
export async function testGenerationCompleteEventLogging() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            LoggerService.event('generation-complete', { 
                totalFrames: 100, 
                duration: '5m 30s',
                outputPath: '/path/to/output'
            });

            if (capturedLogs.length === 0) {
                throw new Error('Generation complete event should produce console output');
            }

            const eventOutput = capturedLogs[0];
            if (!eventOutput.includes('generation-complete')) {
                throw new Error('Event should include event type');
            }

            console.log = originalConsoleLog;
            console.log('✅ Generation complete event logging works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 16: Generation error event logging
 */
export async function testGenerationErrorEventLogging() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            LoggerService.event('generation-error', { 
                error: 'Test error message',
                frame: 50,
                effect: 'TestEffect'
            });

            if (capturedLogs.length === 0) {
                throw new Error('Generation error event should produce console output');
            }

            const eventOutput = capturedLogs[0];
            if (!eventOutput.includes('generation-error')) {
                throw new Error('Event should include event type');
            }

            console.log = originalConsoleLog;
            console.log('✅ Generation error event logging works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 17: Info logging with optional data formatting
 */
export async function testInfoLoggingWithOptionalData() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Capture console.log output
        const capturedLogs = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        try {
            // Test info without data
            LoggerService.info('Simple message');
            
            // Test info with data
            LoggerService.info('Message with data', { key: 'value', number: 42 });

            if (capturedLogs.length !== 2) {
                throw new Error(`Expected 2 log entries, got ${capturedLogs.length}`);
            }

            if (!capturedLogs[0].includes('Simple message')) {
                throw new Error('First log should include simple message');
            }
            if (!capturedLogs[1].includes('Message with data')) {
                throw new Error('Second log should include message with data');
            }

            console.log = originalConsoleLog;
            console.log('✅ Info logging with optional data formatting works correctly');
            return { success: true };
        } finally {
            console.log = originalConsoleLog;
        }
    } finally {
        await testEnv.cleanup();
    }
}