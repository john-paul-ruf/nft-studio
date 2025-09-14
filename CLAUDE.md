# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NFT Studio is an Electron-based frontend application for the `my-nft-gen` NFT generation engine. It provides a visual interface for creating, configuring, and monitoring NFT generation projects.

## Development Commands

- `npm run dev` - Start webpack in watch mode for development
- `npm run build` - Build for production
- `npm start` - Build and launch the Electron app
- `npm run electron` - Launch Electron without rebuilding
- `npm run rebuild` - Rebuild native dependencies (canvas, sharp) for Electron

## Architecture

### Frontend Stack
- **Electron**: Main process handles IPC and file system operations
- **React 18**: Frontend UI framework
- **Webpack**: Bundler with Babel for JSX/ES6+ transpilation
- **CSS**: Custom styling (no framework)

### Project Structure
- `main.js` - Electron main process with extensive IPC handlers
- `render.js` - React app entry point
- `src/App.jsx` - Main React component with view routing
- `src/pages/` - Main application screens (Welcome, NewProject, Resume, Edit)
- `src/components/` - Reusable components including effect wizards and previews
- `src/services/` - Backend service integrations
- `src/utils/` - Helper utilities for config introspection and schema generation

### Key Components
- **EffectWizard**: Multi-step wizard for creating NFT effects
- **EventBusDisplay**: Real-time display of generation progress events
- **ColorSchemeCreator**: Tool for creating color palettes
- **EffectPreview**: Live preview system for effects and thumbnails

### IPC Communication
The main process exposes extensive IPC handlers for:
- File system operations (read/write, dialogs)
- NFT generation (resume-project, effect discovery/validation/preview)
- Frame viewing and management
- Config introspection for dynamic UI generation

### Integration with my-nft-gen
- Depends on local `my-nft-gen` package (file:../my-nft-gen)
- Dynamically imports effect classes and config classes
- Uses UnifiedEventBus for real-time progress monitoring
- Supports effect discovery, validation, and preview rendering

### Native Dependencies
- **canvas** and **sharp**: Image processing libraries requiring native compilation
- Use `npm run rebuild` after Electron version changes

## Development Notes

- The app uses React without TypeScript
- Main process handles all file system and generation operations
- Effect configuration is dynamically generated based on config class introspection
- Preview system renders effects in real-time using the underlying NFT generation engine