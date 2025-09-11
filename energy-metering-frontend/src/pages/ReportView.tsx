import { Link, useParams } from 'react-router-dom'
import { useReportsStore } from '../store/reports'
import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../store/auth'
import ReportFilters from '../components/ReportFilters'
import type { Report } from '../types'

type Key = string

function getString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = (e) => reject(e)
    reader.readAsDataURL(file)
  })
}

export default function ReportView() {
  const { id } = useParams()
  const role = useAuthStore((s) => s.role)
  const {
    getById,
    updateDetails,
    updateTestData,
    addAttachments,
    removeAttachment,
    approveByTO,
    rejectByTO,
    approveByCE,
    rejectByCE,
    filter,
    reports,
  } = useReportsStore()

  const report = getById(id!)

  const [detailsForm, setDetailsForm] = useState(() => ({
    branchName: report?.details.branchName || '',
    transformerNumber: report?.details.transformerNumber || '',
    testDate: report?.details.testDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    remarks: report?.details.remarks || '',
  }))

  const [testDataForm, setTestDataForm] = useState<Record<Key, string>>(() => ({
    // Header-like
    reportNo: getString(report?.testData['reportNo']),
    location: getString(report?.testData['location']),
    accountNo: getString(report?.testData['accountNo']),
    contractDemandKva: getString(report?.testData['contractDemandKva']),
    reason: getString(report?.testData['reason']),
    requestedBy: getString(report?.testData['requestedBy']),
    requestId: getString(report?.testData['requestId']),
    csc: getString(report?.testData['csc']),
    substationNo: getString(report?.testData['substationNo']),

    // Current Transformer
    ctMake: getString(report?.testData['ctMake']),
    ctRatio: getString(report?.testData['ctRatio']),

    // Static Meter
    meterMake: getString(report?.testData['meterMake']),
    meterSerial: getString(report?.testData['meterSerial']),
    meterConstant: getString(report?.testData['meterConstant']),
    meterClass: getString(report?.testData['meterClass'] || report?.testData['accuracyClass']),
    meterVoltage: getString(report?.testData['meterVoltage']),
    meterCurrent: getString(report?.testData['meterCurrent']),

    testerMake: getString(report?.testData['testerMake']),
    testerSerial: getString(report?.testData['testerSerial']),

    // Check
    physicalCondition: getString(report?.testData['physicalCondition']),
    ctRatioCheck: getString(report?.testData['ctRatioCheck']),
    meterRatio: getString(report?.testData['meterRatio']),
    multiplyingFactor: getString(report?.testData['multiplyingFactor'] || '1'),
    meterElementConnection: getString(report?.testData['meterElementConnection'] || '3ph4w'),
    phaseSequence: getString(report?.testData['phaseSequence'] || 'Correct'),
    ctEarthing: getString(report?.testData['ctEarthing'] || 'Yes'),
    percentErrorFound: getString(report?.testData['percentErrorFound'] || getString(report?.testData['measurements?.0?.error'])),
    percentErrorLeft: getString(report?.testData['percentErrorLeft']),

    // Measurements - Summaries
    energyKwhImportTotal: getString(report?.testData['energyKwhImportTotal'] || ''),
    demandKvaTotal: getString(report?.testData['demandKvaTotal'] || ''),
    reactiveEnergyKvarhTotal: getString(report?.testData['reactiveEnergyKvarhTotal'] || ''),
    averagePowerFactor: getString(report?.testData['powerFactor'] || ''),

    // Phases Voltages
    voltageR: getString(report?.testData['voltageR'] || report?.testData['inputVoltage']),
    voltageY: getString(report?.testData['voltageY']),
    voltageB: getString(report?.testData['voltageB']),

    // Currents Primary/Secondary (R, Y, B)
    currentRPrimary: getString(report?.testData['currentRPrimary'] || report?.testData['inputCurrent']),
    currentRSecondary: getString(report?.testData['currentRSecondary']),
    currentYPrimary: getString(report?.testData['currentYPrimary']),
    currentYSecondary: getString(report?.testData['currentYSecondary']),
    currentBPrimary: getString(report?.testData['currentBPrimary']),
    currentBSecondary: getString(report?.testData['currentBSecondary']),

    comments: getString(report?.testData['comments']),
  }))

  useEffect(() => {
    if (!report) return
    setDetailsForm({
      branchName: report.details.branchName,
      transformerNumber: report.details.transformerNumber,
      testDate: report.details.testDate.slice(0, 10),
      remarks: report.details.remarks || '',
    })
    // do not override testDataForm to preserve local edits on re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id])

  if (!report) return <div className="text-red-600">Report not found</div>
  if (role === 'BRANCH_VIEWER' && report.status !== 'APPROVED_FINAL') {
    return <div className="text-red-600">Access restricted. Branch Viewer can only open approved reports.</div>
  }

  const isEditable = role === 'TECHNICAL_OFFICER'
  const canApproveReject = role === 'TECHNICAL_OFFICER' || role === 'CHIEF_ENGINEER'

  const metaItems: Array<{ label: string; value: string }> = [
    { label: 'Status', value: report.status },
    { label: 'Updated', value: new Date(report.updatedAt).toLocaleString() },
    { label: 'Created', value: new Date(report.createdAt).toLocaleString() },
  ]

  const [filters, setFilters] = useState<{ branchName?: string; transformerNumber?: string; fromDate?: string; toDate?: string; status?: any }>({})
  const results = useMemo(() => filter(filters), [reports, filters])

  async function handleUploadAttachments(filesList: FileList | null) {
    if (!filesList) return
    const fileArray = Array.from(filesList)
    const payload = await Promise.all(
      fileArray.map(async (f) => ({
        name: f.name,
        mimeType: f.type || 'application/octet-stream',
        sizeBytes: f.size,
        url: await fileToDataUrl(f),
      }))
    )
    addAttachments(report.id, payload)
  }

  function saveAllChanges() {
    updateDetails(report.id, {
      branchName: detailsForm.branchName,
      transformerNumber: detailsForm.transformerNumber,
      testDate: new Date(detailsForm.testDate).toISOString(),
      remarks: detailsForm.remarks || undefined,
    })
    updateTestData(report.id, { ...testDataForm })
  }

  function approve() {
    if (role === 'TECHNICAL_OFFICER') {
      approveByTO(report.id)
    } else if (role === 'CHIEF_ENGINEER') {
      approveByCE(report.id)
    }
  }

  function reject() {
    if (role === 'TECHNICAL_OFFICER') {
      rejectByTO(report.id)
    } else if (role === 'CHIEF_ENGINEER') {
      rejectByCE(report.id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">LECO Bulk Meter Test Report</h1>
        <div className="flex gap-2">
          {isEditable && (
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={saveAllChanges}>Save Changes</button>
          )}
          {canApproveReject && (
            <>
              <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={approve}>Approve</button>
              <button className="px-3 py-2 bg-red-600 text-white rounded" onClick={reject}>Reject</button>
            </>
          )}
        </div>
      </div>

      {/* Finder */}
      <section className="bg-white border rounded p-4">
        <h2 className="font-semibold mb-3">Find Reports</h2>
        <ReportFilters onChange={(f) => setFilters(f)} />
        <div className="mt-3 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Branch</th>
                <th className="px-3 py-2">Transformer</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">Open</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.details.branchName}</td>
                  <td className="px-3 py-2">{r.details.transformerNumber}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">{new Date(r.updatedAt).toLocaleString()}</td>
                  <td className="px-3 py-2"><Link to={`/reports/${r.id}`} className="text-blue-600">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 0 && (
            <div className="p-4 text-sm text-gray-500">No matching reports</div>
          )}
        </div>
      </section>

      {/* Meta */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border rounded p-4 lg:col-span-2">
          <h2 className="font-semibold mb-3">Report Header</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-xs text-gray-500">Branch</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={detailsForm.branchName} onChange={(e) => setDetailsForm((s) => ({ ...s, branchName: e.target.value }))} />
              ) : (
                <div>{detailsForm.branchName}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Transformer Number</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={detailsForm.transformerNumber} onChange={(e) => setDetailsForm((s) => ({ ...s, transformerNumber: e.target.value }))} />
              ) : (
                <div>{detailsForm.transformerNumber}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Date Tested</label>
              {isEditable ? (
                <input type="date" className="border rounded px-3 py-2 w-full" value={detailsForm.testDate} onChange={(e) => setDetailsForm((s) => ({ ...s, testDate: e.target.value }))} />
              ) : (
                <div>{new Date(detailsForm.testDate).toLocaleDateString()}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Report No.</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.reportNo} onChange={(e) => setTestDataForm((s) => ({ ...s, reportNo: e.target.value }))} />
              ) : (
                <div>{testDataForm.reportNo}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Location</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.location} onChange={(e) => setTestDataForm((s) => ({ ...s, location: e.target.value }))} />
              ) : (
                <div>{testDataForm.location}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">A/C No</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.accountNo} onChange={(e) => setTestDataForm((s) => ({ ...s, accountNo: e.target.value }))} />
              ) : (
                <div>{testDataForm.accountNo}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Contract Demand (kVA)</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.contractDemandKva} onChange={(e) => setTestDataForm((s) => ({ ...s, contractDemandKva: e.target.value }))} />
              ) : (
                <div>{testDataForm.contractDemandKva}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Reason</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.reason} onChange={(e) => setTestDataForm((s) => ({ ...s, reason: e.target.value }))} />
              ) : (
                <div>{testDataForm.reason}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Requested By</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.requestedBy} onChange={(e) => setTestDataForm((s) => ({ ...s, requestedBy: e.target.value }))} />
              ) : (
                <div>{testDataForm.requestedBy}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Request ID</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.requestId} onChange={(e) => setTestDataForm((s) => ({ ...s, requestId: e.target.value }))} />
              ) : (
                <div>{testDataForm.requestId}</div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500">Remarks</label>
              {isEditable ? (
                <textarea className="border rounded px-3 py-2 w-full" value={detailsForm.remarks} onChange={(e) => setDetailsForm((s) => ({ ...s, remarks: e.target.value }))} />
              ) : (
                <div>{detailsForm.remarks}</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-3">Meta</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {metaItems.map((m) => (
              <div key={m.label}>
                <div className="text-gray-500 text-xs">{m.label}</div>
                <div>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-3">Current Transformer</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-xs text-gray-500">Make</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.ctMake} onChange={(e) => setTestDataForm((s) => ({ ...s, ctMake: e.target.value }))} />
              ) : (
                <div>{testDataForm.ctMake}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Ratio</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.ctRatio} onChange={(e) => setTestDataForm((s) => ({ ...s, ctRatio: e.target.value }))} />
              ) : (
                <div>{testDataForm.ctRatio}</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-3">Static Meter</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-xs text-gray-500">Make</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.meterMake} onChange={(e) => setTestDataForm((s) => ({ ...s, meterMake: e.target.value }))} />
              ) : (
                <div>{testDataForm.meterMake}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Serial No.</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.meterSerial} onChange={(e) => setTestDataForm((s) => ({ ...s, meterSerial: e.target.value }))} />
              ) : (
                <div>{testDataForm.meterSerial}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Meter Constant</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.meterConstant} onChange={(e) => setTestDataForm((s) => ({ ...s, meterConstant: e.target.value }))} />
              ) : (
                <div>{testDataForm.meterConstant}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Class</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.meterClass} onChange={(e) => setTestDataForm((s) => ({ ...s, meterClass: e.target.value }))} />
              ) : (
                <div>{testDataForm.meterClass}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Meter Voltage</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.meterVoltage} onChange={(e) => setTestDataForm((s) => ({ ...s, meterVoltage: e.target.value }))} />
              ) : (
                <div>{testDataForm.meterVoltage}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Meter Current</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.meterCurrent} onChange={(e) => setTestDataForm((s) => ({ ...s, meterCurrent: e.target.value }))} />
              ) : (
                <div>{testDataForm.meterCurrent}</div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm mt-3">
            <div>
              <label className="block text-xs text-gray-500">Tester Make</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.testerMake} onChange={(e) => setTestDataForm((s) => ({ ...s, testerMake: e.target.value }))} />
              ) : (
                <div>{testDataForm.testerMake}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500">Tester Serial</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm.testerSerial} onChange={(e) => setTestDataForm((s) => ({ ...s, testerSerial: e.target.value }))} />
              ) : (
                <div>{testDataForm.testerSerial}</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border rounded p-4">
        <h2 className="font-semibold mb-3">Check</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {[
            { key: 'physicalCondition', label: 'Physical Condition of Meter' },
            { key: 'ctRatioCheck', label: 'CT Ratio' },
            { key: 'meterRatio', label: 'Meter Ratio' },
            { key: 'multiplyingFactor', label: 'Multiplying Factor' },
            { key: 'meterElementConnection', label: 'Connection of Meter Elements' },
            { key: 'phaseSequence', label: 'Phase Sequence' },
            { key: 'ctEarthing', label: 'CT Earthing' },
            { key: 'percentErrorFound', label: '% Error as Found' },
            { key: 'percentErrorLeft', label: '% Error as Left' },
          ].map((f) => (
            <div key={f.key} className="col-span-1">
              <label className="block text-xs text-gray-500">{f.label}</label>
              {isEditable ? (
                <input className="border rounded px-3 py-2 w-full" value={testDataForm[f.key] || ''} onChange={(e) => setTestDataForm((s) => ({ ...s, [f.key]: e.target.value }))} />
              ) : (
                <div>{testDataForm[f.key] || ''}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border rounded p-4">
        <h2 className="font-semibold mb-3">Measurements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left">Parameter</th>
                  <th className="px-3 py-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'energyKwhImportTotal', label: 'Energy kWh (Import)' },
                  { key: 'demandKvaTotal', label: 'Demand kVA' },
                  { key: 'reactiveEnergyKvarhTotal', label: 'R. Energy kVArh' },
                  { key: 'averagePowerFactor', label: 'Average Power Factor' },
                ].map((row) => (
                  <tr key={row.key} className="border-t">
                    <td className="px-3 py-2">{row.label}</td>
                    <td className="px-3 py-2">
                      {isEditable ? (
                        <input className="border rounded px-2 py-1 w-full" value={testDataForm[row.key] || ''} onChange={(e) => setTestDataForm((s) => ({ ...s, [row.key]: e.target.value }))} />
                      ) : (
                        <span>{testDataForm[row.key] || ''}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left">Phase</th>
                  <th className="px-3 py-2 text-left">Voltage (V)</th>
                  <th className="px-3 py-2 text-left">Current Primary (A)</th>
                  <th className="px-3 py-2 text-left">Current Secondary (A)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { phase: 'R', vKey: 'voltageR', pKey: 'currentRPrimary', sKey: 'currentRSecondary' },
                  { phase: 'Y', vKey: 'voltageY', pKey: 'currentYPrimary', sKey: 'currentYSecondary' },
                  { phase: 'B', vKey: 'voltageB', pKey: 'currentBPrimary', sKey: 'currentBSecondary' },
                ].map((row) => (
                  <tr key={row.phase} className="border-t">
                    <td className="px-3 py-2">{row.phase}</td>
                    <td className="px-3 py-2">
                      {isEditable ? (
                        <input className="border rounded px-2 py-1 w-full" value={testDataForm[row.vKey] || ''} onChange={(e) => setTestDataForm((s) => ({ ...s, [row.vKey]: e.target.value }))} />
                      ) : (
                        <span>{testDataForm[row.vKey] || ''}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditable ? (
                        <input className="border rounded px-2 py-1 w-full" value={testDataForm[row.pKey] || ''} onChange={(e) => setTestDataForm((s) => ({ ...s, [row.pKey]: e.target.value }))} />
                      ) : (
                        <span>{testDataForm[row.pKey] || ''}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditable ? (
                        <input className="border rounded px-2 py-1 w-full" value={testDataForm[row.sKey] || ''} onChange={(e) => setTestDataForm((s) => ({ ...s, [row.sKey]: e.target.value }))} />
                      ) : (
                        <span>{testDataForm[row.sKey] || ''}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Attachments */}
      <section className="bg-white border rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Attachments</h2>
          {isEditable && (
            <label className="px-3 py-2 bg-gray-100 rounded cursor-pointer">
              <input type="file" multiple className="hidden" onChange={(e) => handleUploadAttachments(e.target.files)} />
              Upload Files
            </label>
          )}
        </div>
        <ul className="text-sm divide-y">
          {report.attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-gray-500 text-xs">{(a.sizeBytes / 1024).toFixed(1)} KB • {new Date(a.uploadedAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <a className="text-blue-600" href={a.url} target="_blank" rel="noreferrer">Open</a>
                {isEditable && (
                  <button className="text-red-600" onClick={() => removeAttachment(report.id, a.id)}>Remove</button>
                )}
              </div>
            </li>
          ))}
          {report.attachments.length === 0 && <li className="py-2 text-gray-500">No attachments</li>}
        </ul>
      </section>

      {/* History */}
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

