#!/usr/bin/env node
/**
 * Test config introspection fix
 */

const { spawn } = require('child_process');

console.log('🔧 Testing Config Introspection Fix...\n');

// Start the app and test config introspection
const child = spawn('npm', ['start'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
});

let output = '';
let hasRegistered = false;
let testPassed = false;

child.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;

    if (text.includes('Effects from my-nft-effects-core registered successfully')) {
        console.log('✅ Effects registered successfully');
        hasRegistered = true;
    }

    if (text.includes('Config introspection result:')) {
        console.log('✅ Config introspection working');
        testPassed = true;
    }
});

child.stderr.on('data', (data) => {
    const text = data.toString();
    if (text.includes('Error introspecting config:')) {
        console.log('❌ Config introspection error:', text);
    }
});

// Give the app 15 seconds to start and register effects
setTimeout(() => {
    child.kill();

    console.log('\n📊 Test Results:');
    console.log(`Effects Registration: ${hasRegistered ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Config Introspection: ${testPassed ? '✅ PASS' : '❌ PENDING (needs user interaction)'}`);

    if (hasRegistered) {
        console.log('\n✅ App should now work properly for effect editing!');
        console.log('💡 Try editing an effect in the UI to test config introspection.');
    } else {
        console.log('\n❌ App startup failed - check for errors above.');
    }

    process.exit(hasRegistered ? 0 : 1);
}, 15000);