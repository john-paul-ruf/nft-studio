import React, { useState, useEffect } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import {
    Edit,
    Add,
    ArrowRight,
    Schedule,
    ChevronRight
} from '@mui/icons-material';
import './EffectContextMenu.bem.css';

export default function EffectContextMenu({
    position,
    onAddSecondary,
    onAddKeyframe,
    onEdit,
    onClose
}) {
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

    return (
        <>
            <div ref={virtualTrigger} />
            <ContextMenu.Root open={isOpen} onOpenChange={setIsOpen}>
                <ContextMenu.Trigger asChild>
                    <div ref={virtualTrigger} />
                </ContextMenu.Trigger>

                <ContextMenu.Portal>
                    <ContextMenu.Content className="effect-context-menu" onEscapeKeyDown={handleClose}>
                        <ContextMenu.Item className="effect-context-menu__item" onSelect={onEdit}>
                            <Edit fontSize="small" className="effect-context-menu__item-icon" />
                            Edit Effect
                        </ContextMenu.Item>

                        <ContextMenu.Separator className="effect-context-menu__separator" />

                        <ContextMenu.Sub>
                            <ContextMenu.SubTrigger className="effect-context-menu__sub-trigger">
                                <div className="effect-context-menu__sub-trigger-content">
                                    <Add fontSize="small" className="effect-context-menu__item-icon" />
                                    Add Secondary Effect
                                </div>
                                <ChevronRight fontSize="small" className="effect-context-menu__sub-trigger-icon" />
                            </ContextMenu.SubTrigger>
                            <ContextMenu.Portal>
                                <ContextMenu.SubContent className="effect-context-menu__sub-content">
                                    {secondaryEffects.length === 0 ? (
                                        <ContextMenu.Item
                                            disabled
                                            className="effect-context-menu__item"
                                        >
                                            No secondary effects available
                                        </ContextMenu.Item>
                                    ) : (
                                        secondaryEffects.map((effect, index) => (
                                            <ContextMenu.Item
                                                key={index}
                                                className="effect-context-menu__item"
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

                        <ContextMenu.Separator className="effect-context-menu__separator" />

                        <ContextMenu.Sub>
                            <ContextMenu.SubTrigger className="effect-context-menu__sub-trigger">
                                <div className="effect-context-menu__sub-trigger-content">
                                    <Schedule fontSize="small" className="effect-context-menu__item-icon" />
                                    Add Keyframe Effect
                                </div>
                                <ChevronRight fontSize="small" className="effect-context-menu__sub-trigger-icon" />
                            </ContextMenu.SubTrigger>
                            <ContextMenu.Portal>
                                <ContextMenu.SubContent className="effect-context-menu__sub-content">
                                    {keyframeEffects.length === 0 ? (
                                        <ContextMenu.Item
                                            disabled
                                            className="effect-context-menu__item"
                                        >
                                            No keyframe effects available
                                        </ContextMenu.Item>
                                    ) : (
                                        keyframeEffects.map((effect, index) => (
                                            <ContextMenu.Item
                                                key={index}
                                                className="effect-context-menu__item"
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