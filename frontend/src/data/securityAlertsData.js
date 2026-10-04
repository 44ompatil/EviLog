export const securityAlertsSeed = [
  {
    id: 'AL-2048',
    title: 'Unauthorized Access Attempt',
    type: 'Access Violation',
    description: 'Back-door access attempt detected at the evidence vault entrance during after-hours access.',
    evidenceId: 'EV-2024-1847',
    officerId: 'OFF-184',
    severity: 'Critical',
    status: 'Open',
    location: 'Evidence Vault Entrance',
    timestamp: '2026-09-19T09:42:00',
    read: false,
  },
  {
    id: 'AL-2046',
    title: 'RFID Tamper Alert',
    type: 'RFID Tamper',
    description: 'RFID reader flagged a duplicate credential scan near the chain-of-custody room.',
    evidenceId: 'EV-2024-1122',
    officerId: 'OFF-021',
    severity: 'High',
    status: 'Investigating',
    location: 'Chain-of-Custody Room',
    timestamp: '2026-09-19T08:27:00',
    read: false,
  },
  {
    id: 'AL-2038',
    title: 'Biometric Match Rejected',
    type: 'Face Authentication',
    description: 'Face-authentication confidence score fell below threshold for officer entry authentication.',
    evidenceId: 'EV-2024-0831',
    officerId: 'OFF-006',
    severity: 'Medium',
    status: 'Pending Review',
    location: 'Officer Entrance',
    timestamp: '2026-09-19T07:15:00',
    read: true,
  },
  {
    id: 'AL-2027',
    title: 'Restricted Zone Breach',
    type: 'Zone Breach',
    description: 'Motion sensor triggered a breach alarm in the restricted evidence archive corridor.',
    evidenceId: 'EV-2024-2209',
    officerId: 'OFF-089',
    severity: 'High',
    status: 'Open',
    location: 'Archive Corridor',
    timestamp: '2026-09-18T22:05:00',
    read: false,
  },
  {
    id: 'AL-2019',
    title: 'Unverified Evidence Movement',
    type: 'Evidence Handling',
    description: 'Evidence transfer chain was interrupted without a supervisor approval checkpoint.',
    evidenceId: 'EV-2024-1772',
    officerId: 'OFF-114',
    severity: 'Critical',
    status: 'Open',
    location: 'Document Locker',
    timestamp: '2026-09-18T18:43:00',
    read: false,
  },
  {
    id: 'AL-2011',
    title: 'Door Held Open',
    type: 'Physical Security',
    description: 'Primary security entry remained open for 12 minutes beyond the automated close cycle.',
    evidenceId: 'EV-2024-1534',
    officerId: 'OFF-029',
    severity: 'Medium',
    status: 'Resolved',
    location: 'Loading Bay',
    timestamp: '2026-09-18T16:18:00',
    read: true,
  },
  {
    id: 'AL-2005',
    title: 'Visitor Badge Expired',
    type: 'Access Control',
    description: 'Visitor access badge remained active after expiry and was automatically quarantined.',
    evidenceId: 'EV-2024-0910',
    officerId: 'OFF-061',
    severity: 'Low',
    status: 'Resolved',
    location: 'Reception Desk',
    timestamp: '2026-09-17T11:48:00',
    read: true,
  },
  {
    id: 'AL-1997',
    title: 'Multiple Failed Badge Attempts',
    type: 'Access Control',
    description: 'Three badge validation failures occurred back-to-back at the secure lab access point.',
    evidenceId: 'EV-2024-0671',
    officerId: 'OFF-032',
    severity: 'High',
    status: 'Investigating',
    location: 'Secure Lab Entry',
    timestamp: '2026-09-16T20:34:00',
    read: false,
  },
]

export function getUnreadAlertCount(alerts = []) {
  return alerts.filter((alert) => !alert.read).length
}

export function markAlertAsRead(alerts = [], alertId) {
  return alerts.map((alert) =>
    alert.id === alertId ? { ...alert, read: true } : alert,
  )
}

export function markAllAlertsAsRead(alerts = []) {
  return alerts.map((alert) => ({ ...alert, read: true }))
}

export function formatRelativeTime(timestamp) {
  const current = new Date()
  const target = new Date(timestamp)
  const diffMinutes = Math.max(1, Math.round((current - target) / 60000))

  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.round(diffHours / 24)
  return `${diffDays}d ago`
}

export function getSeverityTone(severity) {
  switch (severity) {
    case 'Critical':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'High':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'Medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'Low':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export function getStatusTone(status) {
  switch (status) {
    case 'Open':
      return 'bg-red-50 text-red-600 border-red-200'
    case 'Investigating':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'Resolved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'Pending Review':
      return 'bg-violet-50 text-violet-700 border-violet-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}
