import { useMemo, useState } from 'react'
import { useReportsStore } from '../store/reports'
import ReportFilters from '../components/ReportFilters'
import ReportList from '../components/ReportList'

export default function TechnicalOfficerDashboard() {
  const { reports, filter, approveByTO, rejectByTO } = useReportsStore()
  const [filters, setFilters] = useState<{ branchName?: string; transformerNumber?: string }>({})

  const pending = useMemo(() => filter({ ...filters, status: 'PENDING' }), [reports, filters])
  const approved = useMemo(() => filter({ ...filters, status: 'APPROVED_BY_TECHNICAL_OFFICER' }), [reports, filters])
  const rejected = useMemo(() => filter({ ...filters, status: 'REJECTED_BY_TECHNICAL_OFFICER' }), [reports, filters])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Technical Officer</h1>
      </div>
      <ReportFilters onChange={(f) => setFilters({ branchName: f.branchName, transformerNumber: f.transformerNumber })} showStatus={false} />

      <section>
        <h2 className="font-semibold mb-2">Pending Reports</h2>
        <ReportList
          reports={pending}
          actions={(r) => (
            <div className="flex gap-2">
              <button className="text-green-600" onClick={() => approveByTO(r.id)}>Approve</button>
              <button className="text-red-600" onClick={() => rejectByTO(r.id)}>Reject</button>
            </div>
          )}
        />
      </section>

      <section>
        <h2 className="font-semibold mb-2">Approved Reports</h2>
        <ReportList reports={approved} />
      </section>

      <section>
        <h2 className="font-semibold mb-2">Rejected Reports</h2>
        <ReportList reports={rejected} />
      </section>
    </div>
  )
}

