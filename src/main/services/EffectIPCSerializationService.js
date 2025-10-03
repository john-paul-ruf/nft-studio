/**
 * EffectIPCSerializationService
 * 
 * Extracted from NftEffectsManager as part of God Object Destruction Plan - Phase 6, Step 6.5
 * 
 * Responsibilities:
 * - Deep serialize objects for IPC transmission
 * - Handle circular references
 * - Detect class names by structure
 * - Deserialize objects from IPC
 * - Reconstruct class instances from serialized data
 * 
 * Single Responsibility: Comprehensive IPC serialization/deserialization for effects
 * 
 * Note: This is more comprehensive than the basic IPCSerializationService in src/services/
 * which is used for simpler project serialization. This service handles complex effect
 * configurations with circular references, class detection, and reconstruction.
 */

class EffectIPCSerializationService {
    /**
     * Deep serialize object for IPC, handling circular references and non-serializable objects
     * @param {*} obj - Object to serialize
     * @param {WeakSet} visited - Set to track visited objects (for circular reference detection)
     * @returns {*} Serialized object safe for IPC
     */
    deepSerializeForIPC(obj, visited = new WeakSet()) {
        // Handle null and undefined
        if (obj === null || obj === undefined) {
            return obj;
        }

        // Handle functions - convert to string representation (check before object type)
        if (typeof obj === 'function') {
            return '[Function]';
        }

        // Handle primitive types and BigInt
        if (typeof obj !== 'object') {
            if (typeof obj === 'bigint') {
                return obj.toString() + 'n';
            }
            if (typeof obj === 'symbol') {
                return obj.toString();
            }
            return obj;
        }

        // Handle circular references
        if (visited.has(obj)) {
            return '[Circular Reference]';
        }

        // Add to visited set
        visited.add(obj);

        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepSerializeForIPC(item, visited));
        }

        // Handle Date objects
        if (obj instanceof Date) {
            return obj.toISOString();
        }

        // Handle RegExp objects
        if (obj instanceof RegExp) {
            return obj.toString();
        }

        // Handle Error objects
        if (obj instanceof Error) {
            return {
                name: obj.name,
                message: obj.message,
                stack: obj.stack
            };
        }

        // Handle Buffer objects
        if (typeof Buffer !== 'undefined' && obj instanceof Buffer) {
            return `[Buffer: ${obj.length} bytes]`;
        }

        // Handle Map and Set objects
        if (obj instanceof Map) {
            return `[Map: ${obj.size} entries]`;
        }

        if (obj instanceof Set) {
            return `[Set: ${obj.size} entries]`;
        }

        // Handle WeakMap and WeakSet
        if (obj instanceof WeakMap) {
            return '[WeakMap]';
        }

        if (obj instanceof WeakSet) {
            return '[WeakSet]';
        }

        // Handle plain objects and class instances
        const result = {};

        try {
            // Get all own properties including non-enumerable ones (like methods)
            const allKeys = [
                ...Object.getOwnPropertyNames(obj),
                ...Object.getOwnPropertySymbols(obj).map(s => s.toString())
            ];

            for (const key of allKeys) {
                // Skip constructor and prototype
                if (key === 'constructor' || key === 'prototype') {
                    continue;
                }

                try {
                    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
                    if (descriptor && descriptor.value !== undefined) {
                        result[key] = this.deepSerializeForIPC(descriptor.value, visited);
                    } else if (descriptor && (descriptor.get || descriptor.set)) {
                        // Handle getters/setters
                        result[key] = '[Getter/Setter]';
                    }
                } catch (error) {
                    // If a property can't be serialized, replace with error info
                    result[key] = `[Serialization Error: ${error.message}]`;
                }
            }

            // Preserve class name if available
            if (obj.constructor && obj.constructor.name !== 'Object') {
                result.__className = obj.constructor.name;
            } else {
                // Fallback: detect object type based on structure when constructor info is lost
                const detectedClassName = this.detectClassNameByStructure(obj);
                if (detectedClassName) {
                    result.__className = detectedClassName;
                }
            }

        } catch (error) {
            console.error('Error during deep serialization:', error);
            return '[Serialization Failed]';
        }

        return result;
    }

    /**
     * Detect object class name based on structure when constructor info is lost
     * @param {Object} obj - Object to analyze
     * @returns {string|null} Detected class name or null
     */
    detectClassNameByStructure(obj) {
        if (!obj || typeof obj !== 'object') {
            return null;
        }

        // Detect PercentageRange: has lower and upper properties with percent and side
        if (obj.hasOwnProperty('lower') && obj.hasOwnProperty('upper')) {
            const lower = obj.lower;
            const upper = obj.upper;

            // Check if lower and upper have percent/side structure (PercentageRange)
            if (lower && typeof lower === 'object' &&
                lower.hasOwnProperty('percent') && lower.hasOwnProperty('side') &&
                upper && typeof upper === 'object' &&
                upper.hasOwnProperty('percent') && upper.hasOwnProperty('side')) {
                return 'PercentageRange';
            }

            // Check if it's a regular Range (numeric lower/upper)
            if (typeof lower === 'number' && typeof upper === 'number') {
                return 'Range';
            }
        }

        // Detect PercentageShortestSide/PercentageLongestSide: has percent and side properties
        if (obj.hasOwnProperty('percent') && obj.hasOwnProperty('side')) {
            if (obj.side === 'shortest') {
                return 'PercentageShortestSide';
            } else if (obj.side === 'longest') {
                return 'PercentageLongestSide';
            }
        }

        // Detect Point2D: has x and y numeric properties
        if (obj.hasOwnProperty('x') && obj.hasOwnProperty('y') &&
            typeof obj.x === 'number' && typeof obj.y === 'number') {
            return 'Point2D';
        }

        // Detect ColorPicker: has selectionType and colorValue properties
        if (obj.hasOwnProperty('selectionType') && obj.hasOwnProperty('colorValue') &&
            (obj.hasOwnProperty('getColor') || typeof obj.getColor !== 'undefined')) {
            return 'ColorPicker';
        }

        // Detect DynamicRange: has bottom and top properties with Range structure
        if (obj.hasOwnProperty('bottom') && obj.hasOwnProperty('top')) {
            const bottom = obj.bottom;
            const top = obj.top;
            if (bottom && typeof bottom === 'object' &&
                bottom.hasOwnProperty('lower') && bottom.hasOwnProperty('upper') &&
                top && typeof top === 'object' &&
                top.hasOwnProperty('lower') && top.hasOwnProperty('upper')) {
                return 'DynamicRange';
            }
        }

        return null; // Unknown structure
    }

    /**
     * Deep deserialize object from IPC, reconstructing class instances based on __className metadata
     * @param {*} obj - Object to deserialize
     * @param {WeakSet} visited - Set to track visited objects (for circular reference detection)
     * @returns {*} Deserialized object with proper class instances
     */
    async deepDeserializeFromIPC(obj, visited = new WeakSet()) {
        // Handle null and undefined
        if (obj === null || obj === undefined) {
            return obj;
        }

        // Handle primitive types
        if (typeof obj !== 'object') {
            return obj;
        }

        // Handle circular references
        if (visited.has(obj)) {
            return obj; // Return as-is for circular refs
        }

        // Add to visited set
        visited.add(obj);

        // Handle arrays
        if (Array.isArray(obj)) {
            const result = [];
            for (const item of obj) {
                result.push(await this.deepDeserializeFromIPC(item, visited));
            }
            return result;
        }

        // Handle objects with __className metadata
        if (obj.__className) {
            try {
                const reconstructedObj = await this.reconstructObjectFromClassName(obj);
                if (reconstructedObj !== null) {
                    return reconstructedObj;
                }
            } catch (error) {
                console.warn(`Failed to reconstruct object with className ${obj.__className}:`, error.message);
                // Fall through to default object handling
            }
        } else {
            // Fallback: try to detect and reconstruct objects without __className (legacy support)
            const detectedClassName = this.detectClassNameByStructure(obj);
            if (detectedClassName) {
                console.log(`🔄 Detected legacy object type: ${detectedClassName}, attempting reconstruction`);
                try {
                    const reconstructedObj = await this.reconstructObjectFromClassName({
                        __className: detectedClassName,
                        ...obj
                    });
                    if (reconstructedObj !== null) {
                        return reconstructedObj;
                    }
                } catch (error) {
                    console.warn(`Failed to reconstruct detected object type ${detectedClassName}:`, error.message);
                    // Fall through to default object handling
                }
            }
        }

        // Handle plain objects - recursively deserialize nested objects
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (key === '__className') {
                // Preserve className metadata
                result[key] = value;
            } else {
                result[key] = await this.deepDeserializeFromIPC(value, visited);
            }
        }

        return result;
    }

    /**
     * Reconstruct object from __className metadata
     * @param {Object} obj - Serialized object with __className
     * @returns {Promise<Object|null>} Reconstructed object or null if not reconstructible
     */
    async reconstructObjectFromClassName(obj) {
        const { __className, ...props } = obj;

        try {
            // Import the required classes from my-nft-gen
            const {
                PercentageRange,
                PercentageShortestSide,
                PercentageLongestSide,
                Range,
                DynamicRange,
                Point2D,
                ColorPicker
            } = await import('my-nft-gen');

            switch (__className) {
                case 'PercentageRange':
                    // Reconstruct PercentageRange with proper lower/upper instances
                    const lowerInstance = props.lower ? await this.reconstructObjectFromClassName({
                        __className: props.lower.__className || 'PercentageShortestSide',
                        ...props.lower
                    }) : new PercentageShortestSide(0.1);

                    const upperInstance = props.upper ? await this.reconstructObjectFromClassName({
                        __className: props.upper.__className || 'PercentageLongestSide',
                        ...props.upper
                    }) : new PercentageLongestSide(0.9);

                    return new PercentageRange(lowerInstance, upperInstance);

                case 'PercentageShortestSide':
                    return new PercentageShortestSide(props.percent || 0.5);

                case 'PercentageLongestSide':
                    return new PercentageLongestSide(props.percent || 0.5);

                case 'Range':
                    return new Range(props.lower || 0, props.upper || 1);

                case 'DynamicRange':
                    const bottomRange = props.bottom ? await this.reconstructObjectFromClassName({
                        __className: props.bottom.__className || 'Range',
                        ...props.bottom
                    }) : new Range(0, 1);

                    const topRange = props.top ? await this.reconstructObjectFromClassName({
                        __className: props.top.__className || 'Range',
                        ...props.top
                    }) : new Range(0, 1);

                    return new DynamicRange(bottomRange, topRange);

                case 'Point2D':
                    return new Point2D(props.x || 0, props.y || 0);

                case 'ColorPicker':
                    // Reconstruct ColorPicker with preserved properties
                    const colorPicker = new ColorPicker();
                    colorPicker.selectionType = props.selectionType || 'color-bucket';
                    colorPicker.colorValue = props.colorValue || null;
                    return colorPicker;

                case 'Effect':
                    // Reconstruct Effect class instance
                    const { Effect: EffectClass } = await import('../../models/Effect.js');
                    return EffectClass.fromPOJO(props);

                default:
                    console.warn(`Unknown className for reconstruction: ${__className}`);
                    return null;
            }
        } catch (error) {
            console.error(`Error reconstructing object with className ${__className}:`, error);
            return null;
        }
    }
}

// Export singleton instance
export default EffectIPCSerializationService;