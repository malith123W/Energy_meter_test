import { create } from 'zustand'
import { nanoid } from '../utils/nanoid'
import type { Attachment, Report, ReportDetails, ReportStatus, UserRole } from '../types'

interface ReportsState {
  reports: Report[]
  getById: (id: string) => Report | undefined
  filter: (q: {
    branchName?: string
    transformerNumber?: string
    status?: ReportStatus
    fromDate?: string
    toDate?: string
  }) => Report[]

  updateDetails: (id: string, details: Partial<ReportDetails>) => void
  updateTestData: (id: string, updates: Record<string, unknown>) => void
  addAttachments: (id: string, files: Array<{ name: string; mimeType: string; sizeBytes: number; url: string }>) => void
  removeAttachment: (id: string, attachmentId: string) => void

  approveByTO: (id: string, note?: string) => void
  rejectByTO: (id: string, note?: string) => void
  approveByCE: (id: string, note?: string) => void
  rejectByCE: (id: string, note?: string) => void
}

const STORAGE_KEY = 'em_reports'

function save(reports: Report[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
}

function load(): Report[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return seedReports()
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return seedReports()
}

function seedReports(): Report[] {
  const now = new Date().toISOString()
  const branches = ['Central', 'North', 'South', 'East', 'West']
  const reports: Report[] = Array.from({ length: 10 }).map((_, idx) => {
    const id = nanoid()
    const branchName = branches[idx % branches.length]
    const transformerNumber = `TX-${String(1000 + idx)}`
    const statusCycle: ReportStatus[] = ['PENDING', 'APPROVED_BY_TECHNICAL_OFFICER', 'REJECTED_BY_TECHNICAL_OFFICER', 'APPROVED_FINAL', 'REJECTED_FINAL']
    const status = statusCycle[idx % statusCycle.length]
    const testData = {
      inputVoltage: 230 + idx,
      inputCurrent: 5 + (idx % 3),
      accuracyClass: idx % 2 === 0 ? '0.2S' : '0.5S',
      temperature: 25 + (idx % 5),
      powerFactor: 0.98,
      measurements: [
        { point: 1, error: (Math.random() * 0.2).toFixed(3) },
        { point: 2, error: (Math.random() * 0.2).toFixed(3) },
      ],
    }
    const details: ReportDetails = {
      branchName,
      transformerNumber,
      testDate: now,
      remarks: idx % 2 === 0 ? 'Initial import' : undefined,
    }
    const history = [
      { timestamp: now, action: 'CREATED', byRole: 'SYSTEM' as UserRole, note: 'Seed data' },
    ]
    return {
      id,
      status,
      createdAt: now,
      updatedAt: now,
      details,
      testData,
      attachments: [],
      history,
    }
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
  return reports
}

export const useReportsStore = create<ReportsState>((set, get) => ({
  reports: load(),
  getById: (id) => get().reports.find((r) => r.id === id),
  filter: ({ branchName, transformerNumber, status, fromDate, toDate }) => {
    return get().reports.filter((r) => {
      const matchesBranch = branchName ? r.details.branchName.toLowerCase().includes(branchName.toLowerCase()) : true
      const matchesTx = transformerNumber ? r.details.transformerNumber.toLowerCase().includes(transformerNumber.toLowerCase()) : true
      const matchesStatus = status ? r.status === status : true
      const testDateMs = new Date(r.details.testDate).getTime()
      const afterFrom = fromDate ? testDateMs >= new Date(fromDate).getTime() : true
      const beforeTo = toDate ? testDateMs <= new Date(toDate).getTime() : true
      return matchesBranch && matchesTx && matchesStatus && afterFrom && beforeTo
    })
  },

  updateDetails: (id, details) => set((state) => {
    const reports = state.reports.map((r) => {
      if (r.id !== id) return r
      const updated: Report = {
        ...r,
        details: { ...r.details, ...details },
        updatedAt: new Date().toISOString(),
        history: [...r.history, { timestamp: new Date().toISOString(), action: 'EDITED', byRole: 'TECHNICAL_OFFICER', note: 'Details updated' }],
      }
      return updated
    })
    save(reports)
    return { reports }
  }),

  updateTestData: (id, updates) => set((state) => {
    const reports = state.reports.map((r) => {
      if (r.id !== id) return r
      const updated: Report = {
        ...r,
        testData: { ...r.testData, ...updates },
        updatedAt: new Date().toISOString(),
        history: [...r.history, { timestamp: new Date().toISOString(), action: 'EDITED', byRole: 'TECHNICAL_OFFICER', note: 'Test data updated' }],
      }
      return updated
    })
    save(reports)
    return { reports }
  }),

  addAttachments: (id, files) => set((state) => {
    const now = new Date().toISOString()
    const reports = state.reports.map((r) => {
      if (r.id !== id) return r
      const newAttachments: Attachment[] = files.map((f) => ({ id: nanoid(), name: f.name, mimeType: f.mimeType, sizeBytes: f.sizeBytes, url: f.url, uploadedAt: now }))
      return { ...r, attachments: [...r.attachments, ...newAttachments], updatedAt: now }
    })
    save(reports)
    return { reports }
  }),

  removeAttachment: (id, attachmentId) => set((state) => {
    const reports = state.reports.map((r) => (r.id === id ? { ...r, attachments: r.attachments.filter((a) => a.id !== attachmentId), updatedAt: new Date().toISOString() } : r))
    save(reports)
    return { reports }
  }),

  approveByTO: (id, note) => set((state) => {
    const now = new Date().toISOString()
    const reports = state.reports.map((r) => (r.id === id ? { ...r, status: 'APPROVED_BY_TECHNICAL_OFFICER', updatedAt: now, history: [...r.history, { timestamp: now, action: 'APPROVED_BY_TECHNICAL_OFFICER', byRole: 'TECHNICAL_OFFICER', note }] } : r))
    save(reports)
    return { reports }
  }),

  rejectByTO: (id, note) => set((state) => {
    const now = new Date().toISOString()
    const reports = state.reports.map((r) => (r.id === id ? { ...r, status: 'REJECTED_BY_TECHNICAL_OFFICER', updatedAt: now, history: [...r.history, { timestamp: now, action: 'REJECTED_BY_TECHNICAL_OFFICER', byRole: 'TECHNICAL_OFFICER', note }] } : r))
    save(reports)
    return { reports }
  }),

  approveByCE: (id, note) => set((state) => {
    const now = new Date().toISOString()
    const reports = state.reports.map((r) => (r.id === id ? { ...r, status: 'APPROVED_FINAL', updatedAt: now, history: [...r.history, { timestamp: now, action: 'APPROVED_FINAL', byRole: 'CHIEF_ENGINEER', note }] } : r))
    save(reports)
    return { reports }
  }),

  rejectByCE: (id, note) => set((state) => {
    const now = new Date().toISOString()
    const reports = state.reports.map((r) => (r.id === id ? { ...r, status: 'REJECTED_FINAL', updatedAt: now, history: [...r.history, { timestamp: now, action: 'REJECTED_FINAL', byRole: 'CHIEF_ENGINEER', note }] } : r))
    save(reports)
    return { reports }
  }),
}))

