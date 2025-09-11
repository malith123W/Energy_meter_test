import { useState } from 'react'
import type { ReportStatus } from '../types'

interface Props {
  onChange: (filters: { branchName?: string; transformerNumber?: string; status?: ReportStatus; fromDate?: string; toDate?: string }) => void
  showStatus?: boolean
}

export default function ReportFilters({ onChange, showStatus = true }: Props) {
  const [branchName, setBranchName] = useState('')
  const [transformerNumber, setTransformerNumber] = useState('')
  const [status, setStatus] = useState<ReportStatus | ''>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs text-gray-500">Branch Name</label>
        <input value={branchName} onChange={(e) => setBranchName(e.target.value)} className="border rounded px-3 py-2" placeholder="e.g. Central" />
      </div>
      <div>
        <label className="block text-xs text-gray-500">Transformer Number</label>
        <input value={transformerNumber} onChange={(e) => setTransformerNumber(e.target.value)} className="border rounded px-3 py-2" placeholder="e.g. TX-1001" />
      </div>
      {showStatus && (
        <div>
          <label className="block text-xs text-gray-500">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as ReportStatus | '')} className="border rounded px-3 py-2">
            <option value="">Any</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED_BY_TECHNICAL_OFFICER">Approved by TO</option>
            <option value="REJECTED_BY_TECHNICAL_OFFICER">Rejected by TO</option>
            <option value="APPROVED_FINAL">Approved Final</option>
            <option value="REJECTED_FINAL">Rejected Final</option>
          </select>
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-500">From Date</label>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-xs text-gray-500">To Date</label>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border rounded px-3 py-2" />
      </div>
      <button className="px-4 py-2 bg-gray-100 rounded" onClick={() => onChange({ branchName: branchName || undefined, transformerNumber: transformerNumber || undefined, status: (status as ReportStatus) || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined })}>Apply</button>
    </div>
  )
}

