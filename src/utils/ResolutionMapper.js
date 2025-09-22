/**
 * Universal resolution mapper for all standard resolutions supported by FFmpeg
 * This provides a single source of truth for resolution mapping across the application
 */
class ResolutionMapper {
    // Complete mapping of all standard video resolutions
    // Note: Keys must be unique, so we prioritize the most common video resolutions
    static resolutions = {
        // Standard Definition (SD)
        160: { w: 160, h: 120, name: "QQVGA", category: "SD" },
        240: { w: 240, h: 180, name: "HQVGA", category: "SD" },
        320: { w: 320, h: 240, name: "QVGA", category: "SD" },
        480: { w: 480, h: 360, name: "nHD", category: "SD" },
        640: { w: 640, h: 480, name: "VGA", category: "SD" },
        800: { w: 800, h: 600, name: "SVGA", category: "SD" },

        // Widescreen SD
        854: { w: 854, h: 480, name: "FWVGA", category: "WSD" },
        960: { w: 960, h: 540, name: "qHD", category: "WSD" },

        // Extended Graphics Array (4:3 aspect ratio)
        1024: { w: 1024, h: 768, name: "XGA", category: "XGA" },
        1152: { w: 1152, h: 864, name: "XGA+", category: "XGA" },

        // High Definition (HD) - Prioritize video resolutions over XGA variants
        1280: { w: 1280, h: 720, name: "HD", category: "HD" },
        1366: { w: 1366, h: 768, name: "WXGA", category: "HD" },
        1440: { w: 1440, h: 900, name: "WXGA+", category: "HD" },
        1600: { w: 1600, h: 900, name: "HD+", category: "HD" },
        1680: { w: 1680, h: 1050, name: "WSXGA+", category: "HD" },
        1920: { w: 1920, h: 1080, name: "Full HD", category: "HD" },

        // Cinema Formats
        2048: { w: 2048, h: 1080, name: "2K DCI", category: "Cinema" },

        // Quad HD and Ultra HD
        2560: { w: 2560, h: 1440, name: "QHD", category: "QHD" },
        2880: { w: 2880, h: 1620, name: "QHD+", category: "QHD" },
        3200: { w: 3200, h: 1800, name: "QHD+ Wide", category: "QHD" },
        3440: { w: 3440, h: 1440, name: "UWQHD", category: "QHD" },
        3840: { w: 3840, h: 2160, name: "4K UHD", category: "UHD" },
        4096: { w: 4096, h: 2160, name: "DCI 4K", category: "UHD" },

        // 5K and 6K
        5120: { w: 5120, h: 2880, name: "5K", category: "5K+" },
        6144: { w: 6144, h: 3456, name: "6K", category: "5K+" },

        // 8K Ultra HD
        7680: { w: 7680, h: 4320, name: "8K UHD", category: "8K+" },
        8192: { w: 8192, h: 4320, name: "8K DCI", category: "8K+" },

        // Mobile/Portrait Common Resolutions (using height as key to avoid conflicts)
        360: { w: 360, h: 640, name: "Mobile SD", category: "Mobile" },
        375: { w: 375, h: 667, name: "iPhone 6/7/8", category: "Mobile" },
        414: { w: 414, h: 736, name: "iPhone Plus", category: "Mobile" },

        // Social Media Optimized (using unique keys to avoid conflicts)
        1081: { w: 1080, h: 1080, name: "Instagram Square", category: "Social" }
        // Note: Key 1080 is reserved for potential 1080p conflicts, using 1081 for square
    };

    /**
     * Get resolution dimensions by width
     * @param {number} width - The width to look up
     * @returns {Object} Resolution object with w, h, name, category
     */
    static getByWidth(width) {
        return this.resolutions[width] || null;
    }

    /**
     * Get all available resolutions
     * @returns {Object} All resolution mappings
     */
    static getAllResolutions() {
        return this.resolutions;
    }

    /**
     * Get resolutions by category
     * @param {string} category - Category to filter by (SD, HD, QHD, UHD, etc.)
     * @returns {Array} Array of resolution objects
     */
    static getByCategory(category) {
        return Object.entries(this.resolutions)
            .filter(([width, res]) => res.category === category)
            .map(([width, res]) => ({ width: parseInt(width), ...res }));
    }

    /**
     * Get standard video resolutions (most common ones)
     * @returns {Array} Array of common resolution objects
     */
    static getStandardResolutions() {
        const standardWidths = [640, 854, 1280, 1920, 2560, 3840, 7680];
        return standardWidths
            .map(width => {
                const resolution = this.getByWidth(width);
                return resolution ? { width, ...resolution } : null;
            })
            .filter(res => res !== null); // Filter out null results
    }

    /**
     * Check if a resolution is naturally portrait-oriented (mobile)
     * @param {Object} resolution - Resolution object
     * @returns {boolean} True if naturally portrait
     */
    static isNaturallyPortrait(resolution) {
        return resolution && resolution.h > resolution.w;
    }

    /**
     * Get dimensions for a given width, handling orientation
     * @param {number|string} width - The width to look up or string resolution name
     * @param {boolean} isHorizontal - Whether orientation is horizontal
     * @returns {Object} Dimensions object with w and h
     */
    static getDimensions(width, isHorizontal = true) {
        // Convert string resolution names to numeric width values
        if (typeof width === 'string') {
            width = this.parseStringResolution(width);
        }

        const resolution = this.getByWidth(width);
        if (!resolution) {
            throw new Error(`Resolution ${width} not found - no fallbacks allowed`);
        }

        // Check if this resolution is naturally portrait (mobile) or landscape (desktop)
        const isNaturallyPortraitResolution = this.isNaturallyPortrait(resolution);

        if (isNaturallyPortraitResolution) {
            // Mobile resolutions are stored in portrait format (e.g., 360x640)
            // If user wants portrait: return as-is
            // If user wants landscape: swap dimensions
            return isHorizontal
                ? { w: resolution.h, h: resolution.w }  // Swap to landscape
                : { w: resolution.w, h: resolution.h }; // Keep portrait
        } else {
            // Desktop resolutions are stored in landscape format (e.g., 1920x1080)
            // If user wants landscape: return as-is
            // If user wants portrait: swap dimensions
            return isHorizontal
                ? { w: resolution.w, h: resolution.h }  // Keep landscape
                : { w: resolution.h, h: resolution.w }; // Swap to portrait
        }
    }

    /**
     * Get display name for a resolution
     * @param {number} width - The width to look up
     * @returns {string} Display name (e.g., "1920x1080 (Full HD)")
     */
    static getDisplayName(width) {
        const resolution = this.getByWidth(width);
        if (!resolution) {
            return `${width}x? (Unknown)`;
        }
        return `${resolution.w}x${resolution.h} (${resolution.name})`;
    }

    /**
     * Check if a width value is a valid resolution
     * @param {number} width - The width to validate
     * @returns {boolean} True if valid resolution
     */
    static isValidResolution(width) {
        return this.resolutions.hasOwnProperty(width);
    }

    /**
     * Get the closest valid resolution to a given width
     * @param {number} targetWidth - The target width
     * @returns {number} Closest valid resolution width
     */
    static getClosestResolution(targetWidth) {
        const widths = Object.keys(this.resolutions).map(w => parseInt(w));

        return widths.reduce((closest, current) => {
            return Math.abs(current - targetWidth) < Math.abs(closest - targetWidth)
                ? current
                : closest;
        });
    }

    /**
     * Convert string resolution names to numeric width values
     * @param {string} resolutionName - String resolution name (e.g., 'qvga', 'hd', etc.)
     * @returns {number} Numeric width value
     */
    static parseStringResolution(resolutionName) {
        if (typeof resolutionName !== 'string') {
            return this.getDefaultResolution();
        }

        // Common string resolution mappings
        const stringToWidth = {
            'qvga': 320, 'vga': 640, 'svga': 800, 'xga': 1024,
            'hd720': 1280, 'hd': 1920, 'square_small': 720, 'square': 1080,
            'wqhd': 2560, '4k': 3840, '5k': 5120, '8k': 7680,
            // Alternative names
            'fullhd': 1920, 'fhd': 1920, 'uhd': 3840, '4kuhd': 3840,
            'qhd': 2560, '1440p': 2560, '720p': 1280, '1080p': 1920
        };

        const normalized = resolutionName.toLowerCase().trim();

        if (stringToWidth[normalized]) {
            return stringToWidth[normalized];
        }

        // Try to parse as a number
        const parsed = parseInt(resolutionName);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }

        console.warn(`Unknown string resolution '${resolutionName}', falling back to Full HD`);
        return this.getDefaultResolution();
    }

    /**
     * Get default resolution (Full HD)
     * @returns {number} Default resolution width
     */
    static getDefaultResolution() {
        return 1920; // Full HD
    }
}

export default ResolutionMapper;