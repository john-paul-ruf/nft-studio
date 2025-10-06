/**
 * EventFilterService
 * 
 * Handles event filtering logic for the EventBusMonitor component.
 * 
 * Responsibilities:
 * - Category-based filtering
 * - Search term filtering
 * - Combined filter application
 * - Event category detection
 */

const EVENT_CATEGORIES = {
    FRAME: { label: 'Frame', color: '#4CAF50', icon: '🖼️' },
    EFFECT: { label: 'Effects', color: '#2196F3', icon: '✨' },
    VIDEO: { label: 'Video', color: '#E91E63', icon: '🎬' },
    FILE_IO: { label: 'File I/O', color: '#FF9800', icon: '📁' },
    PERFORMANCE: { label: 'Performance', color: '#9C27B0', icon: '⚡' },
    RESOURCE: { label: 'Resources', color: '#00BCD4', icon: '💾' },
    ERROR: { label: 'Errors', color: '#F44336', icon: '❌' },
    LIFECYCLE: { label: 'Lifecycle', color: '#607D8B', icon: '♻️' },
    WORKER: { label: 'Worker', color: '#3F51B5', icon: '⚙️' },
    PROGRESS: { label: 'Progress', color: '#8BC34A', icon: '📊' },
    RENDER_LOOP: { label: 'Render Loop', color: '#FF5722', icon: '🔄' },
    CONSOLE: { label: 'Console', color: '#FFC107', icon: '💬' },
    DEBUG: { label: 'Debug', color: '#795548', icon: '🐛' },
    TIMING: { label: 'Timing', color: '#009688', icon: '⏱️' },
    MEMORY: { label: 'Memory', color: '#673AB7', icon: '🧠' },
    CUSTOM: { label: 'Custom', color: '#9E9E9E', icon: '📌' }
};

class EventFilterService {
    constructor() {
        this.categories = EVENT_CATEGORIES;
    }

    /**
     * Get all event categories
     * @returns {Object} Event categories configuration
     */
    getCategories() {
        return this.categories;
    }

    /**
     * Get category keys
     * @returns {Array<string>} Array of category keys
     */
    getCategoryKeys() {
        return Object.keys(this.categories);
    }

    /**
     * Get category configuration by key
     * @param {string} categoryKey - Category key
     * @returns {Object|null} Category configuration or null if not found
     */
    getCategory(categoryKey) {
        return this.categories[categoryKey] || null;
    }

    /**
     * Detect event category based on event type and data
     * @param {string} eventType - Event type/name
     * @param {Object} eventData - Event data
     * @returns {string} Category key
     */
    detectCategory(eventType, eventData) {
        const lowerType = eventType.toLowerCase();

        // First check the eventData for frame information (worker events)
        if (eventData) {
            // Check if eventData contains frame-related information
            if (typeof eventData === 'object') {
                const dataStr = JSON.stringify(eventData).toLowerCase();
                if (dataStr.includes('frame') || dataStr.includes('framenumber') ||
                    eventData.frameNumber !== undefined || eventData.currentFrame !== undefined) {
                    console.log('🎯 EventFilterService: Found frame data in eventData, categorizing as FRAME');
                    return 'FRAME';
                }
                if (dataStr.includes('effect') || eventData.effectName !== undefined) {
                    return 'EFFECT';
                }
                if (dataStr.includes('progress') || eventData.progress !== undefined) {
                    return 'PROGRESS';
                }
                if (dataStr.includes('error') || eventData.error !== undefined) {
                    return 'ERROR';
                }
            }
        }

        // Frame events by event name
        if (lowerType.includes('frame')) return 'FRAME';

        // Effect events
        if (lowerType.includes('effect')) return 'EFFECT';

        // Video events
        if (lowerType.includes('video') || lowerType.includes('mp4') ||
            lowerType.includes('encode') || lowerType.includes('ffmpeg') ||
            lowerType.includes('codec')) return 'VIDEO';

        // File I/O events
        if (lowerType.includes('file') || lowerType.includes('write') ||
            lowerType.includes('read') || lowerType.includes('save') ||
            lowerType.includes('load')) return 'FILE_IO';

        // Memory-specific events
        if (lowerType.includes('memory') || lowerType.includes('heap') ||
            lowerType.includes('allocation')) return 'MEMORY';

        // Timing-specific events
        if (lowerType.includes('timing') || lowerType.includes('duration') ||
            lowerType.includes('elapsed')) return 'TIMING';

        // Performance events (general)
        if (lowerType.includes('performance') || lowerType.includes('perf')) return 'PERFORMANCE';

        // Resource events
        if (lowerType.includes('buffer') || lowerType.includes('canvas') ||
            lowerType.includes('resource') || lowerType.includes('cache')) return 'RESOURCE';

        // Console events (check before ERROR to properly categorize console.error)
        // Handle both browser console (console.*) and Node console (node.console.*)
        if (lowerType.startsWith('console.') || lowerType.startsWith('node.console.')) {
            // console.error should still be ERROR category
            if (lowerType === 'console.error' || lowerType === 'node.console.error') return 'ERROR';
            // Other console methods go to CONSOLE
            return 'CONSOLE';
        }
        
        // Node exceptions from main process
        if (lowerType === 'node.exception') return 'ERROR';
        
        // Error events and exceptions
        if (lowerType.includes('error') || lowerType.includes('fail') ||
            lowerType.includes('exception') || lowerType.includes('crash')) return 'ERROR';

        // Worker-specific events
        if (lowerType.includes('worker')) return 'WORKER';

        // Render loop events (check before LIFECYCLE to avoid false positives)
        if (lowerType.includes('render') && lowerType.includes('loop')) return 'RENDER_LOOP';
        if (lowerType.includes('render.loop')) return 'RENDER_LOOP';

        // Lifecycle events
        if (lowerType.includes('start') || lowerType.includes('complete') ||
            lowerType.includes('init') || lowerType.includes('terminate') ||
            lowerType.includes('destroy')) return 'LIFECYCLE';

        // Progress events
        if (lowerType.includes('progress')) return 'PROGRESS';

        // Console events
        if (lowerType.includes('console') || lowerType.startsWith('console.')) return 'CONSOLE';

        // Debug events
        if (lowerType.includes('debug') || lowerType.includes('log') ||
            lowerType.includes('trace')) return 'DEBUG';

        // Category-specific events (e.g., "category.frame")
        if (lowerType.startsWith('category.')) {
            const category = lowerType.substring(9).toUpperCase();
            if (this.categories[category]) return category;
        }

        console.log('🎯 EventFilterService: No match found for eventType:', eventType, 'eventData:', eventData, 'defaulting to CUSTOM');
        return 'CUSTOM';
    }

    /**
     * Filter events by search term
     * @param {Array<Object>} events - Array of events
     * @param {string} searchTerm - Search term
     * @returns {Array<Object>} Filtered events
     */
    filterBySearchTerm(events, searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            return events;
        }

        const lowerSearchTerm = searchTerm.toLowerCase();
        return events.filter(event => {
            return event.type.toLowerCase().includes(lowerSearchTerm) ||
                   JSON.stringify(event.data).toLowerCase().includes(lowerSearchTerm);
        });
    }

    /**
     * Filter events by categories
     * @param {Array<Object>} events - Array of events
     * @param {Array<string>} selectedCategories - Array of selected category keys
     * @returns {Array<Object>} Filtered events
     */
    filterByCategories(events, selectedCategories) {
        if (!selectedCategories || selectedCategories.length === 0) {
            return events;
        }

        return events.filter(event => selectedCategories.includes(event.category));
    }

    /**
     * Apply combined filters (search term + categories)
     * @param {Array<Object>} events - Array of events
     * @param {string} searchTerm - Search term
     * @param {Array<string>} selectedCategories - Array of selected category keys
     * @returns {Array<Object>} Filtered events
     */
    applyFilters(events, searchTerm, selectedCategories) {
        let filtered = events;

        // Apply search term filter
        if (searchTerm && searchTerm.trim() !== '') {
            filtered = this.filterBySearchTerm(filtered, searchTerm);
        }

        // Apply category filter
        if (selectedCategories && selectedCategories.length > 0) {
            filtered = this.filterByCategories(filtered, selectedCategories);
        }

        return filtered;
    }

    /**
     * Get category icon
     * @param {string} categoryKey - Category key
     * @returns {string} Category icon emoji
     */
    getCategoryIcon(categoryKey) {
        const category = this.categories[categoryKey];
        return category ? category.icon : '📝';
    }

    /**
     * Get category color
     * @param {string} categoryKey - Category key
     * @returns {string} Category color hex code
     */
    getCategoryColor(categoryKey) {
        const category = this.categories[categoryKey];
        return category ? category.color : '#9E9E9E';
    }

    /**
     * Get category label
     * @param {string} categoryKey - Category key
     * @returns {string} Category label
     */
    getCategoryLabel(categoryKey) {
        const category = this.categories[categoryKey];
        return category ? category.label : 'Unknown';
    }

    /**
     * Get default categories for resumed projects
     * @returns {Array<string>} Array of all category keys
     */
    getDefaultCategoriesForResumedProject() {
        return this.getCategoryKeys();
    }

    /**
     * Get default categories for new projects
     * @returns {Array<string>} Array of default category keys
     */
    getDefaultCategoriesForNewProject() {
        return ['FRAME', 'VIDEO', 'ERROR', 'RENDER_LOOP'];
    }

    /**
     * Get default categories based on project type
     * @param {boolean} isForResumedProject - Whether this is for a resumed project
     * @returns {Array<string>} Array of default category keys
     */
    getDefaultCategories(isForResumedProject = false) {
        return isForResumedProject 
            ? this.getDefaultCategoriesForResumedProject() 
            : this.getDefaultCategoriesForNewProject();
    }

    /**
     * Get category metadata (icon, label, color)
     * @param {string} categoryKey - Category key
     * @returns {Object|null} Category metadata or null if not found
     */
    getCategoryMetadata(categoryKey) {
        return this.categories[categoryKey] || null;
    }

    /**
     * Get all category keys
     * @returns {Array<string>} Array of all category keys
     */
    getAllCategoryKeys() {
        return Object.keys(this.categories);
    }

    /**
     * Get all categories as entries array
     * @returns {Array<Array>} Array of [key, config] pairs
     */
    getAllCategories() {
        return Object.entries(this.categories);
    }
}

// Export singleton instance
export default new EventFilterService();