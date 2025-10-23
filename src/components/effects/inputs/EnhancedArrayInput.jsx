import React, { useState, useRef, useCallback } from 'react';
import {
    Box,
    TextField,
    IconButton,
    Button,
    Chip,
    Typography,
    Paper,
    Stack,
    Tooltip,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    ToggleButtonGroup,
    ToggleButton
} from '@mui/material';
import {
    Add,
    Delete,
    DragIndicator,
    Edit,
    ContentCopy,
    ContentPaste,
    Clear,
    MoreVert,
    FileUpload,
    FileDownload,
    ViewList,
    ViewModule
} from '@mui/icons-material';
import NumberFormatter from '../../../utils/NumberFormatter.js';
import useDebounce from '../../../hooks/useDebounce.js';
import './enhanced-array-input.bem.css';

/**
 * Enhanced array input component with improved UX
 * Features:
 * - Bulk add (comma-separated or multi-line)
 * - Visual drag & drop with better feedback
 * - Quick actions (duplicate, clear all, insert)
 * - Import/Export (JSON, CSV)
 * - Inline editing with validation
 * - Keyboard shortcuts
 */
function EnhancedArrayInput({ field, value, onChange }) {
    // Debug logging
    console.log('🎨 EnhancedArrayInput rendered:', { 
        fieldName: field?.name, 
        fieldType: field?.type,
        arrayType: field?.arrayType,
        valueLength: Array.isArray(value) ? value.length : 'not-array',
        value: value
    });
    
    const [editingIndex, setEditingIndex] = useState(null);
    const [editingValue, setEditingValue] = useState('');
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [bulkAddValue, setBulkAddValue] = useState('');
    const [bulkAddMode, setBulkAddMode] = useState('single'); // 'single', 'comma', 'lines'
    const [viewMode, setViewMode] = useState('list'); // 'list', 'grid'
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importText, setImportText] = useState('');
    const [importError, setImportError] = useState('');
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

    // Parse multiple values from text
    const parseMultipleValues = (text, mode) => {
        let values = [];
        
        if (mode === 'comma') {
            // Split by comma
            values = text.split(',').map(v => v.trim()).filter(v => v !== '');
        } else if (mode === 'lines') {
            // Split by newlines
            values = text.split('\n').map(v => v.trim()).filter(v => v !== '');
        } else {
            // Single value
            values = [text.trim()].filter(v => v !== '');
        }
        
        // Parse each value based on array type
        return values.map(v => {
            if (arrayType === 'number') {
                return NumberFormatter.parseFromString(v);
            } else if (arrayType === 'string') {
                return v;
            } else {
                return parseValue(v, 'auto');
            }
        });
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
        
        onChange(field.name, newArray);
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

    // Handle adding items (single or bulk)
    const addItems = () => {
        if (bulkAddValue.trim() === '') return;
        
        const newValues = parseMultipleValues(bulkAddValue, bulkAddMode);
        if (newValues.length === 0) return;
        
        const newArray = [...currentArray, ...newValues];
        onChange(field.name, newArray);
        setBulkAddValue('');
    };

    // Handle duplicating an item
    const duplicateItem = (index) => {
        const newArray = [...currentArray];
        newArray.splice(index + 1, 0, currentArray[index]);
        onChange(field.name, newArray);
    };

    // Handle clearing all items
    const clearAll = () => {
        onChange(field.name, []);
        setMenuAnchor(null);
    };

    // Handle copying array to clipboard
    const copyToClipboard = async (format = 'json') => {
        let text = '';
        if (format === 'json') {
            text = JSON.stringify(currentArray, null, 2);
        } else if (format === 'csv') {
            text = currentArray.join(', ');
        } else if (format === 'lines') {
            text = currentArray.join('\n');
        }
        
        try {
            await navigator.clipboard.writeText(text);
            setMenuAnchor(null);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Handle importing from text
    const handleImport = () => {
        setImportError('');
        
        try {
            // Try parsing as JSON first
            const parsed = JSON.parse(importText);
            if (Array.isArray(parsed)) {
                onChange(field.name, parsed);
                setImportDialogOpen(false);
                setImportText('');
                return;
            } else {
                setImportError('JSON must be an array');
                return;
            }
        } catch (e) {
            // Not JSON, try as comma-separated or line-separated
            const lines = importText.split('\n').map(l => l.trim()).filter(l => l !== '');
            if (lines.length > 0) {
                // Try comma-separated first
                const values = lines.flatMap(line => 
                    line.split(',').map(v => v.trim()).filter(v => v !== '')
                );
                
                const parsed = values.map(v => {
                    if (arrayType === 'number') {
                        const num = NumberFormatter.parseFromString(v);
                        if (isNaN(num)) {
                            throw new Error(`Invalid number: ${v}`);
                        }
                        return num;
                    } else if (arrayType === 'string') {
                        return v;
                    } else {
                        return parseValue(v, 'auto');
                    }
                });
                
                onChange(field.name, parsed);
                setImportDialogOpen(false);
                setImportText('');
            } else {
                setImportError('No valid values found');
            }
        }
    };

    // Drag and drop handlers
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const newArray = [...currentArray];
        const draggedItem = newArray[draggedIndex];
        
        newArray.splice(draggedIndex, 1);
        const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
        newArray.splice(adjustedDropIndex, 0, draggedItem);
        
        onChange(field.name, newArray);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <Box className="enhanced-array-input">
            {/* Header */}
            <Box className="enhanced-array-input__header">
                <Typography variant="subtitle2" className="enhanced-array-input__title">
                    {field.label || field.name}
                    {field.description && (
                        <Typography component="span" variant="caption" className="enhanced-array-input__description">
                            ({field.description})
                        </Typography>
                    )}
                </Typography>
                
                <Box className="enhanced-array-input__controls">
                    <Chip 
                        label={`${currentArray.length} items`} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                    />
                    
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(e, newMode) => newMode && setViewMode(newMode)}
                        size="small"
                    >
                        <ToggleButton value="list" size="small">
                            <ViewList fontSize="small" />
                        </ToggleButton>
                        <ToggleButton value="grid" size="small">
                            <ViewModule fontSize="small" />
                        </ToggleButton>
                    </ToggleButtonGroup>
                    
                    <Tooltip title="More actions">
                        <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
                            <MoreVert fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Array Items */}
            {currentArray.length > 0 ? (
                <Box className="enhanced-array-input__items-container">
                    {viewMode === 'list' ? (
                        <Stack spacing={1} className="enhanced-array-input__list">
                            {currentArray.map((item, index) => {
                                const isEditing = editingIndex === index;
                                const isDragging = draggedIndex === index;
                                const isDragOver = dragOverIndex === index;
                                const itemType = detectValueType(item);
                                
                                return (
                                    <Paper
                                        key={index}
                                        draggable={!isEditing}
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, index)}
                                        onDragEnd={handleDragEnd}
                                        elevation={isDragging ? 4 : 1}
                                        className={`enhanced-array-input__item ${isDragging ? 'enhanced-array-input__item--dragging' : ''} ${isDragOver ? 'enhanced-array-input__item--drag-over' : ''}`}
                                    >
                                        <DragIndicator className="enhanced-array-input__drag-handle" />
                                        
                                        <Chip 
                                            label={index} 
                                            size="small" 
                                            color={itemType === 'number' ? 'success' : 'info'}
                                            className="enhanced-array-input__item-index"
                                        />
                                        
                                        <Box className="enhanced-array-input__item-content">
                                            {isEditing ? (
                                                <TextField
                                                    inputRef={inputRef}
                                                    value={editingValue}
                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                    onKeyDown={handleEditKeyPress}
                                                    onBlur={saveEdit}
                                                    size="small"
                                                    fullWidth
                                                    autoFocus
                                                    placeholder="Enter value..."
                                                />
                                            ) : (
                                                <Typography 
                                                    variant="body2" 
                                                    className={`enhanced-array-input__item-value ${itemType === 'number' ? 'enhanced-array-input__item-value--monospace' : ''}`}
                                                    onClick={() => startEdit(index)}
                                                >
                                                    {formatValue(item)}
                                                </Typography>
                                            )}
                                        </Box>
                                        
                                        <Chip 
                                            label={itemType === 'number' ? 'NUM' : 'STR'} 
                                            size="small" 
                                            variant="outlined"
                                            color={itemType === 'number' ? 'success' : 'info'}
                                        />
                                        
                                        <Box className="enhanced-array-input__item-actions">
                                            <Tooltip title="Duplicate">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => duplicateItem(index)}
                                                    className="enhanced-array-input__item-action-button enhanced-array-input__item-action-button--duplicate"
                                                >
                                                    <ContentCopy fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            
                                            <Tooltip title="Edit">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => startEdit(index)}
                                                    className="enhanced-array-input__item-action-button enhanced-array-input__item-action-button--edit"
                                                >
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            
                                            <Tooltip title="Remove">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => removeItem(index)}
                                                    className="enhanced-array-input__item-action-button enhanced-array-input__item-action-button--delete"
                                                >
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Paper>
                                );
                            })}
                        </Stack>
                    ) : (
                        <Box className="enhanced-array-input__grid">
                            {currentArray.map((item, index) => {
                                const itemType = detectValueType(item);
                                return (
                                    <Chip
                                        key={index}
                                        label={`${index}: ${formatValue(item)}`}
                                        color={itemType === 'number' ? 'success' : 'info'}
                                        onDelete={() => removeItem(index)}
                                        onClick={() => startEdit(index)}
                                        className={`enhanced-array-input__grid-chip ${itemType === 'number' ? 'enhanced-array-input__grid-chip' : 'enhanced-array-input__grid-chip--string'}`}
                                    />
                                );
                            })}
                        </Box>
                    )}
                </Box>
            ) : (
                <Alert severity="info" className="enhanced-array-input__empty-alert">
                    Array is empty. Add items below to get started.
                </Alert>
            )}

            {/* Add Items Section */}
            <Paper variant="outlined" className="enhanced-array-input__add-section">
                <Typography variant="subtitle2" className="enhanced-array-input__add-section-title">
                    Add Items
                </Typography>
                
                <Stack spacing={2} className="enhanced-array-input__add-controls">
                    <ToggleButtonGroup
                        value={bulkAddMode}
                        exclusive
                        onChange={(e, newMode) => newMode && setBulkAddMode(newMode)}
                        size="small"
                        fullWidth
                    >
                        <ToggleButton value="single">
                            Single Value
                        </ToggleButton>
                        <ToggleButton value="comma">
                            Comma-Separated
                        </ToggleButton>
                        <ToggleButton value="lines">
                            Line-by-Line
                        </ToggleButton>
                    </ToggleButtonGroup>
                    
                    <TextField
                        value={bulkAddValue}
                        onChange={(e) => setBulkAddValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (bulkAddMode === 'single' || bulkAddMode === 'comma')) {
                                e.preventDefault();
                                addItems();
                            }
                        }}
                        multiline={bulkAddMode === 'lines'}
                        rows={bulkAddMode === 'lines' ? 4 : 1}
                        placeholder={
                            bulkAddMode === 'single' ? 'Enter a value...' :
                            bulkAddMode === 'comma' ? 'Enter values separated by commas (e.g., 1, 2, 3)' :
                            'Enter one value per line'
                        }
                        size="small"
                        fullWidth
                    />
                    
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={addItems}
                        disabled={bulkAddValue.trim() === ''}
                        fullWidth
                    >
                        Add {bulkAddMode === 'single' ? 'Item' : 'Items'}
                    </Button>
                </Stack>
            </Paper>

            {/* Help Text */}
            <Typography variant="caption" className="enhanced-array-input__help-text">
                💡 Tip: Click items to edit • Drag to reorder • Use bulk add for multiple values
            </Typography>

            {/* Actions Menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
            >
                <MenuItem onClick={() => { setImportDialogOpen(true); setMenuAnchor(null); }}>
                    <ListItemIcon><FileUpload fontSize="small" /></ListItemIcon>
                    <ListItemText>Import from Text</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => copyToClipboard('json')}>
                    <ListItemIcon><FileDownload fontSize="small" /></ListItemIcon>
                    <ListItemText>Export as JSON</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => copyToClipboard('csv')}>
                    <ListItemIcon><FileDownload fontSize="small" /></ListItemIcon>
                    <ListItemText>Export as CSV</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => copyToClipboard('lines')}>
                    <ListItemIcon><FileDownload fontSize="small" /></ListItemIcon>
                    <ListItemText>Export as Lines</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={clearAll} disabled={currentArray.length === 0}>
                    <ListItemIcon><Clear fontSize="small" /></ListItemIcon>
                    <ListItemText>Clear All</ListItemText>
                </MenuItem>
            </Menu>

            {/* Import Dialog */}
            <Dialog 
                open={importDialogOpen} 
                onClose={() => { setImportDialogOpen(false); setImportText(''); setImportError(''); }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Import Array Data</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" className="enhanced-array-input__import-description">
                        Paste your data as JSON array, comma-separated values, or one value per line.
                    </Typography>
                    
                    {importError && (
                        <Alert severity="error" className="enhanced-array-input__import-error">
                            {importError}
                        </Alert>
                    )}
                    
                    <TextField
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        multiline
                        rows={10}
                        placeholder='Examples:\n[1, 2, 3]\n1, 2, 3\n1\n2\n3'
                        fullWidth
                        autoFocus
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setImportDialogOpen(false); setImportText(''); setImportError(''); }}>
                        Cancel
                    </Button>
                    <Button onClick={handleImport} variant="contained" disabled={importText.trim() === ''}>
                        Import
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default EnhancedArrayInput;