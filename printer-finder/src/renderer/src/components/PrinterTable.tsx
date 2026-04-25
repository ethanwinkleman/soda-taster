import { Printer } from '../types'

interface Props {
  printers: Printer[]
  scanning: boolean
}

const SERVICE_COLORS: Record<string, string> = {
  '_ipp._tcp': 'bg-blue-50 text-blue-700 border-blue-100',
  '_ipps._tcp': 'bg-indigo-50 text-indigo-700 border-indigo-100',
  '_printer._tcp': 'bg-purple-50 text-purple-700 border-purple-100',
  '_pdl-datastream._tcp': 'bg-teal-50 text-teal-700 border-teal-100'
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString()
}

export default function PrinterTable({ printers, scanning }: Props) {
  if (printers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 select-none">
        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
        </svg>
        <p className="text-base font-medium text-gray-500">
          {scanning ? 'Scanning for printers...' : 'No printers found'}
        </p>
        {!scanning && (
          <p className="text-sm">Click &ldquo;Scan Network&rdquo; to discover printers via mDNS/Bonjour</p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Model</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">IP Address</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Port</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Service</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Found At</th>
          </tr>
        </thead>
        <tbody>
          {printers.map((printer) => {
            const badgeClass = SERVICE_COLORS[printer.serviceType] ?? 'bg-gray-100 text-gray-600 border-gray-200'
            return (
              <tr
                key={printer.id}
                className="border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-900">{printer.name}</td>
                <td className="px-4 py-3 text-gray-600">{printer.model ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">
                  {printer.addresses[0] ?? printer.host}
                </td>
                <td className="px-4 py-3 text-gray-600">{printer.port}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${badgeClass}`}>
                    {printer.serviceType}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{printer.location ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatTime(printer.discoveredAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
