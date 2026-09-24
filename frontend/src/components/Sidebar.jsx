import { NavLink } from 'react-router-dom'

const iconClassName = 'h-4 w-4 shrink-0'

function DashboardIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="4" rx="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
      <rect x="3" y="12" width="7" height="9" rx="1.5" />
    </svg>
  )
}

function CasesIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M8 4.5h8l2 3V18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" />
      <path d="M8 4.5v4h8v-4" />
      <path d="M8 11.5h8" />
    </svg>
  )
}

function EvidenceIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M12 3.5 5.5 7v10L12 20.5 18.5 17V7L12 3.5Z" />
      <path d="M12 3.5v17" />
      <path d="M5.5 7 12 10.5 18.5 7" />
    </svg>
  )
}

function OfficersIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
      <circle cx="10" cy="7" r="3.5" />
      <path d="M19 19v-1a4 4 0 0 0-3-3.87" />
      <path d="M15.5 4.5A3.5 3.5 0 0 1 18.5 8" />
    </svg>
  )
}

function SecurityAlertsIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M12 3.5 18.5 6v5.2c0 4.1-2.4 7.8-6.5 9.3-4.1-1.5-6.5-5.2-6.5-9.3V6L12 3.5Z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}

function SettingsIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <circle cx="12" cy="12" r="3.3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1.02 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.02H2.95a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.96 4.6a1.7 1.7 0 0 0 1.02-1.56V2.95a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.04 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8.96a1.7 1.7 0 0 0 1.56 1.02h.09a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  )
}

const iconMap = {
  dashboard: DashboardIcon,
  cases: CasesIcon,
  evidence: EvidenceIcon,
  officers: OfficersIcon,
  'security-alerts': SecurityAlertsIcon,
  settings: SettingsIcon,
}

export default function Sidebar({ items = [] }) {
  return (
    <aside className="w-full bg-[#12263d] text-slate-200 lg:w-[255px] lg:min-h-screen lg:shrink-0">
      <div className="flex flex-col gap-6 p-0 lg:py-5">
        <div className="flex items-center gap-3 px-4 py-4 lg:px-4 lg:py-3">
          <img
            src="/logo.png"
            alt="EviLog logo"
            className="h-9 w-auto max-w-[2.25rem] object-contain"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
          <div className="min-w-0 leading-tight">
            <div className="text-[1.7rem] font-semibold tracking-tight text-white">EviLog</div>
            <div className="text-xs text-slate-300">Ravet Police Station</div>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-3 pb-1 lg:flex-col lg:overflow-visible lg:px-3">
          {items.map(({ id, label, path }) => {
            const Icon = iconMap[id] || DashboardIcon

            return (
              <NavLink
                key={id}
                to={path}
                className={({ isActive }) =>
                  `navigation-item min-w-[150px] ${
                    isActive
                      ? 'bg-[#dfe6ef] text-slate-800 shadow-sm'
                      : 'text-slate-300 hover:bg-[#1a2f45] hover:text-white'
                  }`
                }
              >
                <Icon className={iconClassName} />
                <span>{label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
