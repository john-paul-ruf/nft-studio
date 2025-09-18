import React, { useState, useEffect } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useTheme } from '@mui/material';
import {
    Edit,
    Add,
    ArrowRight,
    Schedule,
    ChevronRight
} from '@mui/icons-material';

export default function EffectContextMenu({
    position,
    onAddSecondary,
    onAddKeyframe,
    onEdit,
    onClose
}) {
    const theme = useTheme();
    const [secondaryEffects, setSecondaryEffects] = useState([]);
    const [keyframeEffects, setKeyframeEffects] = useState([]);
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        loadEffects();
    }, []);

    const loadEffects = async () => {
        try {
            const response = await window.api.discoverEffects();
            if (response.success && response.effects) {
                setSecondaryEffects(response.effects.secondary || []);
                setKeyframeEffects(response.effects.keyFrame || []);
            }
        } catch (error) {
            console.error('Failed to load effects:', error);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        onClose();
    };

    const virtualTrigger = React.useRef(null);

    useEffect(() => {
        // Create a virtual trigger element at the specified position
        if (virtualTrigger.current) {
            virtualTrigger.current.style.position = 'fixed';
            virtualTrigger.current.style.left = `${position.x}px`;
            virtualTrigger.current.style.top = `${position.y}px`;
            virtualTrigger.current.style.width = '1px';
            virtualTrigger.current.style.height = '1px';
            virtualTrigger.current.style.pointerEvents = 'none';
        }
    }, [position]);

    const menuStyles = {
        backgroundColor: theme.palette.mode === 'dark' ? '#323232' : theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '6px',
        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.2)',
        padding: '4px',
        minWidth: '200px',
        zIndex: 1300,
    };

    const itemStyles = {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        fontSize: '14px',
        color: theme.palette.text.primary,
        cursor: 'pointer',
        borderRadius: '4px',
        outline: 'none',
        gap: '8px',
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        },
        '&:focus': {
            backgroundColor: theme.palette.action.hover,
        },
    };

    const separatorStyles = {
        height: '1px',
        backgroundColor: theme.palette.divider,
        margin: '4px 0',
    };

    return (
        <>
            <div ref={virtualTrigger} />
            <ContextMenu.Root open={isOpen} onOpenChange={setIsOpen}>
                <ContextMenu.Trigger asChild>
                    <div ref={virtualTrigger} />
                </ContextMenu.Trigger>

                <ContextMenu.Portal>
                    <ContextMenu.Content style={menuStyles} onEscapeKeyDown={handleClose}>
                        <ContextMenu.Item style={itemStyles} onSelect={onEdit}>
                            <Edit fontSize="small" />
                            Edit Effect
                        </ContextMenu.Item>

                        <ContextMenu.Separator style={separatorStyles} />

                        <ContextMenu.Sub>
                            <ContextMenu.SubTrigger style={{...itemStyles, justifyContent: 'space-between'}}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Add fontSize="small" />
                                    Add Secondary Effect
                                </div>
                                <ChevronRight fontSize="small" />
                            </ContextMenu.SubTrigger>
                            <ContextMenu.Portal>
                                <ContextMenu.SubContent style={{...menuStyles, minWidth: '180px'}}>
                                    {secondaryEffects.length === 0 ? (
                                        <ContextMenu.Item
                                            disabled
                                            style={{
                                                ...itemStyles,
                                                fontStyle: 'italic',
                                                color: theme.palette.text.disabled,
                                                cursor: 'default'
                                            }}
                                        >
                                            No secondary effects available
                                        </ContextMenu.Item>
                                    ) : (
                                        secondaryEffects.map((effect, index) => (
                                            <ContextMenu.Item
                                                key={index}
                                                style={itemStyles}
                                                onSelect={() => {
                                                    onAddSecondary(effect);
                                                    handleClose();
                                                }}
                                            >
                                                {effect.displayName || effect.name}
                                            </ContextMenu.Item>
                                        ))
                                    )}
                                </ContextMenu.SubContent>
                            </ContextMenu.Portal>
                        </ContextMenu.Sub>

                        <ContextMenu.Separator style={separatorStyles} />

                        <ContextMenu.Sub>
                            <ContextMenu.SubTrigger style={{...itemStyles, justifyContent: 'space-between'}}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Schedule fontSize="small" />
                                    Add Keyframe Effect
                                </div>
                                <ChevronRight fontSize="small" />
                            </ContextMenu.SubTrigger>
                            <ContextMenu.Portal>
                                <ContextMenu.SubContent style={{...menuStyles, minWidth: '180px'}}>
                                    {keyframeEffects.length === 0 ? (
                                        <ContextMenu.Item
                                            disabled
                                            style={{
                                                ...itemStyles,
                                                fontStyle: 'italic',
                                                color: theme.palette.text.disabled,
                                                cursor: 'default'
                                            }}
                                        >
                                            No keyframe effects available
                                        </ContextMenu.Item>
                                    ) : (
                                        keyframeEffects.map((effect, index) => (
                                            <ContextMenu.Item
                                                key={index}
                                                style={itemStyles}
                                                onSelect={() => {
                                                    onAddKeyframe(effect);
                                                    handleClose();
                                                }}
                                            >
                                                {effect.displayName || effect.name} at frame
                                            </ContextMenu.Item>
                                        ))
                                    )}
                                </ContextMenu.SubContent>
                            </ContextMenu.Portal>
                        </ContextMenu.Sub>
                    </ContextMenu.Content>
                </ContextMenu.Portal>
            </ContextMenu.Root>
        </>
    );
}