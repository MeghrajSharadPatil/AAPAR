import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Building2,
  Database,
  Activity,
  CopyCheck,
  Scale,
  CheckCircle2,
  Cpu,
  QrCode,
  BarChart3,
  FileClock,
  Network,
  Settings,
  Users,
  UploadCloud,
  Award,
  UserCheck,
  History,
  Menu,
  X,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RotateCcw,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { UserRole } from '../types/domain';

interface NavItem {
  label: string;
  path: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  [UserRole.AICTE_ADMIN]: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Institution Directory', path: '/institutions', icon: Building2 },
    { label: 'Central Student Repository', path: '/repository', icon: Database },
    { label: 'Admission Monitoring', path: '/admission-monitoring', icon: Activity },
    { label: 'Duplicate Shield', path: '/duplicate-shield', icon: CopyCheck },
    { label: 'Seat Ledger', path: '/seat-ledger', icon: Scale },
    { label: 'APAAR Validation', path: '/apaar-validation', icon: CheckCircle2 },
    { label: 'AI Intelligence', path: '/ai-intelligence', icon: Cpu },
    { label: 'Credential Verification', path: '/verify-credential', icon: QrCode },
    { label: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    { label: 'Audit Logs', path: '/audit-logs', icon: FileClock },
    { label: 'System Integrations', path: '/integrations', icon: Network },
    { label: 'System Architecture', path: '/architecture', icon: GitBranch },
    { label: 'Settings', path: '/settings', icon: Settings },
  ],
  [UserRole.INSTITUTE_ADMIN]: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Student Management', path: '/students', icon: Users },
    { label: 'Bulk Upload', path: '/bulk-upload', icon: UploadCloud },
    { label: 'Admission Monitoring', path: '/admission-monitoring', icon: Activity },
    { label: 'Duplicate Shield', path: '/duplicate-shield', icon: CopyCheck },
    { label: 'Seat Ledger', path: '/seat-ledger', icon: Scale },
    { label: 'APAAR Validation', path: '/apaar-validation', icon: CheckCircle2 },
    { label: 'Credential Generation', path: '/credentials', icon: Award },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ],
  [UserRole.STUDENT]: [
    { label: 'My Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Academic Profile', path: '/my-profile', icon: Users },
    { label: 'My Credential', path: '/my-credential', icon: Award },
    { label: 'My QR Code', path: '/my-qr', icon: QrCode },
    { label: 'Consent Management', path: '/consents', icon: UserCheck },
    { label: 'Verification History', path: '/verification-history', icon: History },
    { label: 'Settings', path: '/settings', icon: Settings },
  ],
  [UserRole.VERIFIER]: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Verify Credential', path: '/verify-credential', icon: ShieldCheck },
    { label: 'Scan QR', path: '/scan-qr', icon: QrCode },
    { label: 'Verification History', path: '/verification-history', icon: History },
    { label: 'Settings', path: '/settings', icon: Settings },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.AICTE_ADMIN]: 'AICTE Admin',
  [UserRole.INSTITUTE_ADMIN]: 'Institute Admin',
  [UserRole.STUDENT]: 'Student',
  [UserRole.VERIFIER]: 'Employer / Verifier',
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    alerts,
    toasts,
    dismissToast,
    loginAsRole,
    logout,
    resetDemoData,
  } = usePlatform();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return <>{children}</>;

  const navItems = NAV_BY_ROLE[user.role] || NAV_BY_ROLE[UserRole.AICTE_ADMIN];
  const currentNav = navItems.find((item) => location.pathname.startsWith(item.path));

  const handleRoleSwitch = async (newRole: UserRole) => {
    setProfileOpen(false);
    await loginAsRole(newRole);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Mobile Sidebar Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Left Sidebar Navigation */}
      <aside
        className={`no-print fixed md:sticky top-0 left-0 z-50 h-screen bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-out ${
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-20' : 'md:w-68'} shrink-0`}
      >
        {/* Brand Header */}
        <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-950 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6 text-teal-400" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-display font-bold text-base tracking-tight text-slate-900 truncate">
                  APAAR SETU
                </div>
                <div className="text-[11px] font-medium text-slate-500 truncate">
                  One ID. One Seat. One Verified Truth.
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="md:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Context Summary */}
        {!collapsed && (
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
            <div className="font-semibold text-slate-800 truncate">{ROLE_LABELS[user.role]} Portal</div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {user.institutionName || user.organization || 'National Academic Repository'}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5" aria-label="Primary Sidebar Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer Prototype Notice */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="text-[11px] text-slate-500 leading-relaxed">
                SIH26263 Prototype · Synthetic Demo Data Only
              </div>
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              title="Reset Demo Data"
              aria-label="Reset Demo Data"
              className="w-full flex items-center justify-center p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar following SaaS Dashboard 3-zone contract */}
        <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
          {/* Left Zone: Mobile Menu + Contextual Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 truncate">
              <span className="font-medium text-slate-700 hidden sm:inline">APAAR Setu</span>
              <span className="hidden sm:inline" aria-hidden="true">/</span>
              <span className="text-slate-600 hidden md:inline">{ROLE_LABELS[user.role]}</span>
              <span className="hidden md:inline" aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 truncate">
                {currentNav?.label || 'Overview'}
              </span>
            </div>
          </div>

          {/* Right Zone: Demo Role Switcher, Notifications & Profile Menu */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Role Switcher for Judges */}
            <div className="hidden lg:flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/80">
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleSwitch(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    user.role === r
                      ? 'bg-blue-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setProfileOpen(false);
                }}
                aria-label="View platform notifications"
                className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {alerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {alerts.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900">
                      Recent Integrity Alerts
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-900"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {alerts.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No active alerts for your current portal scope.
                      </div>
                    ) : (
                      alerts.slice(0, 5).map((alt) => (
                        <button
                          key={alt.id}
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            navigate(alt.targetRoute);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-slate-900">{alt.alertType}</span>
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              {alt.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {alt.description}
                          </p>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {alt.institutionName} · {alt.timestamp}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-blue-900 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                  {user.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 leading-none whitespace-nowrap">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">
                    {ROLE_LABELS[user.role]}
                  </div>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <div className="text-xs font-semibold text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-500 truncate">{user.email}</div>
                    <div className="text-[11px] text-teal-700 font-medium mt-1">
                      {ROLE_LABELS[user.role]}
                    </div>
                  </div>

                  <div className="px-3 py-2 border-b border-slate-100 lg:hidden">
                    <div className="text-[11px] font-medium text-slate-400 px-1 mb-1">
                      Switch Demo Role
                    </div>
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRoleSwitch(r)}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded-md ${
                          user.role === r
                            ? 'bg-blue-50 text-blue-950 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {ROLE_LABELS[r]}
                      </button>
                    ))}
                  </div>

                  <div className="px-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-md"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Portal Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>

        {/* Clean Minimal Footer */}
        <footer className="no-print border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-700">APAAR SETU</span> · One ID. One Seat. One Verified Truth. (SIH Problem Statement ID: SIH26263)
          </div>
          <div>
            Hackathon Demonstration Prototype · Synthetic Sample Data Only · Not an Official Government Portal
          </div>
        </footer>
      </div>

      {/* Confirmation Dialog for Reset Demo Data */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-dialog-title"
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl"
          >
            <h3 id="reset-dialog-title" className="text-base font-bold text-slate-900">
              Reset Demonstration Database?
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              This will restore all 6 synthetic AICTE institutions, 10 programmes, the 60/60 full seat capacity scenario, Duplicate Shield cases, and Ed25519 credentials to their clean initial state.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmResetOpen(false);
                  await resetDemoData();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg transition-colors"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Stack */}
      <div className="no-print fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto bg-white border border-slate-200 rounded-xl shadow-lg p-4 flex items-start gap-3"
          >
            {t.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-900">{t.title}</div>
              <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{t.message}</div>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
