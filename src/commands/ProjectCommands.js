/**
 * Project Commands - Single Source of Truth for Project Actions
 * Implements Command Pattern for all project-related user actions
 * 
 * REFACTORED: Decomposed into focused services as part of God Object Destruction Plan - Phase 6, Step 6.3
 * - EffectCommandService: Primary effect commands
 * - SecondaryEffectCommandService: Secondary effect commands
 * - KeyframeEffectCommandService: Keyframe effect commands
 * - ProjectConfigCommandService: Project configuration commands
 */

// Import services
import EffectCommandService from '../services/EffectCommandService.js';
import SecondaryEffectCommandService from '../services/SecondaryEffectCommandService.js';
import KeyframeEffectCommandService from '../services/KeyframeEffectCommandService.js';
import ProjectConfigCommandService from '../services/ProjectConfigCommandService.js';

// Re-export command classes for backward compatibility
export {
    UpdateEffectCommand,
    AddEffectCommand,
    DeleteEffectCommand,
    ReorderEffectsCommand
} from '../services/EffectCommandService.js';

export {
    AddSecondaryEffectCommand,
    DeleteSecondaryEffectCommand,
    ReorderSecondaryEffectsCommand
} from '../services/SecondaryEffectCommandService.js';

export {
    AddKeyframeEffectCommand,
    DeleteKeyframeEffectCommand,
    ReorderKeyframeEffectsCommand
} from '../services/KeyframeEffectCommandService.js';

export {
    ChangeResolutionCommand,
    ToggleOrientationCommand,
    ChangeFramesCommand
} from '../services/ProjectConfigCommandService.js';

// Mark effect-related commands
const EFFECT_COMMAND_TYPES = [
    'effect.add',
    'effect.delete',
    'effect.update',
    'effect.reorder',
    'effect.toggle-visibility',
    'secondary.add',
    'secondary.delete',
    'secondary.reorder',
    'keyframe.add',
    'keyframe.delete',
    'keyframe.reorder'
];

// Export services for direct access if needed
export {
    EffectCommandService,
    SecondaryEffectCommandService,
    KeyframeEffectCommandService,
    ProjectConfigCommandService,
    EFFECT_COMMAND_TYPES
};