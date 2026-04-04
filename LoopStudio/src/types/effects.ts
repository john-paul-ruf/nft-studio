/** Five emoji-labeled effect categories */
export enum EffectCategory {
  SHAPES = 'shapes',
  GLOW = 'glow',
  RETRO = 'retro',
  GLITCH = 'glitch',
  MOOD = 'mood',
}

/** Category display metadata */
export const CATEGORY_META: Record<EffectCategory, { emoji: string; label: string; description: string }> = {
  [EffectCategory.SHAPES]: { emoji: '\u{1F300}', label: 'Shapes', description: 'Hex grids, spirals, rings, geometric forms' },
  [EffectCategory.GLOW]: { emoji: '\u2728', label: 'Glow', description: 'Lens flares, bloom, edge glow, gradients' },
  [EffectCategory.RETRO]: { emoji: '\u{1F4FA}', label: 'Retro', description: 'CRT effects, scan lines, pixelate, vintage' },
  [EffectCategory.GLITCH]: { emoji: '\u{1F4A5}', label: 'Glitch', description: 'Fractal breaks, wave distortion, color pulse' },
  [EffectCategory.MOOD]: { emoji: '\u{1F3AD}', label: 'Mood', description: 'Fade, blur, color shift, brightness, blink' },
};

/** Valid loop durations in seconds */
export type LoopDuration = 3 | 5 | 10 | 15;
export const LOOP_DURATIONS: LoopDuration[] = [3, 5, 10, 15];

/** A single shader uniform value */
export type UniformValue = number | number[];

/** Map of uniform name -> value, consumed directly by the shader */
export type UniformMap = Record<string, UniformValue>;

/** Parameter schema entry - defines one tunable shader parameter */
export interface ParameterSchemaDef {
  name: string;
  displayName: string;
  type: 'float' | 'int' | 'bool' | 'color' | 'dynamicRange';
  min?: number;
  max?: number;
  default: number | boolean | [number, number] | number[];
  description?: string;
}

/** Flavor knob definition - a curated parameter mapping */
export interface FlavorKnobDef {
  name: string;
  param: string;
  min: number;
  max: number;
  default: number;
}

/** Macro mapping - how the 0-1 intensity slider maps to multiple params */
export interface MacroMappingEntry {
  param: string;
  inputRange: [number, number];
  outputRange: [number, number];
}

export type MacroMapping = MacroMappingEntry[];
export type ParameterSchema = ParameterSchemaDef[];
export type FlavorKnobs = FlavorKnobDef[];
