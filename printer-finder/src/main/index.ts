import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'
import { spawn, ChildProcess } from 'child_process'
import type BonjourType from 'bonjour-service'

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const BonjourModule = require('bonjour-service') as any
const Bonjour: typeof BonjourType = BonjourModule.default ?? BonjourModule

const PRINTER_TYPES = ['_ipp._tcp', '_ipps._tcp', '_printer._tcp', '_pdl-datastream._tcp']

let mainWindow: BrowserWindow | null = null
let scanning = false

// bonjour-service state (non-macOS)
let bonjour: InstanceType<typeof BonjourType> | null = null
const browsers: ReturnType<InstanceType<typeof BonjourType>['find']>[] = []

// dns-sd state (macOS)
const dnsSdProcesses: ChildProcess[] = []
const resolving = new Set<string>()
const discovered = new Set<string>()

// ─── Window ─────────────────────────────────────────────────────────────────

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
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function parseTxt(line: string): Record<string, string> {
  const result: Record<string, string> = {}
  const pairs = line.match(/(\w+)=([^\s]*)/g) ?? []
  for (const pair of pairs) {
    const eq = pair.indexOf('=')
    if (eq > 0) result[pair.slice(0, eq)] = pair.slice(eq + 1)
  }
  return result
}

function emitPrinter(printer: Record<string, unknown>): void {
  const id = printer['id'] as string
  if (discovered.has(id)) return
  discovered.add(id)
  console.log(`[PrinterFinder] Printer ready: ${printer['name']} at ${(printer['addresses'] as string[])[0]}:${printer['port']}`)
  mainWindow?.webContents.send('printer:discovered', printer)
}

// ─── macOS: dns-sd ───────────────────────────────────────────────────────────

function spawnDnsSd(args: string[]): ChildProcess {
  const proc = spawn('dns-sd', args)
  dnsSdProcesses.push(proc)
  proc.stderr?.on('data', () => {})
  return proc
}

function resolveIp(host: string, port: number, name: string, serviceType: string, txt: Record<string, string>): void {
  const proc = spawnDnsSd(['-G', 'v4', host])
  let found = false
  let buf = ''

  proc.stdout?.on('data', (chunk: Buffer) => {
    if (found) return
    buf += chunk.toString()
    for (const line of buf.split('\n')) {
      // timestamp  Add  flags  iface  hostname  IP  TTL
      const m = line.match(/^\s*[\d:.]+\s+Add\s+\d+\s+\d+\s+\S+\s+([\d.]+)\s+\d+/)
      if (m && !m[1].startsWith('0.')) {
        found = true
        emitPrinter({
          id: `${host}:${port}:${serviceType}`,
          name,
          host,
          addresses: [m[1]],
          port,
          serviceType,
          model: txt['ty'] || txt['usb_MDL'] || txt['product'] || undefined,
          location: txt['note'] || txt['loc'] || undefined,
          discoveredAt: new Date().toISOString()
        })
        proc.kill()
        break
      }
    }
  })

  const t = setTimeout(() => proc.kill(), 5000)
  proc.on('close', () => clearTimeout(t))
}

function resolveService(name: string, serviceType: string): void {
  const proc = spawnDnsSd(['-L', name, serviceType, 'local'])
  let buf = ''
  let resolved = false

  proc.stdout?.on('data', (chunk: Buffer) => {
    if (resolved) return
    buf += chunk.toString()
    // "Name._type.local. can be reached at hostname.local.:port"
    const m = buf.match(/can be reached at ([^:]+\.local\.?):(\d+)/)
    if (!m) return
    resolved = true

    const host = m[1].endsWith('.') ? m[1].slice(0, -1) : m[1]
    const port = parseInt(m[2], 10)
    const txtLine = buf.split('\n').find((l) => /^\s+\w+=/.test(l)) ?? ''
    console.log(`[PrinterFinder] Resolved: ${name} -> ${host}:${port}`)
    resolveIp(host, port, name, serviceType, parseTxt(txtLine))
    proc.kill()
  })

  const t = setTimeout(() => { if (!resolved) proc.kill() }, 5000)
  proc.on('close', () => clearTimeout(t))
}

function startScanMacOS(): void {
  for (const serviceType of PRINTER_TYPES) {
    console.log(`[PrinterFinder] dns-sd: Browsing for ${serviceType}`)
    const proc = spawnDnsSd(['-B', serviceType, 'local'])
    let buf = ''

    proc.stdout?.on('data', (chunk: Buffer) => {
      buf += chunk.toString()
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        // timestamp  Add  flags  iface  domain  type  name
        const m = line.match(/^\s*[\d:.]+\s+Add\s+\d+\s+\d+\s+\S+\s+\S+\s+(.+)$/)
        if (!m) continue
        const name = m[1].trim()
        const key = `${name}:${serviceType}`
        if (resolving.has(key)) continue
        resolving.add(key)
        console.log(`[PrinterFinder] Found: "${name}" via ${serviceType}`)
        resolveService(name, serviceType)
      }
    })
  }
}

function stopScanMacOS(): void {
  for (const proc of dnsSdProcesses) proc.kill()
  dnsSdProcesses.length = 0
  resolving.clear()
  discovered.clear()
}

// ─── Non-macOS: bonjour-service ──────────────────────────────────────────────

function startScanBonjour(): void {
  bonjour = new Bonjour()
  for (const serviceType of PRINTER_TYPES) {
    const type = serviceType.replace(/^_/, '').replace(/\._tcp$/, '')
    console.log(`[PrinterFinder] bonjour: Browsing for ${serviceType}`)
    const browser = bonjour!.find({ type })

    browser.on('up', (service: Record<string, unknown>) => {
      const txt = (service['txt'] as Record<string, unknown>) ?? {}
      const addresses = (service['addresses'] as string[]) ?? []
      emitPrinter({
        id: `${service['host']}:${service['port']}:${serviceType}`,
        name: service['name'] as string,
        host: service['host'] as string,
        addresses,
        port: service['port'] as number,
        serviceType,
        model: (txt['ty'] || txt['usb_MDL'] || txt['product'] || '') as string || undefined,
        location: (txt['note'] || txt['loc'] || '') as string || undefined,
        discoveredAt: new Date().toISOString()
      })
    })

    browser.on('down', (service: Record<string, unknown>) => {
      const id = `${service['host']}:${service['port']}:${serviceType}`
      mainWindow?.webContents.send('printer:removed', id)
    })

    browsers.push(browser)
  }
}

function stopScanBonjour(): void {
  for (const browser of browsers) browser.stop()
  browsers.length = 0
  bonjour?.destroy()
  bonjour = null
  discovered.clear()
}

// ─── Scan control ────────────────────────────────────────────────────────────

function startScan(): void {
  if (scanning) return
  scanning = true
  console.log(`[PrinterFinder] Starting mDNS scan (platform: ${process.platform})...`)

  if (process.platform === 'darwin') {
    startScanMacOS()
  } else {
    startScanBonjour()
  }

  mainWindow?.webContents.send('scan:status', 'scanning')
  console.log('[PrinterFinder] Scan started, listening for mDNS announcements...')
}

function stopScan(): void {
  if (!scanning) return
  scanning = false

  if (process.platform === 'darwin') {
    stopScanMacOS()
  } else {
    stopScanBonjour()
  }

  mainWindow?.webContents.send('scan:status', 'idle')
  console.log('[PrinterFinder] Scan stopped.')
}

// ─── App lifecycle ───────────────────────────────────────────────────────────

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
      p['name'], p['model'] || '', p['host'],
      (p['addresses'] as string[]).join('; '),
      p['port'], p['serviceType'], p['location'] || '', p['discoveredAt']
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
