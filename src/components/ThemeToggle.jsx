import React, { useState, useEffect } from 'react';
import './ThemeToggle.bem.css';

/**
 * ThemeToggle Component
 * 
 * Temporary dev control for testing token-based theming across light/dark/high-contrast.
 * Add this to your dev toolbar or a dedicated debug panel.
 * 
 * Exit Criteria for Phase 0: This validates that themes switch and tokens update correctly.
 */
export function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState('dark');

  // Initialize from document or localStorage
  useEffect(() => {
    const stored = localStorage.getItem('nft-studio-theme') || 'dark';
    setCurrentTheme(stored);
    applyTheme(stored);
  }, []);

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nft-studio-theme', theme);
  };

  const handleThemeChange = (newTheme) => {
    setCurrentTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <div className="theme-toggle">
      <label className="theme-toggle__label">
        Theme:
      </label>

      {['dark', 'light', 'high-contrast'].map((theme) => (
        <button
          key={theme}
          onClick={() => handleThemeChange(theme)}
          className={`theme-toggle__button ${currentTheme === theme ? 'theme-toggle__button--active' : ''}`}
        >
          {theme}
        </button>
      ))}

      <small className="theme-toggle__status">
        [data-theme="{currentTheme}"]
      </small>
    </div>
  );
}

export default ThemeToggle;