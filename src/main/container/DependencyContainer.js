/**
 * Dependency Injection Container
 * Implements Dependency Inversion Principle
 * Manages object creation and dependency resolution
 */
class DependencyContainer {
    constructor() {
        this.dependencies = new Map();
        this.singletons = new Map();
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
        // Check if singleton instance already exists
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Check if dependency is registered
        const dependency = this.dependencies.get(name);
        if (!dependency) {
            throw new Error(`Dependency '${name}' not found. Make sure it's registered.`);
        }

        // Create instance using factory
        const instance = dependency.factory(this);

        // Store singleton instance if needed
        if (dependency.singleton) {
            this.singletons.set(name, instance);
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