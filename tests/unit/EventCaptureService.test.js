/**
 * EventCaptureService Tests
 * 
 * Tests for event name normalization and mapping
 */

import EventCaptureService from '../../src/services/EventCaptureService.js';

/**
 * Test event name normalization
 */
export async function testEventNameNormalization() {
    console.log('\n🧪 Testing EventCaptureService event name normalization...\n');
    
    // EventCaptureService is a singleton, use the instance directly
    const service = EventCaptureService;
    
    // Test cases: [input event name, expected output event name]
    const testCases = [
        // Frame completion events
        ['frame.complete', 'frameCompleted'],
        ['frame.render.complete', 'frameCompleted'],
        ['frameComplete', 'frameCompleted'],
        ['frameCompleted', 'frameCompleted'], // Already correct
        
        // Frame start events
        ['frame.start', 'frameStarted'],
        ['frame.render.start', 'frameStarted'],
        ['frameStart', 'frameStarted'],
        ['frameStarted', 'frameStarted'], // Already correct
        
        // Frame error events
        ['frame.error', 'frameError'],
        ['frame.render.error', 'frameError'],
        ['frameError', 'frameError'], // Already correct
        
        // Render loop events (should pass through unchanged)
        ['render.loop.start', 'render.loop.start'],
        ['render.loop.complete', 'render.loop.complete'],
        ['render.loop.error', 'render.loop.error'],
        ['project.resume.start', 'project.resume.start'],
        
        // Unknown events (should pass through unchanged)
        ['unknown.event', 'unknown.event'],
        ['custom.event', 'custom.event']
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const [inputName, expectedName] of testCases) {
        const eventData = {
            eventName: inputName,
            data: { test: true },
            timestamp: new Date().toISOString()
        };
        
        const normalized = service.normalizeEventData(eventData);
        
        if (normalized.eventName === expectedName) {
            console.log(`✅ PASS: '${inputName}' → '${normalized.eventName}'`);
            passed++;
        } else {
            console.error(`❌ FAIL: '${inputName}' → '${normalized.eventName}' (expected '${expectedName}')`);
            failed++;
        }
    }
    
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
    
    if (failed > 0) {
        throw new Error(`Event name normalization test failed: ${failed} test cases failed`);
    }
    
    return { passed, failed };
}

/**
 * Test that normalized events preserve data
 */
export async function testEventDataPreservation() {
    console.log('\n🧪 Testing EventCaptureService data preservation...\n');
    
    // EventCaptureService is a singleton, use the instance directly
    const service = EventCaptureService;
    
    const testData = {
        frameNumber: 42,
        totalFrames: 100,
        renderTime: 1234,
        projectName: 'Test Project'
    };
    
    const eventData = {
        eventName: 'frame.complete',
        data: testData,
        timestamp: '2025-01-01T00:00:00.000Z',
        source: 'test'
    };
    
    const normalized = service.normalizeEventData(eventData);
    
    // Check that data is preserved
    if (JSON.stringify(normalized.data) !== JSON.stringify(testData)) {
        throw new Error('Event data was not preserved during normalization');
    }
    
    // Check that timestamp is preserved
    if (normalized.timestamp !== eventData.timestamp) {
        throw new Error('Event timestamp was not preserved during normalization');
    }
    
    // Check that source is preserved
    if (normalized.source !== eventData.source) {
        throw new Error('Event source was not preserved during normalization');
    }
    
    console.log('✅ Event data preservation test passed\n');
    
    return { success: true };
}

/**
 * Run all tests
 */
export async function runAllTests() {
    console.log('🚀 Starting EventCaptureService tests...');
    
    try {
        await testEventNameNormalization();
        await testEventDataPreservation();
        
        console.log('✅ All EventCaptureService tests passed!\n');
        return { success: true };
    } catch (error) {
        console.error('❌ EventCaptureService tests failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().then(result => {
        process.exit(result.success ? 0 : 1);
    });
}