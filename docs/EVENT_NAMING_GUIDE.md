# Event Naming Guide

## Standard Event Names

This document defines the standard event names used throughout the NFT Studio application. All events are automatically normalized to these standard names by the `EventCaptureService`.

## Frame Events

### Frame Completed
**Standard Name**: `frameCompleted`

**Accepted Variants** (automatically mapped):
- `frame.complete`
- `frame.render.complete`
- `frameComplete`

**Data Structure**:
```javascript
{
    frameNumber: 0,        // 0-indexed frame number
    totalFrames: 100,      // Total number of frames to render
    renderTime: 1234,      // Time taken to render this frame (ms)
    projectName: "MyProject"
}
```

**Purpose**: Indicates that a frame has completed rendering. Used to update progress bar, calculate FPS and ETA.

---

### Frame Started
**Standard Name**: `frameStarted`

**Accepted Variants** (automatically mapped):
- `frame.start`
- `frame.render.start`
- `frameStart`

**Data Structure**:
```javascript
{
    frameNumber: 0,        // 0-indexed frame number
    totalFrames: 100,      // Total number of frames to render
    projectName: "MyProject"
}
```

**Purpose**: Indicates that a frame has started rendering. Used to track render progress.

---

### Frame Error
**Standard Name**: `frameError`

**Accepted Variants** (automatically mapped):
- `frame.error`
- `frame.render.error`

**Data Structure**:
```javascript
{
    frameNumber: 0,        // 0-indexed frame number
    error: "Error message",
    projectName: "MyProject"
}
```

**Purpose**: Indicates that a frame rendering failed. Used to display error messages and stop progress tracking.

---

## Render Loop Events

### Render Loop Start
**Standard Name**: `render.loop.start`

**No variants** (already standard)

**Data Structure**:
```javascript
{
    timestamp: 1234567890,
    projectName: "MyProject",
    loopId: "loop-123",
    workerId: "worker-456",
    totalFrames: 100
}
```

**Purpose**: Indicates that a render loop has started. Initializes progress tracking.

---

### Render Loop Complete
**Standard Name**: `render.loop.complete`

**No variants** (already standard)

**Data Structure**:
```javascript
{
    timestamp: 1234567890,
    projectName: "MyProject",
    loopId: "loop-123",
    workerId: "worker-456"
}
```

**Purpose**: Indicates that a render loop has completed successfully. Finalizes progress tracking.

---

### Render Loop Error
**Standard Name**: `render.loop.error`

**No variants** (already standard)

**Data Structure**:
```javascript
{
    timestamp: 1234567890,
    projectName: "MyProject",
    loopId: "loop-123",
    workerId: "worker-456",
    error: "Error message"
}
```

**Purpose**: Indicates that a render loop encountered an error. Stops progress tracking and displays error.

---

## Project Events

### Project Resume Start
**Standard Name**: `project.resume.start`

**No variants** (already standard)

**Data Structure**:
```javascript
{
    timestamp: 1234567890,
    projectName: "MyProject",
    settingsPath: "/path/to/settings.json",
    totalFrames: 100
}
```

**Purpose**: Indicates that a project resume operation has started. Initializes progress tracking for resume operations.

---

## How to Emit Events

### From Renderer Process (React Components)

Use the EventBusService:

```javascript
import EventBusService from '../services/EventBusService.js';

EventBusService.emit('frameCompleted', {
    frameNumber: 42,
    totalFrames: 100,
    renderTime: 1234,
    projectName: 'MyProject'
});
```

### From Main Process (Node.js)

Use the RenderCoordinator's emitProgressEvent method:

```javascript
this.emitProgressEvent('frameCompleted', {
    frameNumber: 42,
    totalFrames: 100,
    renderTime: 1234,
    projectName: 'MyProject'
});
```

Or emit directly to the event bus:

```javascript
eventBus.emit('frameCompleted', {
    frameNumber: 42,
    totalFrames: 100,
    renderTime: 1234,
    projectName: 'MyProject'
});
```

### From my-nft-gen Library

The my-nft-gen library can emit events using any of the accepted variants. They will be automatically normalized:

```javascript
// Any of these will work:
eventBus.emit('frame.complete', data);
eventBus.emit('frame.render.complete', data);
eventBus.emit('frameComplete', data);
eventBus.emit('frameCompleted', data);  // Preferred
```

---

## Adding New Event Name Variants

If you need to add support for a new event name variant:

1. Open `src/services/EventCaptureService.js`
2. Find the `normalizeEventData()` method
3. Add your mapping to the `eventNameMap` object:

```javascript
const eventNameMap = {
    // ... existing mappings ...
    'your.new.variant': 'standardEventName',
};
```

4. Add a test case in `tests/unit/EventCaptureService.test.js`
5. Run the tests to verify: `node tests/unit/EventCaptureService.test.js`

---

## Event Categories

Events are automatically categorized by the `EventFilterService`:

- **FRAME**: Frame-related events (frameCompleted, frameStarted, frameError)
- **RENDER**: Render loop events (render.loop.start, render.loop.complete, render.loop.error)
- **PROJECT**: Project-related events (project.resume.start, project.created, etc.)
- **WORKER**: Worker-related events (workerStarted, workerKilled, etc.)
- **PLUGIN**: Plugin-related events (plugin:loaded, plugin:loadError, etc.)
- **CUSTOM**: All other events

---

## Best Practices

### DO:
✅ Use standard event names when emitting events  
✅ Include all required data fields  
✅ Use consistent data structures  
✅ Add timestamps to events  
✅ Include projectName for context  

### DON'T:
❌ Create new event name variants without updating the mapping  
❌ Emit events with missing required fields  
❌ Use inconsistent data structures  
❌ Forget to document new event types  

---

## Debugging Events

### View All Events
Open the Event Bus Monitor in the application to see all events in real-time.

### Console Logging
Event name mappings are logged to the console:
```
🔄 EventCaptureService: Mapped event name 'frame.complete' → 'frameCompleted'
```

### Event Buffer
Access the event buffer programmatically:
```javascript
import EventCaptureService from './services/EventCaptureService.js';

const events = EventCaptureService.getBufferedEvents();
console.log('Recent events:', events);
```

---

## Related Documentation

- [Progress Bar Fix](./PROGRESS_BAR_FIX.md) - Details on the event name normalization fix
- Event Bus Architecture - See `src/services/EventCaptureService.js`
- Progress Tracking - See `src/services/RenderProgressTracker.js`

---

## Questions?

If you have questions about event naming or need to add support for new event types, please:

1. Check this guide first
2. Review the `EventCaptureService` implementation
3. Look at existing event emissions in the codebase
4. Add tests for new event types