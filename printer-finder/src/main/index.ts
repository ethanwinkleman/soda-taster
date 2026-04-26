import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'
import type BonjourType from 'bonjour-service'

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const BonjourModule = require('bonjour-service') as any
const Bonjour: typeof BonjourType = BonjourModule.default ?? BonjourModule

let mainWindow: BrowserWindow | null = null
let bonjour: InstanceType<typeof BonjourType> | null = null
const browsers: ReturnType<InstanceType<typeof BonjourType>['find']>[] = []

const PRINTER_TYPES = ['ipp', 'ipps', 'printer', 'pdl-datastream']

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    title: 'Printer Finder',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function mapService(service: Record<string, unknown>, type: string) {
  const txt = (service.txt as Record<string, unknown>) || {}
  const addresses = (service.addresses as string[]) || []
  return {
    id: `${service.host}:${service.port}:_${type}._tcp`,
    name: service.name as string,
    host: service.host as string,
    addresses,
    port: service.port as number,
    serviceType: `_${type}._tcp`,
    model: (txt['ty'] || txt['usb_MDL'] || txt['product'] || '') as string || undefined,
    location: (txt['note'] || txt['loc'] || '') as string || undefined,
    discoveredAt: new Date().toISOString()
  }
}

function startScan(): void {
  if (bonjour) return

  bonjour = new Bonjour()

  for (const type of PRINTER_TYPES) {
    const browser = bonjour.find({ type })

    browser.on('up', (service: Record<string, unknown>) => {
      const printer = mapService(service, type)
      mainWindow?.webContents.send('printer:discovered', printer)
    })

    browser.on('down', (service: Record<string, unknown>) => {
      const id = `${service.host}:${service.port}:_${type}._tcp`
      mainWindow?.webContents.send('printer:removed', id)
    })

    browsers.push(browser)
  }

  mainWindow?.webContents.send('scan:status', 'scanning')
}

function stopScan(): void {
  for (const browser of browsers) {
    browser.stop()
  }
  browsers.length = 0
  bonjour?.destroy()
  bonjour = null
  mainWindow?.webContents.send('scan:status', 'idle')
}

app.whenReady().then(() => {
  createWindow()

  ipcMain.on('scan:start', () => startScan())
  ipcMain.on('scan:stop', () => stopScan())

  ipcMain.handle('export:csv', async (_event, printers: Record<string, unknown>[]) => {
    if (!mainWindow) return { success: false }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Printer List',
      defaultPath: 'printers.csv',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    })

    if (result.canceled || !result.filePath) return { success: false }

    const headers = ['Name', 'Model', 'Host', 'IP Addresses', 'Port', 'Service Type', 'Location', 'Discovered At']
    const rows = printers.map((p) => [
      p['name'],
      p['model'] || '',
      p['host'],
      (p['addresses'] as string[]).join('; '),
      p['port'],
      p['serviceType'],
      p['location'] || '',
      p['discoveredAt']
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    writeFileSync(result.filePath, csv, 'utf-8')
    return { success: true, path: result.filePath }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopScan()
  if (process.platform !== 'darwin') app.quit()
})
