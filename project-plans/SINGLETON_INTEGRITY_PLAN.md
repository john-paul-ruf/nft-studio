# Singleton Integrity & Architecture Project Plan

**Status**: Active Planning Phase  
**Objective**: Establish comprehensive singleton governance across NFT Studio  
**Scope**: ApplicationFactory, service singletons, repositories, and all dependency resolution  

---

## Executive Summary

Your application uses a **Dependency Injection container pattern** backed by singleton instances as the single source of truth for state and services. The good news: your architecture is **sound**. The challenge: as the codebase grows (especially with plugins), maintaining singleton integrity requires discipline and automated checks.

This plan establishes:
- ✅ Clear singleton ownership rules
- ✅ Audit methodology to catch violations
- ✅ Automated guardrails (tests/lint rules)
- ✅ Documentation for new contributors
- ✅ Refactoring roadmap for edge cases

---

## Part 1: Current State Assessment

### 1.1 Singletons Identified (Source of Truth)

| Singleton | Location | Status | Scope |
|-----------|----------|--------|-------|
| **ApplicationFactory** | `src/ApplicationFactory.js` | ✅ Solid | Global app state orchestrator |
| **ProjectStateManager** | Created in ApplicationFactory | ✅ Good | Single project state instance |
| **RenderPipelineService** | Created in ApplicationFactory | ✅ Good | Render state & pipeline |
| **PinSettingService** | Created in ApplicationFactory | ✅ Good | Pin/lock state |
| **EventBusService** | `src/services/EventBusService.js` | ✅ Solid | Decoupled communication hub |
| **CommandService** | `src/services/CommandService.js` | ✅ Solid | Undo/redo history |
| **LoggerService** | `src/services/LoggerService.js` | ✅ Solid | Centralized logging |
| **FrontendServiceFactory** | `src/container/FrontendServiceFactory.js` | ⚠️ Review Needed | Secondary factory (may contain singletons) |
| **UtilsFactory** | `src/utils/UtilsFactory.js` | ⚠️ Review Needed | Utility instances (needs verification) |
| **ColorSchemeRepository** | Created in ApplicationFactory | ✅ Good | Color scheme persistence |

### 1.2 Violation Audit Results

**Good News**: No violations found in production code (`src/`)

**Findings**:
```
✅ ApplicationFactory.js:50       → Correct: Single instantiation
✅ CommandService.js:326          → Correct: Exported singleton
✅ EventBusService.js:163         → Correct: Exported singleton
⚠️  Test files (expected)          → Create isolated instances for testing
```

**Scope**: 
- Tests create their own instances (intentional & correct)
- No `new ServiceName()` calls found in production code

---

## Part 2: Risk Assessment & Edge Cases

### 2.1 High-Risk Areas (Potential Violation Points)

1. **FrontendServiceFactory** - Need to verify:
   - Are services stored as singletons or recreated?
   - Does it maintain internal caches?
   - Are factory methods idempotent?

2. **UtilsFactory** - Need to verify:
   - Schema generator: singleton or factory?
   - Property analyzer: singleton or factory?
   - Label formatter: singleton or factory?

3. **Plugin System** (if implemented):
   - How are plugin services registered?
   - Can plugins spawn their own singletons outside ApplicationFactory?
   - Registry cache management

4. **Context Providers** - Check:
   - Are any services re-instantiated in React contexts?
   - Provider initialization patterns

### 2.2 Potential Future Violations

**Common patterns to avoid:**
```javascript
// ❌ BAD: Direct instantiation bypasses DI
const eventBus = new EventBusService();
const command = new CommandService();

// ❌ BAD: Lazy initialization outside ApplicationFactory
let cachedService = null;
function getService() {
  if (!cachedService) {
    cachedService = new MyService(); // Creates implicit singleton
  }
  return cachedService;
}

// ✅ GOOD: Always via ApplicationFactory
import appFactory from './ApplicationFactory.js';
const eventBus = appFactory.eventBusService;
```

---

## Part 3: Governance Rules

### 3.1 Singleton Declaration Rules

**Rule 1: All singletons MUST be managed through ApplicationFactory**
- Register in `ApplicationFactory.initialize()`
- Expose via named getter: `getSomethingService()`
- Document in JSDoc: `@returns {SomethingService} Singleton instance`

**Rule 2: No duplicate instantiation in production code**
- Pattern: Use `appFactory.getSomethingService()` everywhere
- Never use: `import singleton from './SomethingService.js'` directly in components
- Exception: Service files can export their singleton at module level for ApplicationFactory to import

**Rule 3: Singletons must have identity verification**
```javascript
// Optional: Add identity marker for debugging
class MyService {
  constructor() {
    this.__singletonId = `MyService-${Date.now()}`;
  }
}

// Can verify at runtime:
const s1 = appFactory.getSomethingService();
const s2 = appFactory.getSomethingService();
console.assert(s1.__singletonId === s2.__singletonId); // Should be true
```

**Rule 4: Document singleton lifecycle**
- Where it's created
- When it's initialized
- Dependencies it requires
- When/how it's reset (if applicable)

### 3.2 Dependency Ordering (Critical)

**Current order in ApplicationFactory**:
```
1. FrontendServiceFactory → lowest level utilities
2. Repositories → data layer
3. ProjectStateManager → core state (no dependencies)
4. PinSettingService → depends on eventBus, logger
5. RenderPipelineService → depends on projectState, pinSettings
6. EventBus IPC Bridge → top-level integration
```

**Adding new singletons**: Declare where they fit in the dependency chain.

---

## Part 4: Audit & Monitoring Strategy

### 4.1 Phase 1: Deep Verification (This Sprint)

**Task 1.1**: Verify FrontendServiceFactory
```bash
# TODO: Audit these methods:
- getFrontendServiceFactory()        → Returns singleton factory?
- getProjectService()                → Returns same instance?
- getEffectService()                 → Returns same instance?
- getFileService()                   → Returns same instance?
- getNavigationService()             → Returns same instance?
- getColorSchemeService()            → Returns same instance?
- getPreferencesService()            → Returns same instance?
```

**Task 1.2**: Verify UtilsFactory
```bash
# TODO: Audit these methods:
- getSchemaGenerator()               → Singleton or new instance?
- getPropertyAnalyzer()              → Singleton or new instance?
- getLabelFormatter()                → Singleton or new instance?
```

**Task 1.3**: Search for edge cases
```bash
# Search patterns:
- grep -r "new.*Service\(" src/     # Find all service instantiations
- grep -r "new.*Repository\(" src/  # Find all repository instantiations
- grep -r "new.*Factory\(" src/     # Find all factory instantiations
```

**Task 1.4**: Verify context providers
```bash
# TODO: Check src/contexts/* for:
- Are services passed down correctly?
- Are they re-instantiated in providers?
- Is there double-wrapping?
```

### 4.2 Phase 2: Automated Guardrails (This & Next Sprint)

**Create ESLint Rule**: Prevent direct instantiation of singletons
```javascript
// .eslintrc addition:
{
  "rules": {
    "no-direct-singleton-instantiation": ["error", {
      "singletons": [
        "ApplicationFactory",
        "ProjectStateManager", 
        "EventBusService",
        "CommandService",
        "LoggerService",
        "RenderPipelineService",
        "PinSettingService"
      ]
    }]
  }
}
```

**Create Jest Test**: Verify singleton identity
```javascript
// tests/unit/singletons.test.js
describe('Singleton Integrity', () => {
  test('ApplicationFactory returns same instance', () => {
    const app1 = require('./ApplicationFactory.js').default;
    const app2 = require('./ApplicationFactory.js').default;
    expect(app1).toBe(app2);
  });

  test('EventBusService returns same instance', () => {
    const bus1 = require('./services/EventBusService.js').default;
    const bus2 = require('./services/EventBusService.js').default;
    expect(bus1).toBe(bus2);
  });

  // ... etc for all singletons
});
```

**Create Runtime Check**: Singleton verification in ApplicationFactory
```javascript
// In ApplicationFactory.initialize():
verifyAllSingletonsUnique() {
  const services = this.createReactContextValue();
  const identities = new Map();
  
  for (const [key, service] of Object.entries(services)) {
    if (service === null || typeof service !== 'object') continue;
    
    const id = System.identityHashCode(service); // or similar
    if (identities.has(id)) {
      console.warn(`⚠️ Duplicate singleton detected: ${key}`);
    }
    identities.set(id, key);
  }
}
```

### 4.3 Phase 3: Documentation & Onboarding

**Create**: `docs/SINGLETON_GOVERNANCE.md`
- How to add new singletons
- How to access singletons in components
- Anti-patterns to avoid
- Debugging singleton issues

**Update**: `.zencoder/rules/repo.md`
- Add section: "Singleton Access Patterns"
- Add examples of correct/incorrect usage

---

## Part 5: Refactoring Roadmap

### 5.1 Optional But Recommended: Enhance DependencyContainer

Current `DependencyContainer.js` is solid. Consider enhancing:

```javascript
// Enhancement: Add circular dependency detection
detectCircularDependencies() {
  // Prevent singleton A → B → A cycles
  // This is mainly a dev-time check
}

// Enhancement: Add lazy initialization with promises
resolveAsync(name) {
  // Handle async factory functions
  // Important for services with async init
}

// Enhancement: Add dependency graph visualization
getDependencyGraph() {
  // Returns map of what depends on what
  // Useful for debugging
}
```

### 5.2 Optional But Recommended: Add Singleton Registry

```javascript
// New file: src/SingltonRegistry.js
class SingletonRegistry {
  constructor() {
    this.registry = new Map();
  }
  
  register(name, singleton, metadata = {}) {
    this.registry.set(name, {
      instance: singleton,
      createdAt: Date.now(),
      createdBy: metadata.createdBy,
      dependencies: metadata.dependencies || [],
      lifecycle: metadata.lifecycle || 'app' // app|session|module
    });
  }
  
  verify() {
    // Runtime verification that all are still singletons
  }
  
  getDependencies(name) {
    return this.registry.get(name)?.dependencies || [];
  }
}
```

---

## Part 6: Implementation Checklist

### Phase 1: Audit (Weeks 1-2)

- [ ] **1.1a** Run audit scripts on FrontendServiceFactory
- [ ] **1.1b** Run audit scripts on UtilsFactory  
- [ ] **1.1c** Search codebase for edge cases
- [ ] **1.1d** Verify all context providers
- [ ] **1.1e** Document findings in `AUDIT_RESULTS.md`
- [ ] **1.1f** Identify any necessary refactoring

### Phase 2: Automated Guardrails (Weeks 2-3)

- [ ] **2.1a** Create ESLint rule file
- [ ] **2.1b** Add ESLint rule to `.eslintrc`
- [ ] **2.1c** Run linter and fix violations (if any)
- [ ] **2.2a** Create singleton identity tests
- [ ] **2.2b** Add to CI/CD pipeline
- [ ] **2.3a** Implement runtime verification in ApplicationFactory
- [ ] **2.3b** Test runtime verification

### Phase 3: Documentation (Weeks 3-4)

- [ ] **3.1a** Create `docs/SINGLETON_GOVERNANCE.md`
- [ ] **3.1b** Update `.zencoder/rules/repo.md`
- [ ] **3.1c** Create code comment templates
- [ ] **3.2a** Write team guidelines
- [ ] **3.2b** Document anti-patterns with examples

### Phase 4: Enhancement (Weeks 4+, Optional)

- [ ] **4.1a** Enhance DependencyContainer with new features
- [ ] **4.2a** Create SingletonRegistry if needed
- [ ] **4.3a** Add visualization tools for dependency graph

---

## Part 7: Key Metrics & Validation

### Success Criteria

- ✅ Zero violations of singleton pattern in production code
- ✅ 100% of singletons managed through ApplicationFactory
- ✅ ESLint prevents new violations
- ✅ Automated tests verify singleton identity
- ✅ Runtime checks detect any anomalies
- ✅ New team members understand singleton governance

### Monitoring Dashboard (Optional Future)

```javascript
// Expose in ApplicationFactory for debugging
getArchitectureHealth() {
  return {
    singletonViolations: 0,
    circularDependencies: [],
    orphanedServices: [],
    unusedSingletons: [],
    dependencyDepth: calculateMax(),
    initializationTime: this.initTime
  };
}
```

---

## Part 8: Team Guidelines

### For You (One-Man Operation)

**Before adding a new singleton:**
1. ✏️ Ask: "Should this be a singleton?" (Usually yes for services/state)
2. 📝 Add to ApplicationFactory.initialize()
3. 📋 Add getter method getSomethingService()
4. 🧪 Add identity test
5. 📚 Document in repo.md

### For Future Contributors

**Code Review Checklist**:
```
[ ] New service uses ApplicationFactory, not direct import?
[ ] Service is registered as singleton?
[ ] Service has appropriate JSDoc?
[ ] No duplicate instantiations?
[ ] Dependency ordering preserved?
```

---

## Part 9: Technical Deep Dive: Singleton Patterns in Your Code

### Current Pattern: Exported Singleton

```javascript
// ✅ EventBusService.js (correct)
class EventBusService {
  constructor() { /* ... */ }
  emit(type, data) { /* ... */ }
}

export default new EventBusService(); // Singleton at module level
```

**Why this works:**
- Module loads once in Node/Webpack
- `new EventBusService()` runs once
- All imports get same instance
- Simple, reliable, performant

### ApplicationFactory Pattern: Lazy Singleton

```javascript
// ✅ ApplicationFactory.js (correct)
class ApplicationFactory {
  initialize() {
    this.projectStateManager = new ProjectStateManager();
    // ^ Only instantiated when ApplicationFactory.initialize() called
  }
}

export default new ApplicationFactory(); // Factory itself is singleton
```

**Why this works:**
- Allows for initialization sequencing
- Can coordinate dependencies (ProjectState before RenderPipeline)
- Can be reset for testing
- Slightly more control

### Your Architecture: Hybrid Pattern

```
┌─────────────────────────────────────┐
│  Exported Singletons                │
│  - EventBusService                  │
│  - CommandService                   │
│  - LoggerService                    │
│  - (These are truly module-level)   │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  ApplicationFactory (Singleton)     │
│  Manages initialization & provides  │
│  accessor methods to all services   │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Lazy Singletons                    │
│  - ProjectStateManager              │
│  - RenderPipelineService            │
│  - PinSettingService                │
│  - Repositories                     │
│  (Created in initialize())          │
└─────────────────────────────────────┘
```

This hybrid is **perfectly valid** and gives you the best of both worlds.

---

## Part 10: Quick Reference Card

### ✅ DO: Correct Patterns

```javascript
// Pattern 1: Import from ApplicationFactory
import appFactory from './ApplicationFactory.js';

// In component
const eventBus = appFactory.eventBusService;
const command = appFactory.commandService;

// Pattern 2: Via context
function MyComponent() {
  const { eventBusService } = useContext(ServiceContext);
  // Service is singleton provided by factory
}

// Pattern 3: Getter method
appFactory.getProjectStateManager(); // Always same instance
```

### ❌ DON'T: Anti-Patterns

```javascript
// ❌ WRONG: Direct import of singleton
import eventBusService from './services/EventBusService.js';
// (OK at module level for ApplicationFactory, but not in components)

// ❌ WRONG: Create new instance
const newBus = new EventBusService();

// ❌ WRONG: Bypass factory in tests
const service = new ProjectStateManager(); // Should use test setup

// ❌ WRONG: Re-create in provider
<ServiceProvider>
  {/* Don't do this: */}
  {new SomeService()} 
</ServiceProvider>
```

---

## Part 11: Next Steps

**Immediate (This Week):**
1. Run Phase 1 audits (see Part 4.1)
2. Document any findings
3. Create AUDIT_RESULTS.md

**This Sprint:**
1. Complete Phase 2 (ESLint + tests)
2. Fix any violations found
3. Add runtime checks

**Next Sprint:**
1. Complete documentation (Phase 3)
2. Consider enhancements (Phase 4)
3. Monitor & maintain going forward

---

## References & Resources

- **Current DependencyContainer**: `src/main/container/DependencyContainer.js`
- **Main Factory**: `src/ApplicationFactory.js`
- **Singleton Services**: `src/services/{CommandService,EventBusService,LoggerService}.js`
- **Singleton State**: `src/models/ProjectState.js`

---

**Last Updated**: [Current Date]  
**Author**: Zencoder (Architecture Analysis)  
**Status**: 🟡 Ready for Implementation  
**Confidence**: High (architecture is sound, need guardrails)