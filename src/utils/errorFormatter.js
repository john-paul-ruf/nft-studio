/**
 * Error formatting utility for renderer process
 * Formats Error objects to show their properties when logging
 */

/**
 * Format Error objects to extract their properties
 * @param {*} error - Error object or any value
 * @returns {*} Formatted error or original value
 */
export function formatError(error) {
    if (error instanceof Error) {
        return {
            message: error.message,
            name: error.name,
            code: error.code,
            stack: error.stack
        };
    }
    return error;
}

/**
 * Safe console.error that formats Error objects
 * @param {...any} args - Arguments to log
 */
export function safeConsoleError(...args) {
    const formattedArgs = args.map(arg => {
        if (arg instanceof Error) {
            return formatError(arg);
        }
        return arg;
    });
    console.error(...formattedArgs);
}

/**
 * Safe console.log that formats Error objects
 * @param {...any} args - Arguments to log
 */
export function safeConsoleLog(...args) {
    const formattedArgs = args.map(arg => {
        if (arg instanceof Error) {
            return formatError(arg);
        }
        return arg;
    });
    console.log(...formattedArgs);
}

/**
 * Safe console.warn that formats Error objects
 * @param {...any} args - Arguments to log
 */
export function safeConsoleWarn(...args) {
    const formattedArgs = args.map(arg => {
        if (arg instanceof Error) {
            return formatError(arg);
        }
        return arg;
    });
    console.warn(...formattedArgs);
}