import electron from 'electron'
const { app, BrowserWindow } = electron
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import SolidIpcHandlers from './src/main/modules/SolidIpcHandlers.js'
import SafeConsole from './src/main/utils/SafeConsole.js'
import NodeConsoleInterceptor from './src/main/utils/NodeConsoleInterceptor.js'
import AsarModuleResolver from './src/utils/AsarModuleResolver.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Start console interception IMMEDIATELY (before any other code runs)
// This ensures we capture ALL console output from app startup
NodeConsoleInterceptor.startIntercepting()

// Configure module resolution for ASAR-packaged apps BEFORE any services load
// This ensures bundled modules like my-nft-gen can be resolved by plugins and services
const asarResolver = AsarModuleResolver
const nodeModulesPath = asarResolver.getNodeModulesPath()

// CRITICAL: Set NODE_PATH environment variable for ES module resolution
// This must be set BEFORE any modules are loaded, and is essential for plugins
// to resolve dependencies like my-nft-gen when dynamically imported from outside the app bundle
const existingNodePath = process.env.NODE_PATH || ''
const newNodePath = existingNodePath 
  ? `${nodeModulesPath}${path.delimiter}${existingNodePath}`
  : nodeModulesPath
process.env.NODE_PATH = newNodePath

// Verify the path exists and contains my-nft-gen
const myNftGenPath = path.join(nodeModulesPath, 'my-nft-gen')
const nodeModulesExists = fs.existsSync(nodeModulesPath)
const myNftGenExists = fs.existsSync(myNftGenPath)

SafeConsole.log(`[AsarModuleResolver] ✅ NODE_PATH set to: ${newNodePath}`)
SafeConsole.log(`[AsarModuleResolver] ℹ️  node_modules exists: ${nodeModulesExists}`)
SafeConsole.log(`[AsarModuleResolver] ℹ️  my-nft-gen exists: ${myNftGenExists}`)

// Handle EPIPE errors globally to prevent crashes
process.on('uncaughtException', (error) => {
  if (error.code === 'EPIPE') {
    // EPIPE errors occur when writing to a closed pipe/socket
    // This commonly happens with console output - silently ignore
    return
  }
  // For other uncaught exceptions, log them safely
  SafeConsole.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  SafeConsole.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Set the app name
app.name = 'NFT Studio'

/**
 * Create the main application window
 */
function createWindow () {
  // Platform-specific icon
  let iconPath
  if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, 'icons', 'icon.icns')
  } else if (process.platform === 'win32') {
    iconPath = path.join(__dirname, 'icons', 'icon.ico')
  } else {
    iconPath = path.join(__dirname, 'icons', 'icon.png')
  }

  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    title: 'NFT Studio',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Set main window for console interceptor (enables IPC forwarding)
  NodeConsoleInterceptor.setMainWindow(mainWindow)

  // Load the index.html of the app
  if (process.env.NODE_ENV === 'development') {
    // In development, load from webpack dev server
    mainWindow.loadURL('http://localhost:8080')

    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load the built file
    mainWindow.loadFile('dist/index.html')
  }
  
  return mainWindow
}

// Store IPC handlers instance for cleanup
let ipcHandlers = null

// App event handlers
app.whenReady().then(async () => {
  try {
    SafeConsole.log('📱 [main] app.whenReady() fired, initializing...')
    
    // Create SOLID IPC handlers manager
    ipcHandlers = new SolidIpcHandlers()
    SafeConsole.log('📱 [main] SolidIpcHandlers created')

    // Register all IPC handlers using dependency injection
    // This is now async - waits for effects to be initialized
    SafeConsole.log('📱 [main] Registering IPC handlers...')
    await ipcHandlers.registerHandlers()
    SafeConsole.log('✅ [main] IPC handlers registered successfully')

    // Create the main window
    SafeConsole.log('📱 [main] Creating main window...')
    createWindow()
    SafeConsole.log('✅ [main] Main window created')

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (error) {
    SafeConsole.error('❌ [main] Error during app initialization:', error)
    process.exit(1)
  }
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// Cleanup on app quit
app.on('before-quit', async (event) => {
  // Prevent default quit to allow cleanup
  event.preventDefault()

  try {
    if (ipcHandlers) {
      await ipcHandlers.cleanup()
      ipcHandlers = null
    }
  } catch (error) {
    SafeConsole.error('Error during cleanup:', error)
  } finally {
    // Actually quit after cleanup
    app.exit(0)
  }
})