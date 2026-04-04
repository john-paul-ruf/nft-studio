import type {
  EffectCategory,
  ParameterSchema,
  MacroMapping,
  FlavorKnobs,
} from '../types/effects';

export interface EffectDefinition {
  type: string;
  category: EffectCategory;
  displayName: string;
  shaderSource: string;
  parameterSchema: ParameterSchema;
  macroMapping: MacroMapping;
  flavorKnobs: FlavorKnobs;
  version: number;
}
