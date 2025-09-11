export type UserRole = 'TECHNICAL_OFFICER' | 'CHIEF_ENGINEER' | 'BRANCH_VIEWER'

export type ReportStatus =
  | 'PENDING'
  | 'APPROVED_BY_TECHNICAL_OFFICER'
  | 'REJECTED_BY_TECHNICAL_OFFICER'
  | 'APPROVED_FINAL'
  | 'REJECTED_FINAL'

export interface Attachment {
  id: string
  name: string
  mimeType: string
  sizeBytes: number
  url: string
  uploadedAt: string
}

export interface ReportDetails {
  branchName: string
  transformerNumber: string
  testDate: string
  remarks?: string
}

export interface ReportHistoryEntry {
  timestamp: string
  action:
    | 'CREATED'
    | 'EDITED'
    | 'APPROVED_BY_TECHNICAL_OFFICER'
    | 'REJECTED_BY_TECHNICAL_OFFICER'
    | 'APPROVED_FINAL'
    | 'REJECTED_FINAL'
  byRole: UserRole | 'SYSTEM'
  note?: string
}

export interface Report {
  id: string
  status: ReportStatus
  createdAt: string
  updatedAt: string
  details: ReportDetails
  testData: Record<string, unknown>
  attachments: Attachment[]
  history: ReportHistoryEntry[]
}

