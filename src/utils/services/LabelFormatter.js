/**
 * Service for formatting labels
 * Follows Single Responsibility Principle - only handles label formatting
 */
class LabelFormatter {
    /**
     * Format property name into human-readable label
     * @param {string} propertyName - Property name
     * @returns {string} Formatted label
     */
    static formatLabel(propertyName) {
        if (!propertyName || typeof propertyName !== 'string') {
            return '';
        }

        return propertyName
            // Insert space before uppercase letters (camelCase to words)
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            // Replace underscores and dashes with spaces
            .replace(/[_-]/g, ' ')
            // Capitalize first letter of each word
            .replace(/\b\w/g, letter => letter.toUpperCase())
            // Clean up multiple spaces
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Format label with context
     * @param {string} propertyName - Property name
     * @param {string} context - Context information
     * @returns {string} Formatted label with context
     */
    static formatLabelWithContext(propertyName, context) {
        const baseLabel = this.formatLabel(propertyName);

        if (!context) {
            return baseLabel;
        }

        return `${baseLabel} (${context})`;
    }

    /**
     * Generate description from property name
     * @param {string} propertyName - Property name
     * @param {*} value - Property value for context
     * @returns {string} Generated description
     */
    static generateDescription(propertyName, value) {
        const name = propertyName.toLowerCase();
        const label = this.formatLabel(propertyName);

        // Common descriptions based on property name patterns
        if (name.includes('percent') || name.includes('percentage')) {
            return `${label} as a percentage (0-100)`;
        }
        if (name.includes('opacity') || name.includes('alpha')) {
            return `${label} from 0 (transparent) to 100 (opaque)`;
        }
        if (name.includes('color') || name.includes('colour')) {
            return `${label} in hex format (e.g., #FF0000)`;
        }
        if (name.includes('size') || name.includes('width') || name.includes('height')) {
            return `${label} in pixels`;
        }
        if (name.includes('count') || name.includes('number')) {
            return `Number of ${label.toLowerCase()}`;
        }
        if (name.includes('enable') || name.includes('show') || name.includes('visible')) {
            return `Enable or disable ${label.toLowerCase()}`;
        }
        if (name.includes('position') || name.includes('offset')) {
            return `${label} coordinates`;
        }
        if (name.includes('speed') || name.includes('velocity')) {
            return `${label} (higher values = faster)`;
        }
        if (name.includes('delay') || name.includes('duration')) {
            return `${label} in milliseconds`;
        }

        // Default description based on type
        if (typeof value === 'boolean') {
            return `Enable or disable ${label.toLowerCase()}`;
        }
        if (typeof value === 'number') {
            return `Numeric value for ${label.toLowerCase()}`;
        }
        if (typeof value === 'string') {
            return `Text value for ${label.toLowerCase()}`;
        }

        return `Configuration for ${label.toLowerCase()}`;
    }

    /**
     * Generate placeholder text
     * @param {string} propertyName - Property name
     * @param {*} value - Property value for context
     * @returns {string} Generated placeholder
     */
    static generatePlaceholder(propertyName, value) {
        const name = propertyName.toLowerCase();

        if (name.includes('name') || name.includes('title')) {
            return 'Enter name...';
        }
        if (name.includes('description') || name.includes('text')) {
            return 'Enter description...';
        }
        if (name.includes('color') || name.includes('colour')) {
            return '#FF0000';
        }
        if (name.includes('email')) {
            return 'user@example.com';
        }
        if (name.includes('url') || name.includes('link')) {
            return 'https://example.com';
        }

        // Default based on type
        if (typeof value === 'number') {
            return '0';
        }
        if (typeof value === 'string') {
            return 'Enter value...';
        }

        return '';
    }

    /**
     * Format validation error message
     * @param {string} propertyName - Property name
     * @param {string} errorType - Type of error
     * @param {*} context - Additional context
     * @returns {string} Formatted error message
     */
    static formatErrorMessage(propertyName, errorType, context = null) {
        const label = this.formatLabel(propertyName);

        switch (errorType) {
            case 'required':
                return `${label} is required`;
            case 'min':
                return `${label} must be at least ${context}`;
            case 'max':
                return `${label} must be no more than ${context}`;
            case 'minLength':
                return `${label} must be at least ${context} characters`;
            case 'maxLength':
                return `${label} must be no more than ${context} characters`;
            case 'pattern':
                return `${label} format is invalid`;
            case 'email':
                return `${label} must be a valid email address`;
            case 'url':
                return `${label} must be a valid URL`;
            case 'color':
                return `${label} must be a valid color (e.g., #FF0000)`;
            default:
                return `${label} is invalid`;
        }
    }

    /**
     * Format help text
     * @param {string} propertyName - Property name
     * @param {*} value - Property value for context
     * @returns {string} Help text
     */
    static formatHelpText(propertyName, value) {
        const name = propertyName.toLowerCase();

        if (name.includes('regex') || name.includes('pattern')) {
            return 'Use regular expression syntax';
        }
        if (name.includes('json')) {
            return 'Valid JSON format required';
        }
        if (name.includes('css')) {
            return 'Valid CSS syntax required';
        }

        return '';
    }
}

export default LabelFormatter;