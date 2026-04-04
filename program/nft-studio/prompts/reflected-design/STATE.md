# STATE — Loop Studio / full-build

## Overview
| Field | Value |
|-------|-------|
| **Program** | Loop Studio |
| **Feature** | full-build |
| **Intent** | Build the complete v1.0 Android app — gallery, editor, effect browser, three-tier config, moments timeline, GIF export |

## Session Status

| Session | Title | Status | Depends On | Wave |
|---------|-------|--------|-----------|------|
| S01 | Project Scaffolding & Configuration | `complete` | — | 1 |
| S02 | TypeScript Types & Entity Models | `complete` | S01 | 2 |
| S03 | Database Module | `pending` | S01 | 2 |
| S04 | GLSL Shader Library | `pending` | S01 | 2 |
| S05 | RandomService + EffectRegistryService | `pending` | S02, S03 | 3 |
| S06 | MomentService + ShaderPipelineService | `pending` | S02, S03, S04 | 3 |
| S09 | Zustand Store | `pending` | S02 | 3 |
| S07 | RecipeService + LoopService | `pending` | S02, S03, S05 | 4 |
| S08 | PlaybackService + ExportService | `pending` | S02, S06 | 4 |
| S10 | Custom Hooks | `pending` | S05, S06, S07, S08, S09 | 5 |
| S11 | Navigation Setup + App Entry | `pending` | S02, S10 | 6 |
| S12 | HomeScreen + Gallery Components | `pending` | S11 | 7 |
| S13 | EditorScreen + Canvas + Editor Components | `pending` | S11 | 7 |
| S14 | EffectBrowserSheet + Browser Components | `pending` | S11 | 7 |
| S15 | EffectConfigSheet + Config Components | `pending` | S11 | 7 |
| S16 | MomentsSheet + Moment Components | `pending` | S11 | 7 |
| S17 | ExportSheet + Export Components | `pending` | S11 | 7 |
| S18 | Integration Wiring & Final Verification | `pending` | S12–S17 | 8 |

## Execution Waves

| Wave | Sessions | Depends on Waves | Parallel CLI Calls |
|------|----------|------------------|--------------------|
| 1 | S01 | — | 1 |
| 2 | S02, S03, S04 | Wave 1 | 3 |
| 3 | S05, S06, S09 | Wave 2 | 3 |
| 4 | S07, S08 | Wave 3 | 2 |
| 5 | S10 | Wave 4 | 1 |
| 6 | S11 | Wave 5 | 1 |
| 7 | S12, S13, S14, S15, S16, S17 | Wave 6 | 6 |
| 8 | S18 | Wave 7 | 1 |

## Dependency Graph
```
S01 ──┬── S02 ──┬── S05 ──┬── S07 ──┐
      │         │         │         │
      ├── S03 ──┤         │         ├── S10 ── S11 ──┬── S12 ──┐
      │         │         │         │                 ├── S13 ──┤
      └── S04 ──┴── S06 ──┘── S08 ──┘                 ├── S14 ──┤
                                                      ├── S15 ──┼── S18
                    S02 ──── S09 ─────────────────────┤├── S16 ──┤
                                                      └── S17 ──┘
```

## Stub Registry

| Stub | Location | Created In | Replaced In | Status |
|------|----------|-----------|-------------|--------|
| Identity shader (pass-through) | `src/shaders/` concept | S04 | S06 | `pending` |
| Store placeholder selectors | `src/store/` concept | S09 | S10 | `pending` |
| HomeScreen placeholder | `src/screens/HomeScreen.tsx` | S11 | S12 | `pending` |
| EditorScreen placeholder | `src/screens/EditorScreen.tsx` | S11 | S13 | `pending` |
| EffectBrowserSheet placeholder | `src/screens/EffectBrowserSheet.tsx` | S11 | S14 | `pending` |
| EffectConfigSheet placeholder | `src/screens/EffectConfigSheet.tsx` | S11 | S15 | `pending` |
| MomentsSheet placeholder | `src/screens/MomentsSheet.tsx` | S11 | S16 | `pending` |
| ExportSheet placeholder | `src/screens/ExportSheet.tsx` | S11 | S17 | `pending` |

## Architecture Reference

### Stack
React Native bare workflow (Android) + TypeScript strict + @shopify/react-native-skia + Zustand + expo-sqlite + React Navigation

### Database
4 tables: `loops`, `effect_instances`, `moments`, `effect_definitions`

### Services (8)
RandomService, EffectRegistryService, LoopService, RecipeService, MomentService, PlaybackService, ExportService, ShaderPipelineService

### Screens (6)
HomeScreen, EditorScreen, EffectBrowserSheet, EffectConfigSheet, MomentsSheet, ExportSheet

## Scope Summary

| Area | Included | Excluded |
|------|----------|----------|
| Gallery | Loop grid, filter pills, FAB, context menu | Search, sorting options |
| Editor | Live Skia preview, tempo strip, effect stack, shuffle | Audio reactivity |
| Effects | 11 bundled effects, 5 categories, 3-tier config | Plugin system, custom shaders |
| Moments | Timeline, snap-to-grid, drag markers | Multi-track timeline |
| Export | GIF encoding, Android share intent | MP4 (v1.1), iOS share |
| Platform | Android only | iOS, web |
| Data | Local SQLite, local file storage | Cloud sync, social features |

## Design Decisions
1. **Preset/Resolved dual layer**: Preset captures user intent (intensity + knobs); resolved expands to flat uniforms for shader. Enables re-editing without reverse-engineering uniforms.
2. **Normalized phase (0–1)**: Moments fire at relative positions regardless of tempo. Zero per-frame conversion on hot path.
3. **Service-layer type validation**: `effect_type` validated in EffectRegistryService, not FK-constrained in SQLite. Effect definitions are bundled assets, not user data.
4. **SkSL shaders**: Using Skia's shader language (subset of GLSL) for cross-platform GPU rendering via react-native-skia.
5. **Zustand over Redux**: Simpler state management for mobile — no DI hierarchy, no middleware complexity.

## Handoff Notes
- Existing Electron app code in repo is untouched — Loop Studio lives in `LoopStudio/` subdirectory
- `expo-sqlite` requires Expo modules config in bare workflow — handled in S01
- `gifenc` may need a polyfill for `Buffer` in React Native — check in S08
- Skia multi-pass shader composition may need iteration on the rendering approach — S13 handles this

### S02 Handoff (2026-04-04)
- All type definitions created in `src/types/` (effects.ts, recipe.ts, navigation.ts)
- All entity model interfaces created in `src/models/` (Loop, EffectInstance, Moment, EffectDefinition + barrel index)
- `npx tsc --noEmit` passes clean — zero errors
- Pure TypeScript types only, no runtime dependencies added
- Navigation types include global `ReactNavigation` augmentation for type-safe navigation
- Models use camelCase fields; service layer (S05+) will handle snake_case DB conversion

### S01 Handoff (2026-04-04)
- RN 0.84.1 project initialized in `LoopStudio/` with TypeScript template
- All 15 dependencies installed (Skia, expo-sqlite, zustand, navigation, reanimated, gifenc, etc.)
- TypeScript strict mode: `npx tsc --noEmit` passes clean
- Metro configured with `.glsl` asset extension support
- Babel configured with `react-native-reanimated/plugin` (last position)
- All 20 module directories created with `.gitkeep` placeholders
- Minimal `src/App.tsx` renders "Loop Studio" on dark background
- Android config: minSdkVersion 24, Hermes enabled, new architecture enabled
- **Warning:** No JDK installed on this machine — `./gradlew assembleDebug` cannot run. Build config is correct; needs JDK 17+ to verify.