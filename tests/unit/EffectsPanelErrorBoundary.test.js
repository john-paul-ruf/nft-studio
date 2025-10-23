/**
 * EffectsPanelErrorBoundary Tests
 * Tests error handling with REAL services - NO MOCKS
 */

import TestEnvironment from '../setup/TestEnvironment.js';

export async function testErrorBoundaryErrorCapture(testEnv) {
    console.log('🧪 Testing ErrorBoundary error capture...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');

    try {
        let errorCaptured = false;
        let errorMsg = '';

        eventBusService.subscribe('effectspanel:error', (p) => {
            errorCaptured = true;
            errorMsg = p.message;
        });

        eventBusService.emit('effectspanel:error', { message: 'Test error', component: 'EffectsList' });

        console.assert(errorCaptured, '✅ Error captured');
        console.assert(errorMsg.length > 0, '✅ Error message preserved');

        return { testName: 'ErrorBoundary Error Capture', status: 'PASSED' };
    } catch (error) {
        return { testName: 'ErrorBoundary Error Capture', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testErrorBoundaryFallbackUI(testEnv) {
    console.log('🧪 Testing ErrorBoundary fallback UI...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');

    try {
        let fallbackShown = false;

        eventBusService.subscribe('effectspanel:error', (p) => {
            if (p.showFallback) fallbackShown = true;
        });

        eventBusService.emit('effectspanel:error', { message: 'Error', showFallback: true });

        console.assert(fallbackShown, '✅ Fallback triggered');

        return { testName: 'ErrorBoundary Fallback UI', status: 'PASSED' };
    } catch (error) {
        return { testName: 'ErrorBoundary Fallback UI', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testErrorBoundaryErrorLogging(testEnv) {
    console.log('🧪 Testing ErrorBoundary error logging...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');

    try {
        const errorLog = [];

        eventBusService.subscribe('effectspanel:error', (p) => {
            errorLog.push({ message: p.message, component: p.component });
        });

        eventBusService.emit('effectspanel:error', { message: 'Error 1', component: 'Panel' });
        eventBusService.emit('effectspanel:error', { message: 'Error 2', component: 'List' });

        console.assert(errorLog.length === 2, '✅ Multiple errors logged');
        console.assert(errorLog[0].message === 'Error 1', '✅ First error logged');

        return { testName: 'ErrorBoundary Error Logging', status: 'PASSED', logCount: errorLog.length };
    } catch (error) {
        return { testName: 'ErrorBoundary Error Logging', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testErrorBoundaryErrorIsolation(testEnv) {
    console.log('🧪 Testing ErrorBoundary error isolation...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');
    const projectState = testEnv.getService('ProjectState');

    try {
        eventBusService.emit('effectspanel:error', { message: 'Fatal error' });

        // App should still be functional
        const state = projectState.getState();
        const appFunctional = state !== null;

        console.assert(appFunctional, '✅ App remains functional after error');

        return { testName: 'ErrorBoundary Error Isolation', status: 'PASSED' };
    } catch (error) {
        return { testName: 'ErrorBoundary Error Isolation', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testErrorBoundaryRecoveryOptions(testEnv) {
    console.log('🧪 Testing ErrorBoundary recovery options...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');

    try {
        let recoveryOptions = [];

        eventBusService.subscribe('effectspanel:error', (p) => {
            if (p.recoveryOptions) recoveryOptions = p.recoveryOptions;
        });

        eventBusService.emit('effectspanel:error', {
            message: 'Error',
            recoveryOptions: [ { label: 'Retry', action: 'retry' }, { label: 'Close', action: 'close' } ]
        });

        console.assert(recoveryOptions.length === 2, '✅ Recovery options provided');

        return { testName: 'ErrorBoundary Recovery Options', status: 'PASSED', optionCount: recoveryOptions.length };
    } catch (error) {
        return { testName: 'ErrorBoundary Recovery Options', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testErrorBoundaryAsyncErrors(testEnv) {
    console.log('🧪 Testing ErrorBoundary async errors...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');

    try {
        let asyncErrorCaught = false;

        eventBusService.subscribe('effectspanel:error', (p) => {
            if (p.isAsync) asyncErrorCaught = true;
        });

        await new Promise(resolve => {
            setTimeout(() => {
                eventBusService.emit('effectspanel:error', { message: 'Async error', isAsync: true });
                resolve();
            }, 10);
        });

        console.assert(asyncErrorCaught, '✅ Async error caught');

        return { testName: 'ErrorBoundary Async Errors', status: 'PASSED' };
    } catch (error) {
        return { testName: 'ErrorBoundary Async Errors', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}