# Service Method Inventory - Complete Analysis

*Generated: 2024-12-19*

## 📊 Executive Summary

**Total Services**: 6  
**Total Methods Identified**: 31  
**Methods Currently Tested**: 0  
**Coverage Target**: 100% (31/31 methods)

## 🏗️ Service Analysis

### 1. FileSystemService (5 methods) - **Priority: HIGH**
**Location**: `src/main/services/FileSystemService.js`  
**Dependencies**: Node.js fs, path, Electron app  
**Complexity**: Low-Medium  

#### Methods Inventory:
1. **`readFile(filePath)`** - Read file from filesystem
   - **Type**: Async
   - **Returns**: `{success: boolean, content?: string, error?: string}`
   - **Features**: Auto-resolves userData paths for simple filenames
   - **Test Scenarios**: Valid files, non-existent files, userData resolution, error handling

2. **`writeFile(filePath, content)`** - Write file to filesystem  
   - **Type**: Async
   - **Returns**: `{success: boolean, error?: string}`
   - **Features**: Auto-resolves userData paths, UTF-8 encoding
   - **Test Scenarios**: Valid writes, permission errors, userData resolution, large files

3. **`fileExists(filePath)`** - Check if file exists
   - **Type**: Async  
   - **Returns**: `boolean`
   - **Features**: Simple existence check using fs.access
   - **Test Scenarios**: Existing files, non-existent files, permission issues

4. **`listFiles(directoryPath, filter?)`** - List files in directory
   - **Type**: Async
   - **Returns**: `Array<string>` (file names)
   - **Features**: Optional RegExp filter, error handling returns empty array
   - **Test Scenarios**: Valid directories, non-existent directories, filtered results, empty directories

5. **`ensureDirectory(directoryPath)`** - Create directory if it doesn't exist
   - **Type**: Async
   - **Returns**: `boolean`
   - **Features**: Recursive directory creation
   - **Test Scenarios**: New directories, existing directories, nested paths, permission errors

---

### 2. ImageService (4 methods) - **Priority: HIGH**
**Location**: `src/main/services/ImageService.js`  
**Dependencies**: Node.js fs, path  
**Complexity**: Medium  

#### Methods Inventory:
1. **`readImageAsBase64(imagePath)`** - Read image file as base64
   - **Type**: Async
   - **Returns**: `{success: boolean, data?: string, error?: string}`
   - **Features**: Auto MIME type detection, base64 encoding with data URI
   - **Test Scenarios**: Various image formats, invalid files, large images, path resolution

2. **`getMimeTypeFromPath(filePath)`** - Get MIME type from file extension
   - **Type**: Sync
   - **Returns**: `string` (MIME type)
   - **Features**: Supports PNG, JPG, JPEG, GIF, WebP, BMP, SVG
   - **Test Scenarios**: All supported formats, unknown extensions, case sensitivity

3. **`isValidImageExtension(filePath)`** - Validate image file extension
   - **Type**: Sync
   - **Returns**: `boolean`
   - **Features**: Validates against supported image formats
   - **Test Scenarios**: Valid extensions, invalid extensions, case sensitivity, no extension

4. **`extractFrameNumber(filename)`** - Extract frame number from filename
   - **Type**: Sync
   - **Returns**: `number` (frame number or 0)
   - **Features**: Regex-based number extraction
   - **Test Scenarios**: Numbered files, non-numbered files, multiple numbers, edge cases

---

### 3. FrameService (3 methods) - **Priority: MEDIUM**
**Location**: `src/main/services/FrameService.js`  
**Dependencies**: FileSystemService, ImageService (injected)  
**Complexity**: Medium-High  

#### Methods Inventory:
1. **`listCompletedFrames(projectDirectory)`** - List completed frames in project
   - **Type**: Async
   - **Returns**: `{success: boolean, frames: Array, totalFrames: number, framesDirectory?: string, error?: string}`
   - **Features**: Filters image files, sorts by frame number, handles missing directories
   - **Test Scenarios**: Valid project directories, missing frames directory, various image formats, sorting accuracy

2. **`readFrameImage(framePath)`** - Read frame image as base64
   - **Type**: Async
   - **Returns**: `{success: boolean, data?: string, error?: string}`
   - **Features**: Validates image extension before reading, delegates to ImageService
   - **Test Scenarios**: Valid frame images, invalid extensions, non-existent files, various formats

3. **`validateFrameDirectory(projectDirectory)`** - Validate frame directory structure
   - **Type**: Async
   - **Returns**: `{valid: boolean, framesDirectory: string, exists: boolean}`
   - **Features**: Checks for frames subdirectory existence
   - **Test Scenarios**: Valid project structures, missing frames directory, invalid project paths

---

### 4. EffectRegistryService (15 methods) - **Priority: MEDIUM**
**Location**: `src/main/services/EffectRegistryService.js`  
**Dependencies**: my-nft-gen library, Electron BrowserWindow  
**Complexity**: High  

#### Methods Inventory:
1. **`ensureCoreEffectsRegistered()`** - Ensure core effects are registered
   - **Type**: Async
   - **Returns**: `Promise<void>`
   - **Features**: One-time registration, fallback mechanisms, plugin loading
   - **Test Scenarios**: First-time registration, repeated calls, registration failures

2. **`getEffectRegistry()`** - Get effect registry
   - **Type**: Async
   - **Returns**: `Promise<Object>` (EffectRegistry)
   - **Features**: Ensures registration before returning registry
   - **Test Scenarios**: Registry access, registration state verification

3. **`getConfigRegistry()`** - Get config registry
   - **Type**: Async
   - **Returns**: `Promise<Object>` (ConfigRegistry)
   - **Features**: Ensures registration before returning config registry
   - **Test Scenarios**: Config registry access, registration dependencies

4. **`getAllEffects()`** - Get all available effects by category
   - **Type**: Async
   - **Returns**: `Promise<Object>` (effects by category)
   - **Features**: Returns primary, secondary, keyFrame, and final effects
   - **Test Scenarios**: Category completeness, effect availability, registry state

5. **`getEffect(effectName)`** - Get specific effect by name
   - **Type**: Async
   - **Returns**: `Promise<Object|null>`
   - **Features**: Global effect lookup by name
   - **Test Scenarios**: Valid effect names, non-existent effects, case sensitivity

6. **`getPluginRegistry()`** - Get modern plugin registry
   - **Type**: Async
   - **Returns**: `Promise<Object>` (PluginRegistry)
   - **Features**: Modern registry with config linking
   - **Test Scenarios**: Plugin registry access, config linking verification

7. **`getEffectWithConfig(effectName)`** - Get effect with linked config class
   - **Type**: Async
   - **Returns**: `Promise<Object|null>`
   - **Features**: Returns plugin with both effect and config class
   - **Test Scenarios**: Valid effects with configs, effects without configs, non-existent effects

8. **`getAllEffectsWithConfigs()`** - Get all effects with config classes by category
   - **Type**: Async
   - **Returns**: `Promise<Object>` (effects with configs by category)
   - **Features**: Complete registry with config linking by category
   - **Test Scenarios**: Category completeness, config linking verification

9. **`getRegistryStats()`** - Get plugin registry statistics
   - **Type**: Async
   - **Returns**: `Promise<Object>` (registry statistics)
   - **Features**: Includes config linking information
   - **Test Scenarios**: Statistics accuracy, registry state reflection

10. **`areCoreEffectsRegistered()`** - Check if core effects are registered
    - **Type**: Sync
    - **Returns**: `boolean`
    - **Features**: Simple state check
    - **Test Scenarios**: Before/after registration, state persistence

11. **`debugRegistry()`** - Debug method to check registry state
    - **Type**: Async
    - **Returns**: `Promise<Object>` (debug information)
    - **Features**: Comprehensive registry state inspection
    - **Test Scenarios**: Registry state verification, debugging information accuracy

12. **`loadPluginsForUI()`** - Load plugins for UI display
    - **Type**: Async
    - **Returns**: `Promise<void>`
    - **Features**: Plugin manager integration, fallback loading mechanisms
    - **Test Scenarios**: Plugin loading success, fallback mechanisms, error handling

13. **`refreshRegistry(skipPluginReload?)`** - Force refresh the effect registry
    - **Type**: Async
    - **Returns**: `Promise<void>`
    - **Features**: Registry refresh with optional plugin reload skip
    - **Test Scenarios**: Full refresh, skip plugin reload, error handling

14. **`emitEffectsRefreshedEvent()`** - Emit effects refreshed event
    - **Type**: Async
    - **Returns**: `Promise<void>`
    - **Features**: Event emission to renderer processes
    - **Test Scenarios**: Event emission, multiple windows, error handling

---

### 5. ConfigProcessingService (4 methods) - **Priority: MEDIUM**
**Location**: `src/main/services/ConfigProcessingService.js`  
**Dependencies**: None  
**Complexity**: Medium  

#### Methods Inventory:
1. **`convertConfigToProperTypes(config)`** - Convert configuration values to proper types
   - **Type**: Async
   - **Returns**: `Promise<Object>` (processed configuration)
   - **Features**: Recursive type conversion, array handling, object processing
   - **Test Scenarios**: String to number/boolean conversion, nested objects, arrays, null/undefined handling

2. **`convertStringValue(value)`** - Convert string value to appropriate type
   - **Type**: Sync
   - **Returns**: `*` (converted value)
   - **Features**: Boolean and numeric conversion
   - **Test Scenarios**: 'true'/'false' strings, numeric strings, non-convertible strings

3. **`applyPoint2DCenterOverride(config, projectState)`** - Apply Point2D center override
   - **Type**: Sync
   - **Returns**: `Object` (processed configuration)
   - **Features**: Center coordinate resolution based on project dimensions
   - **Test Scenarios**: Center overrides, mixed coordinates, nested Point2D objects

4. **`validateConfig(config)`** - Validate configuration object
   - **Type**: Sync
   - **Returns**: `{valid: boolean, errors: Array<string>}`
   - **Features**: Basic configuration validation
   - **Test Scenarios**: Valid configs, invalid configs, null/undefined inputs

---

### 6. DialogService (3 methods) - **Priority: LOW**
**Location**: `src/main/services/DialogService.js`  
**Dependencies**: Electron dialog  
**Complexity**: Low  

#### Methods Inventory:
1. **`showFolderDialog()`** - Show folder selection dialog
   - **Type**: Async
   - **Returns**: `Promise<Object>` (dialog result)
   - **Features**: Directory selection with error handling
   - **Test Scenarios**: Successful selection, cancellation, error conditions

2. **`showFileDialog(options?)`** - Show file selection dialog
   - **Type**: Async
   - **Returns**: `Promise<Object>` (dialog result)
   - **Features**: Configurable file filters, default JSON/all files
   - **Test Scenarios**: Various file types, custom options, cancellation, error handling

3. **`showSaveDialog(options?)`** - Show save dialog
   - **Type**: Async
   - **Returns**: `Promise<Object>` (dialog result)
   - **Features**: Configurable save dialog options
   - **Test Scenarios**: Save operations, custom options, cancellation, error handling

## 🎯 Implementation Priority Matrix

### Phase 2.1: FileSystemService (HIGH Priority)
- **Impact**: Foundation for all other services
- **Complexity**: Low-Medium
- **Dependencies**: None (Node.js built-ins)
- **Methods**: 5
- **Estimated Effort**: 2-3 days

### Phase 2.2: ImageService (HIGH Priority)  
- **Impact**: Core NFT functionality
- **Complexity**: Medium
- **Dependencies**: FileSystemService
- **Methods**: 4
- **Estimated Effort**: 2-3 days

### Phase 2.3: FrameService (MEDIUM Priority)
- **Impact**: Animation functionality
- **Complexity**: Medium-High
- **Dependencies**: FileSystemService, ImageService
- **Methods**: 3
- **Estimated Effort**: 2-3 days

### Phase 2.4: ConfigProcessingService (MEDIUM Priority)
- **Impact**: Configuration management
- **Complexity**: Medium
- **Dependencies**: None
- **Methods**: 4
- **Estimated Effort**: 2-3 days

### Phase 2.5: EffectRegistryService (MEDIUM Priority)
- **Impact**: Effect system
- **Complexity**: High
- **Dependencies**: my-nft-gen library
- **Methods**: 14
- **Estimated Effort**: 4-5 days

### Phase 2.6: DialogService (LOW Priority)
- **Impact**: UI interaction (Node.js mockable)
- **Complexity**: Low
- **Dependencies**: Electron dialog
- **Methods**: 3
- **Estimated Effort**: 1-2 days

## 🔗 Service Dependency Map

```
DialogService (standalone)
ConfigProcessingService (standalone)
FileSystemService (standalone)
    ↓
ImageService (depends on FileSystemService)
    ↓
FrameService (depends on FileSystemService + ImageService)

EffectRegistryService (standalone, complex external deps)
```

## 📈 Coverage Progression Plan

### Week 1: Foundation Services
- **Target**: FileSystemService (5/31 methods = 16% coverage)
- **Focus**: File I/O operations, error handling, userData resolution

### Week 2: Image Processing
- **Target**: ImageService (9/31 methods = 29% coverage)  
- **Focus**: Image format handling, base64 conversion, validation

### Week 3: Frame Management
- **Target**: FrameService (12/31 methods = 39% coverage)
- **Focus**: Frame listing, validation, dependency integration

### Week 4: Configuration Processing
- **Target**: ConfigProcessingService (16/31 methods = 52% coverage)
- **Focus**: Type conversion, validation, Point2D processing

### Week 5-6: Effect Registry System
- **Target**: EffectRegistryService (30/31 methods = 97% coverage)
- **Focus**: Registry management, plugin loading, event emission

### Week 7: Dialog System
- **Target**: DialogService (31/31 methods = 100% coverage)
- **Focus**: Dialog operations, Node.js compatibility, mocking

## 🚨 Testing Considerations

### Real Objects Constraints
- **DialogService**: Requires Electron environment or Node.js mocking
- **EffectRegistryService**: Requires my-nft-gen library availability
- **FrameService**: Requires real image files for testing
- **ImageService**: Requires various image format samples

### Test Data Requirements
- Sample image files (PNG, JPG, GIF, WebP, BMP, SVG)
- Sample project directory structures
- Sample configuration objects
- Mock plugin files for effect registry testing

### Environment Setup
- Temporary directory management for file operations
- Image file generation for frame testing
- Plugin loading simulation for effect registry
- Electron dialog mocking for Node.js environment

---

**Status**: Phase 1 Complete - Ready for Phase 2.1 (FileSystemService Implementation)  
**Next Action**: Begin FileSystemService method testing implementation  
**Coverage Target**: 31/31 methods (100%)