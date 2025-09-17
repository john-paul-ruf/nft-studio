import React from 'react';
import './Spinner.css';

/**
 * Reusable spinner component for loading states
 */
export default function Spinner({
    size = 'medium',
    color = 'primary',
    message = null,
    overlay = false
}) {
    const spinnerClass = `spinner spinner-${size} spinner-${color}`;

    const spinner = (
        <div className={spinnerClass}>
            <div className="spinner-circle"></div>
            {message && <div className="spinner-message">{message}</div>}
        </div>
    );

    if (overlay) {
        return (
            <div className="spinner-overlay">
                {spinner}
            </div>
        );
    }

    return spinner;
}