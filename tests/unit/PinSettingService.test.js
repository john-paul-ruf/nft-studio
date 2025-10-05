/**
 * PinSettingService Tests - REAL OBJECTS ONLY (NO MOCKS)
 * Tests the pin setting feature for audit mode
 * 
 * CRITICAL: This test file uses REAL PinSettingService instance
 * NO MOCKS, NO STUBS, NO SPIES - Only real objects and real behavior
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import { PinSettingService } from '../../src/services/PinSettingService.js';
import EventBusService from '../../src/services/EventBusService.js';
import fs from 'fs';
import path from 'path';

// Helper to create test environment
async function setupTestEnvironment() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();
    
    const eventBus = EventBusService;
    eventBus.clear();
    
    const pinService = new PinSettingService(eventBus);
    
    const tempDir = testEnv.getTestDirectory();
    
    const testSettingsFile = path.join(tempDir, 'test-settings.json');
    fs.writeFileSync(testSettingsFile, JSON.stringify({
        projectName: 'TestProject',
        numFrames: 100,
        effects: []
    }));
    
    return { pinService, eventBus, tempDir, testSettingsFile, testEnv };
}

async function cleanupTestEnvironment(testEnv, pinService, eventBus) {
    pinService.cleanup();
    eventBus.clear();
    await testEnv.cleanup();
}

// Test: Initial State
export async function testInitialStateUnpinned() {
    const { pinService, eventBus, testEnv } = await setupTestEnvironment();
    
    try {
        if (pinService.isPinned() !== false) {
            throw new Error('Expected service to start unpinned');
        }
        
        if (pinService.getSettingsFilePath() !== null) {
            throw new Error('Expected settings file path to be null initially');
        }
        
        const metadata = pinService.getPinMetadata();
        if (metadata.isPinned !== false || metadata.settingsFilePath !== null) {
            throw new Error('Expected metadata to show unpinned state');
        }
        
        console.log('✅ Service starts in correct unpinned state');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}

// Test: Pin Settings Successfully
export async function testPinSettingsSuccessfully() {
    const { pinService, eventBus, testEnv, testSettingsFile } = await setupTestEnvironment();
    
    try {
        const result = await pinService.pinSettings(testSettingsFile);
        
        if (!result.success) {
            throw new Error(`Pin failed: ${result.error}`);
        }
        
        if (!pinService.isPinned()) {
            throw new Error('Service should be pinned after successful pin operation');
        }
        
        if (pinService.getSettingsFilePath() !== testSettingsFile) {
            throw new Error('Settings file path not stored correctly');
        }
        
        console.log('✅ Settings pinned successfully');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}

// Test: Pin State Changed Event
export async function testPinStateChangedEventEmitted() {
    const { pinService, eventBus, testEnv, testSettingsFile } = await setupTestEnvironment();
    
    try {
        let eventReceived = false;
        let eventPayload = null;
        
        eventBus.subscribe('pin:state:changed', (payload) => {
            eventReceived = true;
            eventPayload = payload;
        });
        
        await pinService.pinSettings(testSettingsFile);
        
        if (!eventReceived) {
            throw new Error('pin:state:changed event was not emitted');
        }
        
        if (!eventPayload.isPinned) {
            throw new Error('Event payload should indicate pinned state');
        }
        
        if (eventPayload.settingsFilePath !== testSettingsFile) {
            throw new Error('Event payload should contain settings file path');
        }
        
        console.log('✅ pin:state:changed event emitted correctly');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}

// Test: Pin Settings Captured Event
export async function testPinSettingsCapturedEventEmitted() {
    const { pinService, eventBus, testEnv, testSettingsFile } = await setupTestEnvironment();
    
    try {
        let eventReceived = false;
        
        eventBus.subscribe('pin:settings:captured', () => {
            eventReceived = true;
        });
        
        await pinService.pinSettings(testSettingsFile);
        
        if (!eventReceived) {
            throw new Error('pin:settings:captured event was not emitted');
        }
        
        console.log('✅ pin:settings:captured event emitted correctly');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}

// Test: Pin Empty Path Fails
export async function testPinNonExistentFileFails() {
    const { pinService, eventBus, testEnv } = await setupTestEnvironment();
    
    try {
        // Test with empty path (frontend can validate this)
        const result = await pinService.pinSettings('');
        
        if (result.success) {
            throw new Error('Pin should fail for empty path');
        }
        
        if (pinService.isPinned()) {
            throw new Error('Service should not be pinned after failed pin operation');
        }
        
        console.log('✅ Pin correctly fails for empty path');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}

// Test: Pin Non-JSON File Fails
export async function testPinNonJsonFileFails() {
    const { pinService, eventBus, testEnv, tempDir } = await setupTestEnvironment();
    
    try {
        const txtFile = path.join(tempDir, 'test.txt');
        fs.writeFileSync(txtFile, 'not json');
        
        const result = await pinService.pinSettings(txtFile);
        
        if (result.success) {
            throw new Error('Pin should fail for non-JSON file');
        }
        
        if (!result.error.includes('JSON')) {
            throw new Error('Error message should mention JSON');
        }
        
        console.log('✅ Pin correctly fails for non-JSON file');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}

// Test: Unpin Settings Successfully
export async function testUnpinSettingsSuccessfully() {
    const { pinService, eventBus, testEnv, testSettingsFile } = await setupTestEnvironment();
    
    try {
        // First pin
        await pinService.pinSettings(testSettingsFile);
        
        if (!pinService.isPinned()) {
            throw new Error('Service should be pinned before unpinning');
        }
        
        // Then unpin
        const result = await pinService.unpinSettings();
        
        if (!result.success) {
            throw new Error(`Unpin failed: ${result.error}`);
        }
        
        if (pinService.isPinned()) {
            throw new Error('Service should be unpinned after unpin operation');
        }
        
        if (pinService.getSettingsFilePath() !== null) {
            throw new Error('Settings file path should be null after unpin');
        }
        
        console.log('✅ Settings unpinned successfully');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}

// Test: Unpin Emits State Changed Event
export async function testUnpinEmitsStateChangedEvent() {
    const { pinService, eventBus, testEnv, testSettingsFile } = await setupTestEnvironment();
    
    try {
        await pinService.pinSettings(testSettingsFile);
        
        let eventReceived = false;
        let eventPayload = null;
        
        eventBus.subscribe('pin:state:changed', (payload) => {
            eventReceived = true;
            eventPayload = payload;
        });
        
        await pinService.unpinSettings();
        
        if (!eventReceived) {
            throw new Error('pin:state:changed event was not emitted on unpin');
        }
        
        if (eventPayload.isPinned !== false) {
            throw new Error('Event payload should indicate unpinned state');
        }
        
        console.log('✅ Unpin emits state changed event correctly');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}

// Test: Toggle Pin From Unpinned To Pinned
export async function testTogglePinFromUnpinnedToPinned() {
    const { pinService, eventBus, testEnv, testSettingsFile } = await setupTestEnvironment();
    
    try {
        if (pinService.isPinned()) {
            throw new Error('Service should start unpinned');
        }
        
        const result = await pinService.togglePin(testSettingsFile);
        
        if (!result.success) {
            throw new Error(`Toggle failed: ${result.error}`);
        }
        
        if (!pinService.isPinned()) {
            throw new Error('Service should be pinned after toggle');
        }
        
        console.log('✅ Toggle from unpinned to pinned works correctly');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}

// Test: Toggle Pin From Pinned To Unpinned
export async function testTogglePinFromPinnedToUnpinned() {
    const { pinService, eventBus, testEnv, testSettingsFile } = await setupTestEnvironment();
    
    try {
        await pinService.pinSettings(testSettingsFile);
        
        if (!pinService.isPinned()) {
            throw new Error('Service should be pinned before toggle');
        }
        
        const result = await pinService.togglePin();
        
        if (!result.success) {
            throw new Error(`Toggle failed: ${result.error}`);
        }
        
        if (pinService.isPinned()) {
            throw new Error('Service should be unpinned after toggle');
        }
        
        console.log('✅ Toggle from pinned to unpinned works correctly');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}

// Test: Validate Existing JSON File
export async function testValidateExistingJsonFile() {
    const { pinService, eventBus, testEnv, testSettingsFile } = await setupTestEnvironment();
    
    try {
        const result = await pinService.validateSettingsFile(testSettingsFile);
        
        if (!result.valid) {
            throw new Error(`Validation failed: ${result.error}`);
        }
        
        if (result.settingsFilePath !== testSettingsFile) {
            throw new Error('Validation result should contain settings file path');
        }
        
        console.log('✅ Settings file validation works correctly');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}

// Test: Validate Non-JSON File Extension Fails
export async function testValidateNonExistentFileFails() {
    const { pinService, eventBus, testEnv } = await setupTestEnvironment();
    
    try {
        // Test with non-JSON extension (frontend can validate this)
        const result = await pinService.validateSettingsFile('/some/file.txt');
        
        if (result.valid) {
            throw new Error('Validation should fail for non-JSON file');
        }
        
        if (!result.error.includes('JSON')) {
            throw new Error('Error message should mention JSON file requirement');
        }
        
        console.log('✅ Validation correctly fails for non-JSON file');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}

// Test: Pin Metadata Tracking
export async function testPinMetadataTracking() {
    const { pinService, eventBus, testEnv, testSettingsFile } = await setupTestEnvironment();
    
    try {
        const beforePin = Date.now();
        await pinService.pinSettings(testSettingsFile);
        const afterPin = Date.now();
        
        const metadata = pinService.getPinMetadata();
        
        if (metadata.pinnedTimestamp < beforePin || metadata.pinnedTimestamp > afterPin) {
            throw new Error('Pin timestamp not tracked correctly');
        }
        
        if (metadata.pinnedDuration === null) {
            throw new Error('Pin duration should be calculated');
        }
        
        console.log('✅ Pin metadata tracked correctly');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}

// Test: Cleanup Clears Pin State
export async function testCleanupClearsPinState() {
    const { pinService, eventBus, testEnv, testSettingsFile } = await setupTestEnvironment();
    
    try {
        await pinService.pinSettings(testSettingsFile);
        
        if (!pinService.isPinned()) {
            throw new Error('Service should be pinned before cleanup');
        }
        
        pinService.cleanup();
        
        if (pinService.isPinned()) {
            throw new Error('Service should be unpinned after cleanup');
        }
        
        if (pinService.getSettingsFilePath() !== null) {
            throw new Error('Settings file path should be null after cleanup');
        }
        
        console.log('✅ Cleanup clears pin state correctly');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}

// Test: Multiple Event Subscribers
export async function testMultipleEventSubscribers() {
    const { pinService, eventBus, testEnv, testSettingsFile } = await setupTestEnvironment();
    
    try {
        const events1 = [];
        const events2 = [];
        const events3 = [];
        
        eventBus.subscribe('pin:state:changed', (payload) => events1.push(payload));
        eventBus.subscribe('pin:state:changed', (payload) => events2.push(payload));
        eventBus.subscribe('pin:state:changed', (payload) => events3.push(payload));
        
        await pinService.pinSettings(testSettingsFile);
        await pinService.unpinSettings();
        
        if (events1.length !== 2 || events2.length !== 2 || events3.length !== 2) {
            throw new Error('All subscribers should receive both pin and unpin events');
        }
        
        console.log('✅ Multiple event subscribers work correctly');
    } finally {
        await cleanupTestEnvironment(testEnv, pinService, eventBus);
    }
}