/**
 * CSS Theme Context
 * 
 * Provides theme switching functionality for CSS-based styling.
 * Supports dark, light, and high-contrast themes via CSS variables.
 * 
 * Usage:
 * ```jsx
 * import { useCSSTheme } from '../hooks/useCSSTheme.js';
 * 
 * function MyComponent() {
 *   const { theme, setTheme } = useCSSTheme();
 *   
 *   return (
 *     <button onClick={() => setTheme('light')}>
 *       Current theme: {theme}
 *     </button>
 *   );
 * }
 * ```
 */

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * Theme context
 * @type {React.Context}
 */
export const CSSThemeContext = createContext();

/**
 * Available themes
 * @type {string[]}
 */
export const AVAILABLE_THEMES = ['dark', 'light', 'high-contrast'];

/**
 * Default theme
 * @type {string}
 */
export const DEFAULT_THEME = 'dark';

/**
 * Theme storage key
 * @type {string}
 */
const THEME_STORAGE_KEY = 'effects-panel-theme';

/**
 * CSSThemeProvider Component
 * 
 * Wraps application to provide theme context and CSS variable management.
 * 
 * Features:
 * - Persists theme preference to localStorage
 * - Respects system preference for reduced motion
 * - Updates document data-theme attribute for CSS variable scoping
 * - Exports theme context for use with useCSSTheme hook
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.defaultTheme - Initial theme (default: 'dark')
 * @param {Function} props.onThemeChange - Callback when theme changes (optional)
 * @returns {React.ReactElement}
 */
export function CSSThemeProvider({ 
  children, 
  defaultTheme = DEFAULT_THEME,
  onThemeChange = null 
}) {
  const [theme, setThemeState] = useState(defaultTheme);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme from storage or system preference
  useEffect(() => {
    try {
      // Try to get saved theme from localStorage
      const savedTheme = localStorage?.getItem(THEME_STORAGE_KEY);
      if (savedTheme && AVAILABLE_THEMES.includes(savedTheme)) {
        setThemeState(savedTheme);
      } else if (!savedTheme) {
        // Check system preference
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
        const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)')?.matches;
        if (prefersDark) {
          setThemeState('dark');
        } else if (prefersLight) {
          setThemeState('light');
        }
      }
    } catch (error) {
      console.warn('Failed to initialize theme:', error);
    }
    setIsInitialized(true);
  }, []);

  // Update document attribute and localStorage when theme changes
  useEffect(() => {
    if (!isInitialized) return;

    try {
      // Update document data-theme attribute for CSS variable scoping
      document.documentElement.setAttribute('data-theme', theme);
      
      // Persist theme preference
      localStorage?.setItem(THEME_STORAGE_KEY, theme);
      
      // Emit callback if provided
      if (onThemeChange) {
        onThemeChange(theme);
      }
    } catch (error) {
      console.warn('Failed to update theme:', error);
    }
  }, [theme, isInitialized, onThemeChange]);

  /**
   * Set theme with validation
   * @param {string} newTheme - Theme to set
   */
  const setTheme = useCallback((newTheme) => {
    if (AVAILABLE_THEMES.includes(newTheme)) {
      setThemeState(newTheme);
    } else {
      console.warn(`Invalid theme: ${newTheme}. Available themes: ${AVAILABLE_THEMES.join(', ')}`);
    }
  }, []);

  /**
   * Cycle through available themes
   * @returns {string} New theme
   */
  const cycleTheme = useCallback(() => {
    const currentIndex = AVAILABLE_THEMES.indexOf(theme);
    const nextIndex = (currentIndex + 1) % AVAILABLE_THEMES.length;
    const nextTheme = AVAILABLE_THEMES[nextIndex];
    setTheme(nextTheme);
    return nextTheme;
  }, [theme, setTheme]);

  /**
   * Toggle between dark and light themes
   * @returns {string} New theme
   */
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    return newTheme;
  }, [theme, setTheme]);

  /**
   * Reset theme to default
   */
  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME);
  }, [setTheme]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    cycleTheme,
    toggleTheme,
    resetTheme,
    availableThemes: AVAILABLE_THEMES,
    isInitialized,
  }), [theme, setTheme, cycleTheme, toggleTheme, resetTheme, isInitialized]);

  return (
    <CSSThemeContext.Provider value={value}>
      {children}
    </CSSThemeContext.Provider>
  );
}

CSSThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
  defaultTheme: PropTypes.oneOf(AVAILABLE_THEMES),
  onThemeChange: PropTypes.func,
};

export default CSSThemeProvider;