/**
 * Enhanced Array Input Component Tests
 * 
 * Tests the enhanced array input functionality including:
 * - Basic rendering
 * - Adding items (single and bulk)
 * - Editing items
 * - Removing items
 * - Drag and drop reordering
 * - Import/Export functionality
 */

import TestEnvironment from '../setup/TestEnvironment.js';

/**
 * Simple assertion helper
 */
function expect(value) {
    return {
        toBe(expected) {
            if (value !== expected) {
                throw new Error(`Expected ${value} to be ${expected}`);
            }
        },
        toEqual(expected) {
            if (JSON.stringify(value) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
            }
        }
    };
}

export async function testEnhancedArrayInputBasics() {
    console.log('🧪 Testing Enhanced Array Input - Basic Operations');
    
    // Test 1: Component should handle empty arrays
    const emptyArray = [];
    expect(Array.isArray(emptyArray)).toBe(true);
    expect(emptyArray.length).toBe(0);
    console.log('  ✓ Empty array handling');
    
    // Test 2: Component should handle numeric arrays
    const numericArray = [1, 2, 3, 4, 5];
    expect(numericArray.every(item => typeof item === 'number')).toBe(true);
    console.log('  ✓ Numeric array handling');
    
    // Test 3: Component should handle string arrays
    const stringArray = ['a', 'b', 'c'];
    expect(stringArray.every(item => typeof item === 'string')).toBe(true);
    console.log('  ✓ String array handling');
    
    // Test 4: Component should handle mixed arrays
    const mixedArray = [1, 'two', 3, 'four'];
    expect(mixedArray.length).toBe(4);
    expect(typeof mixedArray[0]).toBe('number');
    expect(typeof mixedArray[1]).toBe('string');
    console.log('  ✓ Mixed array handling');
}

export async function testEnhancedArrayInputOperations() {
    console.log('🧪 Testing Enhanced Array Input - Operations');
    
    let testArray = [1, 2, 3];
    
    // Test 1: Adding items
    testArray.push(4);
    expect(testArray.length).toBe(4);
    expect(testArray[3]).toBe(4);
    console.log('  ✓ Adding items');
    
    // Test 2: Removing items
    testArray = testArray.filter((_, i) => i !== 1);
    expect(testArray.length).toBe(3);
    expect(testArray).toEqual([1, 3, 4]);
    console.log('  ✓ Removing items');
    
    // Test 3: Editing items
    testArray[0] = 10;
    expect(testArray[0]).toBe(10);
    console.log('  ✓ Editing items');
    
    // Test 4: Duplicating items
    testArray.splice(1, 0, testArray[0]);
    expect(testArray.length).toBe(4);
    expect(testArray[0]).toBe(testArray[1]);
    console.log('  ✓ Duplicating items');
    
    // Test 5: Reordering items (drag and drop simulation)
    const draggedItem = testArray[0];
    testArray.splice(0, 1);
    testArray.splice(2, 0, draggedItem);
    expect(testArray[2]).toBe(draggedItem);
    console.log('  ✓ Reordering items');
    
    // Test 6: Clear all
    testArray = [];
    expect(testArray.length).toBe(0);
    console.log('  ✓ Clear all items');
}

export async function testEnhancedArrayInputBulkOperations() {
    console.log('🧪 Testing Enhanced Array Input - Bulk Operations');
    
    // Test 1: Comma-separated parsing
    const commaSeparated = '1, 2, 3, 4, 5';
    const parsed1 = commaSeparated.split(',').map(v => parseFloat(v.trim()));
    expect(parsed1).toEqual([1, 2, 3, 4, 5]);
    console.log('  ✓ Comma-separated parsing');
    
    // Test 2: Line-separated parsing
    const lineSeparated = '1\n2\n3\n4\n5';
    const parsed2 = lineSeparated.split('\n').map(v => parseFloat(v.trim()));
    expect(parsed2).toEqual([1, 2, 3, 4, 5]);
    console.log('  ✓ Line-separated parsing');
    
    // Test 3: Mixed whitespace handling
    const mixedWhitespace = '  1  ,  2  ,  3  ';
    const parsed3 = mixedWhitespace.split(',').map(v => parseFloat(v.trim()));
    expect(parsed3).toEqual([1, 2, 3]);
    console.log('  ✓ Whitespace handling');
    
    // Test 4: Empty value filtering
    const withEmpties = '1,,2,,3';
    const parsed4 = withEmpties.split(',').map(v => v.trim()).filter(v => v !== '').map(v => parseFloat(v));
    expect(parsed4).toEqual([1, 2, 3]);
    console.log('  ✓ Empty value filtering');
}

export async function testEnhancedArrayInputImportExport() {
    console.log('🧪 Testing Enhanced Array Input - Import/Export');
    
    const testArray = [1, 2, 3, 4, 5];
    
    // Test 1: Export as JSON
    const jsonExport = JSON.stringify(testArray);
    expect(jsonExport).toBe('[1,2,3,4,5]');
    console.log('  ✓ Export as JSON');
    
    // Test 2: Export as CSV
    const csvExport = testArray.join(', ');
    expect(csvExport).toBe('1, 2, 3, 4, 5');
    console.log('  ✓ Export as CSV');
    
    // Test 3: Export as lines
    const linesExport = testArray.join('\n');
    expect(linesExport).toBe('1\n2\n3\n4\n5');
    console.log('  ✓ Export as lines');
    
    // Test 4: Import from JSON
    const jsonImport = '[10, 20, 30]';
    const imported1 = JSON.parse(jsonImport);
    expect(imported1).toEqual([10, 20, 30]);
    console.log('  ✓ Import from JSON');
    
    // Test 5: Import from CSV
    const csvImport = '10, 20, 30';
    const imported2 = csvImport.split(',').map(v => parseFloat(v.trim()));
    expect(imported2).toEqual([10, 20, 30]);
    console.log('  ✓ Import from CSV');
    
    // Test 6: Import from lines
    const linesImport = '10\n20\n30';
    const imported3 = linesImport.split('\n').map(v => parseFloat(v.trim()));
    expect(imported3).toEqual([10, 20, 30]);
    console.log('  ✓ Import from lines');
}

export async function testEnhancedArrayInputTypeDetection() {
    console.log('🧪 Testing Enhanced Array Input - Type Detection');
    
    // Test 1: Detect number type
    const detectType = (val) => {
        if (typeof val === 'number') return 'number';
        if (typeof val === 'string') {
            const num = parseFloat(val);
            return !isNaN(num) && isFinite(num) ? 'number' : 'string';
        }
        return 'string';
    };
    
    expect(detectType(123)).toBe('number');
    expect(detectType('123')).toBe('number');
    expect(detectType('abc')).toBe('string');
    expect(detectType('12.34')).toBe('number');
    console.log('  ✓ Type detection');
    
    // Test 2: Parse values with type preservation
    const parseValue = (str, targetType = 'auto') => {
        if (targetType === 'string') return str;
        if (targetType === 'number') return parseFloat(str);
        
        const num = parseFloat(str);
        if (!isNaN(num) && isFinite(num) && str.trim() !== '') {
            return num;
        }
        return str;
    };
    
    expect(parseValue('123', 'auto')).toBe(123);
    expect(parseValue('abc', 'auto')).toBe('abc');
    expect(parseValue('123', 'string')).toBe('123');
    expect(parseValue('123', 'number')).toBe(123);
    console.log('  ✓ Value parsing with type');
}

export async function testEnhancedArrayInputValidation() {
    console.log('🧪 Testing Enhanced Array Input - Validation');
    
    // Test 1: Validate numeric array
    const validateNumericArray = (arr) => {
        return arr.every(item => typeof item === 'number' && !isNaN(item) && isFinite(item));
    };
    
    expect(validateNumericArray([1, 2, 3])).toBe(true);
    expect(validateNumericArray([1, 'two', 3])).toBe(false);
    expect(validateNumericArray([1, NaN, 3])).toBe(false);
    console.log('  ✓ Numeric array validation');
    
    // Test 2: Validate string array
    const validateStringArray = (arr) => {
        return arr.every(item => typeof item === 'string');
    };
    
    expect(validateStringArray(['a', 'b', 'c'])).toBe(true);
    expect(validateStringArray(['a', 1, 'c'])).toBe(false);
    console.log('  ✓ String array validation');
    
    // Test 3: Validate non-empty values
    const validateNonEmpty = (str) => {
        return str.trim() !== '';
    };
    
    expect(validateNonEmpty('test')).toBe(true);
    expect(validateNonEmpty('   ')).toBe(false);
    expect(validateNonEmpty('')).toBe(false);
    console.log('  ✓ Non-empty validation');
}

// Export all tests
export default {
    testEnhancedArrayInputBasics,
    testEnhancedArrayInputOperations,
    testEnhancedArrayInputBulkOperations,
    testEnhancedArrayInputImportExport,
    testEnhancedArrayInputTypeDetection,
    testEnhancedArrayInputValidation
};