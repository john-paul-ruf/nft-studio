import React, { useState, useEffect } from 'react';
import './EffectPicker.bem.css';

export default function EffectPicker({ onSelect, onClose }) {
    const [effects, setEffects] = useState([]);

    useEffect(() => {
        loadEffects();
    }, []);

    const loadEffects = async () => {
        try {
            const response = await window.api.discoverEffects();

            if (response.success && response.effects) {
                // Combine primary and final effects
                // Note: The API returns 'finalImage' not 'final'
                const allEffects = [
                    ...(response.effects.primary || []),
                    ...(response.effects.finalImage || [])
                ];
                setEffects(allEffects);
            } else {
                console.error('Invalid response from discoverEffects:', response);
                setEffects([]);
            }
        } catch (error) {
            console.error('Failed to load effects:', error);
            setEffects([]);
        }
    };


    return (
        <div className="effect-picker__overlay" onClick={onClose}>
            <div className="effect-picker" onClick={(e) => e.stopPropagation()}>
                <div className="effect-picker__header">
                    <h3 className="effect-picker__title">Add Effect</h3>
                    <button className="effect-picker__close-button" onClick={onClose}>×</button>
                </div>

                <div className="effect-picker__content">
                    {effects.length === 0 ? (
                        <div className="effect-picker__empty-state">No effects available</div>
                    ) : (
                        <div className="effect-picker__grid">
                            {effects.map((effect, index) => {
                                const effectName = effect.name || effect.className || 'Unknown';
                                const displayName = effect.displayName || effectName.replace(/Effect$/, '').replace(/([A-Z])/g, ' $1').trim();

                                return (
                                    <div
                                        key={index}
                                        className="effect-picker__item"
                                        onClick={async () => {
                                            try {
                                                console.log('🎯 EffectPicker: Clicked on effect:', effect.name || effect.className);
                                                const response = await window.api.getEffectDefaults(effect.name || effect.className);
                                                console.log('🎯 EffectPicker: Got effect defaults response:', response);

                                                if (!response.success) {
                                                    console.error('🎯 EffectPicker: Effect defaults failed:', response.error);
                                                    throw new Error(`Effect ${effect.name || effect.className} has no config: ${response.error}`);
                                                }

                                                if (!response.defaults) {
                                                    console.error('🎯 EffectPicker: No defaults returned:', response);
                                                    throw new Error(`Effect ${effect.name || effect.className} returned no config data`);
                                                }

                                                const newEffect = {
                                                    className: effect.name || effect.className,
                                                    config: response.defaults,
                                                    type: effect.category || 'primary',
                                                    secondaryEffects: [],
                                                    keyframeEffects: []
                                                };
                                                console.log('🎯 EffectPicker: Created new effect object:', newEffect);
                                                console.log('🎯 EffectPicker: Calling onSelect with effect');
                                                onSelect(newEffect);
                                            } catch (error) {
                                                console.error('🎯 EffectPicker: Error in onClick handler:', error);
                                                alert(`Failed to add effect: ${error.message}`);
                                            }
                                        }}
                                    >
                                        <div className="effect-picker__item-icon">
                                            {displayName.charAt(0)}
                                        </div>
                                        <div className="effect-picker__item-name">
                                            {displayName}
                                            {effect.category === 'finalImage' && (
                                                <span className="effect-picker__item-type"> (Final)</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}