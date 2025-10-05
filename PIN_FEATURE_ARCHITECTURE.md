# Pin Feature Architecture Diagram

## Data Flow: Unpinned vs Pinned Rendering

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          UNPINNED MODE (Normal)                              │
│                     Each render = Different result                           │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Render"
        │
        ▼
┌───────────────────┐
│   Frontend UI     │  Project State (UI Config):
│  ProjectState     │  - effects: [Effect1, Effect2]
└─────────┬─────────┘  - colorScheme: "neon-cyberpunk"
          │            - resolution: "1920x1080"
          │
          ▼
┌───────────────────┐
│  RenderPipeline   │  settingsFile = null
│     Service       │  (no pin active)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   IPC Channel     │  renderFrame(config, frameNumber, null)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  NftProjectManager│  Creates project from config
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ RenderCoordinator │  renderFrame(project, frame, total, name, null)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   my-nft-gen      │  generateSingleFrame(frame, total, true, null)
│   Project.js      │                                            ▲
└─────────┬─────────┘                                            │
          │                                                      │
          ▼                                                      │
┌───────────────────┐                                            │
│   Settings.js     │  NEW Settings({...})                      │
│                   │  generateEffects() ◄─── 🎲 RANDOMIZATION  │
│                   │  - Random positions                        │
│                   │  - Random colors from palette              │
│                   │  - Random effect parameters                │
└─────────┬─────────┘                                            │
          │                                                      │
          ▼                                                      │
┌───────────────────┐                                            │
│  Save to disk     │  /tmp/project-frame-0-settings.json       │
└─────────┬─────────┘                                            │
          │                                                      │
          ▼                                                      │
┌───────────────────┐                                            │
│ RequestNewFrame   │  Render using settings                     │
│  BuilderThread    │                                            │
└─────────┬─────────┘                                            │
          │                                                      │
          ▼                                                      │
    [Image Buffer]                                               │
          │                                                      │
          ▼                                                      │
    Return to UI                                                 │
                                                                 │
    🔄 Next render: REPEAT ENTIRE PROCESS ─────────────────────┘
       (New randomization, different result)


┌─────────────────────────────────────────────────────────────────────────────┐
│                            PINNED MODE                                       │
│                     Each render = Same result                                │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Pin" button
        │
        ▼
┌───────────────────┐
│  Trigger Render   │  (Same as unpinned mode)
└─────────┬─────────┘
          │
          ▼
    [Render happens]
          │
          ▼
┌───────────────────┐
│  Capture Result   │  settingsFile: "/tmp/project-frame-0-settings.json"
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ PinSettingService │  Store settings file path
│                   │  isPinned = true
│                   │  pinnedSettingsFilePath = "/tmp/..."
└───────────────────┘

─────────────────────────────────────────────────────────────────────────────

User clicks "Render" (while pinned)
        │
        ▼
┌───────────────────┐
│   Frontend UI     │  Project State (UI Config):
│  ProjectState     │  - effects: [Effect1, Effect2, Effect3] ◄─ User changed!
└─────────┬─────────┘  - colorScheme: "sunset-vibes"        ◄─ User changed!
          │            - resolution: "3840x2160"            ◄─ User changed!
          │            
          │            ⚠️ UI changes are IGNORED when pinned!
          │
          ▼
┌───────────────────┐
│  RenderPipeline   │  settingsFile = "/tmp/project-frame-0-settings.json"
│     Service       │  (pin is active, get from PinSettingService)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   IPC Channel     │  renderFrame(config, frameNumber, settingsFile)
└─────────┬─────────┘                                        ▲
          │                                                  │
          ▼                                                  │
┌───────────────────┐                                        │
│  NftProjectManager│  Creates project from config           │
└─────────┬─────────┘  (but settings file will override)    │
          │                                                  │
          ▼                                                  │
┌───────────────────┐                                        │
│ RenderCoordinator │  renderFrame(project, frame, total, name, settingsFile)
└─────────┬─────────┘                                        │
          │                                                  │
          ▼                                                  │
┌───────────────────┐                                        │
│   my-nft-gen      │  generateSingleFrame(frame, total, true, settingsFile)
│   Project.js      │                                        │
└─────────┬─────────┘                                        │
          │                                                  │
          ▼                                                  │
┌───────────────────┐                                        │
│  Load from disk   │  Read: /tmp/project-frame-0-settings.json
│                   │                                        │
│  Settings.js      │  ✅ Use EXISTING settings              │
│                   │  ❌ NO generateEffects()               │
│                   │  ❌ NO randomization                   │
│                   │  - Same positions                      │
│                   │  - Same colors                         │
│                   │  - Same effect parameters              │
└─────────┬─────────┘                                        │
          │                                                  │
          ▼                                                  │
┌───────────────────┐                                        │
│ RequestNewFrame   │  Render using loaded settings          │
│  BuilderThread    │                                        │
└─────────┬─────────┘                                        │
          │                                                  │
          ▼                                                  │
    [Image Buffer]                                           │
          │                                                  │
          ▼                                                  │
    Return to UI                                             │
                                                             │
    🔄 Next render: REUSE SAME SETTINGS FILE ───────────────┘
       (No randomization, same result)


┌─────────────────────────────────────────────────────────────────────────────┐
│                          UNPIN ACTION                                        │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Pin" button (to unpin)
        │
        ▼
┌───────────────────┐
│ PinSettingService │  Clear settings file path
│                   │  isPinned = false
│                   │  pinnedSettingsFilePath = null
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Trigger Render   │  (Back to unpinned mode)
└─────────┬─────────┘
          │
          ▼
    [New randomization, different result]
```

---

## Key Differences

### Unpinned Mode
```javascript
// Settings are GENERATED (with randomization)
const settings = new Settings({
    colorScheme: this.colorScheme,
    // ... config from UI
});
await settings.generateEffects(); // 🎲 RANDOMIZATION HAPPENS HERE
```

### Pinned Mode
```javascript
// Settings are LOADED (no randomization)
const settingsContent = await fs.readFile(settingsFile, 'utf8');
const settings = JSON.parse(settingsContent); // ✅ USE EXISTING SETTINGS
// NO generateEffects() call = NO randomization
```

---

## The Critical Path

```
┌──────────────────────────────────────────────────────────────────┐
│  The settings file path MUST flow through the entire pipeline:   │
└──────────────────────────────────────────────────────────────────┘

PinSettingService.pinnedSettingsFilePath
        │
        ▼
RenderPipelineService.performRender(config, frame, settingsFile)
        │
        ▼
window.api.renderFrame(config, frame, settingsFile)
        │
        ▼
IPC: 'render-frame' handler
        │
        ▼
NftProjectManager.renderFrame(projectState, frame, settingsFile)
        │
        ▼
RenderCoordinator.renderFrame(project, frame, total, name, settingsFile)
        │
        ▼
project.generateSingleFrame(frame, total, true, settingsFile)
        │
        ▼
if (settingsFile) {
    // Load existing settings (PINNED)
} else {
    // Generate new settings (UNPINNED)
}
```

---

## State Management

### PinSettingService State
```javascript
{
    isPinnedState: boolean,           // true when pinned
    pinnedSettingsFilePath: string,   // "/tmp/project-frame-0-settings.json"
    pinnedTimestamp: number           // When pin was activated
}
```

### What PinSettingService Does NOT Store
```javascript
// ❌ WRONG - Don't store project state
{
    pinnedSettingsData: { effects: [...], colorScheme: "..." }  // NO!
}

// ✅ CORRECT - Only store settings file path
{
    pinnedSettingsFilePath: "/tmp/project-frame-0-settings.json"  // YES!
}
```

---

## Event Flow

### Pin Action Events
```
User clicks pin
    ↓
'toolbar:pin:toggle' event
    ↓
'toolbar:render' event (trigger render)
    ↓
'render:complete' event (with settingsFile)
    ↓
PinSettingService.pinSettings(settingsFile)
    ↓
'pin:state:changed' event (isPinned: true)
    ↓
UI updates pin button state
```

### Pinned Render Events
```
User clicks render (while pinned)
    ↓
'toolbar:render' event
    ↓
RenderPipelineService checks PinSettingService.isPinned()
    ↓
Gets settingsFile from PinSettingService.getSettingsFilePath()
    ↓
Passes settingsFile through entire pipeline
    ↓
my-nft-gen loads settings file (no randomization)
    ↓
'render:complete' event (same result as before)
```

---

## File System

### Settings File Location
```
/tmp/
  └── project-frame-{randomId}/
      └── project-name-frame-0/
          ├── settings/
          │   └── (empty or metadata)
          └── project-name-frame-0-settings.json  ◄── THIS FILE!
```

### Settings File Content
```json
{
  "config": {
    "finalFileName": "project-name-frame-0",
    "numberOfFrame": 100,
    "workingDirectory": "/tmp/project-frame-123/project-name-frame-0/",
    "frameStart": 0,
    "frameInc": 1
  },
  "colorScheme": ["#FF0000", "#00FF00", "#0000FF"],
  "backgroundColor": "#000000",
  "allPrimaryEffects": [
    {
      "className": "CircleEffect",
      "config": {
        "x": 0.5234,      // ◄── Randomized!
        "y": 0.7891,      // ◄── Randomized!
        "radius": 0.234,  // ◄── Randomized!
        "color": "#FF0000" // ◄── Randomized from palette!
      }
    }
  ]
}
```

This is what gets frozen when you pin!

---

## Summary

**The entire pin feature hinges on one thing:**

> Passing the settings file path from the frontend to `my-nft-gen`'s `generateSingleFrame()` method.

Without this, the pin feature cannot work because:
- my-nft-gen will always generate NEW settings
- Randomization will always happen
- Results will always be different

**That's why the backend modification is the critical first step.**