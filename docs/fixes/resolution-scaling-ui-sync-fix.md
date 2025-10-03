# Fix: Resolution Scaling UI Synchronization

## Problem

When a user had an effect configuration dialog open (EffectConfigurer) and changed the resolution using the dropdown, the position values displayed in the UI would not update to reflect the scaled positions. The positions were being scaled correctly in ProjectState, but the UI component wasn't re-syncing with the updated values.

### User-Reported Behavior
- Add an effect with a position set to "Center" at 1920x1080 (position: 960, 540)
- Open the effect configuration dialog
- Change resolution to 1280x720 using the dropdown
- **Expected**: Position should update to (640, 360) to maintain center position
- **Actual**: Position remained at (960, 540) in the UI

## Root Cause

The issue was in the `EffectConfigurer` component's synchronization logic. The component has a `useEffect` hook that syncs its internal `effectConfig` state with the `initialConfig` prop received from ProjectState:

```javascript
useEffect(() => {
    if (initialConfig && Object.keys(initialConfig).length > 0) {
        setEffectConfig(initialConfig);
        // ...
    }
}, [initialConfig, selectedEffect?.registryKey]);
```

The problem: **React's dependency array uses shallow comparison**. When the resolution changed:

1. ✅ ProjectState correctly scaled all positions using `PositionScaler`
2. ✅ ProjectState emitted update event
3. ✅ Canvas component re-rendered
4. ✅ `getEditingEffectData()` retrieved the effect with scaled positions
5. ❌ **BUT** - The `initialConfig` object reference didn't change (even though position values inside changed)
6. ❌ React's `useEffect` didn't detect the change because it uses `Object.is()` for dependency comparison
7. ❌ EffectConfigurer's internal state wasn't updated
8. ❌ PositionInput displayed old unscaled positions

## Solution

Add the resolution as a dependency to the `useEffect` hook so that when resolution changes, the component re-syncs with the scaled positions from ProjectState:

```javascript
// Track resolution changes to detect when positions have been scaled
const currentResolution = projectState ? projectState.getTargetResolution() : null;
const currentOrientation = projectState ? projectState.getIsHorizontal() : null;
const resolutionKey = `${currentResolution}-${currentOrientation}`;

// Sync effectConfig with initialConfig when it changes OR when resolution changes
useEffect(() => {
    if (initialConfig && Object.keys(initialConfig).length > 0) {
        console.log('📋 EffectConfigurer: Syncing with initialConfig (from ProjectState):', initialConfig);
        console.log('📋 EffectConfigurer: Current resolution:', resolutionKey);
        setEffectConfig(initialConfig);
        configRef.current = initialConfig;
        defaultsLoadedForEffect.current = selectedEffect?.registryKey;
    } else if (!initialConfig || Object.keys(initialConfig).length === 0) {
        setEffectConfig({});
        configRef.current = {};
        defaultsLoadedForEffect.current = null;
    }
}, [initialConfig, selectedEffect?.registryKey, resolutionKey]); // Added resolutionKey
```

### How It Works

1. The `resolutionKey` is computed from `targetResolution` and `isHorizontal`
2. When resolution changes, `resolutionKey` changes (e.g., "1080p-true" → "720p-true")
3. React detects the `resolutionKey` dependency change
4. The `useEffect` runs and calls `setEffectConfig(initialConfig)`
5. This triggers a re-render with the fresh scaled positions from ProjectState
6. PositionInput displays the correct scaled positions

## Files Modified

- `/src/components/effects/EffectConfigurer.jsx`
  - Added resolution tracking (lines 104-107)
  - Added `resolutionKey` to useEffect dependencies (line 127)
  - Added logging for resolution changes (line 115)

## Testing

### New Tests Created
- `/tests/unit/resolution-scaling-ui.test.js`
  - `test_effect_configurer_resolution_sync()` - Verifies positions scale correctly
  - `test_resolution_key_trigger()` - Verifies resolution key changes trigger re-sync

### Existing Tests Verified
- All 4 orientation scaling tests pass (100% success rate)
  - `test_orientation_scaling_horizontal_to_vertical`
  - `test_orientation_scaling_vertical_to_horizontal`
  - `test_orientation_scaling_nested_positions`
  - `test_orientation_scaling_square_resolution`

## Impact

### Positive
- ✅ UI now correctly displays scaled positions after resolution changes
- ✅ Positions maintain their relative location (e.g., "center" stays centered)
- ✅ Works for all position types (static positions, arc paths, nested positions)
- ✅ No breaking changes to existing functionality

### Minimal Risk
- The fix only affects the EffectConfigurer component's synchronization logic
- The core position scaling logic in ProjectState/PositionScaler remains unchanged
- All existing tests continue to pass

## Related Components

The fix completes the position scaling chain:

1. **ProjectStateResolution.js** - Detects resolution changes, triggers scaling
2. **PositionScaler.js** - Performs the actual position scaling calculations
3. **ProjectStateCore.js** - Updates state and notifies subscribers
4. **Canvas.jsx** - Re-renders and passes updated config to EffectConfigurer
5. **EffectConfigurer.jsx** - ✅ **NOW PROPERLY RE-SYNCS** with scaled positions
6. **PositionInput.jsx** - Displays the scaled positions to the user

## Future Improvements

While this fix solves the immediate issue, potential enhancements could include:

1. **Deep comparison**: Use a deep comparison library for `initialConfig` instead of relying on resolution key
2. **Immutable updates**: Ensure all position updates create new object references
3. **Visual feedback**: Show a notification when positions are auto-scaled
4. **Undo/redo**: Allow users to revert auto-scaling if needed

## Verification Steps

To verify the fix works:

1. Start the application
2. Add an effect with a position (e.g., Text effect at center)
3. Open the effect configuration dialog
4. Note the current position values
5. Change the resolution using the dropdown
6. Verify the position values update proportionally
7. Verify the effect renders at the correct relative location on canvas

Example:
- Start: 1920x1080, position at center (960, 540)
- Change to: 1280x720
- Expected: Position updates to (640, 360) - still centered
- Verify: Effect renders at center of 1280x720 canvas