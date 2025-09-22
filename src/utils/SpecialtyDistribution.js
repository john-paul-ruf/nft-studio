/**
 * SpecialtyDistribution - Utility functions for distributing effects along geometric paths
 */

export class SpecialtyDistribution {
    /**
     * Distribute effects evenly along a line between two points
     * @param {Object} startPoint - Starting point {x, y}
     * @param {Object} endPoint - Ending point {x, y}
     * @param {number} count - Number of effects to distribute
     * @returns {Array} Array of position objects {x, y}
     */
    static distributeAlongLine(startPoint, endPoint, count) {
        if (count <= 0) return [];
        if (count === 1) {
            // Single effect goes at midpoint
            return [{
                x: (startPoint.x + endPoint.x) / 2,
                y: (startPoint.y + endPoint.y) / 2
            }];
        }

        const positions = [];
        const deltaX = endPoint.x - startPoint.x;
        const deltaY = endPoint.y - startPoint.y;

        // Distribute evenly along the line, including start and end points
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1); // t ranges from 0 to 1
            positions.push({
                x: startPoint.x + (deltaX * t),
                y: startPoint.y + (deltaY * t)
            });
        }

        return positions;
    }

    /**
     * Distribute effects evenly around a circle
     * @param {Object} centerPoint - Center point {x, y}
     * @param {number} radius - Circle radius
     * @param {number} count - Number of effects to distribute
     * @returns {Array} Array of position objects {x, y}
     */
    static distributeAlongCircle(centerPoint, radius, count) {
        if (count <= 0) return [];
        if (count === 1) {
            // Single effect goes at top of circle
            return [{
                x: centerPoint.x,
                y: centerPoint.y - radius
            }];
        }

        const positions = [];
        const angleStep = (2 * Math.PI) / count;

        // Start at top of circle (270 degrees or -90 degrees)
        const startAngle = -Math.PI / 2;

        for (let i = 0; i < count; i++) {
            const angle = startAngle + (angleStep * i);
            positions.push({
                x: centerPoint.x + (radius * Math.cos(angle)),
                y: centerPoint.y + (radius * Math.sin(angle))
            });
        }

        return positions;
    }

    /**
     * Calculate the total distance of a line
     * @param {Object} startPoint - Starting point {x, y}
     * @param {Object} endPoint - Ending point {x, y}
     * @returns {number} Distance between points
     */
    static calculateLineDistance(startPoint, endPoint) {
        const deltaX = endPoint.x - startPoint.x;
        const deltaY = endPoint.y - startPoint.y;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    /**
     * Calculate the circumference of a circle
     * @param {number} radius - Circle radius
     * @returns {number} Circumference
     */
    static calculateCircleCircumference(radius) {
        return 2 * Math.PI * radius;
    }

    /**
     * Get preview positions for visualization (limit to reasonable number for UI)
     * @param {string} distributionType - 'line' or 'circle'
     * @param {Object} config - Distribution configuration
     * @returns {Array} Array of preview positions
     */
    static getPreviewPositions(distributionType, config) {
        const maxPreviewCount = 20; // Limit preview for performance
        const previewCount = Math.min(config.count || 1, maxPreviewCount);

        if (distributionType === 'line') {
            return this.distributeAlongLine(
                config.startPoint || { x: 0, y: 0 },
                config.endPoint || { x: 100, y: 100 },
                previewCount
            );
        } else if (distributionType === 'circle') {
            return this.distributeAlongCircle(
                config.centerPoint || { x: 50, y: 50 },
                config.radius || 50,
                previewCount
            );
        }

        return [];
    }
}

export default SpecialtyDistribution;