/**
 * EventExportService
 * 
 * Handles event export functionality for the EventBusMonitor component.
 * 
 * Responsibilities:
 * - JSON export generation
 * - Data URI creation
 * - File download triggering
 * - Export filename generation
 */

class EventExportService {
    constructor() {
        this.defaultFilePrefix = 'event-bus-log';
    }

    /**
     * Export events to JSON file
     * @param {Array<Object>} events - Array of events to export
     * @param {Object} options - Export options
     * @param {string} options.filename - Custom filename (optional)
     * @param {boolean} options.prettyPrint - Pretty print JSON (default: true)
     * @param {boolean} options.includeMetadata - Include export metadata (default: true)
     * @returns {Object} Export result with success status
     */
    exportToJSON(events, options = {}) {
        try {
            const {
                filename = this.generateFilename(),
                prettyPrint = true,
                includeMetadata = true
            } = options;

            // Prepare export data
            const exportData = includeMetadata
                ? this.createExportDataWithMetadata(events)
                : events;

            // Convert to JSON string
            const jsonString = prettyPrint
                ? JSON.stringify(exportData, null, 2)
                : JSON.stringify(exportData);

            // Create data URI
            const dataUri = this.createDataURI(jsonString);

            // Trigger download
            this.triggerDownload(dataUri, filename);

            console.log(`✅ EventExportService: Exported ${events.length} events to ${filename}`);
            return { success: true, filename, eventCount: events.length };
        } catch (error) {
            console.error('❌ EventExportService: Export failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create export data with metadata
     * @param {Array<Object>} events - Array of events
     * @returns {Object} Export data with metadata
     */
    createExportDataWithMetadata(events) {
        return {
            metadata: {
                exportDate: new Date().toISOString(),
                eventCount: events.length,
                exportVersion: '1.0.0',
                source: 'EventBusMonitor'
            },
            events: events
        };
    }

    /**
     * Create data URI from JSON string
     * @param {string} jsonString - JSON string
     * @returns {string} Data URI
     */
    createDataURI(jsonString) {
        const encodedData = encodeURIComponent(jsonString);
        return `data:application/json;charset=utf-8,${encodedData}`;
    }

    /**
     * Trigger file download
     * @param {string} dataUri - Data URI
     * @param {string} filename - Filename for download
     */
    triggerDownload(dataUri, filename) {
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', filename);
        linkElement.click();
    }

    /**
     * Generate filename with timestamp
     * @param {string} prefix - Filename prefix (optional)
     * @returns {string} Generated filename
     */
    generateFilename(prefix = null) {
        const filePrefix = prefix || this.defaultFilePrefix;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${filePrefix}-${timestamp}.json`;
    }

    /**
     * Export filtered events
     * @param {Array<Object>} allEvents - All events
     * @param {Array<Object>} filteredEvents - Filtered events
     * @param {Object} options - Export options
     * @returns {Object} Export result
     */
    exportFiltered(allEvents, filteredEvents, options = {}) {
        const exportOptions = {
            ...options,
            includeMetadata: true
        };

        // Add filter metadata
        const result = this.exportToJSON(filteredEvents, exportOptions);
        
        if (result.success) {
            console.log(`✅ EventExportService: Exported ${filteredEvents.length} of ${allEvents.length} events (filtered)`);
        }

        return result;
    }

    /**
     * Export events by category
     * @param {Array<Object>} events - Array of events
     * @param {string} category - Category to export
     * @param {Object} options - Export options
     * @returns {Object} Export result
     */
    exportByCategory(events, category, options = {}) {
        const categoryEvents = events.filter(event => event.category === category);
        
        const exportOptions = {
            ...options,
            filename: options.filename || this.generateFilename(`events-${category.toLowerCase()}`)
        };

        return this.exportToJSON(categoryEvents, exportOptions);
    }

    /**
     * Export events by date range
     * @param {Array<Object>} events - Array of events
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Object} options - Export options
     * @returns {Object} Export result
     */
    exportByDateRange(events, startDate, endDate, options = {}) {
        const rangeEvents = events.filter(event => {
            const eventDate = new Date(event.timestamp);
            return eventDate >= startDate && eventDate <= endDate;
        });

        const exportOptions = {
            ...options,
            filename: options.filename || this.generateFilename('events-range')
        };

        return this.exportToJSON(rangeEvents, exportOptions);
    }

    /**
     * Export event statistics
     * @param {Object} eventStats - Event statistics
     * @param {Object} options - Export options
     * @returns {Object} Export result
     */
    exportStatistics(eventStats, options = {}) {
        try {
            const filename = options.filename || this.generateFilename('event-statistics');
            const jsonString = JSON.stringify(eventStats, null, 2);
            const dataUri = this.createDataURI(jsonString);
            this.triggerDownload(dataUri, filename);

            console.log(`✅ EventExportService: Exported event statistics to ${filename}`);
            return { success: true, filename };
        } catch (error) {
            console.error('❌ EventExportService: Statistics export failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create CSV export from events
     * @param {Array<Object>} events - Array of events
     * @param {Object} options - Export options
     * @returns {Object} Export result
     */
    exportToCSV(events, options = {}) {
        try {
            const filename = options.filename || this.generateFilename('events').replace('.json', '.csv');
            
            // Create CSV header
            const headers = ['Timestamp', 'Type', 'Category', 'Data'];
            const csvRows = [headers.join(',')];

            // Add event rows
            events.forEach(event => {
                const row = [
                    event.timestamp,
                    event.type,
                    event.category,
                    JSON.stringify(event.data).replace(/,/g, ';') // Replace commas in data
                ];
                csvRows.push(row.join(','));
            });

            const csvString = csvRows.join('\n');
            const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvString)}`;
            this.triggerDownload(dataUri, filename);

            console.log(`✅ EventExportService: Exported ${events.length} events to CSV: ${filename}`);
            return { success: true, filename, eventCount: events.length };
        } catch (error) {
            console.error('❌ EventExportService: CSV export failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Set default filename prefix
     * @param {string} prefix - New prefix
     */
    setDefaultFilePrefix(prefix) {
        this.defaultFilePrefix = prefix;
    }

    /**
     * Get default filename prefix
     * @returns {string} Current prefix
     */
    getDefaultFilePrefix() {
        return this.defaultFilePrefix;
    }
}

// Export singleton instance
export default new EventExportService();