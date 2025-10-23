import React, { useState, useRef, useCallback } from 'react';
import NumberFormatter from '../../../utils/NumberFormatter.js';
import useDebounce from '../../../hooks/useDebounce.js';
import './ArrayInput.bem.css';

/**
 * Enhanced array input component with drag & drop, inline editing, and mixed type support
 * Supports numeric arrays, string arrays, and mixed arrays
 */
function ArrayInput({ field, value, onChange }) {
    const [editingIndex, setEditingIndex] = useState(null);
    const [editingValue, setEditingValue] = useState('');
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [newItemValue, setNewItemValue] = useState('');
    const [newItemType, setNewItemType] = useState('auto'); // 'auto', 'number', 'string'
    const inputRef = useRef(null);
    
    // Debounced onChange for inline editing
    const debouncedOnChange = useDebounce(useCallback((name, val) => {
        onChange(name, val);
    }, [onChange]), 300);

    const currentArray = Array.isArray(value) ? value : field.default || [];
    const arrayType = field.arrayType || 'mixed'; // 'number', 'string', 'mixed'

    // Detect the type of a value
    const detectValueType = (val) => {
        if (typeof val === 'number') return 'number';
        if (typeof val === 'string') {
            const num = parseFloat(val);
            return !isNaN(num) && isFinite(num) ? 'number' : 'string';
        }
        return 'string';
    };

    // Format value for display
    const formatValue = (val) => {
        if (typeof val === 'number') {
            return NumberFormatter.formatForDisplay(val);
        }
        return String(val);
    };

    // Parse value from string based on type
    const parseValue = (str, targetType = 'auto') => {
        if (targetType === 'string') return str;
        if (targetType === 'number') return NumberFormatter.parseFromString(str);
        
        // Auto-detect type
        const num = parseFloat(str);
        if (!isNaN(num) && isFinite(num) && str.trim() !== '') {
            return num;
        }
        return str;
    };

    // Handle starting inline edit
    const startEdit = (index) => {
        setEditingIndex(index);
        setEditingValue(formatValue(currentArray[index]));
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    // Handle saving inline edit
    const saveEdit = () => {
        if (editingIndex === null) return;
        
        const newArray = [...currentArray];
        const originalType = detectValueType(currentArray[editingIndex]);
        newArray[editingIndex] = parseValue(editingValue, originalType);
        
        debouncedOnChange(field.name, newArray);
        setEditingIndex(null);
        setEditingValue('');
    };

    // Handle canceling inline edit
    const cancelEdit = () => {
        setEditingIndex(null);
        setEditingValue('');
    };

    // Handle key press in edit mode
    const handleEditKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    };

    // Handle removing an item
    const removeItem = (index) => {
        const newArray = currentArray.filter((_, i) => i !== index);
        onChange(field.name, newArray);
    };

    // Handle adding a new item
    const addItem = () => {
        if (newItemValue.trim() === '') return;
        
        const newArray = [...currentArray];
        let parsedValue;
        
        if (arrayType === 'number') {
            parsedValue = NumberFormatter.parseFromString(newItemValue);
        } else if (arrayType === 'string') {
            parsedValue = newItemValue;
        } else {
            // Mixed or auto-detect
            parsedValue = parseValue(newItemValue, newItemType);
        }
        
        newArray.push(parsedValue);
        onChange(field.name, newArray);
        setNewItemValue('');
    };

    // Handle drag start
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
        e.dataTransfer.setDragImage(e.target, 0, 0);
    };

    // Handle drag over
    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    };

    // Handle drag leave
    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    // Handle drop
    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const newArray = [...currentArray];
        const draggedItem = newArray[draggedIndex];
        
        // Remove the dragged item
        newArray.splice(draggedIndex, 1);
        
        // Insert at new position (adjust index if we removed an item before the drop position)
        const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
        newArray.splice(adjustedDropIndex, 0, draggedItem);
        
        onChange(field.name, newArray);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    // Handle drag end
    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <div className="array-input">
            <label className="array-input__label">
                {field.label || field.name}
                {field.description && (
                    <span className="array-input__description">
                        ({field.description})
                    </span>
                )}
            </label>

            {/* Array Items */}
            {currentArray.length > 0 && (
                <div className="array-input__items">
                    <div className="array-input__items-header">
                        <span>Array Items ({currentArray.length})</span>
                        <span className="array-input__items-hint">
                            Drag to reorder • Click to edit • Double-click for quick edit
                        </span>
                    </div>
                    
                    <div className="array-input__items-list">
                        {currentArray.map((item, index) => {
                            const isEditing = editingIndex === index;
                            const isDragging = draggedIndex === index;
                            const isDragOver = dragOverIndex === index;
                            const itemType = detectValueType(item);
                            
                            const itemClasses = [
                                'array-input__item',
                                isDragging && 'array-input__item--dragging',
                                isDragOver && 'array-input__item--drag-over',
                                isEditing && 'array-input__item--editing'
                            ].filter(Boolean).join(' ');
                            
                            return (
                                <div
                                    key={index}
                                    className={itemClasses}
                                    draggable={!isEditing}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => !isEditing && startEdit(index)}
                                    onDoubleClick={() => startEdit(index)}
                                >
                                    {/* Drag Handle */}
                                    <div className="array-input__item-drag-handle">
                                        ⋮⋮
                                    </div>

                                    {/* Index */}
                                    <div className={`array-input__item-index array-input__item-index--${itemType}`}>
                                        {index}
                                    </div>

                                    {/* Value */}
                                    <div className="array-input__item-value">
                                        {isEditing ? (
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                className="array-input__item-value-edit"
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                onKeyDown={handleEditKeyPress}
                                                onBlur={saveEdit}
                                                placeholder="Enter value..."
                                            />
                                        ) : (
                                            <span className={`array-input__item-value-display ${itemType === 'number' ? 'array-input__item-value-display--number' : ''}`}>
                                                {formatValue(item)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Type Badge */}
                                    <div className={`array-input__item-type-badge array-input__item-type-badge--${itemType}`}>
                                        {itemType === 'number' ? 'NUM' : 'STR'}
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        className="array-input__item-remove"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeItem(index);
                                        }}
                                        title={`Remove item ${index}`}
                                    >
                                        ×
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Add New Item */}
            <div className="array-input__add-section">
                <div className="array-input__add-label">
                    Add New Item
                </div>
                
                <div className="array-input__add-form">
                    <input
                        type="text"
                        className="array-input__add-input"
                        value={newItemValue}
                        onChange={(e) => setNewItemValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addItem();
                            }
                        }}
                        placeholder="Enter value..."
                    />

                    {arrayType === 'mixed' && (
                        <select
                            className="array-input__add-type-selector"
                            value={newItemType}
                            onChange={(e) => setNewItemType(e.target.value)}
                        >
                            <option value="auto">Auto</option>
                            <option value="number">Number</option>
                            <option value="string">String</option>
                        </select>
                    )}

                    <button
                        onClick={addItem}
                        disabled={newItemValue.trim() === ''}
                        className={`array-input__add-button ${newItemValue.trim() === '' ? 'array-input__add-button--disabled' : 'array-input__add-button--enabled'}`}
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* Help Text */}
            <div className="array-input__help">
                <div className="array-input__help-item">• Click items to edit inline • Drag items to reorder • Use Enter to save, Escape to cancel</div>
                {arrayType === 'mixed' && (
                    <div className="array-input__help-item">• Numbers are auto-detected, or choose type manually when adding</div>
                )}
                {currentArray.length === 0 && (
                    <div className="array-input__help-item array-input__help-item--empty">
                        Array is empty. Add items above to get started.
                    </div>
                )}
            </div>
        </div>
    );
}

export default ArrayInput;