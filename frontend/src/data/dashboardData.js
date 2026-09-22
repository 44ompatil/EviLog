export const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', active: true },
  { id: 'cases', label: 'Cases' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'officers', label: 'Officers' },
  { id: 'settings', label: 'Settings' },
]

export const dashboardStats = [
  { label: 'Total Cases', value: 12, icon: 'folder', tone: 'slate' },
  { label: 'Total Evidence', value: 14, icon: 'evidence', tone: 'emerald' },
  { label: 'Registered Officers', value: 6, icon: 'officer', tone: 'slate' },
]

export const quickActions = [
  { label: 'Register Evidence', tone: 'emerald' },
  { label: 'Register Case', tone: 'slate' },
  { label: 'Register Officer', tone: 'slate' },
  { label: 'Assign RFID', tone: 'violet' },
]

export const activityRows = [
  {
    transactionId: 'ACT-0891',
    officerId: 'OFF-842',
    evidenceId: 'EV-2024-1847',
    action: 'Check In',
    actionTone: 'green',
    timestamp: '2026-09-19 09:14',
    status: 'Completed',
  },
  {
    transactionId: 'ACT-0890',
    officerId: 'OFF-017',
    evidenceId: 'EV-2024-1203',
    action: 'Check Out',
    actionTone: 'orange',
    timestamp: '2026-09-19 09:02',
    status: 'Completed',
  },
  {
    transactionId: 'ACT-0889',
    officerId: 'OFF-033',
    evidenceId: 'EV-2024-0891',
    action: 'Transfer',
    actionTone: 'blue',
    timestamp: '2026-09-19 08:47',
    status: 'In Transit',
  },
  {
    transactionId: 'ACT-0888',
    officerId: 'OFF-009',
    evidenceId: 'EV-2024-1654',
    action: 'Inventory',
    actionTone: 'purple',
    timestamp: '2026-09-19 08:30',
    status: 'Verified',
  },
  {
    transactionId: 'ACT-0887',
    officerId: 'OFF-022',
    evidenceId: 'EV-2024-1122',
    action: 'Check In',
    actionTone: 'green',
    timestamp: '2026-09-19 07:55',
    status: 'Completed',
  },
  {
    transactionId: 'ACT-0886',
    officerId: 'OFF-055',
    evidenceId: 'EV-2024-2011',
    action: 'Transfer',
    actionTone: 'blue',
    timestamp: '2026-09-19 07:30',
    status: 'Pending',
  },
]
