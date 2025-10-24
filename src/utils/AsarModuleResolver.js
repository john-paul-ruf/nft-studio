import electron from 'electron';
import path from 'path';
import fs from 'fs';

/**
 * AsarModuleResolver - Resolves module paths for ASAR-packaged Electron apps
 * 
 * Plugins running from the user's data directory need to resolve modules
 * (like my-nft-gen) that are bundled inside the app's ASAR archive.
 * 
 * This resolver sets up the correct NODE_PATH to allow proper module resolution.
 */
class AsarModuleResolver {
    constructor() {
        this._resolvedNodePath = null;
        this._isProduction = null;
    }

    /**
     * Check if running in production (packaged) mode
     * @returns {boolean} True if running in packaged app
     */
    isProduction() {
        if (this._isProduction === null) {
            this._isProduction = electron?.app?.isPackaged || false;
        }
        return this._isProduction;
    }

    /**
     * Get the unpacked base path for ASAR resources
     * @returns {string} Base path for unpacked resources
     */
    getUnpackedBasePath() {
        if (!this.isProduction()) {
            return process.cwd();
        }

        const appPath = electron?.app?.getAppPath?.() || '';
        
        // If already in .asar.unpacked, use it directly
        if (appPath.includes('.asar.unpacked')) {
            return appPath;
        }
        
        // Otherwise, construct the unpacked path
        if (appPath.includes('.asar')) {
            return appPath.replace('.asar', '.asar.unpacked');
        }
        
        return appPath;
    }

    /**
     * Get the path to node_modules directory containing bundled packages
     * @returns {string} Path to node_modules
     */
    getNodeModulesPath() {
        const unpackedBase = this.getUnpackedBasePath();
        return path.join(unpackedBase, 'node_modules');
    }

    /**
     * Get the resolved NODE_PATH for module resolution
     * This enables plugins to resolve modules from the app bundle
     * @returns {string} NODE_PATH value
     */
    getResolvedNodePath() {
        if (this._resolvedNodePath) {
            return this._resolvedNodePath;
        }

        const nodeModulesPath = this.getNodeModulesPath();
        
        // Verify the path exists
        if (!fs.existsSync(nodeModulesPath)) {
            console.warn(`[AsarModuleResolver] node_modules path does not exist: ${nodeModulesPath}`);
        }

        this._resolvedNodePath = nodeModulesPath;
        return this._resolvedNodePath;
    }

    /**
     * Configure NODE_PATH in the process environment
     * Must be called before loading plugins
     * @returns {void}
     */
    configureNodePath() {
        const nodeModulesPath = this.getResolvedNodePath();
        
        // Append to existing NODE_PATH if it exists
        const existingNodePath = process.env.NODE_PATH || '';
        const newNodePath = existingNodePath 
            ? `${nodeModulesPath}${path.delimiter}${existingNodePath}`
            : nodeModulesPath;
        
        process.env.NODE_PATH = newNodePath;
        console.log(`[AsarModuleResolver] NODE_PATH configured: ${newNodePath}`);
    }

    /**
     * Get diagnostic information about module resolution
     * @returns {Object} Diagnostic information
     */
    getDiagnostics() {
        return {
            isProduction: this.isProduction(),
            appPath: electron?.app?.getAppPath?.() || 'N/A',
            unpackedBasePath: this.getUnpackedBasePath(),
            nodeModulesPath: this.getNodeModulesPath(),
            nodeModulesExists: fs.existsSync(this.getNodeModulesPath()),
            myNftGenPath: path.join(this.getNodeModulesPath(), 'my-nft-gen'),
            myNftGenExists: fs.existsSync(path.join(this.getNodeModulesPath(), 'my-nft-gen'))
        };
    }

    /**
     * Get singleton instance
     * @returns {AsarModuleResolver} Singleton instance
     */
    static getInstance() {
        if (!AsarModuleResolver._instance) {
            AsarModuleResolver._instance = new AsarModuleResolver();
        }
        return AsarModuleResolver._instance;
    }
}

// Static instance holder
AsarModuleResolver._instance = null;

// Export singleton instance as default and class for testing
export default AsarModuleResolver.getInstance();
export { AsarModuleResolver };