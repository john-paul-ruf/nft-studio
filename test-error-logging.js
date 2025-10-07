/**
 * Test script to verify error logging works correctly
 */

import SafeConsole from './src/main/utils/SafeConsole.js';
import logger from './src/main/utils/logger.js';

console.log('='.repeat(60));
console.log('Testing Error Logging Fix');
console.log('='.repeat(60));

// Create a test error
const testError = new Error('This is a test error');
testError.code = 'TEST_ERROR_CODE';

console.log('\n1. Testing SafeConsole.error():');
console.log('-'.repeat(40));
SafeConsole.error('❌ Failed to refresh effect registry:', testError);

console.log('\n2. Testing logger.error():');
console.log('-'.repeat(40));
logger.error('Failed to render frame', testError);

console.log('\n3. Testing SafeConsole.log() with error:');
console.log('-'.repeat(40));
SafeConsole.log('💥 Error:', testError);

console.log('\n4. Testing direct console.error() (should show empty object):');
console.log('-'.repeat(40));
console.error('Direct console.error:', testError);

console.log('\n' + '='.repeat(60));
console.log('Test Complete');
console.log('='.repeat(60));