import React, { createContext, useContext, useMemo } from 'react';
const FrontendServiceFactory = require('../container/FrontendServiceFactory');

/**
 * Service Context for dependency injection in React components
 * Implements Dependency Inversion Principle in React
 */
const ServiceContext = createContext(null);

/**
 * Service Provider component
 * Provides all services to child components through React Context
 */
export function ServiceProvider({ children, value = null, serviceFactory = null }) {
    const services = useMemo(() => {
        // Use provided value if available, otherwise create from factory
        if (value) {
            return value;
        }

        const factory = serviceFactory || FrontendServiceFactory;
        return factory.createContextValue();
    }, [value, serviceFactory]);

    return (
        <ServiceContext.Provider value={services}>
            {children}
        </ServiceContext.Provider>
    );
}

/**
 * Hook to get all services
 * @returns {Object} All services
 */
export function useServices() {
    const services = useContext(ServiceContext);

    if (!services) {
        throw new Error('useServices must be used within a ServiceProvider');
    }

    return services;
}

/**
 * Hook to get project service
 * @returns {IProjectService} Project service
 */
export function useProjectService() {
    const { projectService } = useServices();
    return projectService;
}

/**
 * Hook to get effect service
 * @returns {IEffectService} Effect service
 */
export function useEffectService() {
    const { effectService } = useServices();
    return effectService;
}

/**
 * Hook to get file service
 * @returns {IFileService} File service
 */
export function useFileService() {
    const { fileService } = useServices();
    return fileService;
}

/**
 * Hook to get navigation service
 * @returns {INavigationService} Navigation service
 */
export function useNavigationService() {
    const { navigationService } = useServices();
    return navigationService;
}

/**
 * Hook to get color scheme service
 * @returns {Object} Color scheme service
 */
export function useColorSchemeService() {
    const { colorSchemeService } = useServices();
    return colorSchemeService;
}

/**
 * Hook to get preferences service
 * @returns {Object} Preferences service
 */
export function usePreferencesService() {
    const { preferencesService } = useServices();
    return preferencesService;
}

/**
 * Higher-order component for injecting services
 * @param {React.Component} Component - Component to wrap
 * @returns {React.Component} Wrapped component with services
 */
export function withServices(Component) {
    return function ServiceInjectedComponent(props) {
        const services = useServices();
        return <Component {...props} services={services} />;
    };
}

/**
 * Hook for specific service by name
 * @param {string} serviceName - Name of service to get
 * @returns {*} Service instance
 */
export function useService(serviceName) {
    const services = useServices();
    const service = services[serviceName];

    if (!service) {
        throw new Error(`Service '${serviceName}' not found in context`);
    }

    return service;
}