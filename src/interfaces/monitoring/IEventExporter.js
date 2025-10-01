/**
 * Interface for Event Export Operations
 * 
 * This interface defines the contract for exporting monitored events
 * in various formats for analysis, debugging, and reporting purposes.
 * 
 * @interface IEventExporter
 */
export class IEventExporter {
    /**
     * Exports events to a file in the specified format
     * 
     * @param {Array<Object>} events - Events to export
     * @param {string} filePath - Output file path
     * @param {ExportOptions} [options] - Export options
     * @returns {Promise<ExportResult>} Export operation result
     */
    async exportToFile(events, filePath, options = {}) {
        throw new Error('IEventExporter.exportToFile() must be implemented');
    }

    /**
     * Exports events to a string in the specified format
     * 
     * @param {Array<Object>} events - Events to export
     * @param {ExportOptions} [options] - Export options
     * @returns {Promise<string>} Exported events as string
     */
    async exportToString(events, options = {}) {
        throw new Error('IEventExporter.exportToString() must be implemented');
    }

    /**
     * Exports events to JSON format
     * 
     * @param {Array<Object>} events - Events to export
     * @param {Object} [options] - JSON export options
     * @param {boolean} [options.pretty] - Pretty print JSON
     * @param {Array<string>} [options.fields] - Fields to include
     * @returns {Promise<string>} JSON string
     */
    async exportToJSON(events, options = {}) {
        throw new Error('IEventExporter.exportToJSON() must be implemented');
    }

    /**
     * Exports events to CSV format
     * 
     * @param {Array<Object>} events - Events to export
     * @param {Object} [options] - CSV export options
     * @param {string} [options.delimiter] - CSV delimiter
     * @param {boolean} [options.includeHeaders] - Include column headers
     * @param {Array<string>} [options.columns] - Columns to include
     * @returns {Promise<string>} CSV string
     */
    async exportToCSV(events, options = {}) {
        throw new Error('IEventExporter.exportToCSV() must be implemented');
    }

    /**
     * Exports events to XML format
     * 
     * @param {Array<Object>} events - Events to export
     * @param {Object} [options] - XML export options
     * @param {string} [options.rootElement] - Root element name
     * @param {string} [options.eventElement] - Event element name
     * @param {boolean} [options.pretty] - Pretty print XML
     * @returns {Promise<string>} XML string
     */
    async exportToXML(events, options = {}) {
        throw new Error('IEventExporter.exportToXML() must be implemented');
    }

    /**
     * Exports events to HTML report format
     * 
     * @param {Array<Object>} events - Events to export
     * @param {Object} [options] - HTML export options
     * @param {string} [options.title] - Report title
     * @param {boolean} [options.includeStyles] - Include CSS styles
     * @param {boolean} [options.includeCharts] - Include charts/graphs
     * @returns {Promise<string>} HTML string
     */
    async exportToHTML(events, options = {}) {
        throw new Error('IEventExporter.exportToHTML() must be implemented');
    }

    /**
     * Exports events with custom formatting
     * 
     * @param {Array<Object>} events - Events to export
     * @param {Function} formatter - Custom formatter function
     * @param {Object} [options] - Custom export options
     * @returns {Promise<string>} Formatted string
     */
    async exportWithCustomFormat(events, formatter, options = {}) {
        throw new Error('IEventExporter.exportWithCustomFormat() must be implemented');
    }

    /**
     * Creates a filtered export of events
     * 
     * @param {Array<Object>} events - Events to filter and export
     * @param {Object} filter - Filter criteria
     * @param {ExportOptions} exportOptions - Export options
     * @returns {Promise<ExportResult>} Filtered export result
     */
    async exportFiltered(events, filter, exportOptions) {
        throw new Error('IEventExporter.exportFiltered() must be implemented');
    }

    /**
     * Exports event statistics and summary
     * 
     * @param {Array<Object>} events - Events to analyze
     * @param {Object} [options] - Statistics export options
     * @param {string} [options.format] - Export format
     * @param {boolean} [options.includeCharts] - Include visual charts
     * @returns {Promise<string>} Statistics export
     */
    async exportStatistics(events, options = {}) {
        throw new Error('IEventExporter.exportStatistics() must be implemented');
    }

    /**
     * Exports events in batches for large datasets
     * 
     * @param {Array<Object>} events - Events to export
     * @param {number} batchSize - Size of each batch
     * @param {ExportOptions} options - Export options
     * @param {Function} [progressCallback] - Progress callback function
     * @returns {Promise<Array<ExportResult>>} Array of batch export results
     */
    async exportInBatches(events, batchSize, options, progressCallback = null) {
        throw new Error('IEventExporter.exportInBatches() must be implemented');
    }

    /**
     * Compresses exported data
     * 
     * @param {string} data - Data to compress
     * @param {Object} [options] - Compression options
     * @param {string} [options.algorithm] - Compression algorithm
     * @param {number} [options.level] - Compression level
     * @returns {Promise<Buffer>} Compressed data
     */
    async compressExport(data, options = {}) {
        throw new Error('IEventExporter.compressExport() must be implemented');
    }

    /**
     * Validates export data before processing
     * 
     * @param {Array<Object>} events - Events to validate
     * @param {ExportOptions} options - Export options
     * @returns {Promise<ValidationResult>} Validation result
     */
    async validateExportData(events, options) {
        throw new Error('IEventExporter.validateExportData() must be implemented');
    }

    /**
     * Gets supported export formats
     * 
     * @returns {Array<string>} Array of supported format names
     */
    getSupportedFormats() {
        throw new Error('IEventExporter.getSupportedFormats() must be implemented');
    }

    /**
     * Gets export format capabilities
     * 
     * @param {string} format - Format name
     * @returns {Object} Format capabilities and options
     */
    getFormatCapabilities(format) {
        throw new Error('IEventExporter.getFormatCapabilities() must be implemented');
    }

    /**
     * Estimates export size and duration
     * 
     * @param {Array<Object>} events - Events to export
     * @param {ExportOptions} options - Export options
     * @returns {Promise<ExportEstimate>} Size and duration estimates
     */
    async estimateExport(events, options) {
        throw new Error('IEventExporter.estimateExport() must be implemented');
    }

    /**
     * Cancels an ongoing export operation
     * 
     * @param {string} exportId - Export operation ID
     * @returns {Promise<boolean>} True if export was cancelled
     */
    async cancelExport(exportId) {
        throw new Error('IEventExporter.cancelExport() must be implemented');
    }

    /**
     * Gets the status of an export operation
     * 
     * @param {string} exportId - Export operation ID
     * @returns {ExportStatus} Current export status
     */
    getExportStatus(exportId) {
        throw new Error('IEventExporter.getExportStatus() must be implemented');
    }
}

/**
 * Export options structure
 * @typedef {Object} ExportOptions
 * @property {string} format - Export format ('json', 'csv', 'xml', 'html')
 * @property {Array<string>} [fields] - Fields to include in export
 * @property {Object} [filter] - Filter criteria for events
 * @property {boolean} [compress] - Whether to compress output
 * @property {Object} [formatOptions] - Format-specific options
 */

/**
 * Export result structure
 * @typedef {Object} ExportResult
 * @property {boolean} success - Whether export was successful
 * @property {string} [filePath] - Path to exported file
 * @property {number} eventCount - Number of events exported
 * @property {number} fileSize - Size of exported file in bytes
 * @property {number} duration - Export duration in milliseconds
 * @property {string} [error] - Error message if export failed
 */

/**
 * Export estimate structure
 * @typedef {Object} ExportEstimate
 * @property {number} estimatedSize - Estimated file size in bytes
 * @property {number} estimatedDuration - Estimated duration in milliseconds
 * @property {number} eventCount - Number of events to export
 * @property {Array<string>} warnings - Any warnings about the export
 */

/**
 * Export status enumeration
 * @typedef {string} ExportStatus
 * @enum {string}
 */
export const ExportStatus = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    ERROR: 'error'
};

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether data is valid for export
 * @property {Array<string>} errors - List of validation errors
 * @property {Array<string>} warnings - List of validation warnings
 */