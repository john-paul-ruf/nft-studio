/**
 * useCSSTheme Hook
 * 
 * Provides access to CSS theme context and theme switching functionality.
 * 
 * Usage:
 * ```jsx
 * import { useCSSTheme } from '../hooks/useCSSTheme.js';
 * 
 * export function ThemeToggle() {
 *   const { theme, setTheme, availableThemes } = useCSSTheme();
 *   
 *   return (
 *     <div>
 *       <p>Current theme: {theme}</p>
 *       {availableThemes.map(t => (
 *         <button key={t} onClick={() => setTheme(t)}>
 *           {t}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { useContext } from 'react';
import { CSSThemeContext } from '../contexts/CSSThemeContext.js';

/**
 * Hook to access CSS theme context
 * 
 * @returns {Object} Theme context object with:
 *   - theme: Current theme name
 *   - setTheme: Function to set theme
 *   - cycleTheme: Function to cycle through themes
 *   - toggleTheme: Function to toggle between dark and light
 *   - resetTheme: Function to reset to default
 *   - availableThemes: Array of available theme names
 *   - isInitialized: Whether theme has been initialized
 * 
 * @throws {Error} If used outside CSSThemeProvider
 */
export function useCSSTheme() {
  const context = useContext(CSSThemeContext);
  
  if (!context) {
    throw new Error(
      'useCSSTheme must be used within a CSSThemeProvider. ' +
      'Make sure to wrap your application with <CSSThemeProvider>.'
    );
  }
  
  return context;
}

export default useCSSTheme;