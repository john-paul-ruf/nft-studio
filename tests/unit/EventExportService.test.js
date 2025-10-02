/**
 * EventExportService Tests
 * 
 * Comprehensive tests for EventExportService functionality
 */

import TestEnvironment from '../setup/TestEnvironment.js';

// Mock document.createElement for download testing
global.document = {
    createElement: (tag) => {
        return {
            setAttribute: () => {},
            click: () => {}
        };
    }
};

const mockEvents = [
    { id: 1, type: 'frameCompleted', category: 'FRAME', data: { frameNumber: 0 }, timestamp: '2025-02-01T12:00:00.000Z' },
    { id: 2, type: 'effectApplied', category: 'EFFECT', data: { effectName: 'blur' }, timestamp: '2025-02-01T12:00:01.000Z' },
    { id: 3, type: 'render.loop.start', category: 'RENDER_LOOP', data: {}, timestamp: '2025-02-01T12:00:02.000Z' }
];

/**
 * Test 1: JSON Export
 */
export async function testEventExportServiceJSONExport(testEnv) {
    console.log('🧪 Testing EventExportService JSON export...');
    
    const EventExportService = (await import('../../src/services/EventExportService.js')).default;
    
    const result = EventExportService.exportToJSON(mockEvents, {
        filename: 'test-export.json',
        prettyPrint: true,
        includeMetadata: false
    });
    
    if (!result.success) {
        throw new Error('Export should succeed');
    }
    
    if (result.filename !== 'test-export.json') {
        throw new Error('Filename should match');
    }
    
    if (result.eventCount !== 3) {
        throw new Error('Event count should be 3');
    }
    
    console.log('✅ EventExportService JSON export test passed');
    
    return {
        testName: 'EventExportService JSON Export',
        assertions: 3,
        duration: 0
    };
}

/**
 * Test 2: Export with Metadata
 */
export async function testEventExportServiceMetadata(testEnv) {
    console.log('🧪 Testing EventExportService metadata...');
    
    const EventExportService = (await import('../../src/services/EventExportService.js')).default;
    
    const exportData = EventExportService.createExportDataWithMetadata(mockEvents);
    
    if (!exportData.metadata) {
        throw new Error('Metadata should be defined');
    }
    
    if (exportData.metadata.eventCount !== 3) {
        throw new Error('Event count should be 3');
    }
    
    if (exportData.metadata.exportVersion !== '1.0.0') {
        throw new Error('Export version should be 1.0.0');
    }
    
    if (exportData.metadata.source !== 'EventBusMonitor') {
        throw new Error('Source should be EventBusMonitor');
    }
    
    if (JSON.stringify(exportData.events) !== JSON.stringify(mockEvents)) {
        throw new Error('Events should match');
    }
    
    console.log('✅ EventExportService metadata test passed');
    
    return {
        testName: 'EventExportService Metadata',
        assertions: 5,
        duration: 0
    };
}

/**
 * Test 3: Data URI Creation
 */
export async function testEventExportServiceDataURI(testEnv) {
    console.log('🧪 Testing EventExportService data URI...');
    
    const EventExportService = (await import('../../src/services/EventExportService.js')).default;
    
    const jsonString = JSON.stringify({ test: 'data' });
    const dataUri = EventExportService.createDataURI(jsonString);
    
    if (!dataUri.includes('data:application/json;charset=utf-8,')) {
        throw new Error('Data URI should have correct prefix');
    }
    
    if (!dataUri.includes(encodeURIComponent(jsonString))) {
        throw new Error('Data URI should contain encoded JSON');
    }
    
    console.log('✅ EventExportService data URI test passed');
    
    return {
        testName: 'EventExportService Data URI',
        assertions: 2,
        duration: 0
    };
}

/**
 * Test 4: Filename Generation
 */
export async function testEventExportServiceFilename(testEnv) {
    console.log('🧪 Testing EventExportService filename generation...');
    
    const EventExportService = (await import('../../src/services/EventExportService.js')).default;
    
    const filename = EventExportService.generateFilename('test-prefix');
    
    if (!filename.includes('test-prefix-')) {
        throw new Error('Filename should include prefix');
    }
    
    if (!filename.includes('.json')) {
        throw new Error('Filename should have .json extension');
    }
    
    console.log('✅ EventExportService filename generation test passed');
    
    return {
        testName: 'EventExportService Filename Generation',
        assertions: 2,
        duration: 0
    };
}

/**
 * Test 5: Export Filtered Events
 */
export async function testEventExportServiceFiltered(testEnv) {
    console.log('🧪 Testing EventExportService filtered export...');
    
    const EventExportService = (await import('../../src/services/EventExportService.js')).default;
    
    const allEvents = mockEvents;
    const filteredEvents = mockEvents.slice(0, 2);
    
    const result = EventExportService.exportFiltered(allEvents, filteredEvents);
    
    if (!result.success) {
        throw new Error('Export should succeed');
    }
    
    if (result.eventCount !== 2) {
        throw new Error('Event count should be 2');
    }
    
    console.log('✅ EventExportService filtered export test passed');
    
    return {
        testName: 'EventExportService Filtered Export',
        assertions: 2,
        duration: 0
    };
}

/**
 * Test 6: Export by Category
 */
export async function testEventExportServiceByCategory(testEnv) {
    console.log('🧪 Testing EventExportService export by category...');
    
    const EventExportService = (await import('../../src/services/EventExportService.js')).default;
    
    const result = EventExportService.exportByCategory(mockEvents, 'FRAME');
    
    if (!result.success) {
        throw new Error('Export should succeed');
    }
    
    if (result.eventCount !== 1) {
        throw new Error('Event count should be 1');
    }
    
    console.log('✅ EventExportService export by category test passed');
    
    return {
        testName: 'EventExportService Export by Category',
        assertions: 2,
        duration: 0
    };
}

/**
 * Test 7: Export by Date Range
 */
export async function testEventExportServiceByDateRange(testEnv) {
    console.log('🧪 Testing EventExportService export by date range...');
    
    const EventExportService = (await import('../../src/services/EventExportService.js')).default;
    
    const startDate = new Date('2025-02-01T12:00:00.000Z');
    const endDate = new Date('2025-02-01T12:00:02.000Z');
    
    const result = EventExportService.exportByDateRange(mockEvents, startDate, endDate);
    
    if (!result.success) {
        throw new Error('Export should succeed');
    }
    
    if (result.eventCount !== 3) {
        throw new Error('Event count should be 3');
    }
    
    console.log('✅ EventExportService export by date range test passed');
    
    return {
        testName: 'EventExportService Export by Date Range',
        assertions: 2,
        duration: 0
    };
}

/**
 * Test 8: Export Statistics
 */
export async function testEventExportServiceStatistics(testEnv) {
    console.log('🧪 Testing EventExportService export statistics...');
    
    const EventExportService = (await import('../../src/services/EventExportService.js')).default;
    
    const stats = {
        FRAME: { count: 10, types: { frameCompleted: 10 } },
        EFFECT: { count: 5, types: { effectApplied: 5 } }
    };
    
    const result = EventExportService.exportStatistics(stats);
    
    if (!result.success) {
        throw new Error('Export should succeed');
    }
    
    if (!result.filename.includes('event-statistics')) {
        throw new Error('Filename should include event-statistics');
    }
    
    console.log('✅ EventExportService export statistics test passed');
    
    return {
        testName: 'EventExportService Export Statistics',
        assertions: 2,
        duration: 0
    };
}

/**
 * Test 9: CSV Export
 */
export async function testEventExportServiceCSV(testEnv) {
    console.log('🧪 Testing EventExportService CSV export...');
    
    const EventExportService = (await import('../../src/services/EventExportService.js')).default;
    
    const result = EventExportService.exportToCSV(mockEvents);
    
    if (!result.success) {
        throw new Error('Export should succeed');
    }
    
    if (!result.filename.includes('.csv')) {
        throw new Error('Filename should have .csv extension');
    }
    
    if (result.eventCount !== 3) {
        throw new Error('Event count should be 3');
    }
    
    console.log('✅ EventExportService CSV export test passed');
    
    return {
        testName: 'EventExportService CSV Export',
        assertions: 3,
        duration: 0
    };
}

/**
 * Test 10: File Prefix Management
 */
export async function testEventExportServiceFilePrefix(testEnv) {
    console.log('🧪 Testing EventExportService file prefix management...');
    
    const EventExportService = (await import('../../src/services/EventExportService.js')).default;
    
    EventExportService.setDefaultFilePrefix('custom-prefix');
    const prefix = EventExportService.getDefaultFilePrefix();
    
    if (prefix !== 'custom-prefix') {
        throw new Error('Prefix should be custom-prefix');
    }
    
    // Reset to default
    EventExportService.setDefaultFilePrefix('event-bus-log');
    
    console.log('✅ EventExportService file prefix management test passed');
    
    return {
        testName: 'EventExportService File Prefix Management',
        assertions: 1,
        duration: 0
    };
}