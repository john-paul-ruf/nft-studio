# NFT Studio Build Guide

## ✅ Build System Overview

The NFT Studio build system has been configured to support cross-platform distribution for macOS, Windows, and Linux.

## 🛠️ Prerequisites

### All Platforms
- Node.js 16+ and npm
- Git

### Platform-Specific Requirements

#### macOS
- Xcode Command Line Tools: `xcode-select --install`
- For code signing: Apple Developer ID certificate (optional)

#### Windows  
- Windows Build Tools: `npm install --global windows-build-tools`
- Visual Studio 2019+ with C++ workload (for native modules)

#### Linux
- Build essentials: `sudo apt-get install build-essential`
- Additional packages: `sudo apt-get install libnss3-dev libatk-bridge2.0-0 libdrm-dev libxcomposite-dev libxdamage-dev libxrandr-dev libgbm-dev libxss-dev libasound2-dev`

## 📦 Building the Application

### 1. Install Dependencies
```bash
npm install
```

This will automatically run `postinstall` script to set up electron-builder app dependencies.

### 2. Generate/Update Icons
```bash
npm run generate-icons
```

Currently creates placeholder icons. For production, replace the SVG content in `scripts/generate-icons.js` with your actual logo.

### 3. Build the Application

#### Development Build
```bash
npm run build
```

#### Build for Specific Platforms
```bash
# macOS
npm run package:mac

# Windows  
npm run package:win

# Linux
npm run package:linux

# All platforms (only works fully on macOS)
npm run package
```

## 🔍 Verification

Run the build verification script to check your setup:
```bash
node scripts/verify-build.js
```

## 📁 Build Output

Distribution files are created in the `build/` directory:

- **macOS**: 
  - `.dmg` - Installer disk image
  - `.zip` - Portable archive
  - Supports both Intel (x64) and Apple Silicon (arm64)

- **Windows**:
  - `.exe` - NSIS installer
  - `.exe` - Portable executable
  - Supports 64-bit and 32-bit architectures

- **Linux**:
  - `.AppImage` - Universal portable format
  - `.deb` - Debian/Ubuntu package
  - `.snap` - Snap package

## 🎨 Icon Requirements

### Current Status
- ✅ Placeholder icons generated for all platforms
- ⚠️ Icons are basic placeholders - replace for production

### Production Icon Guidelines

1. **Source Icon**: Create a high-resolution (1024x1024) PNG or SVG
2. **Required Formats**:
   - macOS: `.icns` file with multiple resolutions
   - Windows: `.ico` file with 16x16, 32x32, 48x48, 256x256
   - Linux: PNG files at various sizes (16 to 512px)

### Generating Production Icons

Option 1: Use electron-icon-builder
```bash
npm install --save-dev electron-icon-builder
npx electron-icon-builder --input=icons/source.png --output=icons --flatten
```

Option 2: Platform-specific tools
- macOS: Use `iconutil` to convert iconset to .icns
- Windows: Use icon editors or online converters
- Linux: Use ImageMagick to resize PNG

## 🐛 Troubleshooting

### Build Warnings

#### Case-sensitive file names
**Warning**: "There are multiple modules with names that only differ in casing"
**Fix**: Ensure consistent file naming (fixed: ConfigIntrospector.js)

#### NODE_ENV conflicts  
**Warning**: "Conflicting values for 'process.env.NODE_ENV'"
**Fix**: Already addressed in webpack config

### Platform-Specific Issues

#### macOS Code Signing
If you see "cannot find valid Developer ID Application":
- This is normal without an Apple Developer account
- The app will still build and run
- Users may need to right-click → Open on first launch

#### Windows Defender
Windows Defender may flag unsigned executables:
- This is expected for unsigned apps
- Consider code signing for production releases

#### Linux Permissions
AppImage may need execute permissions:
```bash
chmod +x NFT-Studio-*.AppImage
```

## 🚀 Production Checklist

- [ ] Replace placeholder icons with production icons
- [ ] Update version number in package.json
- [ ] Test on target platforms
- [ ] Code sign for macOS and Windows (optional but recommended)
- [ ] Create release notes
- [ ] Test auto-updater functionality
- [ ] Verify all native modules are properly bundled

## 📝 Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run build` | Production webpack build |
| `npm run copy:assets` | Cross-platform asset copying |
| `npm run generate-icons` | Generate placeholder icons |
| `npm run package` | Build for all platforms |
| `npm run package:mac` | Build for macOS |
| `npm run package:win` | Build for Windows |
| `npm run package:linux` | Build for Linux |
| `npm run clean:preferences` | Clear user preferences |
| `node scripts/verify-build.js` | Verify build configuration |

## 🔧 Advanced Configuration

### Custom Build Options

Edit `package.json` → `build` section for:
- App metadata (name, version, description)
- File associations
- Protocol handlers  
- Auto-update configuration
- Code signing settings

### Native Module Rebuilding

If you add new native modules:
```bash
npm run rebuild
```

Or add to package.json:
```json
"postinstall": "electron-builder install-app-deps && electron-rebuild"
```