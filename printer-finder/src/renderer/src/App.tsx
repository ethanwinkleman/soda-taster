import { useState, useEffect, useCallback } from 'react'
import { Printer } from './types'
import ScanControls from './components/ScanControls'
import PrinterTable from './components/PrinterTable'

export default function App() {
  const [printers, setPrinters] = useState<Printer[]>([])
  const [scanning, setScanning] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const offDiscovered = window.printerFinder.onPrinterDiscovered((printer) => {
      setPrinters((prev) => (prev.some((p) => p.id === printer.id) ? prev : [...prev, printer]))
    })

    const offRemoved = window.printerFinder.onPrinterRemoved((id) => {
      setPrinters((prev) => prev.filter((p) => p.id !== id))
    })

    const offStatus = window.printerFinder.onScanStatus((status) => {
      setScanning(status === 'scanning')
    })

    return () => {
      offDiscovered()
      offRemoved()
      offStatus()
    }
  }, [])

  const handleStart = useCallback(() => {
    setPrinters([])
    window.printerFinder.startScan()
  }, [])

  const handleStop = useCallback(() => {
    window.printerFinder.stopScan()
  }, [])

  const handleExport = useCallback(async () => {
    const result = await window.printerFinder.exportCsv(printers)
    if (result.success && result.path) {
      setToast(`Saved: ${result.path}`)
      setTimeout(() => setToast(null), 4000)
    }
  }, [printers])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
            </svg>
            <h1 className="text-lg font-semibold text-gray-900">Printer Finder</h1>
          </div>
          <ScanControls
            scanning={scanning}
            printerCount={printers.length}
            onStart={handleStart}
            onStop={handleStop}
            onExport={handleExport}
            canExport={printers.length > 0}
          />
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <PrinterTable printers={printers} scanning={scanning} />
      </main>

      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}
    </div>
  )
}
