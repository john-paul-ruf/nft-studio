# Singleton Quick Reference Card

**Pocket Guide for Singleton Management**

---

## 🎯 The 30-Second Version

**Every service, state, and repository should exist exactly once.**

```javascript
// ✅ Always do this
import appFactory from './ApplicationFactory.js';
const myService = appFactory.getMyService();

// ❌ Never do this
import myService from './services/MyService.js';
const newInstance = new MyService();
```

---

## 📋 All Current Singletons

### Core Singletons (ApplicationFactory-managed)
| Name | Access Pattern | Purpose |
|------|----------------|---------|
| ProjectStateManager | `appFactory.getProjectStateManager()` | Core project state |
| RenderPipelineService | `appFactory.getRenderPipelineService()` | Render pipeline |
| PinSettingService | `appFactory.getPinSettingService()` | Pin/lock state |
| CommandService | `appFactory.commandService` | Undo/redo history |
| EventBusService | `appFactory.eventBusService` | Event communication |
| LoggerService | `appFactory.loggerService` | Logging |
| ColorSchemeRepository | `appFactory.getColorSchemeRepository()` | Color schemes |

### Secondary Factories (Managed by FrontendServiceFactory)
| Name | Access Pattern | Status |
|------|----------------|--------|
| ProjectService | `appFactory.getProjectService()` | ✅ Verify singleton |
| EffectService | `appFactory.getEffectService()` | ✅ Verify singleton |
| FileService | `appFactory.getFileService()` | ✅ Verify singleton |
| NavigationService | `appFactory.getNavigationService()` | ✅ Verify singleton |
| ColorSchemeService | `appFactory.getColorSchemeService()` | ✅ Verify singleton |
| PreferencesService | `appFactory.getPreferencesService()` | ✅ Verify singleton |

---

## ✅ Correct Patterns

### Pattern 1: Direct Service Access
```javascript
import appFactory from './ApplicationFactory.js';

// ✅ In components, services, anywhere
const eventBus = appFactory.eventBusService;
const state = appFactory.getProjectStateManager();

// Use them
eventBus.emit('my:event', data);
state.addEffect(effect);
```

### Pattern 2: Context-based (React)
```javascript
import { useContext } from 'react';
import ServiceContext from './contexts/ServiceContext.js';

function MyComponent() {
  // ✅ Services are provided once from ApplicationFactory
  const { eventBusService, projectStateManager } = useContext(ServiceContext);
  
  // Use them
  return <div>{/* ... */}</div>;
}
```

### Pattern 3: Service Injection (if needed)
```javascript
class MyClass {
  constructor(eventBus, logger) {
    this.eventBus = eventBus;
    this.logger = logger;
  }
  
  doSomething() {
    this.eventBus.emit('action:done');
  }
}

// ✅ Instantiate with singletons
const myInstance = new MyClass(
  appFactory.eventBusService,
  appFactory.loggerService
);
```

### Pattern 4: Testing (Create Isolated Instances)
```javascript
import EventBusService from '../services/EventBusService.js';
import ProjectStateManager from '../models/ProjectStateManager.js';

// ✅ In tests, create fresh instances
test('my test', () => {
  const eventBus = new EventBusService();
  const state = new ProjectStateManager();
  
  // Test with isolated instances
  // No risk of pollution from other tests
});
```

---

## ❌ Anti-Patterns (Don't Do These!)

### Anti-Pattern 1: Direct Instantiation in Production
```javascript
// ❌ WRONG - Creates new instance every time
function getService() {
  return new EventBusService();
}

// ❌ WRONG - Direct import and use
import eventBus from './services/EventBusService.js';
```

### Anti-Pattern 2: Re-creating in Components
```javascript
// ❌ WRONG - New instance on each render
function MyComponent() {
  const service = new MyService();
  return <div>{/* ... */}</div>;
}
```

### Anti-Pattern 3: Bypassing Factory
```javascript
// ❌ WRONG - Doesn't use ApplicationFactory
const state1 = new ProjectStateManager();
const state2 = new ProjectStateManager();
// Now you have two separate states! 🔥

// ✅ CORRECT
const state1 = appFactory.getProjectStateManager();
const state2 = appFactory.getProjectStateManager();
// Now they're the same instance ✅
```

### Anti-Pattern 4: Creating in Context Provider
```javascript
// ❌ WRONG
function ServiceProvider({ children }) {
  const services = {
    eventBus: new EventBusService(), // Creates new instance!
    logger: new LoggerService()
  };
  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}

// ✅ CORRECT
function ServiceProvider({ children }) {
  const services = appFactory.createReactContextValue();
  // All services are already singletons from factory
  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}
```

---

## 🚨 Singleton Violations: How to Spot Them

### Red Flag 1: Duplicate Instances
```javascript
const service1 = something();
const service2 = something();

if (service1 !== service2) {
  console.error('🚨 VIOLATION: Two different instances!');
}
```

### Red Flag 2: State Inconsistency
```javascript
// If state changes in one place but not another
appFactory.getProjectStateManager().setTargetResolution('2K');
// But elsewhere it's still '1080p'
// This suggests two different ProjectStateManager instances! 🚨
```

### Red Flag 3: Events Not Firing
```javascript
// If events emitted on one service don't reach listeners on another
const bus1 = somewhere();
const bus2 = somewhere_else();

bus1.emit('test:event');
// But listeners on bus2 don't receive it
// This suggests two different EventBusService instances! 🚨
```

---

## 🔍 How to Debug Singleton Issues

### Technique 1: Identity Check
```javascript
import appFactory from './ApplicationFactory.js';

// In console or debugger:
const s1 = appFactory.getProjectStateManager();
const s2 = appFactory.getProjectStateManager();
console.log(s1 === s2); // Should be true
console.log(Object.is(s1, s2)); // Should be true
```

### Technique 2: Memory Address
```javascript
// If your runtime supports it:
const eventBus = appFactory.eventBusService;
console.log(eventBus); // Look at object reference
console.log(`Instance ID: ${System.identityHashCode(eventBus)}`);

// If you get different IDs in different places, you have two instances!
```

### Technique 3: Add Markers
```javascript
// In your service:
class MyService {
  constructor() {
    this.__id = Math.random();
    console.log(`Created MyService instance: ${this.__id}`);
  }
}

// Then in code:
const s1 = appFactory.getMyService();
console.log(s1.__id); // e.g., 0.123

const s2 = appFactory.getMyService();
console.log(s2.__id); // Should be same: 0.123
// If different, you have two instances!
```

---

## 📝 Checklist: Adding a New Singleton

When you need to add a new singleton service:

- [ ] **Step 1**: Create service class in appropriate directory
  ```javascript
  export class MyNewService {
    constructor() { /* ... */ }
    doSomething() { /* ... */ }
  }
  ```

- [ ] **Step 2**: Decide on instantiation pattern
  - Option A: Export singleton at module level (simpler)
    ```javascript
    export default new MyNewService();
    ```
  - Option B: Create in ApplicationFactory (if needs initialization ordering)
    ```javascript
    // In ApplicationFactory.initialize()
    this.myNewService = new MyNewService();
    ```

- [ ] **Step 3**: Add getter method (if Option B)
  ```javascript
  getMyNewService() {
    this.ensureInitialized();
    return this.myNewService;
  }
  ```

- [ ] **Step 4**: Update ApplicationFactory.createReactContextValue()
  ```javascript
  return {
    // ... existing services
    myNewService: this.getMyNewService(),
  };
  ```

- [ ] **Step 5**: Add JSDoc
  ```javascript
  /**
   * Get MyNewService singleton
   * @returns {MyNewService} Singleton instance
   */
  getMyNewService() { /* ... */ }
  ```

- [ ] **Step 6**: Add test
  ```javascript
  test('MyNewService is singleton', () => {
    const s1 = appFactory.getMyNewService();
    const s2 = appFactory.getMyNewService();
    expect(s1).toBe(s2);
  });
  ```

- [ ] **Step 7**: Document in `.zencoder/rules/repo.md`

- [ ] **Step 8**: Update SINGLETON_INTEGRITY_PLAN.md table

Done! ✅

---

## 🎓 Why Singletons Matter

### Without Singletons (Bad)
```
User Action
  ↓
Component 1 → new EventBusService() → EventBusService #1
                                      (emits events)
  ↓
Component 2 → new EventBusService() → EventBusService #2
                                      (doesn't receive events!)
  ↓
🔥 BROKEN: Events are lost, state is inconsistent
```

### With Singletons (Good)
```
User Action
  ↓
Component 1 → appFactory.getEventBusService() → EventBusService (singleton)
                                                 (emits event)
  ↓
Component 2 → appFactory.getEventBusService() → Same EventBusService
                                                 (receives event!)
  ↓
✅ WORKS: Single source of truth, events flow correctly
```

---

## 🔗 Key Files

- **Main Factory**: `src/ApplicationFactory.js`
- **DependencyContainer**: `src/main/container/DependencyContainer.js`
- **Services**: `src/services/*.js`
- **State**: `src/models/ProjectState.js`
- **Plan**: `project-plans/SINGLETON_INTEGRITY_PLAN.md`

---

## 🆘 Still Confused?

**Quick Rule**: 
> "Never use `new` with a service. Always use `appFactory.getService()` or context."

If you follow that one rule, you'll maintain singleton integrity.

---

**Last Updated**: [Date]  
**Keep This Handy!**