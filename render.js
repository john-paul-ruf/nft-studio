import React from 'react';
import ReactDOM from 'react-dom/client';
import { CSSThemeProvider } from './src/contexts/CSSThemeContext.js';
import App from './src/App.jsx';
import './src/styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <CSSThemeProvider defaultTheme="dark">
    <App />
  </CSSThemeProvider>
);