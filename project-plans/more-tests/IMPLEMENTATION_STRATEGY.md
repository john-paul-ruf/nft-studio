# Test Coverage Improvement Strategy
## NFT Studio - Comprehensive Testing Implementation Plan

**Document Version:** 1.0  
**Created:** 2024  
**Status:** Planning Phase  
**Owner:** Development Team

---

## Executive Summary

This document outlines the comprehensive strategy for improving test coverage across the NFT Studio application. The project aims to increase test coverage from the current ~60% to 90%+ for critical components, focusing on untested core utilities, services, and UI components that are essential to application stability.

### ⚠️ CRITICAL REQUIREMENT: ABSOLUTELY NO MOCKS

**ALL tests MUST use REAL objects only. This is a non-negotiable requirement.**

- ✅ **REAL objects** - Actual service instances, real data structures, real file operations
- ✅ **REAL dependencies** - Test services with their actual dependencies
- ✅ **REAL state** - Actual ProjectState, CommandService, EventBus
- ❌ **NO MOCKS** - Never mock services, functions, or dependencies
- ❌ **NO STUBS** - Never stub method calls or return values
- ❌ **NO SPIES** - Never use test spies to intercept calls
- ❌ **NO FAKE OBJECTS** - Never create fake implementations

**Why?** Real objects catch real bugs. Mocks only test your assumptions, not actual behavior.

### Key Objectives
1. **Test with REAL objects only** - ABSOLUTELY NO MOCKS in any test
2. **Achieve 90%+ coverage** for critical services (CommandService, PositionScaler, ResolutionMapper)
3. **Achieve 85%+ coverage** for core utilities (CenterUtils, PositionSerializer, NumberFormatter)
4. **Add integration tests** for 5+ end-to-end workflows
5. **Prevent regressions** by ensuring all documented bugs have corresponding tests
6. **Maintain test execution speed** (unit tests < 30s, integration tests < 2min) **even with REAL objects**

---

## Architecture Context

### Current Architecture Patterns

The NFT Studio application follows several well-established architectural patterns:

1. **Single Source of Truth Pattern**
   - `ProjectState` manages all project data with automatic resolution scaling
   - `ResolutionMapper` is the single source for resolution definitions
   - `CommandService` is the single source for all user actions with undo/redo

2. **Command Pattern**
   - `CommandService` handles undo/redo with up to 50 tracked actions
   - All state mutations go through commands for consistency
   - Supports both effect and non-effect commands

3. **Event-Driven Architecture**
   - `EventBusService` for decoupled component communication
   - Event capture/filter/export services for advanced workflows
   - Components subscribe to state changes via events

4. **Service Layer with Dependency Injection**
   - 35+ services managed via `ApplicationFactory`
   - Clear separation of concerns (rendering, state, persistence, UI)
   - Main process services (FileSystem, Dialog, Image, Frame)

### Testing Infrastructure

**Existing Test Framework:**
- **Test Environment:** `TestEnvironment.js` - Provides consistent setup/teardown
- **Service Factory:** `TestServiceFactory.js` - Creates test instances of services
- **Test Helpers:** Comprehensive utilities for common test operations
- **Test Runner:** `the-one-runner-to-rule-them-all.js` - Unified test execution

**Current Test Distribution:**
- **Unit Tests:** 43 test files covering services, components, and utilities
- **Integration Tests:** 1 test file (service-integration.test.js)
- **System Tests:** End-to-end workflow tests
- **Performance Tests:** Render performance benchmarks

---

## Gap Analysis

### Critical Gaps (Priority 1) - Week 1-2

These components are **mission-critical** and lack adequate test coverage:

#### 1. CommandService (298 lines, basic tests only)
**Why Critical:** Single source of truth for all user actions with undo/redo
**Current Coverage:** ~40% (basic execution tests exist)
**Risk:** Undo/redo bugs could corrupt user projects

**Missing Test Scenarios:**
- Command stack overflow handling (max 50 commands)
- Concurrent command execution prevention
- Undo/redo to specific index boundary conditions
- Command execution failure rollback
- Event emission on command lifecycle
- Effect vs non-effect command filtering
- Command history persistence across sessions

**Test File:** `tests/unit/CommandService.test.js` (enhance existing)

---

#### 2. ResolutionMapper (240 lines, ZERO tests)
**Why Critical:** Single source of truth for resolution definitions
**Current Coverage:** 0%
**Risk:** Invalid resolutions could crash app or produce incorrect dimensions

**Missing Test Scenarios:**
- Get dimensions with orientation swap
- Parse string resolution (all formats: "1080p", "1920x1080", etc.)
- Closest resolution calculation
- Invalid resolution error handling
- Naturally portrait detection
- Display name generation
- Category filtering (Standard, HD, 4K, etc.)
- Standard resolutions completeness validation

**Test File:** `tests/unit/ResolutionMapper.test.js` (CREATE NEW)

---

#### 3. PositionScaler (350+ lines, indirect tests only)
**Why Critical:** Handles automatic position scaling during resolution changes
**Current Coverage:** ~30% (via orientation-scaling.test.js)
**Risk:** Positions could scale incorrectly, breaking user layouts

**Missing Test Scenarios:**
- Scale factors calculation accuracy
- Boundary clamping edge cases
- Arc path radius scaling with aspect ratio changes
- Nested position scaling recursion
- Legacy Point2D vs Position object consistency
- Scale with invalid dimensions handling
- Position metadata preservation (`__autoScaled`, `__scaledAt`)
- Proportional vs non-proportional scaling modes

**Test File:** `tests/unit/PositionScaler.test.js` (CREATE NEW)

---

#### 4. CenterUtils (423 lines, ZERO tests)
**Why Critical:** Complex center detection and position utilities
**Current Coverage:** 0%
**Risk:** Center positions could be miscalculated across resolutions

**Missing Test Scenarios:**
- Center detection across common resolutions (1080p, 720p, 4K)
- Center detection with tolerance boundaries
- Proportional scaling with aspect ratio changes
- Field value processing for all position types
- Arc path center scaling
- Resolution dimensions parsing (all formats)
- Should apply center logic decision tree
- Edge cases: square resolutions, ultra-wide, portrait

**Test File:** `tests/unit/CenterUtils.test.js` (CREATE NEW)

---

### High Priority Gaps (Priority 2) - Week 3

#### 5. PreferencesService (ZERO tests)
**Why Important:** User preferences persist across sessions
**Current Coverage:** 0%
**Risk:** User settings could be lost or corrupted

**Missing Test Scenarios:**
- Get preferences with missing file
- Save preferences file write failure
- Default preferences structure
- Favorite color schemes management
- Last project settings persistence
- Effect defaults storage
- Preferences migration on schema changes

**Test File:** `tests/unit/PreferencesService.test.js` (CREATE NEW)

---

#### 6. ColorSchemeService (ZERO tests)
**Why Important:** Color scheme management with custom schemes
**Current Coverage:** 0%
**Risk:** Custom color schemes could be lost or corrupted

**Missing Test Scenarios:**
- Get all color schemes (merge custom and predefined)
- Save custom scheme validation
- Delete custom scheme (protection for predefined)
- Category organization
- Favorite schemes integration
- Color scheme export/import
- Scheme application to effects

**Test File:** `tests/unit/ColorSchemeService.test.js` (CREATE NEW)

---

#### 7. PositionSerializer (ZERO tests)
**Why Important:** Position serialization/deserialization logic
**Current Coverage:** 0%
**Risk:** Position data could be corrupted during save/load

**Missing Test Scenarios:**
- Serialize legacy Point2D to Position
- Deserialize unknown formats
- Arc path serialization completeness
- Null and undefined handling
- Round-trip serialization consistency
- Backward compatibility with old formats

**Test File:** `tests/unit/PositionSerializer.test.js` (CREATE NEW)

---

#### 8. NumberFormatter (63 lines, ZERO tests)
**Why Important:** Number formatting utility used throughout UI
**Current Coverage:** 0%
**Risk:** Display inconsistencies, parsing errors

**Missing Test Scenarios:**
- Format for display (trailing zeros removal)
- Format for display edge values (0, -0, Infinity, -Infinity, NaN)
- Parse from string invalid inputs
- Step value consistency
- Very large and very small numbers
- Locale-specific formatting

**Test File:** `tests/unit/NumberFormatter.test.js` (CREATE NEW)

---

### Medium Priority Gaps (Priority 3) - Week 4

#### 9. Command Services (ZERO tests for specialized services)
**Services:**
- `EffectCommandService.js` - Effect command orchestration
- `SecondaryEffectCommandService.js` - Secondary effect commands
- `KeyframeEffectCommandService.js` - Keyframe effect commands
- `ProjectConfigCommandService.js` - Project config commands

**Missing Test Scenarios:**
- Command creation and execution
- Undo/redo integration
- Command validation
- Error handling

**Test Files:** Create individual test files for each service

---

#### 10. Conversion Services (ZERO tests)
**Services:**
- `ResolutionConversionService.js` - Resolution conversion logic
- `ColorSchemeConversionService.js` - Color scheme conversion

**Missing Test Scenarios:**
- Conversion accuracy
- Edge case handling
- Backward compatibility

**Test Files:** Create individual test files for each service

---

#### 11. Utility Services (ZERO tests)
**Services:**
- `ProjectStateManager.js` - Project state coordination
- `IPCSerializationService.js` - IPC data serialization
- `ProjectMetadataService.js` - Project metadata handling
- `SettingsValidationService.js` - Settings validation
- `LoggerService.js` - Logging infrastructure

**Test Files:** Create individual test files for each service

---

#### 12. React Input Components (15 components, ZERO dedicated tests)
**Components in `src/components/effects/inputs/`:**
- ArrayInput, RangeInput, NumberInput, BooleanInput
- Point2DInput, PositionInput, MultiStepInput, PercentageInput
- ColorPickerInput, MultiSelectInput, DynamicRangeInput
- SparsityFactorInput, PercentageRangeInput, FindValueAlgorithmInput
- ConfigInputFactory

**Missing Test Scenarios:**
- Input validation
- Value change handling
- Resolution synchronization (PositionInput)
- Color scheme application (ColorPickerInput)
- Boundary validation (RangeInput)
- Array operations (ArrayInput)
- Step transitions (MultiStepInput)

**Test File:** `tests/unit/EffectInputComponents.test.js` (CREATE NEW)

---

#### 13. UI Components (ZERO tests)
**Components:**
- `UndoRedoControls.jsx` - Undo/redo UI
- `ColorSchemeCreator.jsx` - Color scheme creation UI
- `ColorSchemeDropdown.jsx` - Color scheme selection
- `ProjectSelector.jsx` - Project selection UI
- `ProjectSettingsDialog.jsx` - Project settings UI
- `ImportProjectWizard.jsx` - Project import wizard
- `PluginManagerDialog.jsx` - Plugin management UI
- `RenderProgressWidget.jsx` - Render progress display
- `CanvasToolbar.jsx`, `CanvasViewport.jsx` - Canvas components
- Event-driven components: `EventDrivenEffectsPanel.jsx`, etc.

**Test File:** Create individual test files for complex components

---

#### 14. Custom Hooks (ZERO tests except useEffectManagement)
**Hooks:**
- `useNavigation.js` - Navigation hook
- `useRenderPipeline.js` - Render pipeline hook
- `useEffectOperations.js` - Effect operations hook
- `useInitialResolution.js` - Initial resolution hook
- `useZoomPan.js` - Canvas zoom/pan hook

**Test Files:** Create individual test files for each hook

---

#### 15. Additional Utilities (ZERO tests)
**Utilities:**
- `divisorHelper.js` - Divisor calculation helper
- `ProjectResumer.js` - Project resumption logic
- `convertSettings.js` - Settings conversion
- `schemaGenerator.js` - Schema generation
- `configIntrospector.js` - Config introspection
- `SpecialtyDistribution.js` - Specialty distribution logic
- `CommandDescriptionHelper.js` - Command description formatting
- `LabelFormatter.js`, `PropertyTypeAnalyzer.js` - Utility services
- `IdGenerator.js` - Unique ID generation
- `ResolutionKeyUtils.js` - Resolution key management

**Test Files:** Create individual test files for complex utilities

---

## Implementation Strategy

### Phase 1: Critical Coverage (Week 1-2)

**Goal:** Protect mission-critical functionality

**Tasks:**
1. **CommandService.test.js** (Enhance existing)
   - Add stack overflow tests
   - Add concurrent execution tests
   - Add boundary condition tests
   - Add event emission tests
   - **Estimated Time:** 8 hours

2. **ResolutionMapper.test.js** (Create new)
   - Test all resolution parsing formats
   - Test dimension calculations
   - Test orientation handling
   - Test category filtering
   - **Estimated Time:** 6 hours

3. **PositionScaler.test.js** (Create new)
   - Test scale factor calculations
   - Test boundary clamping
   - Test arc path scaling
   - Test nested position scaling
   - Test metadata preservation
   - **Estimated Time:** 10 hours

4. **CenterUtils.test.js** (Create new)
   - Test center detection across resolutions
   - Test tolerance boundaries
   - Test proportional scaling
   - Test all position types
   - **Estimated Time:** 10 hours

**Total Estimated Time:** 34 hours (1.7 weeks for 1 developer)

**Success Criteria:**
- All 4 test files created/enhanced
- 90%+ code coverage for these modules
- All edge cases documented
- Zero test failures

---

### Phase 2: Core Utilities (Week 3)

**Goal:** Ensure data integrity and persistence

**Tasks:**
1. **PreferencesService.test.js** (Create new)
   - Test file operations
   - Test default preferences
   - Test migration logic
   - **Estimated Time:** 6 hours

2. **ColorSchemeService.test.js** (Create new)
   - Test scheme management
   - Test custom schemes
   - Test favorites
   - **Estimated Time:** 6 hours

3. **PositionSerializer.test.js** (Create new)
   - Test serialization formats
   - Test round-trip consistency
   - Test backward compatibility
   - **Estimated Time:** 6 hours

4. **NumberFormatter.test.js** (Create new)
   - Test formatting edge cases
   - Test parsing validation
   - Test locale handling
   - **Estimated Time:** 4 hours

**Total Estimated Time:** 22 hours (1.1 weeks for 1 developer)

**Success Criteria:**
- All 4 test files created
- 85%+ code coverage for these modules
- All edge cases documented
- Zero test failures

---

### Phase 3: UI & Integration (Week 4)

**Goal:** Validate user-facing components and workflows

**Tasks:**
1. **EffectInputComponents.test.js** (Create new)
   - Test all 15 input components
   - Test validation logic
   - Test value change handling
   - **Estimated Time:** 12 hours

2. **Integration Tests** (Create new)
   - `resolution-scaling-integration.test.js` - Resolution change workflows
   - `color-scheme-integration.test.js` - Color scheme workflows
   - `command-integration.test.js` - Undo/redo workflows
   - **Estimated Time:** 12 hours

3. **Hook Tests** (Create new)
   - Test custom hooks in isolation
   - Test hook state management
   - **Estimated Time:** 8 hours

**Total Estimated Time:** 32 hours (1.6 weeks for 1 developer)

**Success Criteria:**
- Input components tested
- 5+ integration tests created
- All hooks tested
- Zero test failures

---

### Phase 4: Remaining Gaps (Week 5+)

**Goal:** Achieve comprehensive coverage

**Tasks:**
1. Command services tests
2. Conversion services tests
3. Utility services tests
4. UI component tests
5. Additional utility tests

**Estimated Time:** 40+ hours (2+ weeks for 1 developer)

---

## Testing Patterns & Best Practices

### ⚠️ CRITICAL TESTING PHILOSOPHY: REAL OBJECTS ONLY - ABSOLUTELY NO MOCKS

**This project follows a strict NO MOCKING policy:**

- ✅ **USE REAL OBJECTS** - Always test with actual service instances, real data structures, real file operations
- ✅ **USE REAL DEPENDENCIES** - Test services with their actual dependencies, not mocked versions
- ✅ **USE REAL STATE** - Test with actual ProjectState, real CommandService, real EventBus
- ✅ **USE REAL FILE SYSTEM** - Use temporary directories for file operations, clean up after tests
- ❌ **NO MOCKS** - Do not mock services, functions, or dependencies
- ❌ **NO STUBS** - Do not stub method calls or return values
- ❌ **NO SPIES** - Do not use test spies to intercept calls
- ❌ **NO FAKE OBJECTS** - Do not create fake implementations

**Why No Mocks?**
1. **Real behavior testing** - Mocks test your assumptions, not actual behavior
2. **Integration confidence** - Real objects reveal integration issues mocks hide
3. **Refactoring safety** - Tests don't break when implementation details change
4. **Bug detection** - Real objects catch bugs that mocks would miss
5. **Maintenance** - No mock setup/teardown code to maintain

**How to Test Without Mocks:**
- Use `TestEnvironment` to set up real service instances
- Use temporary directories/files for file system operations
- Use real ProjectState with test data
- Use real EventBus for event-driven tests
- Clean up resources in test teardown

### Test Structure

All tests should follow this structure:

```javascript
import TestEnvironment from '../setup/TestEnvironment.js';
import ServiceUnderTest from '../../src/services/ServiceUnderTest.js';

/**
 * Test: [Descriptive name]
 * Validates: [What is being validated]
 * Edge Cases: [List edge cases covered]
 * 
 * TESTING APPROACH: Uses REAL objects - NO MOCKS
 */
export async function test_descriptive_name() {
    // Setup - Use REAL TestEnvironment with REAL services
    const env = await new TestEnvironment().setup();
    
    // Execute - Call REAL methods on REAL objects
    const result = ServiceUnderTest.methodUnderTest(input);
    
    // Assert - Verify REAL behavior
    if (result !== expectedValue) {
        throw new Error(`Expected ${expectedValue}, got ${result}`);
    }
    
    // Cleanup - Clean up REAL resources
    await env.cleanup();
}
```

### Test Naming Conventions

- **Function names:** `test_what_is_being_tested`
- **File names:** `ServiceName.test.js`
- **Descriptive:** Names should clearly indicate what is being tested

### Test Categories

1. **Happy Path Tests:** Test expected behavior with valid inputs
2. **Edge Case Tests:** Test boundary conditions (0, null, undefined, max values)
3. **Error Handling Tests:** Test invalid inputs and error conditions
4. **Integration Tests:** Test interactions between multiple components
5. **Regression Tests:** Test previously fixed bugs don't reoccur

### Assertion Patterns

```javascript
// Value equality
if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}`);
}

// Object equality (deep comparison)
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Objects don't match`);
}

// Array length
if (array.length !== expectedLength) {
    throw new Error(`Expected array length ${expectedLength}, got ${array.length}`);
}

// Null/undefined checks
if (value === null || value === undefined) {
    throw new Error('Value should not be null or undefined');
}

// Type checks
if (typeof value !== 'string') {
    throw new Error(`Expected string, got ${typeof value}`);
}
```

### Test Data Management

**Use Test Builders for REAL Data:**
```javascript
// tests/utils/TestDataBuilders.js
export class EffectBuilder {
    constructor() {
        // Build REAL effect objects, not mocks
        this.effect = {
            id: 'test-effect-1',
            type: 'text',
            config: {}
        };
    }
    
    withPosition(x, y) {
        this.effect.config.position = { x, y };
        return this;
    }
    
    build() {
        // Returns REAL effect object
        return this.effect;
    }
}

// Usage in tests - Creates REAL data
const effect = new EffectBuilder()
    .withPosition(960, 540)
    .build();
```

### ❌ NO MOCK SERVICES - Use Real Services Only

**WRONG - Do NOT do this:**
```javascript
// ❌ NEVER USE MOCKS
const mockService = TestServiceFactory.createMockService('ServiceName', {
    methodName: () => 'mocked result'
});
```

**CORRECT - Use REAL services:**
```javascript
// ✅ ALWAYS USE REAL SERVICES
import TestEnvironment from '../setup/TestEnvironment.js';

const env = await new TestEnvironment().setup();
const realService = env.services.ServiceName; // Real service instance
const result = realService.methodName(); // Real method call
```

### Test Environment Setup

**Always use TestEnvironment for REAL service instances:**
```javascript
// TestEnvironment provides REAL services, not mocks
const env = await new TestEnvironment().setup();

// Access REAL services
const projectState = env.projectState; // Real ProjectState
const commandService = env.services.CommandService; // Real CommandService
const eventBus = env.services.EventBusService; // Real EventBus

// ... test code with REAL objects ...

await env.cleanup(); // Always cleanup REAL resources
```

---

## Success Metrics

### Coverage Targets

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| Critical Services | ~40% | 90%+ | P1 |
| Core Utilities | ~20% | 85%+ | P2 |
| UI Components | ~30% | 70%+ | P3 |
| Integration Tests | 1 test | 10+ tests | P2 |
| Overall Coverage | ~60% | 80%+ | - |

### Quality Indicators

1. **Zero test failures** on main branch
2. **All edge cases documented** in test descriptions
3. **Test execution time:**
   - Unit tests: < 30 seconds
   - Integration tests: < 2 minutes
   - Full suite: < 5 minutes
4. **Regression prevention:** All bugs from `docs/fixes/` have corresponding tests
5. **Code review:** All tests reviewed for meaningful assertions

### Regression Prevention

**Document all bugs with tests:**
- Every bug fix should include a regression test
- Reference bug fix documents in test comments
- Maintain a mapping of bugs to tests

**Example:**
```javascript
/**
 * Test: Resolution scaling UI synchronization
 * Regression Test for: docs/fixes/resolution-scaling-ui-sync-fix.md
 * Validates: EffectConfigurer re-syncs when resolution changes
 */
export async function test_resolution_scaling_ui_sync() {
    // Test implementation
}
```

---

## Risk Mitigation

### Risk 1: Adding tests might reveal existing bugs

**Mitigation Strategy:**
1. Run tests in isolation first (don't block CI/CD)
2. Document discovered bugs in separate issues
3. Fix critical bugs before merging tests
4. Use feature flags to disable problematic features temporarily

**Process:**
- Create test → Discover bug → File issue → Fix bug → Merge test

---

### Risk 2: Test maintenance overhead

**Mitigation Strategy:**
1. Use `TestEnvironment` for consistent setup/teardown of REAL services
2. Create reusable test data builders for REAL data
3. Document test patterns in `tests/docs/`
4. Regular test review in code reviews
5. Refactor tests when they become brittle

**Best Practices:**
- DRY principle: Extract common test logic
- Clear test names: Self-documenting tests
- **ZERO MOCKING**: Test real behavior with real objects ALWAYS
- Real dependencies: Test actual service interactions
- Real state: Use actual ProjectState, CommandService, EventBus

---

### Risk 3: False sense of security from high coverage

**Mitigation Strategy:**
1. Focus on **meaningful** assertions, not just coverage %
2. Include negative test cases (error conditions)
3. Regular test review in code reviews
4. Manual testing for critical workflows
5. User acceptance testing for major features

**Quality over Quantity:**
- 1 good test > 10 shallow tests
- Test behavior, not implementation
- Test edge cases, not just happy paths

---

### Risk 4: Test execution time increases

**Mitigation Strategy:**
1. Keep unit tests fast (< 30s total)
2. **Use REAL objects efficiently** - Optimize setup/teardown, use temporary in-memory structures where possible
3. **Use REAL file system with temp directories** - Clean up aggressively
4. Run integration tests separately
5. Parallelize test execution where possible
6. Profile slow tests and optimize REAL operations

**Performance Targets:**
- Unit test: < 100ms each (with REAL objects)
- Integration test: < 1s each (with REAL services)
- Full suite: < 5 minutes (all REAL, no mocks)

**Note:** Even with REAL objects, tests should be fast. Optimize by:
- Reusing TestEnvironment setup where possible
- Using minimal test data
- Cleaning up resources immediately
- Using in-memory operations when appropriate (but still REAL objects)

---

## Tools & Infrastructure

### Test Runner
- **Current:** `the-one-runner-to-rule-them-all.js`
- **Features:** Unified test execution, colored output, failure reporting

### Test Environment
- **Current:** `TestEnvironment.js`
- **Features:** Consistent setup/teardown, service mocking, cleanup

### Test Helpers
- **Location:** `tests/utils/`
- **Helpers:** TestDataBuilders, TestServiceFactory, assertion helpers

### Coverage Tools
- **Recommended:** Istanbul/nyc for code coverage reporting
- **Integration:** Add to CI/CD pipeline

---

## Documentation Requirements

### Test Documentation

Each test file should include:
1. **File header:** Purpose, scope, related components
2. **Test descriptions:** What is being tested, why it matters
3. **Edge cases:** List of edge cases covered
4. **Regression references:** Links to bug fix documents

**Example:**
```javascript
/**
 * CommandService Tests
 * 
 * Tests the command pattern implementation including:
 * - Command execution and undo/redo
 * - Stack overflow handling (max 50 commands)
 * - Concurrent execution prevention
 * - Event emission on command lifecycle
 * 
 * Related Components:
 * - src/services/CommandService.js
 * - src/commands/*.js
 * 
 * Regression Tests:
 * - None yet (no documented bugs)
 */
```

### Test Patterns Documentation

Create `tests/docs/TESTING_PATTERNS.md`:
- Common test patterns
- Best practices
- Examples
- Anti-patterns to avoid

---

## Timeline & Milestones

### Week 1-2: Critical Coverage
- **Milestone:** CommandService, ResolutionMapper, PositionScaler, CenterUtils tested
- **Deliverable:** 4 test files, 90%+ coverage for critical modules
- **Review:** Code review, coverage report

### Week 3: Core Utilities
- **Milestone:** PreferencesService, ColorSchemeService, PositionSerializer, NumberFormatter tested
- **Deliverable:** 4 test files, 85%+ coverage for utilities
- **Review:** Code review, coverage report

### Week 4: UI & Integration
- **Milestone:** Input components, integration tests, hooks tested
- **Deliverable:** 3+ test files, 5+ integration tests
- **Review:** Code review, integration test report

### Week 5+: Remaining Gaps
- **Milestone:** All remaining components tested
- **Deliverable:** Comprehensive test coverage
- **Review:** Final coverage report, retrospective

---

## Continuous Improvement

### Test Review Process
1. **Weekly:** Review new tests in code reviews
2. **Monthly:** Review test coverage reports
3. **Quarterly:** Refactor brittle tests
4. **Annually:** Update testing strategy

### Metrics Tracking
- Track coverage over time
- Track test execution time
- Track test failure rate
- Track bug escape rate (bugs found in production)

### Retrospectives
- What tests caught bugs?
- What tests are brittle?
- What areas still lack coverage?
- What can we improve?

---

## Conclusion

This strategy provides a comprehensive roadmap for improving test coverage in NFT Studio. By focusing on critical components first and following established testing patterns, we can significantly reduce the risk of bugs while maintaining development velocity.

**Key Takeaways:**
1. **ABSOLUTELY NO MOCKS** - Use REAL objects, REAL services, REAL state in ALL tests
2. **Prioritize critical components** (CommandService, PositionScaler, ResolutionMapper)
3. **Follow established patterns** (TestEnvironment, test builders, clear naming)
4. **Focus on meaningful tests** (edge cases, error handling, integration)
5. **Maintain test quality** (fast execution, clear assertions, good documentation)
6. **Continuous improvement** (regular reviews, metrics tracking, retrospectives)

**Next Steps:**
1. Review and approve this strategy
2. Assign developers to phases
3. Begin Phase 1 implementation with REAL objects only
4. Track progress in PROJECT_STATUS.md