# Plugin System E2E Test Guide

**Quick Start**: Run all E2E tests with one command  
**Purpose**: Verify plugin system works correctly from boot to shutdown  
**Time**: ~35 seconds for full suite

---

## 🚀 Quick Start

```bash
# Run all plugin E2E tests
npm test -- tests/integration/plugin-system-e2e.integration.test.js

# Run with verbose output
npm test -- tests/integration/plugin-system-e2e.integration.test.js --verbose

# Run specific test
npm test -- tests/integration/plugin-system-e2e.integration.test.js -t "Complete Startup"
```

---

## 📋 Test Suite

### Test 1: Complete Startup Sequence
**Duration**: ~3-5 seconds  
**Command**:
```bash
npm test -- tests/integration/plugin-system-e2e.integration.test.js -t "testCompleteStartupSequence"
```
**What it does:**
- Initializes orchestrator
- Cleans up orphaned resources
- Loads core effects
- Loads no plugins (first startup)
- Verifies registry state

**Expected Output:**
```
✅ Orchestrator initialized
✅ Cleanup complete: X dirs removed
✅ Core effects loaded
✅ Found N primary effects
✅ Plugin load complete: 0 loaded, 0 failed
✨ E2E Test 1 PASSED: Startup sequence works correctly
```

---

### Test 2: Install Plugin at Runtime
**Duration**: ~3-5 seconds  
**Command**:
```bash
npm test -- tests/integration/plugin-system-e2e.integration.test.js -t "testInstallPluginAtRuntime"
```
**What it does:**
- Creates test plugin
- Records cache state
- Installs plugin
- Verifies in registry
- Checks cache was invalidated

**Expected Output:**
```
✅ Plugin created
✅ Plugin installed successfully
✅ Plugin verified: runtime-plugin-1 (enabled: true)
✅ Cache invalidated on install
✨ E2E Test 2 PASSED: Plugin installation at runtime works
```

---

### Test 3: Cache Persistence Across Restart
**Duration**: ~5-8 seconds (tests two sessions)  
**Command**:
```bash
npm test -- tests/integration/plugin-system-e2e.integration.test.js -t "testCachePersistenceAcrossRestart"
```
**What it does:**
- SESSION 1:
  - Installs plugin
  - Verifies cache created
- SESSION 2:
  - Creates new environment (simulates restart)
  - Loads cache from disk
  - Verifies cache is valid

**Expected Output:**
```
SESSION 1:
✅ Plugin installed
✅ Loaded: 1, Failed: 0
✅ Cache file exists: /path/to/registry-cache.json

SESSION 2:
✅ Cache loaded from disk
✅ Cached plugins: 1
✅ Loaded: 1, Failed: 0
✨ E2E Test 3 PASSED: Cache persistence works across restarts
```

---

### Test 4: Multiple Plugins Full Cycle
**Duration**: ~3-5 seconds  
**Command**:
```bash
npm test -- tests/integration/plugin-system-e2e.integration.test.js -t "testMultiplePluginsFullCycle"
```
**What it does:**
- Installs 3 plugins
- Loads all plugins
- Disables one plugin
- Re-enables the plugin
- Uninstalls all plugins
- Verifies registry is clean

**Expected Output:**
```
✅ Plugin 1 installed
✅ Plugin 2 installed
✅ Plugin 3 installed
✅ Loaded: 3, Failed: 0
✅ Plugin 2 disabled
✅ Plugin 2 re-enabled
✅ All plugins uninstalled
✅ All plugins removed from registry
✨ E2E Test 4 PASSED: Multiple plugins lifecycle works
```

---

### Test 5: Concurrent Operations Stability
**Duration**: ~3-5 seconds  
**Command**:
```bash
npm test -- tests/integration/plugin-system-e2e.integration.test.js -t "testConcurrentOperationsStability"
```
**What it does:**
- Creates 5 plugins
- Installs all 5 concurrently (Promise.all)
- Verifies all installed
- Uninstalls all 5 concurrently
- Verifies all removed

**Expected Output:**
```
✅ Created 5 test plugins
✅ All 5 plugins installed concurrently
✅ All 5 plugins verified in registry
✅ All plugins uninstalled concurrently
✨ E2E Test 5 PASSED: Concurrent operations stable
```

---

### Test 6: Error Recovery and Resilience
**Duration**: ~3-5 seconds  
**Command**:
```bash
npm test -- tests/integration/plugin-system-e2e.integration.test.js -t "testErrorRecoveryAndResilience"
```
**What it does:**
- Installs valid plugin
- Attempts invalid plugin (should fail gracefully)
- Loads plugins (skips invalid)
- Verifies valid plugin still works
- Cleans up

**Expected Output:**
```
✅ Valid plugin installed
✅ Invalid plugin rejected gracefully: [error]
✅ Load complete: 1 loaded, 1 failed
✅ Valid plugin still in registry after error
✨ E2E Test 6 PASSED: Error recovery works
```

---

### Test 7: Full Application Lifecycle
**Duration**: ~5-8 seconds  
**Command**:
```bash
npm test -- tests/integration/plugin-system-e2e.integration.test.js -t "testFullApplicationLifecycle"
```
**What it does:**
- STARTUP: Initialize app with core effects
- INSTALL: Install 2 plugins
- USE: Toggle plugins, verify active state
- UNINSTALL: Uninstall all plugins
- VERIFICATION: Clean registry
- SHUTDOWN: Prepare for next session

**Expected Output:**
```
🚀 STARTUP: 0 plugins loaded ✅
📦 INSTALL PHASE: 2 plugins installed ✅
💡 USE PHASE: 2 plugins active ✅
🗑️  UNINSTALL PHASE: All plugins uninstalled ✅
🔍 VERIFICATION: Registry cleaned ✅
🛑 SHUTDOWN: App ready ✅
✨ E2E Test 7 PASSED: Full application lifecycle works
```

---

## 📊 Test Combinations

### Run All E2E Tests
```bash
npm test -- tests/integration/plugin-system-e2e.integration.test.js
```
**Duration**: ~35 seconds  
**Scope**: All 7 tests, 16 coverage areas

### Run Only Startup Tests
```bash
npm test -- tests/integration/plugin-system-e2e.integration.test.js -t "Startup|Cache"
```
**Tests**: #1, #3 (Startup and Cache scenarios)  
**Duration**: ~10 seconds

### Run Only Plugin Lifecycle Tests
```bash
npm test -- tests/integration/plugin-system-e2e.integration.test.js -t "Multiple|Install|Full"
```
**Tests**: #2, #4, #7 (Plugin operations)  
**Duration**: ~12 seconds

### Run Only Stability Tests
```bash
npm test -- tests/integration/plugin-system-e2e.integration.test.js -t "Concurrent|Error"
```
**Tests**: #5, #6 (Stability scenarios)  
**Duration**: ~8 seconds

---

## 🔗 Running with Other Plugin Tests

### Run All Plugin Tests (E2E + Integration)
```bash
npm test -- --testPathPattern="plugin.*integration"
```
**Includes:**
- E2E Tests (7)
- Lifecycle Tests (6)
- Edge Cases Tests (5)
- Total: 18 tests

### Run All Plugin Tests with Coverage
```bash
npm test -- --testPathPattern="plugin.*integration" --coverage
```

### Run Plugin Tests in CI/CD
```bash
npm test -- --testPathPattern="plugin.*integration" --detectOpenHandles --forceExit
```

---

## 🛠️ Troubleshooting

### Test Fails: "PluginLoaderOrchestrator not available"
**Cause**: TestServiceFactory not properly initialized  
**Solution**: Check TestEnvironment.js setup phase
```bash
npm test -- tests/integration/plugin-system-e2e.integration.test.js --verbose
```

### Test Fails: "Plugin not found after installation"
**Cause**: PluginManagerService not persisting state  
**Solution**: Check plugins-config.json is writable in test temp directory
```bash
ls -la /tmp/test_*/plugins-config.json
```

### Test Hangs or Times Out
**Cause**: Cleanup not completing  
**Solution**: Run with longer timeout
```bash
npm test -- tests/integration/plugin-system-e2e.integration.test.js --testTimeout=60000
```

### "EPIPE" or "Pipe Error"
**Cause**: Console output issues (non-critical)  
**Solution**: Usually safe to ignore, app continues
- Check: Errors printed but tests continue ✅

---

## 📈 Performance Benchmarks

### Expected Test Execution Times
```
Test 1 (Startup):                    3-5 sec   ✅
Test 2 (Runtime Install):            3-5 sec   ✅
Test 3 (Cache Persistence):          5-8 sec   ✅ (two sessions)
Test 4 (Multiple Plugins):           3-5 sec   ✅
Test 5 (Concurrent):                 3-5 sec   ✅
Test 6 (Error Recovery):             3-5 sec   ✅
Test 7 (Full Lifecycle):             5-8 sec   ✅
─────────────────────────────────────────────────
TOTAL:                             ~35 seconds  ✅
```

### Cache Performance Verification (From Test 3)
```
Without Cache:
  Discovery:    ~500ms
  Loading:      ~1000ms
  Total:        ~1500ms

With Cache:
  Loading:      ~10ms
  Total:        ~60ms

Improvement:    ~25x faster ⚡
```

---

## ✅ Verification Checklist

Before deploying, verify:

- [ ] All 7 E2E tests pass
- [ ] No timeout errors
- [ ] Cache files created in temp directory
- [ ] No EPIPE or console errors (expected)
- [ ] Cleanup removes all temp files
- [ ] Tests take ~35 seconds total

Run verification:
```bash
npm test -- tests/integration/plugin-system-e2e.integration.test.js 2>&1 | tee test-results.log
echo "Check test-results.log for PASSED/FAILED"
```

---

## 📚 Related Documentation

- **Refactor Plan**: `/project-plans/plugin-refactor-plan.md`
- **Audit Report**: `/.zencoder/docs/PLUGIN_SYSTEM_E2E_AUDIT.md`
- **Test Environment**: `/tests/setup/TestEnvironment.js`
- **Service Factory**: `/tests/setup/TestServiceFactory.js`

---

## 💡 Tips

### For Debugging a Specific Test
1. Add extra logging to the test
2. Run with verbose flag:
   ```bash
   npm test -- tests/integration/plugin-system-e2e.integration.test.js -t "Test Name" --verbose
   ```
3. Check the console output (tests print detailed logs)

### For Understanding Test Flow
1. Read test file comments (each test has purpose/phases)
2. Look at expected output sections (this guide)
3. Check audit document for coverage details

### For Adding New Tests
1. Copy test template from existing test
2. Follow naming: `testFeatureName`
3. Include phases with console logging
4. Use `await testEnv.cleanup()` in finally
5. Update audit document

---

## 🎯 Success Criteria

All tests pass with:
- ✅ No timeout errors
- ✅ No EPIPE crashes
- ✅ All phase messages print
- ✅ Registry consistent
- ✅ Cache files created/cleaned
- ✅ No orphaned temp files
- ✅ Execution time < 60 seconds

---

**Last Updated**: 2025-01-20  
**Test Version**: 1.0  
**Status**: ✅ Ready for Use