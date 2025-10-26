# Phase 6: Plugin Lifecycle Integration Tests

**Status**: 🎉 READY TO RUN

## Quick Start

### Run All Phase 6 Tests

```bash
npm test
```

Or specifically:

```bash
npm run test:integration
```

### Run Individual Test Files

```bash
# Core lifecycle tests
npm test -- --grep "plugin-lifecycle.integration"

# Edge cases and stress tests  
npm test -- --grep "plugin-lifecycle-edgecases"
```

### Run Single Test Function

```bash
# Example: Full lifecycle test
npm test -- --grep "testPluginFullLifecycleCycle"

# Example: Cache tests
npm test -- --grep "testCachePersistenceAndValidation"

# Example: Large dataset test
npm test -- --grep "testLargePluginSetPerformance"
```

## What the Tests Do

### Core Lifecycle Tests (6 tests)
1. **Full Plugin Lifecycle** - Install → Load → Uninstall cycle
2. **Cache Persistence** - Save/Load/Validate cache operations
3. **Multiple Plugins** - Registry handling with 3+ plugins
4. **State Resilience** - Enable/Disable state persistence
5. **Invalid Handling** - Error cases and edge conditions
6. **Cache Corruption** - Recovery from corrupted cache

### Edge Case Tests (6 tests)
1. **Concurrent Operations** - Install/uninstall simultaneously
2. **Reinstall Scenario** - Install → Uninstall → Install again
3. **Toggle Sequences** - Multiple enable/disable cycles
4. **Checksum Accuracy** - Cache validation correctness
5. **Performance Test** - 10+ plugin handling
6. **Load Consistency** - Rapid operations stress test

## Key Features

✅ **Real Objects** - Uses actual PluginManagerService and RegistryCacheService instances  
✅ **Real Files** - Creates real plugins on disk, saves real cache files  
✅ **Automatic Cleanup** - All files removed after each test  
✅ **Isolation** - Each test gets its own temp directory  
✅ **Complete Coverage** - 12 tests covering core + edge cases  

## Expected Results

```
✅ All 12 tests should PASS
⏱️ Total time: 10-30 seconds (depends on system)
🧹 All temp files cleaned up automatically
```

## Troubleshooting

### Test Fails - Check These

**Permission denied**: Verify `/tmp` is writable
```bash
ls -ld /tmp
# Should show rwx for owner
```

**Plugin not found**: Verify PluginManagerService works
```bash
# Check the service is registered
npm test -- --grep "testPluginFullLifecycleCycle"
```

**Cache errors**: Check temp directory creation
```bash
# See where temp dir is created
npm test -- --grep "testCachePersistenceAndValidation"
```

### Debug Mode

To keep temp files for inspection, modify a test:

```javascript
// Comment out cleanup temporarily
// await testEnv.cleanup();

console.log('Test directory:', testEnv.testDirectory);
```

Then inspect:
```bash
ls -la /tmp/test_xxx/
```

## Performance Expectations

| Operation | Expected Time |
|-----------|---|
| Single test | 500ms - 2s |
| All 12 tests | 10-30s |
| Plugin install | 50-200ms |
| Cache save | 10-50ms |
| Concurrent ops | ~500ms for 3 plugins |

Times will vary based on system speed.

## Files Created During Tests

Each test creates:
- Temp directory: `/tmp/test_<id>/`
- Test plugins: `/tmp/test_<id>/test-plugin-*/`
- Cache files: `/tmp/test_<id>/registry-cache.json`

All automatically deleted after test.

## Test Output Interpretation

### Passing Test
```
✨ Test Name PASSED: Description of verification
```

### Failing Test  
```
❌ Test Name FAILED: Error message with context
```

### Performance Metrics
```
✅ Installed 10 plugins in 2500ms
   Average per plugin: 250ms
```

## Adding New Tests

To add a new Phase 6 test:

1. Create function in appropriate file:
```javascript
export async function testMyNewScenario() {
    const testEnv = await new TestEnvironment().setup();
    try {
        // Your test here
    } finally {
        await testEnv.cleanup();
    }
}
```

2. Use real services:
```javascript
const pluginManager = testEnv.getService('PluginManagerService');
const registryCache = testEnv.getService('RegistryCacheService');
```

3. Make real operations and verify real results
4. Test runner will discover and execute automatically

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Phase 6 Tests
  run: npm test -- --grep "plugin-lifecycle"
```

Expected exit code: `0` (all pass) or `1` (any fail)

## Documentation

For detailed information see:
- **How to Run**: `PHASE6_TEST_GUIDE.md`
- **Infrastructure Details**: `REAL_OBJECTS_INFRASTRUCTURE.md`
- **Implementation Summary**: `project-plans/PHASE6_IMPLEMENTATION_COMPLETE.md`

## Questions?

Check the documentation files or review the test code directly - it's well-commented and self-documenting.

## Success Criteria

✅ All 12 tests pass  
✅ No orphaned temp files remain  
✅ Performance acceptable (< 30s total)  
✅ Clean, detailed output  
✅ Real behavior verified (not mocked)  

**Ready to execute!**