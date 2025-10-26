# Singleton Integrity Implementation Checklist

**Track your progress through all phases**

---

## 🎯 Overview

This checklist guides you through implementing the Singleton Integrity Plan. Work through each phase sequentially. Expected time: 4-6 weeks for full implementation.

---

## PHASE 1: Audit & Discovery (Week 1-2)

### Task 1.1: Verify FrontendServiceFactory Behavior
- [ ] **1.1.1** Read `src/container/FrontendServiceFactory.js`
- [ ] **1.1.2** Identify all getter methods
- [ ] **1.1.3** Check if services are cached internally
  - [ ] Look for `this.projectService = ...` pattern
  - [ ] Look for Map/object storage patterns
  - [ ] Check if getters return same instance or new instance
- [ ] **1.1.4** Write test:
  ```javascript
  // tests/unit/singletons-frontend-factory.test.js
  test('FrontendServiceFactory returns same instance on multiple calls', () => {
    const factory = FrontendServiceFactory;
    factory.initialize();
    
    const p1 = factory.getProjectService();
    const p2 = factory.getProjectService();
    expect(p1).toBe(p2); // If false, it's a factory, not singleton!
    
    // Repeat for all service getters
  });
  ```
- [ ] **1.1.5** Document findings in AUDIT_RESULTS.md
  - Status: Singleton / Factory / Needs Refactoring
  - Evidence: [Quote from code]
  - Recommendation: [Action needed]

### Task 1.2: Verify UtilsFactory Behavior
- [ ] **2.1.1** Read `src/utils/UtilsFactory.js`
- [ ] **2.1.2** Identify what it returns (singletons vs new instances)
- [ ] **2.1.3** Check methods:
  - [ ] `getSchemaGenerator()` - singleton or factory?
  - [ ] `getPropertyAnalyzer()` - singleton or factory?
  - [ ] `getLabelFormatter()` - singleton or factory?
- [ ] **2.1.4** Write test:
  ```javascript
  // tests/unit/singletons-utils-factory.test.js
  test('UtilsFactory schema generator consistency', () => {
    const gen1 = UtilsFactory.getSchemaGenerator();
    const gen2 = UtilsFactory.getSchemaGenerator();
    // Determine: should be singleton or factory?
    // Then decide if current behavior is correct
  });
  ```
- [ ] **2.1.5** Document findings

### Task 1.3: Plugin System Audit
- [ ] **1.3.1** Locate plugin loading code
- [ ] **1.3.2** Find EffectRegistryService usage
- [ ] **1.3.3** Verify plugins don't create their own singletons
- [ ] **1.3.4** Check registry cache management
- [ ] **1.3.5** Document findings

### Task 1.4: Context Provider Audit
- [ ] **1.4.1** Find all context providers in `src/contexts/`
- [ ] **1.4.2** For each provider:
  - [ ] Check how services are obtained
  - [ ] Verify no new instances in render
  - [ ] Confirm values come from ApplicationFactory
- [ ] **1.4.3** Document findings

### Task 1.5: Create Audit Results Document
- [ ] **1.5.1** Copy SINGLETON_AUDIT_TEMPLATE.md → AUDIT_RESULTS.md
- [ ] **1.5.2** Fill in Sections 1-5 with findings
- [ ] **1.5.3** Update Status field with real results
- [ ] **1.5.4** Identify any violations or issues
- [ ] **1.5.5** Review and sign off

### Phase 1 Sign-Off
- [ ] All audit tasks complete
- [ ] AUDIT_RESULTS.md created and populated
- [ ] No critical violations found
- [ ] Document any minor issues for Phase 2

**Expected Outcome**: Clear picture of current state. Likely: ✅ All good in production code, ⚠️ Minor questions about factories.

---

## PHASE 2: Automated Guardrails (Week 2-3)

### Task 2.1: Create ESLint Rule

- [ ] **2.1.1** Create file: `.eslintrc.json` or update existing
- [ ] **2.1.2** Find existing ESLint config (may be in package.json)
- [ ] **2.1.3** Plan new rule that prevents:
  ```javascript
  // ❌ Disallow these patterns in production code:
  new EventBusService()
  new CommandService()
  new LoggerService()
  new ProjectStateManager()
  new RenderPipelineService()
  // etc.
  ```
- [ ] **2.1.4** Research ESLint plugin approach:
  - Option A: Use existing `no-new` rule with exceptions
  - Option B: Create custom rule
  - Option C: Use pattern matching rule
- [ ] **2.1.5** Implement rule (choose simplest that works)
- [ ] **2.1.6** Test rule against codebase:
  ```bash
  npm run lint -- --fix
  ```
- [ ] **2.1.7** Ensure no false positives in tests (tests should be exempt)

### Task 2.2: Create Singleton Identity Tests

- [ ] **2.2.1** Create test file: `tests/unit/singletons-integrity.test.js`
- [ ] **2.2.2** Test all exported singletons:
  ```javascript
  describe('Singleton Integrity', () => {
    test('EventBusService is singleton', () => {
      const bus1 = require('../src/services/EventBusService.js').default;
      const bus2 = require('../src/services/EventBusService.js').default;
      expect(bus1).toBe(bus2);
    });
    
    test('CommandService is singleton', () => {
      const cmd1 = require('../src/services/CommandService.js').default;
      const cmd2 = require('../src/services/CommandService.js').default;
      expect(cmd1).toBe(cmd2);
    });
    
    // ... repeat for all singletons
  });
  ```
- [ ] **2.2.3** Test ApplicationFactory-managed singletons:
  ```javascript
  test('ApplicationFactory returns same instances', () => {
    const app = require('../src/ApplicationFactory.js').default;
    
    const p1 = app.getProjectStateManager();
    const p2 = app.getProjectStateManager();
    expect(p1).toBe(p2);
    
    // ... repeat for all factory-managed singletons
  });
  ```
- [ ] **2.2.4** Run tests:
  ```bash
  npm test -- tests/unit/singletons-integrity.test.js
  ```
- [ ] **2.2.5** All tests should pass ✅

### Task 2.3: Add Runtime Verification

- [ ] **2.3.1** Open `src/ApplicationFactory.js`
- [ ] **2.3.2** Add verification method:
  ```javascript
  verifySingletonIntegrity() {
    const services = this.createReactContextValue();
    const seen = new Set();
    
    for (const [key, service] of Object.entries(services)) {
      if (service === null || typeof service !== 'object') continue;
      
      // Simple check: each service object should be unique
      // (except intentionally shared ones)
      if (seen.has(service)) {
        console.warn(`⚠️ Singleton reuse detected: ${key}`);
      }
      seen.add(service);
    }
    
    console.log('✅ Singleton integrity verified');
  }
  ```
- [ ] **2.3.3** Call verification in `initialize()`:
  ```javascript
  initialize() {
    // ... existing initialization code
    this.verifySingletonIntegrity();
    this.initialized = true;
  }
  ```
- [ ] **2.3.4** Test by starting dev server:
  ```bash
  npm run start:dev
  # Look for ✅ Singleton integrity verified in console
  ```

### Task 2.4: Update CI/CD Pipeline

- [ ] **2.4.1** Find CI/CD config (GitHub Actions, Jenkins, etc.)
- [ ] **2.4.2** Add test step:
  ```yaml
  - name: Test singleton integrity
    run: npm test -- tests/unit/singletons-integrity.test.js
  ```
- [ ] **2.4.3** Add lint step if not present:
  ```yaml
  - name: Lint
    run: npm run lint
  ```
- [ ] **2.4.4** Commit and test pipeline

### Task 2.5: Fix Any Violations

- [ ] **2.5.1** Run linter and find violations:
  ```bash
  npm run lint
  ```
- [ ] **2.5.2** For each violation:
  - [ ] Is it in test code? (OK, probably)
  - [ ] Is it in production code? (Fix it!)
  - [ ] Is it a false positive? (Adjust rule)
- [ ] **2.5.3** Fix violations:
  ```bash
  npm run lint -- --fix
  ```
- [ ] **2.5.4** Manual review of fixes
- [ ] **2.5.5** Commit changes

### Phase 2 Sign-Off
- [ ] ESLint rule implemented and working
- [ ] Singleton identity tests passing
- [ ] Runtime verification implemented
- [ ] CI/CD updated
- [ ] No violations in production code

**Expected Outcome**: Automated guardrails in place. Future violations will be caught immediately.

---

## PHASE 3: Documentation & Guidelines (Week 3-4)

### Task 3.1: Create Developer Guidelines

- [ ] **3.1.1** Create file: `docs/SINGLETON_GOVERNANCE.md`
- [ ] **3.1.2** Include sections:
  - [ ] What are singletons?
  - [ ] Why do we use them?
  - [ ] How to use them (correct patterns)
  - [ ] Common mistakes (anti-patterns)
  - [ ] How to add a new singleton
  - [ ] Debugging singleton issues
  - [ ] How to test singleton code
- [ ] **3.1.3** Use examples from SINGLETON_QUICK_REFERENCE.md
- [ ] **3.1.4** Add code snippets for each pattern
- [ ] **3.1.5** Review and refine

### Task 3.2: Update Repository Info

- [ ] **3.2.1** Open `.zencoder/rules/repo.md`
- [ ] **3.2.2** Add new section after "Dependency Injection via ServiceFactory":
  ```markdown
  ### Singleton Management
  **Single Source**: ApplicationFactory and exported singletons
  **Access Pattern**: Always via `appFactory.getService()` or context
  **Key Singletons**:
  - EventBusService (event-driven communication)
  - CommandService (undo/redo)
  - ProjectStateManager (project state)
  - RenderPipelineService (rendering)
  - PinSettingService (pin/lock state)
  
  **Guidelines**:
  - Never use `new ServiceName()` in production code
  - Always use `appFactory.getService()` pattern
  - See docs/SINGLETON_GOVERNANCE.md for details
  ```
- [ ] **3.2.3** Add to "Important Patterns to Follow":
  - [ ] "Singleton Access Patterns" section
  - [ ] Examples of correct usage
- [ ] **3.2.4** Verify formatting and readability

### Task 3.3: Create Code Comment Templates

- [ ] **3.3.1** Add JSDoc template for singleton getters:
  ```javascript
  /**
   * Get [ServiceName] singleton
   * @returns {[ServiceName]} Singleton instance
   * @description Always returns the same instance. Use this in all
   * components, services, and utilities that need [ServiceName].
   */
  ```
- [ ] **3.3.2** Add JSDoc template for singletons in service files:
  ```javascript
  /**
   * [ServiceName] - Singleton Instance
   * 
   * Exported as singleton. All code should use this single instance.
   * Do NOT create new instances with `new [ServiceName]()`
   * 
   * @example
   * import [serviceName] from './[ServiceName].js';
   * [serviceName].methodName();
   */
  ```
- [ ] **3.3.3** Create COMMENT_TEMPLATES.md with these
- [ ] **3.3.4** Commit as reference

### Task 3.4: Create Troubleshooting Guide

- [ ] **3.4.1** Create `docs/SINGLETON_TROUBLESHOOTING.md`
- [ ] **3.4.2** Add common issues:
  - [ ] Events not firing between components
  - [ ] State changes not syncing
  - [ ] Multiple instances created
  - [ ] Performance issues from duplication
- [ ] **3.4.3** For each issue, include:
  - [ ] Symptoms (how to recognize it)
  - [ ] Root cause (why it happens)
  - [ ] Debugging steps (how to verify)
  - [ ] Solution (how to fix it)
  - [ ] Prevention (how to avoid it)
- [ ] **3.4.4** Add debugging scripts/tools

### Task 3.5: Code Review Checklist

- [ ] **3.5.1** Create `CODE_REVIEW_SINGLETON_CHECKLIST.md`
- [ ] **3.5.2** Include checklist items:
  ```markdown
  ## Singleton Code Review Checklist
  
  For each PR, verify:
  - [ ] No direct service instantiation (`new ServiceName()`)?
  - [ ] All services access via ApplicationFactory?
  - [ ] Singleton tests added/updated?
  - [ ] No context provider re-instantiation?
  - [ ] Dependencies properly ordered?
  - [ ] No circular singleton dependencies?
  - [ ] ESLint passes without warnings?
  - [ ] New singleton documented in repo.md?
  ```
- [ ] **3.5.3** Link to checklist in PULL_REQUEST_TEMPLATE.md (if exists)

### Phase 3 Sign-Off
- [ ] SINGLETON_GOVERNANCE.md created
- [ ] repo.md updated
- [ ] Troubleshooting guide created
- [ ] Code review checklist created
- [ ] All documentation reviewed and proofread

**Expected Outcome**: Clear, accessible documentation. New developers can understand singleton pattern immediately.

---

## PHASE 4: Optional Enhancements (Week 4+)

### Task 4.1: Enhance DependencyContainer (Optional)

- [ ] **4.1.1** Review current `src/main/container/DependencyContainer.js`
- [ ] **4.1.2** Consider enhancements:
  - [ ] Add lazy initialization support
  - [ ] Add circular dependency detection
  - [ ] Add dependency graph visualization
  - [ ] Add async factory support
- [ ] **4.1.3** For each enhancement:
  - [ ] Write tests first
  - [ ] Implement feature
  - [ ] Update JSDoc
  - [ ] Document in repo
- [ ] **4.1.4** Be conservative - don't break existing functionality

### Task 4.2: Create SingletonRegistry (Optional)

- [ ] **4.2.1** Decide if SingletonRegistry is needed
  - Useful for: Visibility, debugging, monitoring
  - Cost: Additional abstraction layer
- [ ] **4.2.2** If yes, create `src/SingletonRegistry.js`:
  ```javascript
  class SingletonRegistry {
    register(name, instance, metadata) { }
    getMetadata(name) { }
    verify() { } // Runtime check
    getDependencyGraph() { }
  }
  ```
- [ ] **4.2.3** Integrate with ApplicationFactory
- [ ] **4.2.4** Update documentation

### Task 4.3: Create Monitoring Dashboard (Optional)

- [ ] **4.3.1** Add health check method to ApplicationFactory:
  ```javascript
  getSingletonHealthStatus() {
    return {
      initialized: this.initialized,
      singletonCount: this.singletons.size,
      violations: 0,
      timestamp: Date.now()
    };
  }
  ```
- [ ] **4.3.2** Expose in dev tools / debug panel
- [ ] **4.3.3** Consider browser DevTools extension

### Task 4.4: Create Visualization Tools (Optional)

- [ ] **4.4.1** Create dependency graph visualization
- [ ] **4.4.2** Create singleton instance browser
- [ ] **4.4.3** Create singleton usage report

### Phase 4 Sign-Off
- [ ] Enhancements implemented (if chosen)
- [ ] Tests passing
- [ ] Documented

---

## 🎉 Final Sign-Off

### Pre-Release Verification

- [ ] **Phase 1 Complete**: ✅ Audit done
- [ ] **Phase 2 Complete**: ✅ Guardrails in place
- [ ] **Phase 3 Complete**: ✅ Documentation done
- [ ] **Phase 4 Complete**: ✅ Enhancements done (if chosen)
- [ ] **All Tests Passing**: ✅
  ```bash
  npm test
  npm run lint
  npm run build
  ```
- [ ] **No Violations**: ✅
- [ ] **Documentation Updated**: ✅
- [ ] **Team Notified**: ✅

### Post-Implementation

- [ ] Create summary of changes
- [ ] Update CHANGELOG.md
- [ ] Commit all changes
- [ ] Create pull request for review
- [ ] Merge after approval
- [ ] Mark this checklist complete! 🎊

---

## 📊 Timeline Summary

| Phase | Duration | Effort | Status |
|-------|----------|--------|--------|
| 1: Audit | Weeks 1-2 | Medium | ⏳ |
| 2: Guardrails | Weeks 2-3 | High | ⏳ |
| 3: Documentation | Weeks 3-4 | Low | ⏳ |
| 4: Enhancements | Week 4+ | Optional | ⏳ |
| **Total** | **4 weeks** | **Medium-High** | ⏳ |

---

## 📝 Notes & Tracking

Use this section to track your progress:

```
Week 1:
- [x] Started Phase 1
- [ ] Audit findings documented
- [ ] Questions/blockers: None yet

Week 2:
- [ ] ...

Week 3:
- [ ] ...

Week 4:
- [ ] ...

Completion Date: ___________
```

---

## 🔗 Quick Links

- **Main Plan**: project-plans/SINGLETON_INTEGRITY_PLAN.md
- **Quick Reference**: project-plans/SINGLETON_QUICK_REFERENCE.md
- **Audit Results**: project-plans/AUDIT_RESULTS.md (will create)
- **Governor Doc**: docs/SINGLETON_GOVERNANCE.md (will create)
- **ApplicationFactory**: src/ApplicationFactory.js
- **Repo Info**: .zencoder/rules/repo.md

---

**Last Updated**: [Date]  
**Status**: 🟡 Ready for Implementation  
**Estimated Effort**: 4 weeks for one person  
**Complexity**: Medium

Good luck! You've got this! 💪