# Changelog

All notable changes to this project are documented here.

---

## [2026-04-04] — Session 01: Project Scaffolding & Configuration

### Summary
Initialized the React Native bare workflow project in `LoopStudio/` alongside the existing Electron app. Installed all required dependencies, configured TypeScript strict mode, Metro bundler with GLSL support, Babel with Reanimated plugin, and created the full module directory structure. Produces a type-clean, buildable (pending JDK) Android app shell.

### Added
- `LoopStudio/package.json` — RN 0.84.1 project with 15 dependencies (Skia, expo-sqlite, zustand, react-navigation, reanimated, gifenc, etc.)
- `LoopStudio/tsconfig.json` — Strict TypeScript config with `@/*` path alias
- `LoopStudio/metro.config.js` — Metro config with `.glsl` asset extension
- `LoopStudio/babel.config.js` — Babel with `react-native-reanimated/plugin`
- `LoopStudio/.eslintrc.js` — ESLint config extending `@react-native`
- `LoopStudio/declarations.d.ts` — Module declaration for `.glsl` imports
- `LoopStudio/index.js` — RN app entry point routing to `src/App`
- `LoopStudio/src/App.tsx` — Minimal app shell (SafeAreaView, dark theme, "Loop Studio" text)
- `LoopStudio/src/types/` — Types module directory
- `LoopStudio/src/models/` — Entity models directory
- `LoopStudio/src/db/` — Database module directory
- `LoopStudio/src/services/` — Service layer directory
- `LoopStudio/src/store/` — Zustand store directory
- `LoopStudio/src/hooks/` — Custom hooks directory
- `LoopStudio/src/screens/` — Screen components directory
- `LoopStudio/src/shaders/{shapes,glow,retro,distort,color}/` — Shader category directories
- `LoopStudio/src/components/{canvas,editor,effects,gallery,moments,export,shared}/` — Component subdirectories
- `LoopStudio/src/assets/` — Static assets directory

### Architecture Impact
- New `LoopStudio/` subdirectory houses the entire RN project, coexisting with the Electron app at repo root
- Android config: minSdkVersion 24, Hermes engine, new architecture enabled

---

## [2026-04-04] — Session 02: TypeScript Types & Entity Models

### Summary
Defined the complete type system for Loop Studio: effect enums, parameter schemas, preset/resolved config types, navigation param lists, and entity model interfaces for all four database tables. Pure TypeScript — no runtime dependencies.

### Added
- `LoopStudio/src/types/effects.ts` — EffectCategory enum, CATEGORY_META, LoopDuration, UniformMap, ParameterSchemaDef, FlavorKnobDef, MacroMappingEntry, and derived type aliases
- `LoopStudio/src/types/recipe.ts` — PresetConfig, ResolvedConfig, EffectStackEntry interfaces
- `LoopStudio/src/types/navigation.ts` — RootStackParamList with global ReactNavigation augmentation
- `LoopStudio/src/models/Loop.ts` — Loop entity interface (id, name, loopSeconds, seed, thumbnailPath, timestamps)
- `LoopStudio/src/models/EffectInstance.ts` — EffectInstance entity interface (preset/resolved dual-layer config)
- `LoopStudio/src/models/Moment.ts` — Moment entity interface (normalized 0-1 fireAt/duration)
- `LoopStudio/src/models/EffectDefinition.ts` — EffectDefinition entity interface (shader source, parameter schema, macro mapping, flavor knobs)
- `LoopStudio/src/models/index.ts` — Barrel re-export of all model interfaces

### Architecture Impact
- M01 (Types) and M02 (Models) fully defined — all downstream modules can now import from these
