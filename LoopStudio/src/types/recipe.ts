import type { UniformMap } from './effects';

/** User-facing preset: macro intensity + flavor knob positions */
export interface PresetConfig {
  intensity: number;
  knobs: Record<string, number>;
  lab?: Record<string, number | boolean | [number, number]>;
}

/** Shader-ready resolved config: flat uniform values */
export type ResolvedConfig = UniformMap;

/** An effect in the composable stack */
export interface EffectStackEntry {
  instanceId: string;
  effectType: string;
  enabled: boolean;
  sortOrder: number;
  preset: PresetConfig;
  resolved: ResolvedConfig;
}
