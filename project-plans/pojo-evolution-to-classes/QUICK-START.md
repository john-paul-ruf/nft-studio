# POJO to Classes - Quick Start Guide

**For**: Developers ready to start implementation  
**Time to Read**: 5 minutes  
**Prerequisites**: Read README.md first

---

## 🚀 Start Here

### Step 1: Verify Environment (2 minutes)

```bash
# Navigate to project root
cd /Users/the.phoenix/WebstormProjects/nft-studio

# Verify tests pass
npm test

# Expected output:
# ✅ 253 tests passed
# ❌ 0 tests failed
# Success Rate: 100.0%
```

**If tests fail**: Fix existing issues before proceeding.

### Step 2: Create Feature Branch (1 minute)

```bash
# Create and checkout feature branch
git checkout -b feature/pojo-to-classes

# Verify branch
git branch
# Should show: * feature/pojo-to-classes
```

### Step 3: Create First File (5 minutes)

Create `/src/models/Effect.js`:

```javascript
/**
 * Effect - Base class for all NFT effects
 * 
 * Represents a single effect in the NFT generation pipeline.
 * Effects can be primary, secondary, or final image effects.
 * 
 * @class
 * @example
 * const effect = new Effect({
 *     id: 'effect_123',
 *     name: 'amp',
 *     className: 'AmpEffect',
 *     registryKey: 'amp',
 *     config: { intensity: 50 },
 *     type: 'primary'
 * });
 */
export class Effect {
    /**
     * Create an Effect
     * @param {Object} params - Effect parameters
     * @param {string} params.id - Unique identifier
     * @param {string} params.name - Effect name (e.g., 'amp', 'glow')
     * @param {string} params.className - Effect class name (e.g., 'AmpEffect')
     * @param {string} params.registryKey - Registry lookup key
     * @param {Object} params.config - Effect configuration object
     * @param {string} params.type - Effect type ('primary', 'secondary', 'finalImage', 'specialty', 'keyframe')
     * @param {number} [params.percentChance=100] - Application probability (0-100)
     * @param {boolean} [params.visible=true] - UI visibility flag
     * @param {Array<Effect>} [params.secondaryEffects=[]] - Secondary effects
     * @param {Array<Effect>} [params.keyframeEffects=[]] - Keyframe effects
     * @throws {Error} If required parameters are missing or invalid
     */
    constructor({
        id,
        name,
        className,
        registryKey,
        config,
        type,
        percentChance = 100,
        visible = true,
        secondaryEffects = [],
        keyframeEffects = []
    }) {
        // Validation
        if (!id) throw new Error('Effect requires an id');
        if (!name) throw new Error('Effect requires a name');
        if (!type) throw new Error('Effect requires a type');
        if (!config) throw new Error('Effect requires a config');
        
        if (percentChance < 0 || percentChance > 100) {
            throw new Error('percentChance must be between 0 and 100');
        }
        
        const validTypes = ['primary', 'secondary', 'finalImage', 'specialty', 'keyframe'];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid effect type: ${type}. Must be one of: ${validTypes.join(', ')}`);
        }

        // Core identity
        this.id = id;
        this.name = name;
        this.className = className || name;
        this.registryKey = registryKey || name;
        
        // Configuration
        this.config = config;
        this.type = type;
        
        // Behavior modifiers
        this.percentChance = percentChance;
        this.visible = visible;
        
        // Nested effects
        this.secondaryEffects = secondaryEffects;
        this.keyframeEffects = keyframeEffects;
    }

    /**
     * Create Effect from plain object (POJO)
     * @param {Object} pojo - Plain object
     * @returns {Effect} Effect instance
     * @throws {Error} If pojo is null or undefined
     * @static
     * @example
     * const pojo = { id: '123', name: 'amp', type: 'primary', config: {} };
     * const effect = Effect.fromPOJO(pojo);
     */
    static fromPOJO(pojo) {
        if (!pojo) {
            throw new Error('Cannot create Effect from null or undefined');
        }
        
        return new Effect({
            id: pojo.id,
            name: pojo.name,
            className: pojo.className,
            registryKey: pojo.registryKey,
            config: pojo.config,
            type: pojo.type,
            percentChance: pojo.percentChance,
            visible: pojo.visible,
            secondaryEffects: (pojo.secondaryEffects || []).map(e => 
                e instanceof Effect ? e : Effect.fromPOJO(e)
            ),
            keyframeEffects: (pojo.keyframeEffects || []).map(e => 
                e instanceof Effect ? e : Effect.fromPOJO(e)
            )
        });
    }

    /**
     * Convert Effect to plain object (POJO)
     * @returns {Object} Plain object representation
     * @example
     * const effect = new Effect({ id: '123', name: 'amp', type: 'primary', config: {} });
     * const pojo = effect.toPOJO();
     * // pojo = { id: '123', name: 'amp', ... }
     */
    toPOJO() {
        return {
            id: this.id,
            name: this.name,
            className: this.className,
            registryKey: this.registryKey,
            config: this.config,
            type: this.type,
            percentChance: this.percentChance,
            visible: this.visible,
            secondaryEffects: this.secondaryEffects.map(e => 
                e.toPOJO ? e.toPOJO() : e
            ),
            keyframeEffects: this.keyframeEffects.map(e => 
                e.toPOJO ? e.toPOJO() : e
            )
        };
    }

    /**
     * Create a deep clone of this effect
     * @returns {Effect} Cloned effect with new ID
     * @example
     * const original = new Effect({ id: '123', name: 'amp', type: 'primary', config: {} });
     * const clone = original.clone();
     * // clone.id !== original.id
     */
    clone() {
        return new Effect({
            ...this.toPOJO(),
            id: `${this.id}_clone_${Date.now()}_${Math.random()}`
        });
    }

    /**
     * Validate effect structure
     * @returns {{isValid: boolean, errors: string[]}} Validation result
     * @example
     * const effect = new Effect({ id: '123', name: 'amp', type: 'primary', config: {} });
     * const validation = effect.validate();
     * if (!validation.isValid) {
     *     console.error('Validation errors:', validation.errors);
     * }
     */
    validate() {
        const errors = [];
        
        if (!this.id) errors.push('Missing id');
        if (!this.name) errors.push('Missing name');
        if (!this.type) errors.push('Missing type');
        if (!this.config) errors.push('Missing config');
        
        const validTypes = ['primary', 'secondary', 'finalImage', 'specialty', 'keyframe'];
        if (!validTypes.includes(this.type)) {
            errors.push(`Invalid type: ${this.type}`);
        }
        
        if (this.percentChance < 0 || this.percentChance > 100) {
            errors.push('percentChance must be between 0 and 100');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Update effect configuration
     * @param {Object} configUpdates - Configuration updates to apply
     * @example
     * effect.updateConfig({ intensity: 75 });
     */
    updateConfig(configUpdates) {
        this.config = { ...this.config, ...configUpdates };
    }

    /**
     * Check if effect has secondary effects
     * @returns {boolean} True if effect has secondary effects
     * @example
     * if (effect.hasSecondaryEffects()) {
     *     console.log('Effect has secondary effects');
     * }
     */
    hasSecondaryEffects() {
        return this.secondaryEffects && this.secondaryEffects.length > 0;
    }

    /**
     * Check if effect has keyframe effects
     * @returns {boolean} True if effect has keyframe effects
     * @example
     * if (effect.hasKeyframeEffects()) {
     *     console.log('Effect has keyframe effects');
     * }
     */
    hasKeyframeEffects() {
        return this.keyframeEffects && this.keyframeEffects.length > 0;
    }
}
```

### Step 4: Create First Test (10 minutes)

Create `/tests/unit/Effect.test.js`:

```javascript
/**
 * Effect Class Tests
 * 
 * Tests for the Effect class implementation
 */

import { Effect } from '../../src/models/Effect.js';

// Test 1: Constructor Validation
function testConstructorValidation() {
    console.log('📝 Test 1: Constructor Validation');
    
    try {
        // Valid effect creation
        const validEffect = new Effect({
            id: 'test-id',
            name: 'test-effect',
            className: 'TestEffect',
            registryKey: 'test-effect',
            config: { intensity: 50 },
            type: 'primary'
        });
        
        if (!validEffect.id) throw new Error('Valid effect creation failed');
        if (validEffect.percentChance !== 100) throw new Error('Default percentChance not applied');
        if (validEffect.visible !== true) throw new Error('Default visible not applied');
        
        // Missing required property - id
        try {
            new Effect({ name: 'test', type: 'primary', config: {} });
            throw new Error('Should have thrown error for missing id');
        } catch (error) {
            if (!error.message.includes('id')) {
                throw new Error('Wrong error message for missing id');
            }
        }
        
        // Missing required property - name
        try {
            new Effect({ id: 'test', type: 'primary', config: {} });
            throw new Error('Should have thrown error for missing name');
        } catch (error) {
            if (!error.message.includes('name')) {
                throw new Error('Wrong error message for missing name');
            }
        }
        
        // Invalid percentChance
        try {
            new Effect({
                id: 'test',
                name: 'test',
                type: 'primary',
                config: {},
                percentChance: 150
            });
            throw new Error('Should have thrown error for invalid percentChance');
        } catch (error) {
            if (!error.message.includes('percentChance')) {
                throw new Error('Wrong error message for invalid percentChance');
            }
        }
        
        // Invalid type
        try {
            new Effect({
                id: 'test',
                name: 'test',
                type: 'invalid-type',
                config: {}
            });
            throw new Error('Should have thrown error for invalid type');
        } catch (error) {
            if (!error.message.includes('type')) {
                throw new Error('Wrong error message for invalid type');
            }
        }
        
        console.log('✅ Constructor validation test passed');
        return true;
    } catch (error) {
        console.error('❌ Constructor validation test failed:', error.message);
        return false;
    }
}

// Test 2: Serialization
function testSerialization() {
    console.log('📝 Test 2: Serialization');
    
    try {
        const original = new Effect({
            id: 'test-id',
            name: 'test-effect',
            className: 'TestEffect',
            registryKey: 'test-effect',
            config: { intensity: 50 },
            type: 'primary',
            percentChance: 75,
            visible: true
        });
        
        // Convert to POJO
        const pojo = original.toPOJO();
        if (typeof pojo !== 'object') {
            throw new Error('toPOJO() should return object');
        }
        if (pojo.id !== 'test-id') {
            throw new Error('POJO missing id');
        }
        if (pojo.percentChance !== 75) {
            throw new Error('POJO missing percentChance');
        }
        
        // Convert back to Effect
        const restored = Effect.fromPOJO(pojo);
        if (!(restored instanceof Effect)) {
            throw new Error('fromPOJO() should return Effect instance');
        }
        if (restored.id !== original.id) {
            throw new Error('Round-trip serialization failed - id mismatch');
        }
        if (restored.percentChance !== original.percentChance) {
            throw new Error('Round-trip serialization failed - percentChance mismatch');
        }
        
        console.log('✅ Serialization test passed');
        return true;
    } catch (error) {
        console.error('❌ Serialization test failed:', error.message);
        return false;
    }
}

// Test 3: Methods
function testMethods() {
    console.log('📝 Test 3: Methods');
    
    try {
        const effect = new Effect({
            id: 'test-id',
            name: 'test-effect',
            type: 'primary',
            config: { intensity: 50 }
        });
        
        // Test clone()
        const cloned = effect.clone();
        if (cloned.id === effect.id) {
            throw new Error('Clone should have different id');
        }
        if (cloned.name !== effect.name) {
            throw new Error('Clone should have same name');
        }
        
        // Test validate()
        const validation = effect.validate();
        if (!validation.isValid) {
            throw new Error('Valid effect should pass validation');
        }
        if (validation.errors.length !== 0) {
            throw new Error('Valid effect should have no errors');
        }
        
        // Test updateConfig()
        effect.updateConfig({ intensity: 75 });
        if (effect.config.intensity !== 75) {
            throw new Error('updateConfig() should update config');
        }
        
        // Test hasSecondaryEffects()
        if (effect.hasSecondaryEffects()) {
            throw new Error('Effect without secondary effects should return false');
        }
        
        // Test hasKeyframeEffects()
        if (effect.hasKeyframeEffects()) {
            throw new Error('Effect without keyframe effects should return false');
        }
        
        console.log('✅ Methods test passed');
        return true;
    } catch (error) {
        console.error('❌ Methods test failed:', error.message);
        return false;
    }
}

// Run tests
console.log('🧪 Starting Effect Class Tests...\n');

const results = [
    testConstructorValidation(),
    testSerialization(),
    testMethods()
];

const passed = results.filter(r => r).length;
const total = results.length;

console.log(`\n📊 Test Results: ${passed}/${total} passed`);

if (passed === total) {
    console.log('✅ All Effect class tests passed!');
    process.exit(0);
} else {
    console.log('❌ Some Effect class tests failed');
    process.exit(1);
}
```

### Step 5: Run Your Test (1 minute)

```bash
# Run your new test
node tests/unit/Effect.test.js

# Expected output:
# 🧪 Starting Effect Class Tests...
# 📝 Test 1: Constructor Validation
# ✅ Constructor validation test passed
# 📝 Test 2: Serialization
# ✅ Serialization test passed
# 📝 Test 3: Methods
# ✅ Methods test passed
# 📊 Test Results: 3/3 passed
# ✅ All Effect class tests passed!
```

### Step 6: Commit Your Work (1 minute)

```bash
# Stage files
git add src/models/Effect.js
git add tests/unit/Effect.test.js

# Commit
git commit -m "Phase 1: Create Effect class with validation and tests"

# Verify commit
git log -1
```

---

## ✅ Checkpoint: Phase 1 Started

**You've completed**:
- ✅ Created Effect class
- ✅ Created Effect tests
- ✅ Tests passing
- ✅ First commit made

**Next steps**:
1. Create ProjectConfig class (similar to Effect)
2. Create ProjectConfig tests
3. Run full test suite to ensure no regressions

---

## 🎯 Next File: ProjectConfig Class

Create `/src/models/ProjectConfig.js`:

```javascript
/**
 * ProjectConfig - Project configuration model
 * 
 * Represents the complete configuration for an NFT project.
 * 
 * @class
 */
export class ProjectConfig {
    /**
     * Create a ProjectConfig
     * @param {Object} params - Project parameters
     * @param {string} [params.projectName='Untitled Project'] - Project name
     * @param {string} [params.artist=''] - Artist name
     * @param {number} [params.targetResolution=1080] - Target resolution (height in pixels)
     * @param {boolean} [params.isHorizontal=false] - Orientation flag
     * @param {number} [params.numFrames=1] - Number of frames
     * @param {Array<Effect>} [params.effects=[]] - Effects array
     * @param {string} [params.colorScheme=''] - Color scheme name
     * @param {Object} [params.colorSchemeData={}] - Color scheme data
     */
    constructor({
        projectName = 'Untitled Project',
        artist = '',
        targetResolution = 1080,
        isHorizontal = false,
        numFrames = 1,
        effects = [],
        colorScheme = '',
        colorSchemeData = {}
    } = {}) {
        // Validation
        if (targetResolution < 1) {
            throw new Error('targetResolution must be at least 1');
        }
        if (numFrames < 1) {
            throw new Error('numFrames must be at least 1');
        }
        
        this.projectName = projectName;
        this.artist = artist;
        this.targetResolution = targetResolution;
        this.isHorizontal = isHorizontal;
        this.numFrames = numFrames;
        this.effects = effects;
        this.colorScheme = colorScheme;
        this.colorSchemeData = colorSchemeData;
    }

    /**
     * Create ProjectConfig from plain object
     * @param {Object} pojo - Plain object
     * @returns {ProjectConfig}
     * @static
     */
    static fromPOJO(pojo) {
        if (!pojo) {
            throw new Error('Cannot create ProjectConfig from null or undefined');
        }
        
        // Import Effect class dynamically to avoid circular dependency
        return new ProjectConfig({
            projectName: pojo.projectName,
            artist: pojo.artist,
            targetResolution: pojo.targetResolution,
            isHorizontal: pojo.isHorizontal,
            numFrames: pojo.numFrames,
            effects: pojo.effects || [],
            colorScheme: pojo.colorScheme,
            colorSchemeData: pojo.colorSchemeData
        });
    }

    /**
     * Convert to plain object
     * @returns {Object}
     */
    toPOJO() {
        return {
            projectName: this.projectName,
            artist: this.artist,
            targetResolution: this.targetResolution,
            isHorizontal: this.isHorizontal,
            numFrames: this.numFrames,
            effects: this.effects.map(e => e.toPOJO ? e.toPOJO() : e),
            colorScheme: this.colorScheme,
            colorSchemeData: this.colorSchemeData
        };
    }

    /**
     * Validate project configuration
     * @returns {{isValid: boolean, errors: string[]}}
     */
    validate() {
        const errors = [];
        
        if (!this.projectName) errors.push('Project name is required');
        if (this.targetResolution < 1) errors.push('Invalid target resolution');
        if (this.numFrames < 1) errors.push('Number of frames must be at least 1');
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
```

---

## 📋 Daily Checklist

Use this checklist each day:

### Morning
- [ ] Pull latest changes: `git pull origin main`
- [ ] Checkout feature branch: `git checkout feature/pojo-to-classes`
- [ ] Run tests to verify baseline: `npm test`

### During Development
- [ ] Make small, incremental changes
- [ ] Run tests after each change: `npm test`
- [ ] Commit frequently with descriptive messages

### End of Day
- [ ] Run full test suite: `npm test`
- [ ] Commit all work: `git commit -am "End of day commit: [description]"`
- [ ] Push to remote: `git push origin feature/pojo-to-classes`
- [ ] Update progress in CURRENT-STATE.md

---

## 🆘 Troubleshooting

### Tests Failing?

```bash
# Run specific test
node tests/unit/Effect.test.js

# Check for syntax errors
npm run build

# Verify imports
node -e "import('./src/models/Effect.js').then(m => console.log(m))"
```

### Import Errors?

Make sure you're using ES6 module syntax:
```javascript
// ✅ Correct
import { Effect } from './Effect.js';

// ❌ Wrong
const { Effect } = require('./Effect.js');
```

### Git Issues?

```bash
# Check current branch
git branch

# Check status
git status

# Discard changes (if needed)
git checkout -- <file>
```

---

## 📞 Need Help?

1. **Check PROJECT-PLAN.md** for detailed implementation steps
2. **Check CURRENT-STATE.md** for architecture context
3. **Review existing tests** in `/tests/unit/` for patterns
4. **Check git history** for similar changes: `git log --oneline`

---

## 🎉 You're Ready!

You now have:
- ✅ Effect class implemented
- ✅ Tests passing
- ✅ First commit made
- ✅ Understanding of workflow

**Next**: Continue with ProjectConfig class, then move to Phase 2 (Service Integration).

**Remember**: Small, incremental changes with continuous testing!

---

**Good luck! 🚀**