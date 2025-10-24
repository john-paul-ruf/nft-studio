import https from 'https';
import http from 'http';
import { createWriteStream, promises as fs } from 'fs';
import { createReadStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { execSync } from 'child_process';
import defaultLogger from '../main/utils/logger.js';

/**
 * Service for downloading and installing plugins from npm registry
 * Works in both development and production environments
 * Supports direct npm registry access (doesn't require npm CLI)
 */
export class PluginDownloadService {
    constructor(pluginsDir, logger = null) {
        this.pluginsDir = pluginsDir;
        this.logger = logger || defaultLogger;
        this.npmRegistry = 'https://registry.npmjs.org';
        this.downloadTimeout = 60000; // 60 seconds
    }

    /**
     * Download and install a plugin package from npm registry
     * @param {string} packageName - Package name (e.g., 'my-plugin' or '@scope/my-plugin')
     * @param {Function} onProgress - Optional callback for progress updates
     * @returns {Promise<Object>} Installation result
     */
    async installPackage(packageName, onProgress = null) {
        try {
            this._log(`Starting installation of ${packageName}`);

            // Step 1: Fetch package info from npm registry
            this._notifyProgress(onProgress, 'Fetching package info...', 10);
            const packageInfo = await this._fetchPackageInfo(packageName);
            if (!packageInfo) {
                throw new Error(`Package "${packageName}" not found on npm registry`);
            }

            // Step 2: Download the tarball
            this._notifyProgress(onProgress, 'Downloading package...', 30);
            const tarballPath = await this._downloadTarball(packageInfo, packageName);
            this._log(`Downloaded to: ${tarballPath}`);

            // Step 3: Extract the tarball
            this._notifyProgress(onProgress, 'Extracting files...', 60);
            const extractPath = await this._extractTarball(tarballPath, packageName);
            this._log(`Extracted to: ${extractPath}`);

            // Step 4: Validate the plugin
            this._notifyProgress(onProgress, 'Validating plugin...', 80);
            const packageJson = await this._validatePlugin(extractPath);

            // Step 5: Cleanup tarball and move to final location
            this._notifyProgress(onProgress, 'Finalizing installation...', 90);
            await fs.unlink(tarballPath);

            this._notifyProgress(onProgress, 'Installation complete!', 100);

            return {
                success: true,
                info: {
                    name: packageJson.name,
                    version: packageJson.version,
                    description: packageJson.description,
                    author: packageJson.author,
                    main: packageJson.main
                },
                extractPath
            };
        } catch (error) {
            this.logger.error(`Failed to install package ${packageName}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fetch package info from npm registry
     * @private
     */
    async _fetchPackageInfo(packageName) {
        return new Promise((resolve, reject) => {
            const encodedName = encodeURIComponent(packageName);
            const url = `${this.npmRegistry}/${encodedName}`;

            this._log(`Fetching package info from: ${url}`);

            const protocol = url.startsWith('https') ? https : http;
            const request = protocol.get(url, { timeout: this.downloadTimeout }, (response) => {
                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    if (response.statusCode === 200) {
                        try {
                            const json = JSON.parse(data);
                            resolve(json);
                        } catch (e) {
                            reject(new Error(`Invalid JSON response for ${packageName}`));
                        }
                    } else if (response.statusCode === 404) {
                        resolve(null); // Package not found
                    } else {
                        reject(new Error(`HTTP ${response.statusCode}: Failed to fetch package info`));
                    }
                });
            });

            request.on('error', reject);
            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Request timeout while fetching package info'));
            });
        });
    }

    /**
     * Download tarball from npm registry
     * @private
     */
    async _downloadTarball(packageInfo, packageName) {
        const latestVersion = packageInfo['dist-tags']?.latest;
        if (!latestVersion) {
            throw new Error(`No version found for ${packageName}`);
        }

        const versionInfo = packageInfo.versions[latestVersion];
        if (!versionInfo || !versionInfo.dist || !versionInfo.dist.tarball) {
            throw new Error(`No tarball found for ${packageName}@${latestVersion}`);
        }

        const tarballUrl = versionInfo.dist.tarball;
        const tarballPath = path.join(this.pluginsDir, `${packageName.replace('/', '-')}-${latestVersion}.tgz`);

        this._log(`Downloading from: ${tarballUrl}`);

        return new Promise((resolve, reject) => {
            const protocol = tarballUrl.startsWith('https') ? https : http;
            const request = protocol.get(tarballUrl, { timeout: this.downloadTimeout }, (response) => {
                if (response.statusCode === 200) {
                    const writeStream = createWriteStream(tarballPath);
                    pipeline(response, writeStream)
                        .then(() => resolve(tarballPath))
                        .catch(reject);
                } else {
                    reject(new Error(`HTTP ${response.statusCode}: Failed to download tarball`));
                }
            });

            request.on('error', reject);
            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Request timeout while downloading tarball'));
            });
        });
    }

    /**
     * Extract tarball using tar command or fallback
     * @private
     */
    async _extractTarball(tarballPath, packageName) {
        const extractDir = path.join(this.pluginsDir, packageName.replace('/', '-'));

        // Ensure extract directory exists
        await fs.mkdir(extractDir, { recursive: true });

        try {
            // Try using system tar command first (most reliable)
            this._log(`Attempting to extract with system tar...`);
            execSync(`tar -xzf "${tarballPath}" -C "${extractDir}" --strip-components=1`, {
                stdio: 'pipe'
            });
            this._log(`Extracted successfully using system tar`);
            return extractDir;
        } catch (error) {
            this.logger.warn(`System tar failed, attempting Node.js implementation:`, error.message);

            // Fallback: Try using Node.js tar package if available
            try {
                const tar = await import('tar');
                await tar.x({
                    file: tarballPath,
                    cwd: extractDir,
                    strip: 1
                });
                this._log(`Extracted successfully using Node.js tar`);
                return extractDir;
            } catch (nodeError) {
                throw new Error(
                    `Failed to extract tarball. Ensure 'tar' is available on your system. ` +
                    `Error: ${nodeError.message}`
                );
            }
        }
    }

    /**
     * Validate plugin structure and package.json
     * @private
     */
    async _validatePlugin(pluginPath) {
        try {
            const packageJsonPath = path.join(pluginPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

            if (!packageJson.main) {
                throw new Error('Plugin package.json missing required "main" entry point');
            }

            const mainFile = path.join(pluginPath, packageJson.main);
            await fs.access(mainFile);

            this._log(`Plugin validated: ${packageJson.name}@${packageJson.version}`);

            return packageJson;
        } catch (error) {
            throw new Error(`Plugin validation failed: ${error.message}`);
        }
    }

    /**
     * Helper to notify progress
     * @private
     */
    _notifyProgress(onProgress, message, percentage) {
        this._log(`[${percentage}%] ${message}`);
        if (onProgress) {
            try {
                onProgress(percentage, message);
            } catch (error) {
                this.logger.warn('Progress callback error:', error);
            }
        }
    }

    /**
     * Helper to log messages
     * @private
     */
    _log(message) {
        this.logger.info(`[PluginDownloadService] ${message}`);
    }
}