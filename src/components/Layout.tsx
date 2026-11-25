import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus2,
  GraduationCap,
  History,
  UserCheck,
  BookOpenCheck,
  Database,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronRight,
  Menu,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/new-review', label: 'Professor Overview', icon: FilePlus2 },
  { to: '/student-overview', label: 'Student Overview', icon: GraduationCap },
  { to: '/history', label: 'Review History', icon: History },
  { to: '/reviewer', label: 'Reviewer Dashboard', icon: UserCheck },
  { to: '/published', label: 'Published Content', icon: BookOpenCheck },
  { to: '/knowledge', label: 'Knowledge Sources', icon: Database },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function getPageMeta(pathname: string): { title: string; breadcrumb: string[] } {
  if (pathname === '/') return { title: 'Dashboard', breadcrumb: ['Veritas', 'Dashboard'] };
  if (pathname === '/new-review')
    return { title: 'Professor Overview', breadcrumb: ['Veritas', 'Professor Overview'] };
  if (pathname === '/student-overview')
    return { title: 'Student Overview', breadcrumb: ['Veritas', 'Student Overview'] };
  if (pathname === '/upload-paper')
    return { title: 'Upload Question Paper', breadcrumb: ['Veritas', 'Upload Question Paper'] };
  if (pathname.includes('/workflow'))
    return { title: 'Live Agent Workflow', breadcrumb: ['Veritas', 'Reviews', 'Live Workflow'] };
  if (pathname.includes('/results'))
    return { title: 'Review Results', breadcrumb: ['Veritas', 'Reviews', 'Verification Results'] };
  if (pathname === '/history')
    return { title: 'Review History', breadcrumb: ['Veritas', 'Review History'] };
  if (pathname === '/reviewer')
    return { title: 'Reviewer Dashboard', breadcrumb: ['Veritas', 'Reviewer Workspace'] };
  if (pathname === '/published')
    return { title: 'Published Content', breadcrumb: ['Veritas', 'Published Academic Library'] };
  if (pathname === '/knowledge')
    return { title: 'Knowledge Sources', breadcrumb: ['Veritas', 'Knowledge Base'] };
  if (pathname === '/settings')
    return { title: 'Settings', breadcrumb: ['Veritas', 'Settings'] };
  return { title: 'Veritas', breadcrumb: ['Veritas'] };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const {
    user,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    toasts,
    dismissToast,
    globalSearch,
    setGlobalSearch,
    addToast,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const meta = getPageMeta(pathname);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const showSearch =
    pathname === '/' ||
    pathname === '/history' ||
    pathname === '/published' ||
    pathname === '/knowledge';

  const handleLogout = () => {
    setProfileOpen(false);
    addToast({
      type: 'info',
      title: 'Session locked',
      description: 'In production, this redirects to institutional SSO.',
    });
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#111827] text-slate-200 select-none">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-3 text-left"
        >
          <div className="w-9 h-9 rounded-[10px] bg-[#635BFF] flex items-center justify-center shadow-sm">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 5l7 14 7-14" />
              <path d="M9.5 5l2.5 5 2.5-5" className="opacity-70" />
            </svg>
          </div>
          <div>
            <span className="block text-sm font-bold tracking-[0.14em] text-white">
              VERITAS
            </span>
            <span className="block text-[10px] text-slate-400">
              Academic Verification
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white p-1"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#635BFF] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom User Profile */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2.5 py-2 rounded-[10px] bg-white/5">
          <div className="w-9 h-9 rounded-full bg-[#18BFA0]/20 text-[#18BFA0] border border-[#18BFA0]/30 flex items-center justify-center text-xs font-semibold shrink-0">
            {user.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F4F6FB] text-[#182238]">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 fixed inset-y-0 left-0 z-30">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#10182B]/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full z-50">{SidebarContent}</div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-[8px] text-[#64748B] hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                {meta.breadcrumb.map((crumb, idx) => (
                  <React.Fragment key={crumb}>
                    {idx > 0 && <ChevronRight className="w-3 h-3" />}
                    <span
                      className={
                        idx === meta.breadcrumb.length - 1
                          ? 'text-[#182238] font-medium'
                          : ''
                      }
                    >
                      {crumb}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <h2 className="text-base font-semibold text-[#182238] truncate">
                {meta.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {showSearch && (
              <div className="hidden md:flex items-center relative w-64">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search reviews, topics, IDs..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-[10px] border border-slate-200 bg-[#F4F6FB] text-sm text-[#182238] placeholder:text-[#64748B] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF]"
                />
              </div>
            )}

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setProfileOpen(false);
                }}
                className="relative p-2 rounded-[10px] border border-slate-200 bg-white text-[#64748B] hover:text-[#182238] hover:bg-slate-50 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#635BFF] text-white text-[10px] font-semibold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-[12px] shadow-lg overflow-hidden z-40">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#182238]">
                      Notifications
                    </span>
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-xs font-medium text-[#635BFF] hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-[#64748B] text-center">
                        No notifications.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            markNotificationRead(n.id);
                            setNotifOpen(false);
                            if (n.link) navigate(n.link);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                            !n.read ? 'bg-[#635BFF]/[0.03]' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-[#182238]">
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-[#635BFF] shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-[#64748B]">{n.message}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-[10px] border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[#10182B] text-white text-xs font-semibold flex items-center justify-center">
                  {user.initials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-[#182238] leading-tight">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-[#64748B] leading-tight">
                    {user.role}
                  </p>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-[12px] shadow-lg overflow-hidden z-40">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-semibold text-[#182238]">{user.name}</p>
                    <p className="text-[11px] text-[#64748B] truncate">{user.email}</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full text-left px-3 py-2 rounded-[8px] text-xs font-medium text-[#182238] hover:bg-slate-100"
                    >
                      Profile & Role Settings
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-[8px] text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto bg-white border border-slate-200 rounded-[12px] shadow-lg p-3.5 flex items-start gap-3"
          >
            {t.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-[#18BFA0] shrink-0 mt-0.5" />
            )}
            {t.type === 'warning' && (
              <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
            )}
            {t.type === 'error' && (
              <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
            )}
            {t.type === 'info' && (
              <Info className="w-4 h-4 text-[#635BFF] shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#182238]">{t.title}</p>
              {t.description && (
                <p className="text-xs text-[#64748B] mt-0.5">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="text-slate-400 hover:text-[#182238]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
