#!/usr/bin/env node
/**
 * Debug test for Canvas.jsx rendering behavior
 * Tests the frontend render logic and state management
 */

const fs = require('fs');

class CanvasRenderDebugTest {
    constructor() {
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
    }

    test(description, testFn) {
        this.testCount++;
        try {
            testFn();
            console.log(`✅ PASS: ${description}`);
            this.passedTests++;
        } catch (error) {
            console.log(`❌ FAIL: ${description}`);
            console.log(`   Error: ${error.message}`);
            this.failedTests++;
        }
    }

    assertTrue(condition, message = '') {
        if (!condition) {
            throw new Error(`${message} - Expected truthy value`);
        }
    }

    assertExists(value, message = '') {
        if (value === null || value === undefined) {
            throw new Error(`${message} - Expected value to exist`);
        }
    }

    async analyzeCanvasComponent() {
        console.log('\n🔍 Analyzing Canvas.jsx Component...');

        this.test('should read Canvas.jsx file', () => {
            const canvasPath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/pages/Canvas.jsx';
            this.assertTrue(fs.existsSync(canvasPath), 'Canvas.jsx should exist');

            const content = fs.readFileSync(canvasPath, 'utf8');
            this.assertTrue(content.length > 0, 'Canvas.jsx should have content');

            console.log(`   ✅ Canvas.jsx found (${content.length} characters)`);
        });

        this.test('should analyze render function logic', () => {
            const canvasPath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/pages/Canvas.jsx';
            const content = fs.readFileSync(canvasPath, 'utf8');

            // Check for render function
            const hasRenderFunction = content.includes('const handleRender') || content.includes('handleRender');
            this.assertTrue(hasRenderFunction, 'Should have handleRender function');

            // Check for state management
            const hasIsRendering = content.includes('isRendering');
            const hasSetIsRendering = content.includes('setIsRendering');
            const hasRenderResult = content.includes('renderResult');
            const hasSetRenderResult = content.includes('setRenderResult');

            this.assertTrue(hasIsRendering && hasSetIsRendering, 'Should have isRendering state');
            this.assertTrue(hasRenderResult && hasSetRenderResult, 'Should have renderResult state');

            console.log(`   ✅ State management found: isRendering=${hasIsRendering}, renderResult=${hasRenderResult}`);

            // Check for error handling
            const hasErrorHandling = content.includes('catch') && content.includes('error');
            this.assertTrue(hasErrorHandling, 'Should have error handling');

            console.log(`   ✅ Error handling found: ${hasErrorHandling}`);
        });

        this.test('should analyze IPC call structure', () => {
            const canvasPath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/pages/Canvas.jsx';
            const content = fs.readFileSync(canvasPath, 'utf8');

            // Check for window.api.renderFrame call
            const hasRenderFrameCall = content.includes('window.api.renderFrame');
            this.assertTrue(hasRenderFrameCall, 'Should call window.api.renderFrame');

            // Check for result handling
            const hasResultSuccess = content.includes('result.success');
            const hasFrameBuffer = content.includes('result.frameBuffer') || content.includes('frameBuffer');

            this.assertTrue(hasResultSuccess, 'Should check result.success');
            this.assertTrue(hasFrameBuffer, 'Should handle frameBuffer');

            console.log(`   ✅ IPC structure found: renderFrame=${hasRenderFrameCall}, success=${hasResultSuccess}, buffer=${hasFrameBuffer}`);

            // Extract the exact IPC call for analysis
            const renderFrameMatch = content.match(/const result = await window\.api\.renderFrame\([^)]*\);/);
            if (renderFrameMatch) {
                console.log(`   📋 IPC call: ${renderFrameMatch[0]}`);
            }

            // Extract result handling logic
            const resultHandlingMatch = content.match(/if \(result\.success[^}]*\}/s);
            if (resultHandlingMatch) {
                console.log(`   📋 Result handling: ${resultHandlingMatch[0].substring(0, 200)}...`);
            }
        });

        this.test('should analyze image display logic', () => {
            const canvasPath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/pages/Canvas.jsx';
            const content = fs.readFileSync(canvasPath, 'utf8');

            // Check for image rendering in JSX
            const hasImageDisplay = content.includes('<img') || content.includes('src=');
            const hasCanvasDisplay = content.includes('<canvas') || content.includes('canvas');

            console.log(`   📊 Display methods: img=${hasImageDisplay}, canvas=${hasCanvasDisplay}`);

            // Check for base64 or blob URL creation
            const hasBase64 = content.includes('data:image') || content.includes('base64');
            const hasBlobURL = content.includes('createObjectURL') || content.includes('URL.createObjectURL');

            console.log(`   📊 Image formats: base64=${hasBase64}, blob=${hasBlobURL}`);

            // Look for image source assignment
            const srcAssignmentMatch = content.match(/src=\{[^}]*\}/g);
            if (srcAssignmentMatch) {
                console.log(`   📋 Image src assignments: ${srcAssignmentMatch.join(', ')}`);
            }

            this.assertTrue(hasImageDisplay || hasCanvasDisplay, 'Should have some image display method');
        });
    }

    async identifyPotentialIssues() {
        console.log('\n🔍 Identifying Potential Issues...');

        this.test('should identify async/await issues', () => {
            const canvasPath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/pages/Canvas.jsx';
            const content = fs.readFileSync(canvasPath, 'utf8');

            // Check if handleRender is async
            const isHandleRenderAsync = content.includes('async') && content.includes('handleRender');
            console.log(`   📊 handleRender is async: ${isHandleRenderAsync}`);

            // Check for proper await usage
            const hasAwaitRenderFrame = content.includes('await window.api.renderFrame');
            console.log(`   📊 Uses await for renderFrame: ${hasAwaitRenderFrame}`);

            // Check for finally block to reset rendering state
            const hasFinallyBlock = content.includes('finally') && content.includes('setIsRendering(false)');
            console.log(`   📊 Has finally block to reset rendering state: ${hasFinallyBlock}`);

            if (!hasFinallyBlock) {
                console.log(`   ⚠️  POTENTIAL ISSUE: No finally block - rendering state might stick if error occurs`);
            }

            this.assertTrue(true, 'Async patterns analyzed');
        });

        this.test('should identify state update issues', () => {
            const canvasPath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/pages/Canvas.jsx';
            const content = fs.readFileSync(canvasPath, 'utf8');

            // Check for setIsRendering(true) at start
            const setsRenderingTrue = content.includes('setIsRendering(true)');
            console.log(`   📊 Sets isRendering(true) at start: ${setsRenderingTrue}`);

            // Check for setIsRendering(false) at end
            const setsRenderingFalse = content.includes('setIsRendering(false)');
            console.log(`   📊 Sets isRendering(false) at end: ${setsRenderingFalse}`);

            // Check for setRenderResult call
            const setsRenderResult = content.includes('setRenderResult');
            console.log(`   📊 Sets render result: ${setsRenderResult}`);

            if (!setsRenderingTrue || !setsRenderingFalse) {
                console.log(`   ⚠️  POTENTIAL ISSUE: Incomplete rendering state management`);
            }

            this.assertTrue(true, 'State update patterns analyzed');
        });

        this.test('should identify buffer format issues', () => {
            const canvasPath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/pages/Canvas.jsx';
            const content = fs.readFileSync(canvasPath, 'utf8');

            // Check what happens with frameBuffer
            const frameBufferUsage = content.match(/result\.frameBuffer[^;]*/g);
            if (frameBufferUsage) {
                console.log(`   📋 frameBuffer usage: ${frameBufferUsage.join(', ')}`);
            }

            // Check for buffer processing
            const hasBufferProcessing = content.includes('Buffer') || content.includes('Uint8Array') || content.includes('base64');
            console.log(`   📊 Has buffer processing: ${hasBufferProcessing}`);

            // Our test shows renderFrame returns a frameBuffer - check if Canvas handles it correctly
            if (!hasBufferProcessing) {
                console.log(`   ⚠️  POTENTIAL ISSUE: No buffer processing - frameBuffer might not be converted to displayable format`);
            }

            this.assertTrue(true, 'Buffer format handling analyzed');
        });
    }

    async generateFixRecommendations() {
        console.log('\n💡 Generating Fix Recommendations...');

        this.test('should provide actionable fix suggestions', () => {
            console.log('\n   🔧 RECOMMENDATIONS BASED ON ANALYSIS:');
            console.log('\n   1. CHECK BROWSER CONSOLE:');
            console.log('      - Open DevTools when clicking render');
            console.log('      - Look for JavaScript errors');
            console.log('      - Check network tab for failed IPC calls');

            console.log('\n   2. VERIFY STATE UPDATES:');
            console.log('      - Add console.log to handleRender function');
            console.log('      - Log isRendering state changes');
            console.log('      - Log result.success and result.frameBuffer');

            console.log('\n   3. CHECK BUFFER CONVERSION:');
            console.log('      - frameBuffer from backend might need conversion');
            console.log('      - May need Buffer.from() or base64 encoding');
            console.log('      - Check if frameBuffer is actually image data');

            console.log('\n   4. VERIFY IMAGE DISPLAY:');
            console.log('      - Check if image src is being set correctly');
            console.log('      - Verify image element exists in DOM');
            console.log('      - Test with a known working image');

            console.log('\n   5. IPC COMMUNICATION:');
            console.log('      - Verify window.api.renderFrame is available');
            console.log('      - Check if IPC handler is properly registered');
            console.log('      - Test IPC call with simpler data');

            this.assertTrue(true, 'Fix recommendations generated');
        });
    }

    async runAllTests() {
        console.log('🚀 Running Canvas Render Debug Tests...\n');
        console.log('This will analyze the frontend Canvas component to identify rendering state issues.');

        try {
            await this.analyzeCanvasComponent();
            await this.identifyPotentialIssues();
            await this.generateFixRecommendations();

            console.log('\n📊 Debug Analysis Results:');
            console.log(`   Total: ${this.testCount}`);
            console.log(`   Passed: ${this.passedTests}`);
            console.log(`   Failed: ${this.failedTests}`);

            console.log('\n🏁 Canvas Debug Analysis Complete!');
            console.log('Since backend rendering works, the issue is likely in the frontend.');
            console.log('Follow the recommendations above to identify the specific problem.');

            return {
                total: this.testCount,
                passed: this.passedTests,
                failed: this.failedTests
            };

        } catch (error) {
            console.log(`❌ Canvas debug analysis failed: ${error.message}`);
            this.failedTests++;
            throw error;
        }
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    const tests = new CanvasRenderDebugTest();
    tests.runAllTests().then(results => {
        console.log('\n✅ Frontend analysis complete!');
        console.log('Next step: Test the actual Canvas.jsx component in the running app.');
        process.exit(0);
    }).catch(error => {
        console.error('Canvas debug analysis failed:', error);
        process.exit(1);
    });
}

module.exports = CanvasRenderDebugTest;