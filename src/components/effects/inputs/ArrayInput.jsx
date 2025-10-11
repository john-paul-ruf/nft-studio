import React, { useState, useRef, useCallback } from 'react';
import NumberFormatter from '../../../utils/NumberFormatter.js';
import useDebounce from '../../../hooks/useDebounce.js';

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
        <div style={{ marginBottom: '1rem' }}>
            <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.9rem',
                color: '#ccc',
                fontWeight: '500'
            }}>
                {field.label || field.name}
                {field.description && (
                    <span style={{ 
                        fontSize: '0.8rem', 
                        color: '#888', 
                        fontWeight: 'normal',
                        marginLeft: '0.5rem'
                    }}>
                        ({field.description})
                    </span>
                )}
            </label>

            {/* Array Items */}
            {currentArray.length > 0 && (
                <div style={{
                    marginBottom: '0.75rem',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{
                        fontSize: '0.8rem',
                        color: '#aaa',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>Array Items ({currentArray.length})</span>
                        <span style={{ fontSize: '0.7rem', color: '#666' }}>
                            Drag to reorder • Click to edit • Double-click for quick edit
                        </span>
                    </div>
                    
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                    }}>
                        {currentArray.map((item, index) => {
                            const isEditing = editingIndex === index;
                            const isDragging = draggedIndex === index;
                            const isDragOver = dragOverIndex === index;
                            const itemType = detectValueType(item);
                            
                            return (
                                <div
                                    key={index}
                                    draggable={!isEditing}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, index)}
                                    onDragEnd={handleDragEnd}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem',
                                        background: isDragging 
                                            ? 'rgba(255,255,255,0.1)' 
                                            : isDragOver 
                                                ? 'rgba(102, 126, 234, 0.2)' 
                                                : 'rgba(255,255,255,0.08)',
                                        borderRadius: '6px',
                                        border: isDragOver 
                                            ? '2px dashed #667eea' 
                                            : '1px solid rgba(255,255,255,0.15)',
                                        cursor: isEditing ? 'text' : 'grab',
                                        opacity: isDragging ? 0.5 : 1,
                                        transition: 'all 0.2s ease',
                                        transform: isDragging ? 'rotate(2deg)' : 'none'
                                    }}
                                    onClick={() => !isEditing && startEdit(index)}
                                    onDoubleClick={() => startEdit(index)}
                                >
                                    {/* Drag Handle */}
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#666',
                                        cursor: 'grab',
                                        fontSize: '14px'
                                    }}>
                                        ⋮⋮
                                    </div>

                                    {/* Index */}
                                    <div style={{
                                        minWidth: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: itemType === 'number' 
                                            ? 'rgba(76, 175, 80, 0.2)' 
                                            : 'rgba(33, 150, 243, 0.2)',
                                        borderRadius: '50%',
                                        fontSize: '0.75rem',
                                        color: itemType === 'number' ? '#4caf50' : '#2196f3',
                                        fontWeight: 'bold'
                                    }}>
                                        {index}
                                    </div>

                                    {/* Value */}
                                    <div style={{ flex: 1 }}>
                                        {isEditing ? (
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                onKeyDown={handleEditKeyPress}
                                                onBlur={saveEdit}
                                                style={{
                                                    width: '100%',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    border: '2px solid #667eea',
                                                    borderRadius: '4px',
                                                    padding: '0.25rem 0.5rem',
                                                    color: '#fff',
                                                    fontSize: '0.85rem',
                                                    outline: 'none'
                                                }}
                                                placeholder="Enter value..."
                                            />
                                        ) : (
                                            <span style={{
                                                color: '#fff',
                                                fontSize: '0.85rem',
                                                fontFamily: itemType === 'number' ? 'monospace' : 'inherit'
                                            }}>
                                                {formatValue(item)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Type Badge */}
                                    <div style={{
                                        padding: '0.2rem 0.4rem',
                                        background: itemType === 'number' 
                                            ? 'rgba(76, 175, 80, 0.2)' 
                                            : 'rgba(33, 150, 243, 0.2)',
                                        borderRadius: '12px',
                                        fontSize: '0.7rem',
                                        color: itemType === 'number' ? '#4caf50' : '#2196f3',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {itemType === 'number' ? 'NUM' : 'STR'}
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeItem(index);
                                        }}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            background: 'rgba(244, 67, 54, 0.2)',
                                            border: 'none',
                                            borderRadius: '50%',
                                            color: '#f44336',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = 'rgba(244, 67, 54, 0.3)';
                                            e.target.style.transform = 'scale(1.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = 'rgba(244, 67, 54, 0.2)';
                                            e.target.style.transform = 'scale(1)';
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
            <div style={{
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{
                    fontSize: '0.8rem',
                    color: '#aaa',
                    marginBottom: '0.5rem'
                }}>
                    Add New Item
                </div>
                
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center'
                }}>
                    <input
                        type="text"
                        value={newItemValue}
                        onChange={(e) => setNewItemValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addItem();
                            }
                        }}
                        placeholder="Enter value..."
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            padding: '0.5rem',
                            color: '#fff',
                            fontSize: '0.85rem',
                            outline: 'none'
                        }}
                    />

                    {arrayType === 'mixed' && (
                        <select
                            value={newItemType}
                            onChange={(e) => setNewItemType(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '4px',
                                padding: '0.5rem',
                                color: '#fff',
                                fontSize: '0.8rem',
                                outline: 'none'
                            }}
                        >
                            <option value="auto">Auto</option>
                            <option value="number">Number</option>
                            <option value="string">String</option>
                        </select>
                    )}

                    <button
                        onClick={addItem}
                        disabled={newItemValue.trim() === ''}
                        style={{
                            padding: '0.5rem 1rem',
                            background: newItemValue.trim() === '' 
                                ? 'rgba(255,255,255,0.1)' 
                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '4px',
                            color: newItemValue.trim() === '' ? '#666' : '#fff',
                            cursor: newItemValue.trim() === '' ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (newItemValue.trim() !== '') {
                                e.target.style.transform = 'translateY(-1px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = 'none';
                        }}
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* Help Text */}
            <div style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: '#888',
                lineHeight: '1.4'
            }}>
                <div>• Click items to edit inline • Drag items to reorder • Use Enter to save, Escape to cancel</div>
                {arrayType === 'mixed' && (
                    <div>• Numbers are auto-detected, or choose type manually when adding</div>
                )}
                {currentArray.length === 0 && (
                    <div style={{ color: '#666', fontStyle: 'italic' }}>
                        Array is empty. Add items above to get started.
                    </div>
                )}
            </div>
        </div>
    );
}

export default ArrayInput;