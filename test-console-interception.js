/**
 * Test Script for Console Interception
 * 
 * Run this in the browser console after opening the Event Bus Monitor
 * to verify that all console methods and exceptions are being captured.
 */

console.log('=== Starting Console Interception Test ===');

// Test 1: Basic console methods
console.log('✅ Test 1: console.log() - This should appear in CONSOLE category');
console.info('✅ Test 2: console.info() - This should appear in CONSOLE category');
console.warn('✅ Test 3: console.warn() - This should appear in CONSOLE category');
console.debug('✅ Test 4: console.debug() - This should appear in CONSOLE category');
console.error('✅ Test 5: console.error() - This should appear in ERROR category');

// Test 2: Console with objects
console.log('✅ Test 6: Object logging', { 
  user: 'test', 
  action: 'click', 
  timestamp: Date.now() 
});

// Test 3: Console with arrays
console.log('✅ Test 7: Array logging', [1, 2, 3, 4, 5]);

// Test 4: Console with multiple arguments
console.log('✅ Test 8:', 'Multiple', 'arguments', 123, true, { nested: 'object' });

// Test 5: Exception handling (wrapped in try-catch to continue tests)
try {
  throw new Error('✅ Test 9: Thrown exception - This should appear in ERROR category with stack trace');
} catch (e) {
  console.log('Exception caught and logged:', e.message);
}

// Test 6: Promise rejection (will be caught by unhandledrejection handler)
setTimeout(() => {
  Promise.reject(new Error('✅ Test 10: Promise rejection - This should appear in ERROR category with stack trace'));
}, 100);

// Test 7: Nested function call to test stack trace
function level3() {
  throw new Error('✅ Test 11: Nested exception - Check stack trace depth');
}

function level2() {
  level3();
}

function level1() {
  level2();
}

try {
  level1();
} catch (e) {
  console.log('Nested exception caught:', e.message);
}

// Test 8: High-frequency logging (performance test)
console.log('✅ Test 12: Starting high-frequency logging (10 messages)...');
for (let i = 0; i < 10; i++) {
  console.log(`High-frequency message ${i + 1}/10`);
}

console.log('=== Console Interception Test Complete ===');
console.log('📊 Check the Event Bus Monitor to verify all 12+ tests appear correctly');
console.log('Expected categories:');
console.log('  - CONSOLE: Tests 1-4, 6-8, 12');
console.log('  - ERROR: Tests 5, 9, 10, 11');