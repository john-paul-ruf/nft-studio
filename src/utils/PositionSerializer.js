/**
 * Position Serialization Utility
 * Handles conversion between UI form data and Position objects for serialization
 */

export class PositionSerializer {
    /**
     * Serialize position data for backend consumption
     * @param {Object} positionData - Position data from UI form
     * @returns {Object} Serialized position object
     */
    static serialize(positionData) {
        if (!positionData) return null;

        // Handle legacy point2d format (convert to Position)
        if (positionData.x !== undefined && positionData.y !== undefined && !positionData.name) {
            return {
                name: 'position',
                x: positionData.x,
                y: positionData.y
            };
        }

        // Handle Position objects
        if (positionData.name === 'position') {
            return {
                name: 'position',
                x: positionData.x || 0,
                y: positionData.y || 0
            };
        }

        // Handle ArcPath objects
        if (positionData.name === 'arc-path') {
            return {
                name: 'arc-path',
                center: positionData.center || { x: 0, y: 0 },
                radius: positionData.radius || 100,
                startAngle: positionData.startAngle || 0,
                endAngle: positionData.endAngle || 360,
                direction: positionData.direction || 1
            };
        }

        // Return as-is if already in correct format
        return positionData;
    }

    /**
     * Deserialize position data for UI consumption
     * @param {Object} positionData - Position data from backend
     * @returns {Object} Deserialized position object for UI
     */
    static deserialize(positionData) {
        if (!positionData) return null;

        // Handle legacy point2d format
        if (positionData.x !== undefined && positionData.y !== undefined && !positionData.name) {
            return {
                name: 'position',
                x: positionData.x,
                y: positionData.y
            };
        }

        // Position objects are already in correct format for UI
        if (positionData.name === 'position' || positionData.name === 'arc-path') {
            return positionData;
        }

        // Fallback for unknown formats
        return positionData;
    }

    /**
     * Convert legacy point2d to Position object
     * @param {Object} point2dData - Legacy point2d data {x, y}
     * @returns {Object} Position object
     */
    static fromPoint2D(point2dData) {
        if (!point2dData || (point2dData.x === undefined && point2dData.y === undefined)) {
            return null;
        }

        return {
            name: 'position',
            x: point2dData.x || 0,
            y: point2dData.y || 0
        };
    }

    /**
     * Convert Position object to legacy point2d format
     * @param {Object} positionData - Position data
     * @returns {Object} Legacy point2d object {x, y}
     */
    static toPoint2D(positionData) {
        if (!positionData) return null;

        // For Position objects, extract x,y
        if (positionData.name === 'position') {
            return {
                x: positionData.x || 0,
                y: positionData.y || 0
            };
        }

        // For ArcPath objects, calculate position at frame 0
        if (positionData.name === 'arc-path') {
            const angle = positionData.startAngle * (Math.PI / 180);
            return {
                x: Math.floor((positionData.center?.x || 0) + (positionData.radius || 0) * Math.cos(angle)),
                y: Math.floor((positionData.center?.y || 0) + (positionData.radius || 0) * Math.sin(angle))
            };
        }

        // Already in point2d format
        if (positionData.x !== undefined && positionData.y !== undefined) {
            return {
                x: positionData.x,
                y: positionData.y
            };
        }

        return null;
    }

    /**
     * Validate position data structure
     * @param {Object} positionData - Position data to validate
     * @returns {boolean} True if valid
     */
    static isValid(positionData) {
        if (!positionData || typeof positionData !== 'object') {
            return false;
        }

        // Valid Position object
        if (positionData.name === 'position') {
            return typeof positionData.x === 'number' && typeof positionData.y === 'number';
        }

        // Valid ArcPath object
        if (positionData.name === 'arc-path') {
            return (
                positionData.center &&
                typeof positionData.center.x === 'number' &&
                typeof positionData.center.y === 'number' &&
                typeof positionData.radius === 'number' &&
                typeof positionData.startAngle === 'number' &&
                typeof positionData.endAngle === 'number' &&
                typeof positionData.direction === 'number'
            );
        }

        // Valid legacy point2d
        if (positionData.x !== undefined && positionData.y !== undefined && !positionData.name) {
            return typeof positionData.x === 'number' && typeof positionData.y === 'number';
        }

        return false;
    }

    /**
     * Get position type from data
     * @param {Object} positionData - Position data
     * @returns {string} Position type ('position', 'arc-path', 'point2d', 'unknown')
     */
    static getType(positionData) {
        if (!positionData) return 'unknown';

        if (positionData.name === 'position') return 'position';
        if (positionData.name === 'arc-path') return 'arc-path';
        if (positionData.x !== undefined && positionData.y !== undefined && !positionData.name) return 'point2d';

        return 'unknown';
    }
}

export default PositionSerializer;