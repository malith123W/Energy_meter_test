import { useParams } from 'react-router-dom'
import { useReportsStore } from '../store/reports'
import { useMemo, useState } from 'react'
import type { Report } from '../types'

export default function ReportView() {
  const { id } = useParams()
  const getById = useReportsStore((s) => s.getById)
  const report = getById(id!)
  const [branchName, setBranchName] = useState(report?.details.branchName || '')
  const [transformerNumber, setTransformerNumber] = useState(report?.details.transformerNumber || '')

  const json = useMemo(() => JSON.stringify(report?.testData ?? {}, null, 2), [report])

  if (!report) return <div className="text-red-600">Report not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Report Details</h1>
        <div className="flex gap-2">
          <button className="px-3 py-2 bg-gray-100 rounded">Generate Jasper Report</button>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-3">Meta</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500 text-xs">Status</div>
              <div>{report.status}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Updated</div>
              <div>{new Date(report.updatedAt).toLocaleString()}</div>
            </div>
            <div className="col-span-2">
              <div className="text-gray-500 text-xs">Branch Name</div>
              <div>{branchName}</div>
            </div>
            <div className="col-span-2">
              <div className="text-gray-500 text-xs">Transformer Number</div>
              <div>{transformerNumber}</div>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-3">Test Data</h2>
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-96">{json}</pre>
        </div>
      </section>

      <section className="bg-white border rounded p-4">
        <h2 className="font-semibold mb-3">History</h2>
        <ul className="text-sm space-y-2">
          {report.history.map((h, idx) => (
            <li key={idx} className="flex items-center justify-between">
              <span>{h.action} by {h.byRole}</span>
              <span className="text-gray-500">{new Date(h.timestamp).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

