import { useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import RegisterCaseOverlay from './overlays/RegisterCaseOverlay'
import RegisterEvidenceOverlay from './overlays/RegisterEvidenceOverlay'
import AssignRfidOverlay from './overlays/AssignRfidOverlay'
import OfficerRegistrationOverlay from './overlays/OfficerRegistrationOverlay'
import { sidebarItems } from '../data/dashboardData'
import { caseRows } from '../data/casesData'
import { evidenceRows } from '../data/evidenceData'
import { officersRows } from '../data/officersData'
import { rfidCatalog } from '../data/rfidData'
import { securityAlertsSeed, markAlertAsRead, markAllAlertsAsRead } from '../data/securityAlertsData'
import Dashboard from '../screens/Dashboard/Dashboard'
import Cases from '../screens/Cases/Cases'
import Evidence from '../screens/Evidence/Evidence'
import Officers from '../screens/Officers/Officers'
import SecurityAlerts from '../screens/SecurityAlerts/SecurityAlerts'
import Settings from '../screens/Settings/Settings'

const screenMeta = {
  '/dashboard': {
    title: 'Dashboard',
    subtitle: 'Overview of evidence and station activity',
  },
  '/cases': {
    title: 'Cases',
    subtitle: 'Manage registered cases and FIR records',
  },
  '/evidence': {
    title: 'Evidence',
    subtitle: 'Browse and manage evidence items',
  },
  '/officers': {
    title: 'Officers',
    subtitle: 'Registered officers and duty records',
  },
  '/security-alerts': {
    title: 'Security Alerts',
    subtitle: 'Monitor live station security activity',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'System configuration and preferences',
  },
}

const enrichCaseRows = (casesList, evidenceList) =>
  casesList.map((item) => ({
    ...item,
    caseType: item.caseType || item.type,
    firNumber: item.firNumber || `FIR-${item.id.split('-').slice(-1)[0]}`,
    description: item.description || 'No additional case description provided.',
    createdAt: item.createdAt || item.created || new Date().toISOString(),
    evidence: evidenceList.filter((entry) => entry.caseId === item.id).length,
  }))

const buildCustodyHistory = (record = {}) => {
  const events = []

  if (record.id) {
    events.push({
      type: 'Evidence Registered',
      date: record.registered || new Date().toISOString().slice(0, 10),
      time: '09:30',
      actor: 'System',
      details: record.id,
    })
  }

  if (record.rfid) {
    events.push({
      type: 'RFID Assigned',
      date: record.registered || new Date().toISOString().slice(0, 10),
      time: '09:42',
      actor: 'System',
      details: `RFID: ${record.rfid}`,
    })
  }

  return events
}

const enrichEvidenceRecord = (record) => ({
  ...record,
  status: record.status || 'Stored',
  custodyHistory: Array.isArray(record.custodyHistory) && record.custodyHistory.length
    ? record.custodyHistory
    : buildCustodyHistory(record),
})

export default function AppLayout() {
  const location = useLocation()
  const currentPath = location.pathname === '/' ? '/dashboard' : location.pathname
  const meta = screenMeta[currentPath] || screenMeta['/dashboard']
  const [securityAlerts, setSecurityAlerts] = useState(securityAlertsSeed)
  const [cases, setCases] = useState(() => enrichCaseRows(caseRows, evidenceRows))
  const [evidence, setEvidence] = useState(() => evidenceRows.map(enrichEvidenceRecord))
  const [officers, setOfficers] = useState(officersRows)
  const [registerEvidenceOpen, setRegisterEvidenceOpen] = useState(false)
  const [assignRfidOpen, setAssignRfidOpen] = useState(false)
  const [registerCaseOpen, setRegisterCaseOpen] = useState(false)
  const [registerOfficerOpen, setRegisterOfficerOpen] = useState(false)
  const [dashboardOfficerOverlayOpen, setDashboardOfficerOverlayOpen] = useState(false)

  const availableRfidOptions = useMemo(
    () => rfidCatalog.filter((tag) => !evidence.some((item) => item.rfid === tag)),
    [evidence],
  )

  const navItems = sidebarItems.map((item) => ({
    ...item,
    active: item.path === currentPath,
  }))

  const handleMarkAlertAsRead = (alertId) => {
    setSecurityAlerts((currentAlerts) => markAlertAsRead(currentAlerts, alertId))
  }

  const handleMarkAllAlertsAsRead = () => {
    setSecurityAlerts((currentAlerts) => markAllAlertsAsRead(currentAlerts))
  }

  const handleAddCase = (casePayload) => {
    const nextCase = {
      ...casePayload,
      id: casePayload.id,
      title: casePayload.title,
      type: casePayload.caseType,
      caseType: casePayload.caseType,
      status: casePayload.status,
      firNumber: casePayload.firNumber,
      description: casePayload.description,
      createdAt: casePayload.createdAt,
      created: casePayload.createdAt ? casePayload.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      evidence: casePayload.evidenceItems?.length || 0,
    }

    setCases((currentCases) => [nextCase, ...currentCases])

    if (casePayload.evidenceItems?.length) {
      const newEvidenceRecords = casePayload.evidenceItems.map((item, index) => ({
        id: item.id,
        caseId: casePayload.id,
        name: item.evidenceName,
        type: item.evidenceType,
        description: item.description || '',
        rfid: item.assignedRfid,
        status: item.status || 'Stored',
        registered: item.registeredAt || new Date().toISOString().slice(0, 10),
        createdAt: item.createdAt || new Date().toISOString(),
      }))

      setEvidence((currentEvidence) => [...newEvidenceRecords, ...currentEvidence])
    }
  }

  const handleUpdateCase = (updatedCase, evidenceItems = []) => {
    setCases((currentCases) =>
      currentCases.map((item) =>
        item.id === updatedCase.id
          ? {
              ...item,
              title: updatedCase.title,
              type: updatedCase.caseType,
              caseType: updatedCase.caseType,
              status: updatedCase.status,
              firNumber: updatedCase.firNumber,
              description: updatedCase.description,
              createdAt: item.createdAt,
              created: item.created,
              evidence: evidenceItems.length || item.evidence,
            }
          : item,
      ),
    )

    if (evidenceItems.length) {
      setEvidence((currentEvidence) => {
        const remaining = currentEvidence.filter((entry) => entry.caseId !== updatedCase.id)
        const next = evidenceItems.map((item) => ({
          id: item.id,
          caseId: updatedCase.id,
          name: item.evidenceName,
          type: item.evidenceType,
          description: item.description || '',
          rfid: item.assignedRfid,
          status: item.status || 'Stored',
          registered: item.registeredAt || new Date().toISOString().slice(0, 10),
          createdAt: item.createdAt || new Date().toISOString(),
        }))

        return [...next, ...remaining]
      })
    }
  }

  const handleDeleteCase = (caseId) => {
    setCases((currentCases) => currentCases.filter((item) => item.id !== caseId))
    setEvidence((currentEvidence) => currentEvidence.filter((entry) => entry.caseId !== caseId))
  }

  const handleAddEvidenceRecord = (payload) => {
    const caseRecord = cases.find((item) => item.id === payload.caseId)
    const nextEvidenceItem = enrichEvidenceRecord({
      id: payload.id,
      caseId: payload.caseId,
      name: payload.name,
      type: payload.type,
      description: payload.description || '',
      rfid: payload.rfid,
      status: payload.status || 'Stored',
      registered: payload.registered || new Date().toISOString().slice(0, 10),
      createdAt: payload.createdAt || new Date().toISOString(),
      custodyHistory: payload.custodyHistory || buildCustodyHistory({
        id: payload.id,
        rfid: payload.rfid,
        registered: payload.registered || new Date().toISOString().slice(0, 10),
      }),
    })

    setEvidence((currentEvidence) => [nextEvidenceItem, ...currentEvidence])
    setCases((currentCases) =>
      currentCases.map((item) =>
        item.id === payload.caseId
          ? { ...item, evidence: (item.evidence || 0) + 1 }
          : item,
      ),
    )

    if (caseRecord && caseRecord.id === payload.caseId) {
      setCases((currentCases) =>
        currentCases.map((item) =>
          item.id === payload.caseId ? { ...item, evidence: (item.evidence || 0) + 1 } : item,
        ),
      )
    }
  }

  const handleAssignRfid = (evidenceId, rfidValue) => {
    if (!evidenceId || !rfidValue) return false

    const targetEvidence = evidence.find((item) => item.id === evidenceId)
    if (!targetEvidence) return false

    const alreadyAssigned = evidence.some(
      (item) => item.id !== evidenceId && item.rfid === rfidValue,
    )

    if (alreadyAssigned) return false

    const previousRfid = targetEvidence.rfid

    setEvidence((currentEvidence) =>
      currentEvidence.map((item) => {
        if (item.id !== evidenceId) return item

        const nextHistory = [...(item.custodyHistory || [])]
        const hasRfidEvent = nextHistory.some((entry) => entry.type === 'RFID Assigned' && entry.details === `RFID: ${rfidValue}`)

        if (!hasRfidEvent) {
          nextHistory.push({
            type: 'RFID Assigned',
            date: new Date().toISOString().slice(0, 10),
            time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
            actor: 'System',
            details: `RFID: ${rfidValue}`,
          })
        }

        return {
          ...item,
          rfid: rfidValue,
          status: item.status || 'Stored',
          custodyHistory: nextHistory,
        }
      }),
    )

    if (previousRfid && previousRfid !== rfidValue) {
      setCases((currentCases) => currentCases)
    }

    return true
  }

  const handleUpdateEvidence = (updatedEvidence) => {
    setEvidence((currentEvidence) =>
      currentEvidence.map((item) => {
        if (item.id !== updatedEvidence.id) return item

        const previousRfid = item.rfid
        const nextRfid = updatedEvidence.rfid || previousRfid
        const nextHistory = Array.isArray(updatedEvidence.custodyHistory) && updatedEvidence.custodyHistory.length
          ? updatedEvidence.custodyHistory
          : item.custodyHistory || buildCustodyHistory(item)

        if (nextRfid && previousRfid !== nextRfid) {
          nextHistory.push({
            type: 'RFID Assigned',
            date: new Date().toISOString().slice(0, 10),
            time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
            actor: 'System',
            details: `RFID: ${nextRfid}`,
          })
        }

        return {
          ...item,
          ...updatedEvidence,
          name: updatedEvidence.name,
          type: updatedEvidence.type,
          status: updatedEvidence.status,
          rfid: nextRfid,
          description: updatedEvidence.description,
          custodyHistory: nextHistory,
        }
      }),
    )

    if (updatedEvidence.caseId) {
      setCases((currentCases) =>
        currentCases.map((item) =>
          item.id === updatedEvidence.caseId
            ? {
                ...item,
                evidence: evidence.filter((entry) => entry.caseId === updatedEvidence.caseId).length,
              }
            : item,
        ),
      )
    }
  }

  const handleDeleteEvidence = (evidenceId) => {
    const target = evidence.find((entry) => entry.id === evidenceId)

    setEvidence((currentEvidence) => currentEvidence.filter((entry) => entry.id !== evidenceId))
    setCases((currentCases) =>
      currentCases.map((item) =>
        item.id === target?.caseId
          ? { ...item, evidence: Math.max(0, (item.evidence || 0) - 1) }
          : item,
      ),
    )
  }

  const handleUpdateOfficer = (updatedOfficer) => {
    setOfficers((currentOfficers) =>
      currentOfficers.map((item) =>
        item.id === updatedOfficer.id ? { ...item, ...updatedOfficer } : item,
      ),
    )
  }

  const handleDeleteOfficer = (officerId) => {
    setOfficers((currentOfficers) => currentOfficers.filter((item) => item.id !== officerId))
  }

  return (
    <div className="min-h-screen w-full bg-[#edf3f7] text-slate-800">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <Sidebar items={navItems} />

        <div className="flex min-h-screen flex-1 flex-col bg-[#f3f6f8]">
          <Header
            title={meta.title}
            subtitle={meta.subtitle}
            alerts={securityAlerts}
            onMarkAlertAsRead={handleMarkAlertAsRead}
            onMarkAllAlertsAsRead={handleMarkAllAlertsAsRead}
          />

          <main className="flex-1">
            <Routes>
              <Route
                path="/dashboard"
                element={
                  <Dashboard
                    cases={cases}
                    evidence={evidence}
                    officers={officers}
                    onRegisterCase={() => setRegisterCaseOpen(true)}
                    onRegisterOfficer={() => setDashboardOfficerOverlayOpen(true)}
                    onRegisterEvidence={() => setRegisterEvidenceOpen(true)}
                    onAssignRfid={() => setAssignRfidOpen(true)}
                  />
                }
              />
              <Route
                path="/cases"
                element={
                  <Cases
                    cases={cases}
                    onAddCase={handleAddCase}
                    onUpdateCase={handleUpdateCase}
                    onDeleteCase={handleDeleteCase}
                  />
                }
              />
              <Route
                path="/evidence"
                element={
                  <Evidence
                    evidence={evidence}
                    cases={cases}
                    officers={officers}
                    onRegisterEvidence={() => setRegisterEvidenceOpen(true)}
                    onUpdateEvidence={handleUpdateEvidence}
                    onDeleteEvidence={handleDeleteEvidence}
                  />
                }
              />
              <Route
                path="/officers"
                element={
                  <Officers
                    officers={officers}
                    evidence={evidence}
                    openRegisterSignal={registerOfficerOpen}
                    onRegisterSignalConsumed={() => setRegisterOfficerOpen(false)}
                    onAddOfficer={(officer) => setOfficers((current) => [officer, ...current])}
                    onUpdateOfficer={handleUpdateOfficer}
                    onDeleteOfficer={handleDeleteOfficer}
                  />
                }
              />
              <Route
                path="/security-alerts"
                element={
                  <SecurityAlerts
                    alerts={securityAlerts}
                    onMarkAlertAsRead={handleMarkAlertAsRead}
                    onMarkAllAlertsAsRead={handleMarkAllAlertsAsRead}
                  />
                }
              />
              <Route path="/settings" element={<Settings />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>

      <OfficerRegistrationOverlay
        isOpen={dashboardOfficerOverlayOpen}
        officers={officers}
        onClose={() => setDashboardOfficerOverlayOpen(false)}
        onAddOfficer={(record) => {
          setOfficers((current) => [record, ...current])
          setDashboardOfficerOverlayOpen(false)
        }}
      />

      <RegisterCaseOverlay
        isOpen={registerCaseOpen}
        onClose={() => setRegisterCaseOpen(false)}
        onCaseRegistered={(payload) => {
          handleAddCase(payload)
          setRegisterCaseOpen(false)
        }}
      />

      <RegisterEvidenceOverlay
        isOpen={registerEvidenceOpen}
        cases={cases}
        evidence={evidence}
        currentlyAssignedRfids={evidence.map((item) => item.rfid).filter(Boolean)}
        onClose={() => setRegisterEvidenceOpen(false)}
        onRegister={(record) => {
          handleAddEvidenceRecord(record)
          setRegisterEvidenceOpen(false)
        }}
      />

      <AssignRfidOverlay
        isOpen={assignRfidOpen}
        evidence={evidence}
        availableRfids={availableRfidOptions}
        onClose={() => setAssignRfidOpen(false)}
        onAssign={(selectedEvidenceId, selectedRfid) => {
          const success = handleAssignRfid(selectedEvidenceId, selectedRfid)
          if (success) {
            setAssignRfidOpen(false)
          }
        }}
      />
    </div>
  )
}
