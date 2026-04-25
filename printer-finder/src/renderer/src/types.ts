export interface Printer {
  id: string
  name: string
  host: string
  addresses: string[]
  port: number
  serviceType: string
  model?: string
  location?: string
  discoveredAt: string
}

export interface ExportResult {
  success: boolean
  path?: string
}

declare global {
  interface Window {
    printerFinder: {
      startScan: () => void
      stopScan: () => void
      exportCsv: (printers: Printer[]) => Promise<ExportResult>
      onPrinterDiscovered: (callback: (printer: Printer) => void) => () => void
      onPrinterRemoved: (callback: (id: string) => void) => () => void
      onScanStatus: (callback: (status: string) => void) => () => void
    }
  }
}
