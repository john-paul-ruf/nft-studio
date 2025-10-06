#!/usr/bin/env node

/**
 * Diagnostic script to test render functionality and capture detailed error information
 * Run this with: node diagnose-render-error.js
 */

import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the worker script in my-nft-gen
const workerScript = path.resolve(__dirname, '../my-nft-gen/src/core/worker-threads/GenerateAnimateFrameWorkerThread.js');

console.log('🔍 Diagnostic Script for Render Error');
console.log('=====================================\n');

console.log('1. Checking worker script exists...');
try {
    await fs.access(workerScript);
    console.log('   ✅ Worker script found at:', workerScript);
} catch (error) {
    console.error('   ❌ Worker script NOT found at:', workerScript);
    console.error('   Error:', error.message);
    process.exit(1);
}

console.log('\n2. Creating test settings file...');
const testSettings = {
    config: {
        finalFileName: 'test-frame',
        numberOfFrame: 100,
        width: 1920,
        height: 1080
    },
    workingDirectory: '/tmp/nft-studio-test/',
    effects: []
};

const settingsPath = '/tmp/test-settings.json';
try {
    await fs.mkdir('/tmp/nft-studio-test/', { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(testSettings, null, 2));
    console.log('   ✅ Test settings created at:', settingsPath);
} catch (error) {
    console.error('   ❌ Failed to create test settings:', error.message);
    process.exit(1);
}

console.log('\n3. Attempting to spawn worker process...');
console.log('   Command:', process.execPath);
console.log('   Script:', workerScript);
console.log('   Args:', [settingsPath, '0']);

const child = fork(workerScript, [settingsPath, '0'], {
    execPath: process.execPath,
    env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        NFT_SUPPRESS_PER_FRAME_EVENTS: 'false',
        NFT_VERBOSE_EVENTS: 'true'
    },
    silent: true
});

let stdout = '';
let stderr = '';

if (child.stdout) {
    child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        console.log('   [STDOUT]:', text.trim());
    });
}

if (child.stderr) {
    child.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        console.error('   [STDERR]:', text.trim());
    });
}

child.on('exit', (code, signal) => {
    console.log('\n4. Worker process exited');
    console.log('   Exit code:', code);
    console.log('   Signal:', signal);
    
    if (code !== 0) {
        console.error('\n❌ WORKER FAILED');
        console.error('Full stderr output:');
        console.error('-------------------');
        console.error(stderr || '(no stderr output)');
        console.error('\nFull stdout output:');
        console.error('-------------------');
        console.error(stdout || '(no stdout output)');
    } else {
        console.log('\n✅ WORKER SUCCEEDED');
        console.log('Output:', stdout.trim());
    }
    
    process.exit(code);
});

child.on('error', (error) => {
    console.error('\n❌ WORKER ERROR');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
});

console.log('   Worker PID:', child.pid);
console.log('   Waiting for worker to complete...\n');