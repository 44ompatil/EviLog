const asDate = (value) => value ? new Date(value) : null
const dateOnly = (value) => value ? new Date(value).toISOString().slice(0, 10) : '—'

export const toApiStatus = (value = '') => value.trim().replace(/\s+/g, '_').toLowerCase()

export const toDisplayStatus = (value = '') => String(value)
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())

export function mapCase(record, evidence = []) {
  return {
    id: record.case_id,
    title: record.case_title,
    caseType: toDisplayStatus(record.case_type),
    type: toDisplayStatus(record.case_type),
    firNumber: record.fir_number,
    description: record.description,
    status: toDisplayStatus(record.status),
    createdAt: record.created_at,
    created: dateOnly(record.created_at),
    evidence: evidence.filter((item) => item.case_id === record.case_id).length,
  }
}

export function mapEvidence(record, currentRfids = {}, custody = []) {
  return {
    id: record.evidence_id,
    caseId: record.case_id,
    name: record.evidence_name,
    type: toDisplayStatus(record.evidence_type),
    description: record.description,
    status: toDisplayStatus(record.status),
    rfid: currentRfids[record.evidence_id] || '',
    registered: dateOnly(record.registered_at),
    createdAt: record.registered_at,
    custodyHistory: custody.map((event) => {
      const timestamp = asDate(event.timestamp)
      return {
        type: toDisplayStatus(event.action),
        date: timestamp ? timestamp.toISOString().slice(0, 10) : '—',
        time: timestamp ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '00:00',
        actor: event.officer_name || event.officer_id || 'System',
        details: event.remarks || '',
      }
    }),
  }
}

export function mapOfficer(record) {
  return {
    id: record.officer_id,
    name: record.name,
    badgeNumber: record.badge_number,
    role: record.role,
    status: toDisplayStatus(record.status),
    faceAuthentication: record.face_enrolled ? 'Enrolled' : 'Not Enrolled',
    registered: dateOnly(record.registered_at),
    createdAt: record.registered_at,
  }
}

export function mapAlert(record) {
  return {
    id: record.alert_id,
    title: record.message || toDisplayStatus(record.alert_type),
    type: toDisplayStatus(record.alert_type),
    description: record.description || record.message,
    evidenceId: record.evidence_id || '—',
    officerId: record.officer_id || '—',
    severity: toDisplayStatus(record.severity),
    status: toDisplayStatus(record.status),
    location: '—',
    timestamp: record.timestamp,
    read: Boolean(record.read),
  }
}

export function mapActivity(record) {
  const action = toDisplayStatus(record.action)
  const actionTone = /check.?out|transfer|tamper/.test(action.toLowerCase())
    ? 'orange'
    : /check.?in|seal/.test(action.toLowerCase())
      ? 'green'
      : /scan|inventory/.test(action.toLowerCase())
        ? 'blue'
        : 'purple'
  return {
    transactionId: record.transaction_id,
    officerId: record.officer_id,
    evidenceId: record.evidence_id,
    action,
    actionTone,
    timestamp: asDate(record.timestamp)?.toLocaleString() || '—',
    status: 'Processed',
  }
}

export function currentRfidAssignments(tags = [], mappings = []) {
  const assignedTags = new Set(tags.filter((tag) => String(tag.status).toLowerCase() === 'assigned').map((tag) => tag.rfid_id))
  const sorted = [...mappings].sort((left, right) => new Date(right.assigned_at) - new Date(left.assigned_at))
  const byEvidence = {}
  const seenTags = new Set()
  for (const mapping of sorted) {
    if (!assignedTags.has(mapping.rfid_id) || seenTags.has(mapping.rfid_id)) continue
    seenTags.add(mapping.rfid_id)
    byEvidence[mapping.evidence_id] ||= mapping.rfid_id
  }
  return byEvidence
}
