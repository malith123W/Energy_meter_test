import { Link } from 'react-router-dom'
import type { Report } from '../types'

interface Props {
  reports: Report[]
  actions?: (report: Report) => React.ReactNode
}

export default function ReportList({ reports, actions }: Props) {
  return (
    <div className="overflow-hidden border rounded bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-3 py-2">Branch</th>
            <th className="px-3 py-2">Transformer</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Updated</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2">{r.details.branchName}</td>
              <td className="px-3 py-2">{r.details.transformerNumber}</td>
              <td className="px-3 py-2">{r.status}</td>
              <td className="px-3 py-2">{new Date(r.updatedAt).toLocaleString()}</td>
              <td className="px-3 py-2 flex gap-2">
                <Link to={`/reports/${r.id}`} className="text-blue-600">View</Link>
                {actions?.(r)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {reports.length === 0 && (
        <div className="p-6 text-center text-gray-500">No reports found</div>
      )}
    </div>
  )}

