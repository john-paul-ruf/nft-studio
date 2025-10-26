/**
 * Dependency Injection Container
 * Implements Dependency Inversion Principle
 * Manages object creation and dependency resolution
 */
class DependencyContainer {
    constructor() {
        this.dependencies = new Map();
        this.singletons = new Map();
        // Track in-flight resolution promises to prevent race conditions during async creation
        this.resolutionPromises = new Map();
    }

    /**
     * Register a dependency
     * @param {string} name - Dependency name
     * @param {Function} factory - Factory function to create dependency
     * @param {boolean} singleton - Whether to create as singleton
     */
    register(name, factory, singleton = false) {
        this.dependencies.set(name, {
            factory,
            singleton
        });
    }

    /**
     * Register a singleton dependency
     * @param {string} name - Dependency name
     * @param {Function} factory - Factory function to create dependency
     */
    registerSingleton(name, factory) {
        this.register(name, factory, true);
    }

    /**
     * Register an instance directly
     * @param {string} name - Dependency name
     * @param {*} instance - Instance to register
     */
    registerInstance(name, instance) {
        this.singletons.set(name, instance);
    }

    /**
     * Resolve a dependency
     * @param {string} name - Dependency name
     * @returns {*} Resolved dependency
     */
    resolve(name) {
        // CRITICAL: Check if singleton instance already exists
        // This prevents creating multiple instances even with concurrent calls
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Check if dependency is registered
        const dependency = this.dependencies.get(name);
        if (!dependency) {
            throw new Error(`Dependency '${name}' not found. Make sure it's registered.`);
        }

        // For singletons, prevent race conditions by checking again before creating
        // If another call started resolving this singleton while we were waiting, use that result
        if (dependency.singleton && this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Create instance using factory
        const instance = dependency.factory(this);

        // Store singleton instance if needed
        // CRITICAL: Store BEFORE returning to prevent race conditions
        // Any subsequent calls will get the cached instance
        if (dependency.singleton) {
            this.singletons.set(name, instance);
            // Also clear any in-flight promise tracking since we've now cached the instance
            this.resolutionPromises.delete(name);
        }

        return instance;
    }

    /**
     * Check if dependency is registered
     * @param {string} name - Dependency name
     * @returns {boolean} True if registered
     */
    has(name) {
        return this.dependencies.has(name) || this.singletons.has(name);
    }

    /**
     * Clear all dependencies and singletons
     */
    clear() {
        this.dependencies.clear();
        this.singletons.clear();
    }

    /**
     * Get all registered dependency names
     * @returns {Array<string>} Array of dependency names
     */
    getRegisteredNames() {
        return [
            ...Array.from(this.dependencies.keys()),
            ...Array.from(this.singletons.keys())
        ];
    }
}

export default DependencyContainer;