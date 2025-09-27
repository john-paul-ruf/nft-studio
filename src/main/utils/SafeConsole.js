/**
 * Safe console wrapper that prevents EPIPE errors
 * These errors occur when console output stream is closed
 */
class SafeConsole {
    /**
     * Safe console.log wrapper
     * @param {...any} args - Arguments to log
     */
    static log(...args) {
        try {
            console.log(...args);
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
            console.error(...args);
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
            console.warn(...args);
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
            console.info(...args);
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
            console.debug(...args);
        } catch (error) {
            // Silently ignore console errors
        }
    }
}

export default SafeConsole;