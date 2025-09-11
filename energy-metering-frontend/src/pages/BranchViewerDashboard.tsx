import { useMemo, useState } from 'react'
import ReportFilters from '../components/ReportFilters'
import ReportList from '../components/ReportList'
import { useReportsStore } from '../store/reports'

export default function BranchViewerDashboard() {
  const { filter, reports } = useReportsStore()
  const [filters, setFilters] = useState<{ branchName?: string; transformerNumber?: string }>({})
  const finalApproved = useMemo(() => filter({ ...filters, status: 'APPROVED_FINAL' }), [reports, filters])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Branch Viewer</h1>
      <ReportFilters onChange={(f) => setFilters({ branchName: f.branchName, transformerNumber: f.transformerNumber })} showStatus={false} />
      <section>
        <h2 className="font-semibold mb-2">Approved Reports</h2>
        <ReportList reports={finalApproved} />
      </section>
    </div>
  )
}

