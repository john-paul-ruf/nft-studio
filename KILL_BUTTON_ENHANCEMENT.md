# Kill Button Enhancement - Event Bus Monitor

## Overview
Enhanced the Event Bus Monitor to ensure the kill button is always visible and properly tracks render loop status.

## Problem
The kill button in the Event Bus Monitor was not visible when a render loop was active, making it impossible to stop runaway render processes.

## Solution

### 1. **Always-Visible Kill Button**
- **Previous Behavior**: Kill button only showed when `renderProgress.isRendering || isRenderLoopActive` was true
- **New Behavior**: Kill button is **always visible** in the Event Bus Monitor
- **Visual Feedback**:
  - **Red color (#f44336)**: When render loop is actively running
  - **Orange color (#ff9800)**: When idle (acts as emergency stop)
  - **Pulsing red indicator**: Added to toolbar when rendering is active

### 2. **Enhanced Event Tracking**
Added subscription to `render.loop.start` event to ensure render loop status is properly tracked:
```javascript
unsubscribeRenderLoopStart = EventBusService.subscribe('render.loop.start', (payload) => {
    console.log('🎯 EventBusMonitor: Render loop start event received:', payload);
    setIsRenderLoopActive(true);
}, { component: 'EventBusMonitor' });
```

### 3. **Improved Stop Function**
- **Emergency Stop Capability**: Can now stop workers even when UI thinks nothing is running
- **Event Emission**: Emits `renderloop:toggled` event after stopping to notify other components
- **Better Logging**: Distinguishes between active loop stops and emergency stops

### 4. **Visual Indicators**
Added multiple visual indicators when render loop is active:
- **Pulsing red dot** in toolbar title
- **"RENDERING" label** in toolbar
- **Background color change** in toolbar (subtle red tint)
- **Dynamic tooltip** on kill button showing current state

## Files Modified

### `/src/components/EventBusMonitor.jsx`

#### Changes:
1. **Kill Button (Lines 532-554)**:
   - Moved kill button to be first in toolbar (more prominent)
   - Made always visible (removed conditional rendering)
   - Added dynamic color based on render status
   - Enhanced tooltip with state-aware messages

2. **Event Listeners (Lines 151-155)**:
   - Added `render.loop.start` event subscription
   - Ensures render loop status is tracked from multiple sources

3. **Stop Function (Lines 247-299)**:
   - Removed check that prevented stopping when UI thought nothing was running
   - Added emergency stop capability
   - Emits `renderloop:toggled` event after stopping
   - Better error handling and logging

4. **Visual Indicators (Lines 512-529)**:
   - Added pulsing red indicator dot
   - Added "RENDERING" label
   - Added background color transition
   - Added CSS animation for pulse effect

## Usage

### Normal Operation
1. When render loop starts, kill button turns **red** and toolbar shows **"RENDERING"** with pulsing indicator
2. Click kill button to stop the render loop gracefully
3. Button returns to **orange** when idle

### Emergency Stop
1. If render loop status is not properly tracked, button remains **orange**
2. Click button to force kill all workers
3. Useful for stopping runaway processes that aren't properly tracked

## Testing Recommendations

1. **Start Render Loop**: Verify kill button turns red and shows active state
2. **Stop Render Loop**: Click kill button and verify it stops the loop
3. **Emergency Stop**: Test killing workers when UI state is out of sync
4. **Visual Feedback**: Verify pulsing indicator and color changes work correctly
5. **Event Flow**: Check console logs to ensure events are properly emitted and received

## Event Flow

```
Render Loop Start:
1. User clicks "Start Render Loop"
2. `toolbar:renderloop:toggle` event emitted with isActive: true
3. `render.loop.start` event emitted by RenderCoordinator
4. EventBusMonitor receives both events and sets isRenderLoopActive: true
5. Kill button turns red, toolbar shows "RENDERING"

Render Loop Stop:
1. User clicks kill button
2. killAllWorkers('SIGTERM') called
3. window.api.stopRenderLoop() called
4. `renderloop:toggled` event emitted with isActive: false
5. EventBusMonitor updates state, kill button returns to orange
```

## Benefits

1. **Always Accessible**: Kill button is always available for emergency stops
2. **Clear Visual Feedback**: Multiple indicators show when rendering is active
3. **Robust Tracking**: Multiple event sources ensure status is properly tracked
4. **Emergency Capability**: Can stop processes even when UI state is incorrect
5. **Better UX**: Color-coded button and dynamic tooltips improve usability

## Future Enhancements

1. Add keyboard shortcut for emergency stop (e.g., Ctrl+Shift+K)
2. Add confirmation dialog for emergency stops
3. Show worker count in toolbar when multiple workers are active
4. Add "Force Kill" option with SIGKILL signal for stuck processes