import path from 'path';
import fs from 'fs/promises';

export class PluginManagerService {
    constructor(appDataPath) {
        this.appDataPath = appDataPath;
        this.pluginsDir = path.join(appDataPath, 'plugins');
        this.pluginsConfigPath = path.join(appDataPath, 'plugins-config.json');
        this.loadedPlugins = new Map();
        this.pluginConfigs = [];
    }

    async initialize() {
        try {
            await fs.mkdir(this.pluginsDir, { recursive: true });
            await this.loadPluginConfigs();
        } catch (error) {
            console.error('Failed to initialize plugin manager:', error);
        }
    }

    async loadPluginConfigs() {
        try {
            const configData = await fs.readFile(this.pluginsConfigPath, 'utf8');
            this.pluginConfigs = JSON.parse(configData);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Failed to load plugin configs:', error);
            }
            this.pluginConfigs = [];
        }
    }

    async savePluginConfigs() {
        try {
            await fs.writeFile(
                this.pluginsConfigPath,
                JSON.stringify(this.pluginConfigs, null, 2),
                'utf8'
            );
        } catch (error) {
            console.error('Failed to save plugin configs:', error);
            throw error;
        }
    }

    async addPlugin(pluginData) {
        const { name, path: pluginPath, type, enabled = true } = pluginData;

        const existingIndex = this.pluginConfigs.findIndex(p => p.name === name);
        if (existingIndex >= 0) {
            this.pluginConfigs[existingIndex] = {
                ...this.pluginConfigs[existingIndex],
                ...pluginData,
                updatedAt: new Date().toISOString()
            };
        } else {
            this.pluginConfigs.push({
                name,
                path: pluginPath,
                type,
                enabled,
                addedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        await this.savePluginConfigs();
        return { success: true, message: 'Plugin added successfully' };
    }

    async removePlugin(name) {
        const index = this.pluginConfigs.findIndex(p => p.name === name);
        if (index >= 0) {
            this.pluginConfigs.splice(index, 1);
            await this.savePluginConfigs();
            this.loadedPlugins.delete(name);
            return { success: true, message: 'Plugin removed successfully' };
        }
        return { success: false, message: 'Plugin not found' };
    }

    async togglePlugin(name) {
        const plugin = this.pluginConfigs.find(p => p.name === name);
        if (plugin) {
            plugin.enabled = !plugin.enabled;
            plugin.updatedAt = new Date().toISOString();
            await this.savePluginConfigs();
            return { success: true, enabled: plugin.enabled };
        }
        return { success: false, message: 'Plugin not found' };
    }

    async getPlugins() {
        return this.pluginConfigs;
    }

    async getEnabledPlugins() {
        return this.pluginConfigs.filter(p => p.enabled);
    }

    async validatePlugin(pluginPath) {
        try {
            const fullPath = path.isAbsolute(pluginPath)
                ? pluginPath
                : path.join(this.pluginsDir, pluginPath);

            const stats = await fs.stat(fullPath);

            if (stats.isDirectory()) {
                const packageJsonPath = path.join(fullPath, 'package.json');
                const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

                if (!packageJson.main) {
                    return { valid: false, error: 'Plugin package.json missing main entry point' };
                }

                const mainFile = path.join(fullPath, packageJson.main);
                await fs.access(mainFile);

                return {
                    valid: true,
                    info: {
                        name: packageJson.name,
                        version: packageJson.version,
                        description: packageJson.description,
                        author: packageJson.author,
                        main: packageJson.main
                    }
                };
            } else if (stats.isFile() && pluginPath.endsWith('.js')) {
                return { valid: true, info: { type: 'single-file' } };
            }

            return { valid: false, error: 'Invalid plugin format' };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    async installFromNpm(packageName) {
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);

            const installPath = path.join(this.pluginsDir, 'node_modules');
            await fs.mkdir(installPath, { recursive: true });

            const { stdout, stderr } = await execAsync(
                `npm install ${packageName}`,
                { cwd: this.pluginsDir }
            );

            if (stderr && !stderr.includes('WARN')) {
                throw new Error(stderr);
            }

            const packagePath = path.join(installPath, packageName);
            const validation = await this.validatePlugin(packagePath);

            if (!validation.valid) {
                throw new Error(validation.error);
            }

            await this.addPlugin({
                name: validation.info.name || packageName,
                path: packagePath,
                type: 'npm',
                version: validation.info.version,
                enabled: true
            });

            return { success: true, message: `Plugin ${packageName} installed successfully` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async loadPluginsForGeneration() {
        const enabledPlugins = await this.getEnabledPlugins();
        const loadResults = [];

        for (const plugin of enabledPlugins) {
            try {
                const fullPath = path.isAbsolute(plugin.path)
                    ? plugin.path
                    : path.join(this.pluginsDir, plugin.path);

                loadResults.push({
                    name: plugin.name,
                    path: fullPath,
                    success: true
                });
            } catch (error) {
                console.error(`Failed to prepare plugin ${plugin.name}:`, error);
                loadResults.push({
                    name: plugin.name,
                    path: plugin.path,
                    success: false,
                    error: error.message
                });
            }
        }

        return loadResults;
    }
}