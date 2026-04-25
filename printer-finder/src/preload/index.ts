import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('printerFinder', {
  startScan: () => ipcRenderer.send('scan:start'),
  stopScan: () => ipcRenderer.send('scan:stop'),
  exportCsv: (printers: unknown[]) => ipcRenderer.invoke('export:csv', printers),

  onPrinterDiscovered: (callback: (printer: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, printer: unknown) => callback(printer)
    ipcRenderer.on('printer:discovered', handler)
    return () => ipcRenderer.removeListener('printer:discovered', handler)
  },

  onPrinterRemoved: (callback: (id: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, id: string) => callback(id)
    ipcRenderer.on('printer:removed', handler)
    return () => ipcRenderer.removeListener('printer:removed', handler)
  },

  onScanStatus: (callback: (status: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: string) => callback(status)
    ipcRenderer.on('scan:status', handler)
    return () => ipcRenderer.removeListener('scan:status', handler)
  }
})
