/**
 * EventFilterService Tests
 * 
 * Comprehensive tests for EventFilterService functionality
 */

import TestEnvironment from '../setup/TestEnvironment.js';

const mockEvents = [
    { id: 1, type: 'frameCompleted', category: 'FRAME', data: { frameNumber: 0 }, timestamp: '2025-02-01T12:00:00.000Z' },
    { id: 2, type: 'effectApplied', category: 'EFFECT', data: { effectName: 'blur' }, timestamp: '2025-02-01T12:00:01.000Z' },
    { id: 3, type: 'render.loop.start', category: 'RENDER_LOOP', data: {}, timestamp: '2025-02-01T12:00:02.000Z' },
    { id: 4, type: 'error.occurred', category: 'ERROR', data: { error: 'Test error' }, timestamp: '2025-02-01T12:00:03.000Z' },
    { id: 5, type: 'workerStarted', category: 'WORKER', data: {}, timestamp: '2025-02-01T12:00:04.000Z' }
];

/**
 * Test 1: Event Categories
 */
export async function testEventFilterServiceCategories(testEnv) {
    console.log('🧪 Testing EventFilterService categories...');
    
    const EventFilterService = (await import('../../src/services/EventFilterService.js')).default;
    
    const categories = EventFilterService.getCategories();
    
    if (!categories) {
        throw new Error('Categories should be defined');
    }
    
    if (!categories.FRAME || !categories.EFFECT || !categories.ERROR) {
        throw new Error('Required categories should exist');
    }
    
    if (Object.keys(categories).length !== 16) {
        throw new Error('Should have 16 categories');
    }
    
    const keys = EventFilterService.getCategoryKeys();
    if (keys.length !== 16) {
        throw new Error('Should have 16 category keys');
    }
    
    console.log('✅ EventFilterService categories test passed');
    
    return {
        testName: 'EventFilterService Categories',
        assertions: 4,
        duration: 0
    };
}

/**
 * Test 2: Category Detection
 */
export async function testEventFilterServiceDetection(testEnv) {
    console.log('🧪 Testing EventFilterService category detection...');
    
    const EventFilterService = (await import('../../src/services/EventFilterService.js')).default;
    
    // Test FRAME detection
    const frameCategory = EventFilterService.detectCategory('frameCompleted', { frameNumber: 5 });
    if (frameCategory !== 'FRAME') {
        throw new Error('Should detect FRAME category');
    }
    
    // Test EFFECT detection
    const effectCategory = EventFilterService.detectCategory('effectApplied', { effectName: 'blur' });
    if (effectCategory !== 'EFFECT') {
        throw new Error('Should detect EFFECT category');
    }
    
    // Test ERROR detection
    const errorCategory = EventFilterService.detectCategory('error.occurred', { error: 'Test' });
    if (errorCategory !== 'ERROR') {
        throw new Error('Should detect ERROR category');
    }
    
    // Test RENDER_LOOP detection
    const renderLoopCategory = EventFilterService.detectCategory('render.loop.start', {});
    if (renderLoopCategory !== 'RENDER_LOOP') {
        throw new Error('Should detect RENDER_LOOP category');
    }
    
    // Test WORKER detection
    const workerCategory = EventFilterService.detectCategory('workerStarted', {});
    if (workerCategory !== 'WORKER') {
        throw new Error('Should detect WORKER category');
    }
    
    // Test CUSTOM default
    const customCategory = EventFilterService.detectCategory('unknownEvent', {});
    if (customCategory !== 'CUSTOM') {
        throw new Error('Should default to CUSTOM category');
    }
    
    console.log('✅ EventFilterService detection test passed');
    
    return {
        testName: 'EventFilterService Detection',
        assertions: 6,
        duration: 0
    };
}

/**
 * Test 3: Search Term Filtering
 */
export async function testEventFilterServiceSearchTerm(testEnv) {
    console.log('🧪 Testing EventFilterService search term filtering...');
    
    const EventFilterService = (await import('../../src/services/EventFilterService.js')).default;
    
    const filtered = EventFilterService.filterBySearchTerm(mockEvents, 'frame');
    
    if (filtered.length !== 1) {
        throw new Error('Should filter to 1 event');
    }
    
    if (filtered[0].type !== 'frameCompleted') {
        throw new Error('Should filter frameCompleted event');
    }
    
    // Test empty search term
    const allEvents = EventFilterService.filterBySearchTerm(mockEvents, '');
    if (allEvents.length !== mockEvents.length) {
        throw new Error('Empty search should return all events');
    }
    
    console.log('✅ EventFilterService search term test passed');
    
    return {
        testName: 'EventFilterService Search Term',
        assertions: 3,
        duration: 0
    };
}

/**
 * Test 4: Category Filtering
 */
export async function testEventFilterServiceCategoryFilter(testEnv) {
    console.log('🧪 Testing EventFilterService category filtering...');
    
    const EventFilterService = (await import('../../src/services/EventFilterService.js')).default;
    
    const filtered = EventFilterService.filterByCategories(mockEvents, ['FRAME', 'EFFECT']);
    
    if (filtered.length !== 2) {
        throw new Error('Should filter to 2 events');
    }
    
    const categories = filtered.map(e => e.category);
    if (!categories.includes('FRAME') || !categories.includes('EFFECT')) {
        throw new Error('Should include FRAME and EFFECT categories');
    }
    
    // Test empty categories
    const allEvents = EventFilterService.filterByCategories(mockEvents, []);
    if (allEvents.length !== mockEvents.length) {
        throw new Error('Empty categories should return all events');
    }
    
    console.log('✅ EventFilterService category filter test passed');
    
    return {
        testName: 'EventFilterService Category Filter',
        assertions: 3,
        duration: 0
    };
}

/**
 * Test 5: Combined Filters
 */
export async function testEventFilterServiceCombinedFilters(testEnv) {
    console.log('🧪 Testing EventFilterService combined filters...');
    
    const EventFilterService = (await import('../../src/services/EventFilterService.js')).default;
    
    const filtered = EventFilterService.applyFilters(mockEvents, 'effect', ['EFFECT']);
    
    if (filtered.length !== 1) {
        throw new Error('Should filter to 1 event');
    }
    
    if (filtered[0].type !== 'effectApplied') {
        throw new Error('Should filter effectApplied event');
    }
    
    // Test no filters
    const allEvents = EventFilterService.applyFilters(mockEvents, '', []);
    if (allEvents.length !== mockEvents.length) {
        throw new Error('No filters should return all events');
    }
    
    console.log('✅ EventFilterService combined filters test passed');
    
    return {
        testName: 'EventFilterService Combined Filters',
        assertions: 3,
        duration: 0
    };
}

/**
 * Test 6: Category Metadata
 */
export async function testEventFilterServiceCategoryMetadata(testEnv) {
    console.log('🧪 Testing EventFilterService category metadata...');
    
    const EventFilterService = (await import('../../src/services/EventFilterService.js')).default;
    
    const icon = EventFilterService.getCategoryIcon('FRAME');
    if (icon !== '🖼️') {
        throw new Error('Should return correct icon');
    }
    
    const color = EventFilterService.getCategoryColor('FRAME');
    if (color !== '#4CAF50') {
        throw new Error('Should return correct color');
    }
    
    const label = EventFilterService.getCategoryLabel('FRAME');
    if (label !== 'Frame') {
        throw new Error('Should return correct label');
    }
    
    console.log('✅ EventFilterService category metadata test passed');
    
    return {
        testName: 'EventFilterService Category Metadata',
        assertions: 3,
        duration: 0
    };
}

/**
 * Test 7: Default Categories
 */
export async function testEventFilterServiceDefaultCategories(testEnv) {
    console.log('🧪 Testing EventFilterService default categories...');
    
    const EventFilterService = (await import('../../src/services/EventFilterService.js')).default;
    
    const resumedCategories = EventFilterService.getDefaultCategoriesForResumedProject();
    if (!Array.isArray(resumedCategories) || resumedCategories.length !== 16) {
        throw new Error('Resumed project should have all 16 categories');
    }
    
    const newCategories = EventFilterService.getDefaultCategoriesForNewProject();
    if (!Array.isArray(newCategories)) {
        throw new Error('New project categories should be an array');
    }
    
    const expectedNew = ['FRAME', 'VIDEO', 'ERROR', 'RENDER_LOOP'];
    if (JSON.stringify(newCategories) !== JSON.stringify(expectedNew)) {
        throw new Error('New project should have default categories');
    }
    
    console.log('✅ EventFilterService default categories test passed');
    
    return {
        testName: 'EventFilterService Default Categories',
        assertions: 3,
        duration: 0
    };
}

/**
 * Test 8: Category Lookup
 */
export async function testEventFilterServiceCategoryLookup(testEnv) {
    console.log('🧪 Testing EventFilterService category lookup...');
    
    const EventFilterService = (await import('../../src/services/EventFilterService.js')).default;
    
    const frameCategory = EventFilterService.getCategory('FRAME');
    if (!frameCategory || frameCategory.label !== 'Frame') {
        throw new Error('Should return FRAME category');
    }
    
    const invalidCategory = EventFilterService.getCategory('INVALID');
    if (invalidCategory !== null) {
        throw new Error('Should return null for invalid category');
    }
    
    console.log('✅ EventFilterService category lookup test passed');
    
    return {
        testName: 'EventFilterService Category Lookup',
        assertions: 2,
        duration: 0
    };
}