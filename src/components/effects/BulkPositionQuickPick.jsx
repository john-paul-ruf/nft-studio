import React, { useState, useMemo } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Grid, Button } from '@mui/material';

function BulkPositionQuickPick({ projectState, onPositionSelect }) {
    const [selectedCategory, setSelectedCategory] = useState('basic');

    // Get resolution from project state
    const { width, height } = useMemo(() => {
        if (!projectState) return { width: 1920, height: 1080 };
        const dimensions = projectState.getResolutionDimensions();
        return { width: dimensions.w, height: dimensions.h };
    }, [projectState]);

    // Position presets
    const presets = useMemo(() => ({
        basic: [
            { name: 'Top Left', x: width * 0.25, y: height * 0.25, icon: '⌜' },
            { name: 'Top Center', x: width / 2, y: height * 0.25, icon: '⌐' },
            { name: 'Top Right', x: width * 0.75, y: height * 0.25, icon: '⌝' },
            { name: 'Left Center', x: width * 0.25, y: height / 2, icon: '⊢' },
            { name: 'Center', x: width / 2, y: height / 2, icon: '⊙' },
            { name: 'Right Center', x: width * 0.75, y: height / 2, icon: '⊣' },
            { name: 'Bottom Left', x: width * 0.25, y: height * 0.75, icon: '⌞' },
            { name: 'Bottom Center', x: width / 2, y: height * 0.75, icon: '⌙' },
            { name: 'Bottom Right', x: width * 0.75, y: height * 0.75, icon: '⌟' }
        ],
        thirds: [
            { name: 'Top Third Left', x: width * 0.33, y: height * 0.33, icon: '⚏' },
            { name: 'Top Third Right', x: width * 0.67, y: height * 0.33, icon: '⚎' },
            { name: 'Middle Third Left', x: width * 0.33, y: height / 2, icon: '⚋' },
            { name: 'Middle Third Right', x: width * 0.67, y: height / 2, icon: '⚊' },
            { name: 'Bottom Third Left', x: width * 0.33, y: height * 0.67, icon: '⚍' },
            { name: 'Bottom Third Right', x: width * 0.67, y: height * 0.67, icon: '⚌' }
        ],
        golden: [
            { name: 'Golden Top Left', x: width * 0.382, y: height * 0.382, icon: '◗' },
            { name: 'Golden Top Right', x: width * 0.618, y: height * 0.382, icon: '◖' },
            { name: 'Golden Bottom Left', x: width * 0.382, y: height * 0.618, icon: '◥' },
            { name: 'Golden Bottom Right', x: width * 0.618, y: height * 0.618, icon: '◤' }
        ],
        edge: [
            { name: 'Near Top Left Corner', x: width * 0.05, y: height * 0.05, icon: '◸' },
            { name: 'Near Top Edge', x: width / 2, y: height * 0.05, icon: '▲' },
            { name: 'Near Top Right Corner', x: width * 0.95, y: height * 0.05, icon: '◹' },
            { name: 'Near Left Edge', x: width * 0.05, y: height / 2, icon: '◀' },
            { name: 'Near Right Edge', x: width * 0.95, y: height / 2, icon: '▶' },
            { name: 'Near Bottom Left Corner', x: width * 0.05, y: height * 0.95, icon: '◺' },
            { name: 'Near Bottom Edge', x: width / 2, y: height * 0.95, icon: '▼' },
            { name: 'Near Bottom Right Corner', x: width * 0.95, y: height * 0.95, icon: '◿' }
        ]
    }), [width, height]);

    const categoryInfo = {
        basic: { label: 'Basic', description: 'Standard composition positions' },
        thirds: { label: 'Rule of Thirds', description: 'Photography rule of thirds (33% / 67% points)' },
        golden: { label: 'Golden Ratio', description: 'Golden ratio composition (38.2% / 61.8% points)' },
        edge: { label: 'Edge Positions', description: 'Positions near canvas edges (5% / 95% points)' }
    };

    const handleCategoryChange = (event, newCategory) => {
        if (newCategory !== null) {
            setSelectedCategory(newCategory);
        }
    };

    const handlePresetSelect = (preset) => {
        const position = {
            name: 'position',
            x: Math.round(preset.x),
            y: Math.round(preset.y)
        };
        onPositionSelect(position);
    };

    return (
        <Box>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Quick Position Selection
            </Typography>

            {/* Category Selector */}
            <ToggleButtonGroup
                value={selectedCategory}
                exclusive
                onChange={handleCategoryChange}
                aria-label="position category"
                size="small"
                fullWidth
                sx={{ mb: 2 }}
            >
                {Object.entries(categoryInfo).map(([key, info]) => (
                    <ToggleButton value={key} key={key} sx={{ textTransform: 'none' }}>
                        {info.label}
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>

            {/* Category Description */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.75rem' }}>
                {categoryInfo[selectedCategory].description}
            </Typography>

            {/* Position Grid */}
            <Grid container spacing={1}>
                {presets[selectedCategory].map((preset) => (
                    <Grid item xs={4} key={preset.name}>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => handlePresetSelect(preset)}
                            sx={{
                                py: 1.5,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textTransform: 'none',
                                fontSize: '0.75rem'
                            }}
                        >
                            <Box sx={{ fontSize: '1.5rem', mb: 0.5 }}>{preset.icon}</Box>
                            <Box sx={{ fontSize: '0.65rem', lineHeight: 1.2 }}>
                                {preset.name}
                            </Box>
                            <Box sx={{ fontSize: '0.6rem', color: 'text.secondary', mt: 0.5 }}>
                                ({Math.round(preset.x)}, {Math.round(preset.y)})
                            </Box>
                        </Button>
                    </Grid>
                ))}
            </Grid>

            {/* Canvas Info */}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center', fontSize: '0.7rem' }}>
                Canvas: {width} × {height} {projectState &&
                    (projectState.getIsHorizontal() ? '(Horizontal)' : '(Vertical)')}
            </Typography>
        </Box>
    );
}

export default BulkPositionQuickPick;