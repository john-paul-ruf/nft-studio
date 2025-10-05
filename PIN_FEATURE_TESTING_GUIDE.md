# Pin Feature - Testing Guide

## Quick Start Testing

### Prerequisites
1. Start the application: `npm start`
2. Open DevTools Console (to see logs)
3. Create or load a project with at least one effect

## Test Scenario 1: Basic Pin/Unpin Flow

### Step 1: Render Without Pin (Unpinned Mode)
1. Click the **Render** button
2. **Expected Logs**:
   ```
   🚀 RenderPipeline: Executing render for frame: 0
   🚀 Settings file: none (unpinned)
   📄 Settings file generated: /tmp/project-frame-xxx/...settings.json
   📄 EventDrivenToolbarActions: Captured settings file from render: /tmp/...
   ```
3. **Expected Result**: Frame renders successfully
4. Note the visual appearance

### Step 2: Render Again (Still Unpinned)
1. Click **Render** button again
2. **Expected Logs**: Different settings file path
3. **Expected Result**: Visual appearance should be DIFFERENT (randomization active)

### Step 3: Pin the Settings
1. Click the **Pin** button (📌 icon in toolbar)
2. **Expected Logs**:
   ```
   📌 EventDrivenToolbarActions: Pinning settings
   📌 EventDrivenToolbarActions: Using settings file from last render: /tmp/...
   Settings pinned successfully
   ```
3. **Expected Result**: Pin button shows active/highlighted state

### Step 4: Render With Pin (Pinned Mode)
1. Click **Render** button
2. **Expected Logs**:
   ```
   📌 RenderPipeline: Using pinned settings file: /tmp/...
   🚀 Settings file: /tmp/... (pinned)
   ```
3. **Expected Result**: Visual appearance should be IDENTICAL to Step 3

### Step 5: Render Again (Still Pinned)
1. Click **Render** button multiple times
2. **Expected Result**: Every render produces IDENTICAL output
3. **Verification**: Randomization is frozen

### Step 6: Unpin the Settings
1. Click the **Pin** button again
2. **Expected Logs**:
   ```
   📌 EventDrivenToolbarActions: Unpinning settings
   Settings unpinned successfully
   ```
3. **Expected Result**: Pin button returns to normal state

### Step 7: Render After Unpin
1. Click **Render** button
2. **Expected Result**: Visual appearance should be DIFFERENT again (randomization active)

## Test Scenario 2: Error Handling

### Test: Pin Without Rendering First
1. Restart the application (fresh state)
2. Click **Pin** button WITHOUT rendering first
3. **Expected Logs**:
   ```
   ❌ EventDrivenToolbarActions: Pin toggle error
   Error: No settings file available. Please render a frame first before pinning.
   ```
4. **Expected Result**: Error message shown, pin state unchanged

## Test Scenario 3: Pin with UI Changes

### Test: Change Effects While Pinned
1. Render a frame (unpinned)
2. Pin the settings
3. Add or remove an effect
4. Render again (pinned)
5. **Expected Result**: 
   - New effect appears/disappears (UI config applied)
   - BUT randomization remains frozen (positions, colors stay same)

### Test: Change Resolution While Pinned
1. Render a frame (unpinned)
2. Pin the settings
3. Change resolution (e.g., 1920x1080 → 1280x720)
4. Render again (pinned)
5. **Expected Result**:
   - Resolution changes (UI config applied)
   - BUT randomization remains frozen

## Test Scenario 4: Render Loop with Pin

### Test: Start Render Loop While Pinned
1. Render a frame (unpinned)
2. Pin the settings
3. Click **Render Loop** button
4. **Expected Logs**:
   ```
   📌 EventDrivenToolbarActions: Starting render loop with pinned settings
   ```
5. **Expected Result**: All frames in loop use same randomization

### Test: Start Render Loop While Unpinned
1. Ensure pin is OFF
2. Click **Render Loop** button
3. **Expected Result**: Each frame has different randomization

## Verification Checklist

### Visual Verification
- [ ] Unpinned renders show different results each time
- [ ] Pinned renders show identical results each time
- [ ] Pin button visual state changes correctly
- [ ] Effects added/removed while pinned work correctly

### Log Verification
- [ ] Settings file paths appear in logs
- [ ] Pin status shows in render logs
- [ ] Settings file capture logs appear after render
- [ ] Error messages appear for invalid operations

### State Verification
- [ ] Pin state persists across multiple renders
- [ ] Unpin correctly clears pin state
- [ ] Pin state resets after app restart (expected behavior)

## Common Issues and Solutions

### Issue: "No settings file available" error when pinning
**Cause**: No render has been performed yet
**Solution**: Render at least one frame before clicking pin

### Issue: Pinned renders still show different results
**Cause**: Backend not using settings file correctly
**Solution**: Check backend logs for settings file loading

### Issue: Pin button doesn't change state
**Cause**: EventBus not emitting pin state change
**Solution**: Check browser console for pin events

### Issue: Settings file path is null
**Cause**: Backend not returning settings file in response
**Solution**: Verify backend changes are applied correctly

## Advanced Testing

### Test Backend Return Format
Open browser console and run:
```javascript
// Test render and check return format
window.api.renderFrame(
  { effects: [], resolution: '1920x1080', numFrames: 1 },
  0
).then(result => {
  console.log('Result structure:', {
    hasSuccess: 'success' in result,
    hasFrameBuffer: 'frameBuffer' in result,
    hasSettingsFile: 'settingsFile' in result,
    settingsFile: result.settingsFile
  });
});
```

### Test Pin Service State
```javascript
// Access pin service (if exposed)
// Check pin state
console.log('Pin state:', {
  isPinned: pinSettingService.isPinned(),
  settingsFile: pinSettingService.getSettingsFilePath(),
  metadata: pinSettingService.getPinMetadata()
});
```

### Monitor EventBus Events
```javascript
// Subscribe to pin events
eventBusService.subscribe('pin:state:changed', (payload) => {
  console.log('Pin state changed:', payload);
});

eventBusService.subscribe('pin:pinned', (payload) => {
  console.log('Settings pinned:', payload);
});

eventBusService.subscribe('pin:unpinned', (payload) => {
  console.log('Settings unpinned:', payload);
});

eventBusService.subscribe('pin:error', (payload) => {
  console.error('Pin error:', payload);
});
```

## Performance Testing

### Test: Render Speed Comparison
1. Measure unpinned render time (generates new settings)
2. Measure pinned render time (loads existing settings)
3. **Expected**: Pinned renders should be slightly faster (no randomization)

### Test: Memory Usage
1. Render 10 frames unpinned (generates 10 settings files)
2. Check `/tmp/` directory for settings files
3. Verify files are cleaned up after render (unpinned mode)
4. Verify files are preserved during pin mode

## Success Criteria

✅ **Feature Works** if:
- Unpinned renders produce different results
- Pinned renders produce identical results
- Pin button state reflects pin status
- Settings file paths appear in logs
- Error handling works correctly
- UI changes apply even when pinned
- Randomization freezes when pinned

❌ **Feature Broken** if:
- Pinned renders still show different results
- Settings file is null or undefined
- Pin button doesn't change state
- Errors occur during normal pin/unpin flow
- Backend doesn't return settings file

## Reporting Issues

When reporting issues, include:
1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Console logs** (especially lines with 📌, 📄, ❌)
5. **Pin state** (pinned/unpinned)
6. **Settings file path** (from logs)

## Next Steps After Testing

1. If tests pass → Feature is ready for production
2. If tests fail → Check implementation against architecture docs
3. Document any edge cases discovered
4. Consider UI improvements (settings file viewer, etc.)

---

**Happy Testing! 🚀**