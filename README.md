# NFT Studio

<div align="center">

  <img src="icons/icon.svg" alt="NFT Studio Logo" width="256" height="256">

  **🎨 A powerful desktop application for creating and generating NFT collections**

  [![Electron](https://img.shields.io/badge/Electron-30.0.6-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
  [![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
  [![Tests](https://img.shields.io/badge/Tests-480%2F480_Passing-brightgreen?style=for-the-badge)](tests/)

  *Featuring a custom cyberpunk-themed animated icon with neon aesthetics*

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Visual Identity](#-visual-identity)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Development](#-development)
- [Building & Packaging](#-building--packaging)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Architecture](#-architecture)
- [Contributing](#-contributing)
- [Support](#-support)
- [License](#-license)

---

## 🎨 Overview

**NFT Studio** is a comprehensive desktop application built with **Electron** and **React** that provides an intuitive graphical interface for the `my-nft-gen` NFT generation engine. It enables artists and creators to design, configure, and generate unique NFT collections with various effects, layers, and customization options—all without writing a single line of code.

### 🌟 Key Highlights

- 🖼️ **Visual NFT Creation** - Design NFTs with an intuitive drag-and-drop interface
- 🎯 **Real-time Preview** - See your changes instantly with live effect previews
- 🔧 **Advanced Effects System** - Apply 20+ complex visual effects and transformations
- 📊 **Progress Monitoring** - Track generation progress with real-time event display
- 🎨 **Color Scheme Creator** - Build custom color palettes for your collections
- 💾 **Project Management** - Save, resume, and organize multiple NFT projects
- ↩️ **Undo/Redo System** - Full command history with up to 50 tracked actions
- 🔄 **Auto-Scaling** - Automatic resolution scaling when dimensions change
- 🎭 **Effect Chaining** - Layer multiple effects with secondary and keyframe support

---

## ✨ Features

### Core Functionality

#### 🗂️ Project Creation & Management
- Create new NFT generation projects from scratch
- Resume and edit existing projects
- Import/export project configurations (`.nftproject` files)
- Automatic project saving and recovery
- Project metadata management (name, artist, description)

#### 🎨 Visual Effect System
- **Multi-step effect wizard** for easy configuration
- **20+ built-in effects**: blur, pixelate, glitch, color shift, and more
- **Effect chaining and layering** with primary, secondary, and keyframe effects
- **Real-time effect preview** with thumbnail generation
- **Custom effect parameter tuning** with dynamic UI generation
- **Effect reordering** via drag-and-drop
- **Auto-scaling** when resolution or orientation changes

#### 📐 Resolution & Orientation Management
- Multiple resolution presets (HD, Full HD, 4K, etc.)
- Custom resolution support
- Horizontal/vertical orientation switching
- **Automatic effect scaling** when dimensions change
- Resolution-aware effect properties

#### 🔄 Command Pattern & Undo/Redo
- **Full undo/redo support** for all effect operations
- Tracks up to **50 effect-related actions**
- Human-readable command descriptions with effect IDs
- Navigate to any point in history
- Filters out non-effect commands for clarity

#### 🎨 Color Scheme Management
- **Color Scheme Creator** with palette management
- Favorite color schemes
- Default color scheme selection
- Persistent storage across sessions
- Integration with ColorPicker components

#### 🚀 Generation Engine
- Batch generation of NFT collections
- Progress tracking with event bus display
- Frame-by-frame preview
- Export to multiple formats (PNG, JPG, GIF)
- Metadata generation (JSON, CSV)
- Real-time rendering feedback

#### 🛠️ Advanced Tools
- Dynamic UI generation based on effect configurations
- Config introspection for automatic form generation
- Integrated file browser and manager
- Event bus display for debugging and monitoring
- Effect registry with dynamic discovery

---

## 🎭 Visual Identity

### Cyberpunk Icon Design

NFT Studio features a **custom cyberpunk-themed animated icon** that reflects the cutting-edge nature of NFT technology:

<div align="center">

  <img src="icons/icon.svg" alt="NFT Studio Animated Icon" width="400" height="400">

  *Watch the scanning line and digital rain effects in action!*

</div>

#### Design Elements
- **🌈 Neon Color Scheme**: Cyan (#00ffff) and Magenta (#ff00ff) gradients
- **⬡ Hexagonal Frame**: Multi-layered hexagon design representing blockchain aesthetic
- **🔌 Circuit Board Patterns**: Decorative circuit traces with node connections
- **⚡ Glitch Effects**: Applied to "NFT" text for digital distortion look
- **💫 Animated Elements**: 
  - Scanning line effect that moves vertically (8s cycle)
  - Matrix-style digital rain drops (4-7s cycles)
  - Dynamic opacity animations for depth

#### Platform Support
- **macOS**: `icon.icns` (generated via iconutil)
- **Windows**: `icon.ico` (256x256)
- **Linux**: `icon.png` (512x512)
- **Multiple Sizes**: 16, 32, 64, 128, 256, 512, 1024 pixels

#### Regenerate Icons
```bash
npm run generate-icons
```

See [CYBERPUNK_ICON_IMPLEMENTATION.md](CYBERPUNK_ICON_IMPLEMENTATION.md) for full details.

---

## 📋 Prerequisites

Before installing NFT Studio, ensure you have the following:

- **Node.js** version 18.0 or higher
- **npm** version 8.0 or higher
- **Git** for cloning the repository
- **Python** (for native dependencies compilation)
- **Build tools** for your platform:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: windows-build-tools
  - **Linux**: build-essential

### Platform-specific Requirements

#### macOS
```bash
xcode-select --install
```

#### Windows
```bash
npm install --global windows-build-tools
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install build-essential
```

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/nft-studio.git
cd nft-studio
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild
```

### 3. Set Up the NFT Generation Engine

NFT Studio requires the `my-nft-gen` package to be available locally:

```bash
# Clone the my-nft-gen repository (if not already present)
cd ..
git clone https://github.com/yourusername/my-nft-gen.git
cd nft-studio
```

The `package.json` references `my-nft-gen` as a local dependency:
```json
"my-nft-gen": "file:../my-nft-gen"
```

### 4. Start the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm start
```

---

## 💻 Development

### Development Commands

```bash
# Start webpack in watch mode (hot reload)
npm run dev

# Launch Electron app (without rebuilding)
npm run electron

# Build for production
npm run build

# Clean and start fresh
npm run clean:start

# Copy assets (HTML, CSS, etc.)
npm run copy:assets

# Generate application icons
npm run generate-icons

# Clean user preferences
npm run clean:preferences
```

### Development Workflow

1. **Start webpack in watch mode** (Terminal 1):
   ```bash
   npm run dev
   ```

2. **Launch Electron** (Terminal 2):
   ```bash
   npm run electron
   ```

3. **Make changes** - Frontend changes reload automatically
4. **Restart app** - Main process changes require app restart

### Debugging

- **DevTools**: Press `Ctrl+Shift+I` (or `Cmd+Option+I` on macOS) in the app
- **Main Process**: Use `--inspect` flag with Electron
- **React DevTools**: Install the standalone version for Electron apps
- **Event Bus Display**: Built-in real-time event monitoring

### Environment Setup

1. **Configure your IDE**
   - Install React and JSX extensions
   - Configure Babel for ES6+ support
   - Set up ESLint for code quality

2. **Hot Reload**
   - Frontend changes reload automatically via webpack
   - Main process changes require app restart
   - Preload script changes require app restart

---

## 📦 Building & Packaging

### Build for Current Platform

```bash
npm run build
npm run package
```

### Build for Specific Platforms

```bash
# macOS (DMG and ZIP for x64 and arm64)
npm run package:mac

# Windows (NSIS installer and portable for x64 and ia32)
npm run package:win

# Linux (AppImage, deb, and snap for x64)
npm run package:linux

# Build without publishing
npm run dist
```

### Build Configuration

The build process is configured in `package.json` under the `build` key:

- **App ID**: `com.nftstudio.app`
- **Product Name**: NFT Studio
- **Output Directory**: `build/`
- **Icons**:
  - macOS: `icons/icon.icns`
  - Windows: `icons/icon.ico`
  - Linux: `icons/` (directory with multiple sizes)

### Platform-Specific Targets

#### macOS
- **DMG**: Disk image installer
- **ZIP**: Compressed application bundle
- **Architectures**: x64, arm64 (Apple Silicon)
- **Category**: Graphics & Design

#### Windows
- **NSIS**: Installer with custom options
- **Portable**: Standalone executable
- **Architectures**: x64, ia32

#### Linux
- **AppImage**: Universal Linux package
- **deb**: Debian/Ubuntu package
- **snap**: Snap package
- **Architecture**: x64

### Verify Build

```bash
npm run verify:build
```

---

## 🧪 Testing

NFT Studio includes a **comprehensive test suite** with **100% pass rate** (480/480 tests passing) using **real objects and no mocks**.

### Test Status

```
✅ Total Tests: 480
✅ Passed: 480 (100%)
❌ Failed: 0
⏱️ Execution Time: ~2-3 seconds
```

**Test Categories:**
- **Integration Tests**: 16/16 (100%) ✅
- **System Tests**: 3/3 (100%) ✅  
- **Unit Tests**: 461/461 (100%) ✅

### Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:system        # System tests only
npm run test:services      # Service layer tests
npm run test:workflow      # Workflow tests
npm run test:dependency    # Dependency tests

# Run specific test file
npm run test:file -- path/to/test.js
```

### Test Structure

```
tests/
├── unit/                  # Unit tests for individual components (461 tests)
│   ├── commands/         # Command pattern tests
│   ├── services/         # Service layer tests
│   ├── models/           # Model tests
│   └── utils/            # Utility tests
├── integration/          # Integration tests for features (16 tests)
│   ├── effect-workflow.test.js
│   ├── project-lifecycle.test.js
│   └── undo-redo.test.js
├── system/               # System-level tests (3 tests)
│   └── full-workflow.test.js
├── setup/                # Test environment and service factories
│   ├── TestEnvironment.js
│   └── ServiceFactory.js
├── utils/                # Test utilities and helpers
└── the-one-runner-to-rule-them-all.js  # Custom test runner
```

### Testing Philosophy

**🚫 NO MOCKS EVER - NO EXCEPTIONS**

All tests use **real service instances** and **actual implementations**:
- ✅ Real `ProjectState` with actual state management
- ✅ Real `CommandService` with full undo/redo stack
- ✅ Real `EventBus` with actual event emission
- ✅ Real `EffectOperationsService` with command execution
- ✅ Real `PreferencesService` with file I/O
- ❌ **No mocks, stubs, or fake implementations**

### Writing Tests

```javascript
// Example test file: tests/unit/my-component.test.js
import TestEnvironment from '../setup/TestEnvironment.js';

export async function testMyFeature() {
  const testEnv = new TestEnvironment();
  await testEnv.setup();
  
  try {
    // Get real service instances
    const service = testEnv.getService('MyService');
    
    // Test with real objects
    const result = await service.doSomething();
    
    if (result !== expected) {
      throw new Error('Test failed');
    }
    
    console.log('✅ Test passed');
  } finally {
    await testEnv.cleanup();
  }
}
```

### Test Coverage

See [TEST_SUITE_100_PERCENT_COMPLETE.md](tests/docs/TEST_SUITE_100_PERCENT_COMPLETE.md) for details on achieving 100% test pass rate.

---

## 📁 Project Structure

```
nft-studio/
├── src/                          # Source code
│   ├── App.jsx                  # Main React component
│   ├── ApplicationFactory.js    # Dependency injection container
│   ├── pages/                   # Application screens
│   │   ├── Welcome.jsx          # Welcome/landing page
│   │   ├── NewProject.jsx       # Project creation wizard
│   │   ├── Resume.jsx           # Project selection screen
│   │   └── Edit.jsx             # Main project editor
│   ├── components/              # Reusable UI components
│   │   ├── EffectWizard/        # Effect configuration wizard
│   │   ├── EventBusDisplay/     # Real-time event display
│   │   ├── ColorSchemeCreator/  # Color palette tool
│   │   ├── EffectPreview/       # Live preview system
│   │   └── EffectsList/         # Effect management UI
│   ├── services/                # Backend services
│   │   ├── ProjectService.js    # Project management
│   │   ├── CommandService.js    # Undo/redo system
│   │   ├── EventBusService.js   # Event communication
│   │   ├── PreferencesService.js # User preferences
│   │   └── EffectOperationsService.js # Effect operations
│   ├── commands/                # Command pattern implementations
│   │   ├── AddEffectCommand.js
│   │   ├── DeleteEffectCommand.js
│   │   ├── UpdateEffectCommand.js
│   │   └── ReorderEffectsCommand.js
│   ├── models/                  # Data models
│   │   └── ProjectState.js      # Central project state (SSOT)
│   ├── utils/                   # Helper utilities
│   │   ├── ResolutionMapper.js  # Resolution presets
│   │   └── ScalingUtilities.js  # Scaling calculations
│   ├── hooks/                   # Custom React hooks
│   ├── contexts/                # React contexts
│   └── styles.css               # Global styles
├── tests/                       # Test suite (480 tests)
│   ├── unit/                    # Unit tests (461)
│   ├── integration/             # Integration tests (16)
│   ├── system/                  # System tests (3)
│   ├── setup/                   # Test environment
│   └── the-one-runner-to-rule-them-all.js
├── icons/                       # Application icons (cyberpunk theme)
│   ├── icon.svg                 # Original vector with animations
│   ├── icon.icns                # macOS icon
│   ├── icon.ico                 # Windows icon
│   ├── icon.png                 # Linux icon (512x512)
│   └── icon-*.png               # Various sizes (16-1024px)
├── scripts/                     # Utility scripts
│   ├── generate-icons.js        # Icon generation script
│   ├── copy-assets.js           # Asset copying script
│   └── clean-preferences.js     # Preferences cleanup
├── docs/                        # Documentation
│   ├── BUILD_GUIDE.md
│   ├── EVENT_NAMING_GUIDE.md
│   └── fixes/
├── dist/                        # Build output (generated)
├── build/                       # Packaged apps (generated)
├── main.js                      # Electron main process
├── render.js                    # React entry point
├── preload.js                   # Secure IPC bridge
├── index.html                   # HTML template
├── webpack.config.js            # Webpack configuration
├── package.json                 # Project configuration
└── README.md                    # This file
```

---

## 🏗️ Architecture

### Technology Stack

- **Frontend Framework**: React 18.3.1
- **Desktop Framework**: Electron 30.0.6
- **Build Tool**: Webpack 5.91.0
- **UI Components**: Material-UI 7.3.2, Radix UI
- **Styling**: CSS with custom styles
- **IPC**: Electron IPC with secure context bridge
- **State Management**: Custom hooks and context providers
- **NFT Engine**: my-nft-gen (local dependency)

### Architectural Patterns

#### 🎯 Single Source of Truth (SSOT)

**ProjectState** (`src/models/ProjectState.js`) is the central authority for all project data:
- Maintains complete project configuration
- Handles automatic resolution scaling when dimensions change
- Manages effects list with all properties and sub-effects
- Provides save/load functionality for `.nftproject` files
- Emits update events for UI synchronization

**Key Methods:**
- `setTargetResolution()` - Auto-scales all effects when resolution changes
- `setIsHorizontal()` - Auto-scales when orientation changes
- `getResolutionDimensions()` - Returns calculated width/height
- `reorderEffects()` - Maintains effect order
- `update()` - Generic update method that triggers callbacks

#### 🔄 Command Pattern

**CommandService** (`src/services/CommandService.js`) implements undo/redo:
- Tracks up to 50 effect-related actions
- Filters out non-effect commands (resolution, orientation, frames)
- Provides detailed human-readable descriptions with effect IDs
- Supports undo/redo to any point in history

**Effect Commands:**
- `AddEffectCommand` - Add primary effects
- `DeleteEffectCommand` - Remove effects
- `UpdateEffectCommand` - Modify effect properties
- `ReorderEffectsCommand` - Drag & drop reordering
- `AddSecondaryEffectCommand` - Add secondary effects
- `AddKeyframeEffectCommand` - Add keyframe effects
- `DeleteSecondaryEffectCommand` - Remove secondary effects
- `DeleteKeyframeEffectCommand` - Remove keyframe effects

#### 📡 Event Bus Architecture

**EventBusService** (`src/services/EventBusService.js`) enables decoupled communication:
- `effect:*` - Effect-related actions
- `project:*` - Project management
- `resolution:*` - Resolution changes
- `orientation:*` - Orientation changes
- `command:*` - Undo/redo actions
- `renderloop:*` - Render control

#### 🔌 IPC Communication

```javascript
// Renderer → Main
await window.api.readFile(path);
await window.api.saveProject(projectData);

// Main → Renderer
ipcMain.handle('read-file', async (event, path) => {
  return await fs.readFile(path);
});
```

### Process Architecture

#### Main Process (main.js)
- Handles all file system operations
- Manages IPC communication channels
- Controls application lifecycle
- Interfaces with my-nft-gen engine
- Window management

#### Renderer Process (React)
- Component-based architecture
- Custom hooks for state management
- Service layer with dependency injection
- Event-driven communication
- Material-UI components

#### Preload Script (preload.js)
- Secure contextBridge with exposed API methods
- Prevents direct filesystem access from renderer
- Provides safe IPC communication

### Key Design Decisions

1. **Separation of Concerns**: Clear separation between UI and business logic
2. **Security**: Secure IPC bridge prevents direct filesystem access from renderer
3. **Modularity**: Component-based architecture for reusability
4. **Performance**: Lazy loading and code splitting for optimal performance
5. **Extensibility**: Plugin-based effect system for easy additions
6. **Single Update Flow**: User Action → Command → ProjectState → Event → UI Update
7. **No Direct State Modification**: Always use ProjectState methods
8. **Event-Driven UI Updates**: Components subscribe to events, not direct callbacks

### Important Patterns to Follow

1. **Never Directly Modify State** - Always use ProjectState methods
2. **Use Commands for User Actions** - All effect modifications should use Command pattern
3. **Event-Driven UI Updates** - Components subscribe to events, not direct callbacks
4. **Resolution Changes Auto-Scale** - Never manually scale effects; ProjectState handles it
5. **Effect IDs for Uniqueness** - All effects have unique IDs for tracking
6. **Single Update Flow**: User Action → Command → ProjectState → Event → UI Update

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use ES6+ features
- Follow existing code conventions
- Add JSDoc comments for functions
- Write tests for new features (NO MOCKS!)
- Ensure all tests pass before submitting
- Follow SOLID principles

### Commit Messages

Follow conventional commits format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

### Testing Requirements

- All new features must include tests
- Tests must use real objects (NO MOCKS)
- All tests must pass (100% pass rate)
- Follow existing test patterns in `tests/` directory

---

## 🆘 Support

### Documentation

- [User Guide](docs/user-guide.md) *(coming soon)*
- [Developer Guide](docs/developer-guide.md) *(coming soon)*
- [Build Guide](docs/BUILD_GUIDE.md)
- [Event Naming Guide](docs/EVENT_NAMING_GUIDE.md)
- [Cyberpunk Icon Implementation](CYBERPUNK_ICON_IMPLEMENTATION.md)
- [Pin Feature Architecture](PIN_FEATURE_ARCHITECTURE.md)
- [Test Suite Documentation](tests/docs/TEST_SUITE_100_PERCENT_COMPLETE.md)

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/yourusername/nft-studio/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/nft-studio/discussions)

### Reporting Bugs

When reporting bugs, please include:
- Operating system and version
- Node.js and npm versions
- Steps to reproduce the issue
- Expected vs actual behavior
- Error messages and logs
- Screenshots (if applicable)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built on top of the amazing [my-nft-gen](https://github.com/yourusername/my-nft-gen) engine
- Thanks to all contributors and the open source community
- Special thanks to the Electron and React teams
- Cyberpunk icon design inspired by the NFT and blockchain aesthetic

---

## 🎯 Project Status

### Current Version: 0.0.1

### Recent Achievements
- ✅ **100% Test Pass Rate** (480/480 tests passing)
- ✅ **Cyberpunk Icon Implementation** with neon aesthetics
- ✅ **Pin Feature** for locking effect properties
- ✅ **Command Pattern** with full undo/redo support
- ✅ **Auto-Scaling System** for resolution changes
- ✅ **Color Scheme Creator** with favorites
- ✅ **Event Bus Display** for real-time monitoring

### Roadmap
- 🔄 Enhanced effect preview system
- 🔄 Additional effect types
- 🔄 Improved metadata generation
- 🔄 Cloud project storage
- 🔄 Collaborative editing features

---

<div align="center">

  <img src="icons/icon.svg" alt="NFT Studio Icon" width="128" height="128">

  **Made with ❤️ and ⚡ by the NFT Studio Team**

  *Powered by cutting-edge technology and cyberpunk aesthetics*

</div>