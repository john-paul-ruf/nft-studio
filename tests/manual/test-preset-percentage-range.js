/**
 * Manual Test: Preset Application with Percentage Ranges
 * 
 * This test verifies that percentage range values are correctly applied
 * when a preset is selected.
 * 
 * To run this test:
 * 1. Start the application: npm run start:dev
 * 2. Open the Effects panel
 * 3. Select an effect with PercentageRange properties (e.g., fuzz-flare)
 * 4. Open the preset dropdown
 * 5. Select a built-in preset
 * 6. Verify in the console that the percentage values are NOT zero
 * 7. Verify that the UI displays the correct percentage values
 * 8. Try to modify the percentage values using the sliders
 * 9. Verify that the changes are reflected in the UI
 * 
 * Expected Console Output:
 * [PresetSelector] Deserialized config: { flareOffset: { lower: {...}, upper: {...} }, ... }
 * [PercentageRangeInput] flareOffset received value: {
 *   valueProp: { lower: { percent: 0.01, side: 'shortest' }, upper: { percent: 0.06, side: 'shortest' } },
 *   currentValue: { lower: { percent: 0.01, side: 'shortest' }, upper: { percent: 0.06, side: 'shortest' } },
 *   lowerPercent: 0.01,
 *   upperPercent: 0.06,
 *   ...
 * }
 * 
 * PASS Criteria:
 * - lowerPercent and upperPercent should NOT be 0 (unless the preset intentionally sets them to 0)
 * - lowerPercent and upperPercent should NOT be undefined
 * - The UI should display the correct percentage values
 * - The sliders should be responsive to user input
 * 
 * FAIL Criteria:
 * - lowerPercent or upperPercent is 0 when it shouldn't be
 * - lowerPercent or upperPercent is undefined
 * - The UI displays 0% for all values
 * - The sliders are unresponsive
 */

console.log('Manual test script loaded. Follow the instructions in the comments above.');