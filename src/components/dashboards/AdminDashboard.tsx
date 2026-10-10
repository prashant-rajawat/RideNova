import React, { useState } from 'react';
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  Car,
  Navigation,
  CreditCard,
  Ticket,
  HelpCircle,
  BarChart3,
  Settings,
  LogOut,
  Clock,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAuthSession } from '../../context/AuthContext.tsx';

interface AdminDashboardProps {
  onNavigate: (route: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuthSession();
  const [activeTab, setActiveTab] = useState<'overview' | 'riders' | 'drivers' | 'rides' | 'payments' | 'promos' | 'support' | 'reports' | 'settings'>('overview');

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'riders', label: 'Riders', icon: Users, future: 'Future Step' },
    { id: 'drivers', label: 'Drivers', icon: Car, future: 'Future Step' },
    { id: 'rides', label: 'Rides', icon: Navigation, future: 'Step 4' },
    { id: 'payments', label: 'Payments', icon: CreditCard, future: 'Step 5' },
    { id: 'promos', label: 'Promo Codes', icon: Ticket, future: 'Step 5' },
    { id: 'support', label: 'Support', icon: HelpCircle, future: 'Step 6' },
    { id: 'reports', label: 'Reports', icon: BarChart3, future: 'Future Step' },
    { id: 'settings', label: 'Settings', icon: Settings, future: 'Future Step' },
  ];

  return (
    <div className="min-h-[85vh] flex flex-col md:flex-row gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0 rounded-xl border border-[#1E334D] bg-[#0F1C2E] p-4 flex flex-col justify-between shadow-sm">
        <div className="space-y-6">
          <div className="pb-4 border-b border-[#1E334D]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#22C55E] to-[#00C2FF] text-[#07111F] font-black text-sm">
                RN
              </div>
              <span className="text-lg font-extrabold text-[#E5F2FF]">RideNova Admin</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-[#8FA6BF]">Access Tier</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 tracking-wider">
                ADMIN
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                      : 'text-[#8FA6BF] hover:bg-[#1E334D]/40 hover:text-[#E5F2FF]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.future && (
                    <span className="text-[10px] text-[#8FA6BF]/80 font-mono">
                      {item.future}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-[#1E334D] space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="h-8 w-8 rounded-full bg-[#1E334D] flex items-center justify-center text-xs font-bold text-[#22C55E]">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-[#E5F2FF] truncate">{user?.name}</p>
              <p className="text-[11px] text-[#8FA6BF] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#1E334D] bg-[#07111F] py-2 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 rounded-xl border border-[#1E334D] bg-[#0F1C2E] p-6 shadow-sm">
        <div className="pb-6 border-b border-[#1E334D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#22C55E]">
                Administrative Control Panel
              </span>
              <span className="text-xs text-[#8FA6BF]">·</span>
              <span className="text-xs text-[#22C55E] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"></span>
                Superuser Role Verified
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-[#E5F2FF]">
              RideNova Admin Console
            </h1>
            <p className="mt-1 text-xs text-[#8FA6BF]">
              Platform-wide administration, role governance, and compliance.
            </p>
          </div>

          <button
            onClick={() => onNavigate('profile')}
            className="self-start sm:self-auto rounded-lg border border-[#1E334D] bg-[#07111F] px-3.5 py-2 text-xs font-medium text-[#E5F2FF] hover:border-[#22C55E] transition-colors"
          >
            Admin Profile
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-[#1E334D] bg-[#07111F] p-4">
                <span className="text-xs text-[#8FA6BF]">Staff Administrator</span>
                <p className="mt-1 text-lg font-bold text-[#E5F2FF]">{user?.name}</p>
                <span className="mt-2 text-[11px] text-[#22C55E] block font-mono">
                  Role: ADMIN (PostgreSQL)
                </span>
              </div>
              <div className="rounded-lg border border-[#1E334D] bg-[#07111F] p-4">
                <span className="text-xs text-[#8FA6BF]">RBAC Authorization</span>
                <p className="mt-1 text-lg font-bold text-[#22C55E]">Authorized</p>
                <span className="mt-2 text-[11px] text-[#8FA6BF] block">
                  All route barriers permitted
                </span>
              </div>
              <div className="rounded-lg border border-[#1E334D] bg-[#07111F] p-4">
                <span className="text-xs text-[#8FA6BF]">Database Subject ID</span>
                <p className="mt-1 text-xs font-mono text-[#8FA6BF] truncate">
                  {user?.id}
                </p>
                <span className="mt-2 text-[11px] text-[#22C55E] block">
                  PostgreSQL UUID Enforced
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-[#1E334D] bg-[#07111F] p-6">
              <div className="flex items-center gap-2 text-sm font-bold text-[#E5F2FF] mb-2">
                <ShieldCheck className="h-4 w-4 text-[#22C55E]" />
                Highest Privilege Tier Active
              </div>
              <p className="text-xs text-[#8FA6BF] leading-relaxed">
                You are authenticated with the <strong>ADMIN</strong> application role.
                Platform analytics, driver compliance approvals, and payment dispute tools are preserved as placeholders until future phases.
              </p>
            </div>
          </div>
        )}

        {activeTab !== 'overview' && (
          <div className="mt-12 text-center py-12 border border-dashed border-[#1E334D] rounded-xl bg-[#07111F]/50">
            <Clock className="mx-auto h-8 w-8 text-[#22C55E] mb-3" />
            <h3 className="text-base font-bold text-[#E5F2FF]">
              {navItems.find((n) => n.id === activeTab)?.label} — Coming Soon
            </h3>
            <p className="mt-1 text-xs text-[#8FA6BF] max-w-sm mx-auto">
              This administrative module is scheduled for development in{' '}
              <span className="text-[#22C55E] font-semibold">
                {navItems.find((n) => n.id === activeTab)?.future}
              </span>.
            </p>
            <button
              onClick={() => setActiveTab('overview')}
              className="mt-5 text-xs text-[#22C55E] hover:underline"
            >
              Return to Admin Overview
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
