import electron from 'electron'
const { app, BrowserWindow } = electron
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import SolidIpcHandlers from './src/main/modules/SolidIpcHandlers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
}

// App event handlers
app.whenReady().then(() => {
  // Create SOLID IPC handlers manager
  const ipcHandlers = new SolidIpcHandlers()

  // Register all IPC handlers using dependency injection
  ipcHandlers.registerHandlers()

  // Create the main window
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})