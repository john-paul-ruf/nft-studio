import type { PresetConfig, ResolvedConfig } from '../types/recipe';

export interface Moment {
  id: string;
  loopId: string;
  effectType: string;
  fireAt: number;
  duration: number;
  preset: PresetConfig;
  resolved: ResolvedConfig;
}
