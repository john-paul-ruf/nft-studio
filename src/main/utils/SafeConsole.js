/**
 * Safe console wrapper that prevents EPIPE errors
 * These errors occur when console output stream is closed
 */
class SafeConsole {
    /**
     * Format error objects to extract meaningful information
     * Error objects don't serialize to JSON properly
     * @param {*} arg - Argument to format
     * @returns {*} Formatted argument
     */
    static formatArg(arg) {
        if (arg instanceof Error) {
            return {
                message: arg.message || 'No error message',
                name: arg.name || 'Error',
                code: arg.code,
                stack: arg.stack ? arg.stack.split('\n').slice(0, 4).join('\n') : undefined
            };
        }
        return arg;
    }

    /**
     * Safe console.log wrapper
     * @param {...any} args - Arguments to log
     */
    static log(...args) {
        try {
            // Format error objects before logging
            const formattedArgs = args.map(arg => SafeConsole.formatArg(arg));
            console.log(...formattedArgs);
        } catch (error) {
            // Silently ignore EPIPE and other console errors
            // These typically occur when stdout is closed or piped
            if (error.code !== 'EPIPE') {
                // For non-EPIPE errors, try to at least write to stderr
                try {
                    console.error('Console log failed:', error.message);
                } catch {
                    // Even stderr might be closed, ignore
                }
            }
        }
    }

    /**
     * Safe console.error wrapper
     * @param {...any} args - Arguments to log
     */
    static error(...args) {
        try {
            // Format error objects before logging
            const formattedArgs = args.map(arg => SafeConsole.formatArg(arg));
            console.error(...formattedArgs);
        } catch (error) {
            // Silently ignore console errors
        }
    }

    /**
     * Safe console.warn wrapper
     * @param {...any} args - Arguments to log
     */
    static warn(...args) {
        try {
            // Format error objects before logging
            const formattedArgs = args.map(arg => SafeConsole.formatArg(arg));
            console.warn(...formattedArgs);
        } catch (error) {
            // Silently ignore console errors
        }
    }

    /**
     * Safe console.info wrapper
     * @param {...any} args - Arguments to log
     */
    static info(...args) {
        try {
            // Format error objects before logging
            const formattedArgs = args.map(arg => SafeConsole.formatArg(arg));
            console.info(...formattedArgs);
        } catch (error) {
            // Silently ignore console errors
        }
    }

    /**
     * Safe console.debug wrapper
     * @param {...any} args - Arguments to log
     */
    static debug(...args) {
        try {
            // Format error objects before logging
            const formattedArgs = args.map(arg => SafeConsole.formatArg(arg));
            console.debug(...formattedArgs);
        } catch (error) {
            // Silently ignore console errors
        }
    }
}

export default SafeConsole;