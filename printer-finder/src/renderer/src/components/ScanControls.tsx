interface Props {
  scanning: boolean
  printerCount: number
  onStart: () => void
  onStop: () => void
  onExport: () => void
  canExport: boolean
}

export default function ScanControls({ scanning, printerCount, onStart, onStop, onExport, canExport }: Props) {
  return (
    <div className="flex items-center gap-4">
      {printerCount > 0 && (
        <span className="text-sm text-gray-500">
          {printerCount} printer{printerCount !== 1 ? 's' : ''} found
        </span>
      )}

      <button
        onClick={onExport}
        disabled={!canExport}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Save as CSV
      </button>

      {scanning ? (
        <button
          onClick={onStop}
          className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Stop
        </button>
      ) : (
        <button
          onClick={onStart}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Scan Network
        </button>
      )}

      {scanning && (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-gray-500">Scanning...</span>
        </div>
      )}
    </div>
  )
}
