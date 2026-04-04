# Domain — Types & Entity Models

## Overview
The type system defines all shared TypeScript types (M01: `src/types/`) and entity model interfaces (M02: `src/models/`). These are leaf modules with no upward dependencies — consumed by every other module in the app.

## Types Inventory (`src/types/`)

| File | Key Exports | Purpose |
|------|-------------|---------|
| `effects.ts` | `EffectCategory`, `CATEGORY_META`, `LoopDuration`, `LOOP_DURATIONS`, `UniformValue`, `UniformMap`, `ParameterSchemaDef`, `FlavorKnobDef`, `MacroMappingEntry`, `MacroMapping`, `ParameterSchema`, `FlavorKnobs` | Effect system primitives: categories, shader uniforms, parameter schemas |
| `recipe.ts` | `PresetConfig`, `ResolvedConfig`, `EffectStackEntry` | Dual-layer config: user-facing presets and shader-ready resolved uniforms |
| `navigation.ts` | `RootStackParamList` | React Navigation route params with global type augmentation |

## Entity Models (`src/models/`)

| File | Interface | DB Table | Key Fields |
|------|-----------|----------|------------|
| `Loop.ts` | `Loop` | `loops` | `id`, `name`, `loopSeconds` (LoopDuration), `seed`, `thumbnailPath?`, `createdAt`, `updatedAt` |
| `EffectInstance.ts` | `EffectInstance` | `effect_instances` | `id`, `loopId`, `effectType`, `sortOrder`, `enabled`, `preset` (PresetConfig), `resolved` (ResolvedConfig) |
| `Moment.ts` | `Moment` | `moments` | `id`, `loopId`, `effectType`, `fireAt` (0-1), `duration` (0-1), `preset`, `resolved` |
| `EffectDefinition.ts` | `EffectDefinition` | `effect_definitions` | `type` (PK), `category`, `displayName`, `shaderSource`, `parameterSchema`, `macroMapping`, `flavorKnobs`, `version` |
| `index.ts` | — | — | Barrel re-export of all model interfaces |

## Key Behaviors

- **Preset/Resolved dual layer**: `PresetConfig` captures user intent (intensity slider + flavor knobs). `ResolvedConfig` is a flat `UniformMap` consumed by shaders. Services convert between the two using `MacroMapping` and `FlavorKnobs`.
- **Normalized phase**: Moment `fireAt` and `duration` are 0-1 values, tempo-independent.
- **LoopDuration constraint**: Only `3 | 5 | 10 | 15` seconds — enforced at the type level.
- **camelCase fields**: Entity interfaces use camelCase; the service/DB layer converts to/from snake_case.

## Dependencies
- `src/types/` — no imports (leaf module)
- `src/models/` — imports from `src/types/` only
