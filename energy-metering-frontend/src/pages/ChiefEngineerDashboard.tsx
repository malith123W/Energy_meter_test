import { useMemo } from 'react'
import { useReportsStore } from '../store/reports'
import ReportList from '../components/ReportList'
import ReportFilters from '../components/ReportFilters'
import { useState } from 'react'

export default function ChiefEngineerDashboard() {
  const { filter, reports, approveByCE, rejectByCE } = useReportsStore()
  const [filters, setFilters] = useState<{ branchName?: string; transformerNumber?: string }>({})
  const awaitingCE = useMemo(() => filter({ ...filters, status: 'APPROVED_BY_TECHNICAL_OFFICER' }), [reports, filters])
  const finalApproved = useMemo(() => filter({ ...filters, status: 'APPROVED_FINAL' }), [reports, filters])
  const finalRejected = useMemo(() => filter({ ...filters, status: 'REJECTED_FINAL' }), [reports, filters])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Chief Engineer</h1>
      <ReportFilters onChange={(f) => setFilters({ branchName: f.branchName, transformerNumber: f.transformerNumber })} showStatus={false} />

      <section>
        <h2 className="font-semibold mb-2">Reports from Technical Officer</h2>
        <ReportList
          reports={awaitingCE}
          actions={(r) => (
            <div className="flex gap-2">
              <button className="text-green-600" onClick={() => approveByCE(r.id)}>Approve</button>
              <button className="text-red-600" onClick={() => rejectByCE(r.id)}>Reject</button>
            </div>
          )}
        />
      </section>

      <section>
        <h2 className="font-semibold mb-2">Final Approved</h2>
        <ReportList reports={finalApproved} />
      </section>
      <section>
        <h2 className="font-semibold mb-2">Final Rejected</h2>
        <ReportList reports={finalRejected} />
      </section>
    </div>
  )
}

