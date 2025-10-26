# Real Objects Infrastructure - How Tests Ensure Isolation & Cleanup

**Philosophy**: No mocks, no stubs - only real objects with real behavior in isolated environments.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Test Runner                        │
│  (the-one-runner-to-rule-them-all.js)              │
│  Discovers, loads, and executes test functions      │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│              Test Environment Setup                  │
│  (TestEnvironment.js)                               │
│  - Creates isolated temp directory                  │
│  - Instantiates real services                       │
│  - Configures service factory                       │
│  - Tracks resources for cleanup                     │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│            Individual Test Function                  │
│  - Receives real TestEnvironment                    │
│  - Gets real service instances                      │
│  - Performs real operations                         │
│  - Makes explicit assertions                        │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│              Cleanup & Verification                  │
│  (TestEnvironment.cleanup())                        │
│  - Removes temp directory and all files             │
│  - Verifies complete cleanup                        │
│  - Reports any orphaned resources                   │
└─────────────────────────────────────────────────────┘
```

## TestEnvironment Flow

### 1. Setup Phase

```javascript
const testEnv = await new TestEnvironment().setup();
```

What happens:
1. **Create unique test ID** - `test_1234567890_abc123`
2. **Create isolated temp directory** - `/tmp/test_1234567890_abc123/`
3. **Backup environment** - Save original `process.env`
4. **Configure test environment** - Set `NODE_ENV=test`, `NFT_STUDIO_TEST_DATA_DIR=...`
5. **Create service factory** - Real services configured for test directory
6. **Return ready environment** - Test can now use real services

### 2. Execution Phase

```javascript
const pluginManager = testEnv.getService('PluginManagerService');
const result = await pluginManager.addPlugin(data);
```

What happens:
1. **Request real service** - Gets actual PluginManagerService instance
2. **Perform real operations** - Creates real files in temp directory
3. **Services work together** - Multiple services interact normally
4. **Verify behavior** - Check real results

### 3. Cleanup Phase

```javascript
await testEnv.cleanup();
```

What happens:
1. **Restore environment** - Reset `process.env` to original
2. **Remove temp directory** - Delete entire test directory tree
3. **Verify cleanup** - Check no files remain
4. **Report results** - Log cleanup status

## Key Components

### TestEnvironment Class

**File**: `tests/setup/TestEnvironment.js`

**Purpose**: Isolate each test with real objects and automatic cleanup

**Key Methods**:
```javascript
class TestEnvironment {
    // Setup isolated environment
    async setup() { }
    
    // Get real service instances
    getService(name) { }
    getFileSystemService() { }
    getPluginManager() { }
    // ... more specific getters
    
    // Cleanup after test
    async cleanup() { }
    
    // Verify cleanup happened
    async verifyCleanup() { }
}
```

**Key Properties**:
- `testId` - Unique identifier for this test run
- `testDirectory` - Isolated temp directory for test files
- `serviceFactory` - Creates and manages real service instances
- `tempManager` - Tracks temporary resources for cleanup

### TestServiceFactory Class

**File**: `tests/setup/TestServiceFactory.js`

**Purpose**: Create real service instances configured for testing

**Key Features**:
- Instantiates real services (not mocks)
- Configures services to use test directory
- Provides dependency injection
- Manages service lifecycle

**Usage**:
```javascript
const factory = new TestServiceFactory(testDirectory);
const pluginManager = factory.getService('PluginManagerService');
// pluginManager is a REAL instance, fully functional
```

### TempResourceManager Class

**File**: `tests/setup/TempResourceManager.js`

**Purpose**: Create and track temporary directories for cleanup

**Key Methods**:
```javascript
// Create isolated temp directory
const testDir = await tempManager.createTempDirectory(testId);

// Cleanup after test
await tempManager.cleanup(testId);

// Verify cleanup
const verified = await tempManager.verifyCleanup(testId);
```

## Isolation Strategy

### Directory Isolation

Each test gets its own temporary directory:

```
/tmp/
├── test_1234567890_abc123/          ← Test 1
│   ├── plugin-1/
│   ├── plugin-2/
│   ├── registry-cache.json
│   └── ...
├── test_1234567891_def456/          ← Test 2
│   ├── plugin-3/
│   ├── registry-cache.json
│   └── ...
```

**Benefits**:
- Tests don't interfere with each other
- No cleanup between tests needed
- Can run tests in parallel safely
- Leftover files are isolated

### Environment Isolation

Each test gets isolated environment variables:

```javascript
// Before test
process.env.NODE_ENV = 'test'
process.env.NFT_STUDIO_TEST_DATA_DIR = '/tmp/test_1234567890_abc123/'

// ... test runs ...

// After test - restored to original
process.env = originalEnv;
```

### Service Isolation

Each test gets fresh service instances:

```javascript
const testEnv1 = await new TestEnvironment().setup();
const factory1 = testEnv1.getContainer();
const pluginManager1 = factory1.resolve('PluginManagerService');

const testEnv2 = await new TestEnvironment().setup();
const factory2 = testEnv2.getContainer();
const pluginManager2 = factory2.resolve('PluginManagerService');

// pluginManager1 and pluginManager2 are DIFFERENT instances
// testEnv1 and testEnv2 use DIFFERENT directories
// Services don't interfere
```

## Real Object Pattern vs Mocking

### ❌ Mock Approach (Not Used)
```javascript
// Don't do this
const mockPluginManager = {
    addPlugin: async () => ({ success: true }),
    getPlugins: async () => []
};

// Problem: Tests pass but real system might fail
// Can't catch integration issues
// False confidence
```

### ✅ Real Objects Approach (Used)
```javascript
// Do this
const pluginManager = testEnv.getService('PluginManagerService');
const result = await pluginManager.addPlugin(data);

// Tests real behavior
// Catches integration issues
// Real confidence
```

## Cleanup Verification

After each test cleanup, system verifies:

1. **Temp directory removed** - `fs.access()` should throw ENOENT
2. **No orphaned files** - Scan for stray test files
3. **Environment restored** - Original `process.env` restored
4. **Services disposed** - Resources released

**Example Cleanup Verification**:
```javascript
async verifyCleanup() {
    try {
        await fs.access(this.testDirectory);
        // If we get here, directory still exists - FAIL
        return false;
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Directory successfully deleted - PASS
            return true;
        }
        throw error; // Unexpected error
    }
}
```

## File System Operations During Tests

### What Creates Files
- Plugin installations → Creates plugin directories
- Cache operations → Creates `registry-cache.json`
- Test fixtures → Create test data files
- Service operations → Create any required metadata

### All In Temp Directory
All operations happen in isolated test directory:

```javascript
// Plugin installed to:
/tmp/test_1234567890_abc123/my-plugin/

// Cache saved to:
/tmp/test_1234567890_abc123/registry-cache.json

// Never touches:
- Real user data directory
- System directories
- Other tests' directories
```

### Complete Cleanup
After test, entire directory removed:

```bash
# Before cleanup
ls /tmp/test_1234567890_abc123/
# → my-plugin/, registry-cache.json, etc.

# After cleanup
ls /tmp/test_1234567890_abc123/
# → (directory doesn't exist)
```

## Environment Variable Configuration

### Test-Specific Environment

Tests set these automatically:

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `'test'` | Signal test mode |
| `NFT_STUDIO_TEST_DATA_DIR` | `/tmp/test_xxx/` | Override data directory |

### Service Configuration

Services read these and configure accordingly:

```javascript
// In PluginManagerService
constructor(appDataPath = null) {
    // If in test, uses NFT_STUDIO_TEST_DATA_DIR
    // Otherwise uses app.getPath('userData')
    this.dataDir = process.env.NFT_STUDIO_TEST_DATA_DIR || appDataPath;
}
```

## Error Handling & Cleanup

### Critical: Cleanup Always Happens

Even if test fails, cleanup still executes:

```javascript
let testEnv = null;

try {
    testEnv = await new TestEnvironment().setup();
    // Test might throw error here
    await performTest(testEnv);
} catch (error) {
    // Error caught, but cleanup still needed
    console.error('Test failed:', error);
} finally {
    // ALWAYS runs, even on error
    if (testEnv) {
        await testEnv.cleanup();
    }
}
```

### Cascading Errors

If cleanup fails:

1. **First attempt** - Try normal cleanup
2. **Log error** - Report cleanup issue
3. **Manual inspection** - Admin can check `/tmp` for orphaned files
4. **Fallback** - System might clean on next reboot

## Running Parallel Tests

### Safe for Parallel Execution

Because each test is isolated:

```javascript
// These can run simultaneously
await Promise.all([
    testOne(),  // Uses /tmp/test_1234567890_abc123/
    testTwo(),  // Uses /tmp/test_1234567891_def456/
    testThree() // Uses /tmp/test_1234567892_ghi789/
]);

// No conflicts - separate directories
```

### Current Execution

Tests run sequentially (see `the-one-runner-to-rule-them-all.js`):

```javascript
for (const test of testsToRun) {
    await this.runTest(test.fn, test.name, test.category);
}
```

Could be parallelized in future if needed.

## Debugging Isolated Tests

### Keep Temp Directory for Debugging

Modify cleanup to keep files:

```javascript
// In test, before cleanup
console.log('Test directory:', testEnv.testDirectory);
// Note the path, don't delete

// In TestEnvironment.cleanup(), comment out cleanup:
// await this.tempManager.cleanup(this.testId);

// Then examine files manually
ls /tmp/test_1234567890_abc123/
```

### Inspect Service State

Get references to services for debugging:

```javascript
const pluginManager = testEnv.getService('PluginManagerService');
const plugins = await pluginManager.getPlugins();

console.log('Current plugins:', plugins);
console.log('Data directory:', testEnv.testDirectory);

// Leave breakpoint here to inspect state
```

### Check TestEnvironment Properties

```javascript
testEnv.testId            // Unique test ID
testEnv.testDirectory     // Path to temp dir
testEnv.serviceFactory    // Access to services
testEnv.tempManager       // Temp file manager
```

## Extending Infrastructure

### Adding New Real Services

When adding a new service:

1. **Create service class** - Real implementation
2. **Add to TestServiceFactory** - Include in factory creation
3. **Provide getter** - `getService('MyService')`
4. **Tests can now use** - Access via `testEnv.getService('MyService')`

**Example**:
```javascript
// tests/setup/TestServiceFactory.js
class TestServiceFactory {
    getService(name) {
        switch (name) {
            case 'MyNewService':
                return new MyNewService(this.testDirectory);
            // ...
        }
    }
}
```

### Adding Environment Variables

If services need new env vars for testing:

```javascript
// In TestEnvironment.setup()
process.env.MY_NEW_VAR = 'test-value';
this.originalProcessEnv.MY_NEW_VAR = process.env.MY_NEW_VAR;

// In TestEnvironment.cleanup()
process.env.MY_NEW_VAR = this.originalProcessEnv.MY_NEW_VAR;
```

## Summary

**Real Objects Infrastructure ensures**:

✅ **Isolation** - Each test uses separate directory and services  
✅ **Safety** - No test affects others, parallel execution possible  
✅ **Reality** - Tests real behavior, not mocked expectations  
✅ **Cleanup** - Complete resource cleanup, no orphaned files  
✅ **Simplicity** - Clear setup/execute/cleanup flow  
✅ **Debugging** - Real file system, can inspect manually  
✅ **Extensibility** - Easy to add new services and tests  

This approach trades testing speed for **confidence** - tests prove the system actually works.