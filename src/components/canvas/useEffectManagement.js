import { useState, useEffect, useCallback } from 'react';

export default function useEffectManagement(config, updateConfig) {
    const [availableEffects, setAvailableEffects] = useState({
        primary: [],
        secondary: [],
        finalImage: []
    });
    const [effectsLoaded, setEffectsLoaded] = useState(false);
    const [editingEffect, setEditingEffect] = useState(null);
    const [contextMenuEffect, setContextMenuEffect] = useState(null);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

    // Load available effects
    const loadAvailableEffects = useCallback(async () => {
        try {
            const result = await window.api.getAvailableEffects();
            console.log('🎭 Available effects result:', result);
            if (result.success) {
                setAvailableEffects({
                    primary: result.effects.primary || [],
                    secondary: result.effects.secondary || [],
                    finalImage: result.effects.finalImage || []
                });
                setEffectsLoaded(true);
            }
        } catch (error) {
            console.error('Failed to load available effects:', error);
        }
    }, []);

    // Load effects on mount
    useEffect(() => {
        loadAvailableEffects();
    }, [loadAvailableEffects]);

    const handleAddEffect = useCallback((effect) => {
        const newEffects = [...(config.effects || []), effect];
        updateConfig({ effects: newEffects });
    }, [config.effects, updateConfig]);

    const handleAddEffectDirect = useCallback(async (effectName, effectType = 'primary') => {
        try {
            // Get effect defaults from backend
            const result = await window.api.getEffectDefaults(effectName);
            if (result.success) {
                // Find the effect in our available effects to get the className
                const effectCategory = availableEffects[effectType] || [];
                const effectData = effectCategory.find(e => e.name === effectName);

                const effect = {
                    name: effectName,
                    registryKey: effectData?.registryKey || effectName,
                    className: effectData?.className || effectName,
                    type: effectType,
                    config: result.defaults,
                    visible: true
                };

                const newEffects = [...(config.effects || []), effect];
                updateConfig({ effects: newEffects });

                console.log(`✅ Added ${effectType} effect: ${effectName}`, effect);
            } else {
                console.error('Failed to get effect defaults:', result.error);
                alert(`Failed to add effect: ${result.error}`);
            }
        } catch (error) {
            console.error('Error adding effect:', error);
            alert(`Error adding effect: ${error.message}`);
        }
    }, [availableEffects, config.effects, updateConfig]);

    const handleEffectUpdate = useCallback((index, updatedEffect) => {
        const newEffects = [...config.effects];
        newEffects[index] = updatedEffect;
        updateConfig({ effects: newEffects });
    }, [config.effects, updateConfig]);

    const handleEffectDelete = useCallback((index) => {
        const newEffects = config.effects.filter((_, i) => i !== index);
        updateConfig({ effects: newEffects });
    }, [config.effects, updateConfig]);

    const handleEffectReorder = useCallback((fromIndex, toIndex) => {
        const newEffects = [...config.effects];
        const [removed] = newEffects.splice(fromIndex, 1);
        newEffects.splice(toIndex, 0, removed);
        updateConfig({ effects: newEffects });
    }, [config.effects, updateConfig]);

    const handleEffectToggleVisibility = useCallback((index) => {
        const newEffects = [...config.effects];
        newEffects[index] = {
            ...newEffects[index],
            visible: newEffects[index].visible === false ? true : false
        };
        updateConfig({ effects: newEffects });
    }, [config.effects, updateConfig]);

    const handleEffectRightClick = useCallback((effect, index, e) => {
        e.preventDefault();
        setContextMenuEffect({ effect, index });
        setContextMenuPos({ x: e.clientX, y: e.clientY });
    }, []);

    const handleEditEffect = useCallback((effectIndex, effectType = 'primary', subIndex = null) => {
        setEditingEffect({
            effectIndex,
            effectType,
            subIndex
        });
    }, []);

    const getEditingEffectData = useCallback(() => {
        if (!editingEffect || !config.effects[editingEffect.effectIndex]) {
            return null;
        }

        const mainEffect = config.effects[editingEffect.effectIndex];

        if (editingEffect.effectType === 'primary') {
            return mainEffect;
        } else if (editingEffect.effectType === 'secondary' && mainEffect.secondaryEffects && editingEffect.subIndex !== null) {
            return mainEffect.secondaryEffects[editingEffect.subIndex];
        } else if (editingEffect.effectType === 'keyframe' && mainEffect.keyframeEffects && editingEffect.subIndex !== null) {
            return mainEffect.keyframeEffects[editingEffect.subIndex];
        }

        return null;
    }, [editingEffect, config.effects]);

    const handleSubEffectUpdate = useCallback((newConfig) => {
        if (!editingEffect || !config.effects[editingEffect.effectIndex]) {
            return;
        }

        const mainEffect = config.effects[editingEffect.effectIndex];

        if (editingEffect.effectType === 'primary') {
            const updatedEffect = {
                ...mainEffect,
                config: newConfig
            };
            handleEffectUpdate(editingEffect.effectIndex, updatedEffect);
        } else if (editingEffect.effectType === 'secondary' && editingEffect.subIndex !== null) {
            const updatedSecondaryEffects = [...(mainEffect.secondaryEffects || [])];
            updatedSecondaryEffects[editingEffect.subIndex] = {
                ...updatedSecondaryEffects[editingEffect.subIndex],
                config: newConfig
            };
            const updatedEffect = {
                ...mainEffect,
                secondaryEffects: updatedSecondaryEffects
            };
            handleEffectUpdate(editingEffect.effectIndex, updatedEffect);
        } else if (editingEffect.effectType === 'keyframe' && editingEffect.subIndex !== null) {
            const updatedKeyframeEffects = [...(mainEffect.keyframeEffects || [])];
            updatedKeyframeEffects[editingEffect.subIndex] = {
                ...updatedKeyframeEffects[editingEffect.subIndex],
                config: newConfig
            };
            const updatedEffect = {
                ...mainEffect,
                keyframeEffects: updatedKeyframeEffects
            };
            handleEffectUpdate(editingEffect.effectIndex, updatedEffect);
        }
    }, [editingEffect, config.effects, handleEffectUpdate]);

    const handleAddSecondaryEffect = useCallback(async (targetEffect, effectIndex, newSecondaryEffect) => {
        try {
            const defaults = await window.api.getEffectDefaults(newSecondaryEffect.name);
            const secondaryEffectToAdd = {
                registryKey: newSecondaryEffect.registryKey || newSecondaryEffect.name,
                className: newSecondaryEffect.className || newSecondaryEffect.name,
                config: defaults || {}
            };

            const updatedEffect = {
                ...targetEffect,
                secondaryEffects: [
                    ...(targetEffect.secondaryEffects || []),
                    secondaryEffectToAdd
                ]
            };
            handleEffectUpdate(effectIndex, updatedEffect);
        } catch (error) {
            console.error('Failed to add secondary effect:', error);
        }
    }, [handleEffectUpdate]);

    const handleAddKeyframeEffect = useCallback(async (targetEffect, effectIndex, newKeyframeEffect, selectedFrame) => {
        try {
            const defaults = await window.api.getEffectDefaults(newKeyframeEffect.name);
            const keyframeEffectToAdd = {
                frame: selectedFrame,
                registryKey: newKeyframeEffect.registryKey || newKeyframeEffect.name,
                className: newKeyframeEffect.className || newKeyframeEffect.name,
                config: defaults || {}
            };

            const updatedEffect = {
                ...targetEffect,
                keyframeEffects: [
                    ...(targetEffect.keyframeEffects || []),
                    keyframeEffectToAdd
                ]
            };
            handleEffectUpdate(effectIndex, updatedEffect);
        } catch (error) {
            console.error('Failed to add keyframe effect:', error);
        }
    }, [handleEffectUpdate]);

    return {
        availableEffects,
        effectsLoaded,
        editingEffect,
        contextMenuEffect,
        contextMenuPos,
        handleAddEffect,
        handleAddEffectDirect,
        handleEffectUpdate,
        handleEffectDelete,
        handleEffectReorder,
        handleEffectToggleVisibility,
        handleEffectRightClick,
        handleEditEffect,
        getEditingEffectData,
        handleSubEffectUpdate,
        handleAddSecondaryEffect,
        handleAddKeyframeEffect,
        setEditingEffect
    };
}