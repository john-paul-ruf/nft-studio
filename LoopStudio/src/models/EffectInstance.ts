import type { PresetConfig, ResolvedConfig } from '../types/recipe';

export interface EffectInstance {
  id: string;
  loopId: string;
  effectType: string;
  sortOrder: number;
  enabled: boolean;
  preset: PresetConfig;
  resolved: ResolvedConfig;
}
