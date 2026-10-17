import React from 'react';
import { LogOut, Home, User } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  action?: () => void;
  badge?: number;
  highlight?: boolean;
}

interface DashboardLayoutProps {
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'RIDER' | string;
  navItems: NavItem[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: { name?: string; email?: string } | null;
  logout: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  role,
  navItems,
  activeTab,
  setActiveTab,
  user,
  logout,
  children,
}) => {
  const canonicalRole =
    role.toUpperCase() === 'RIDER' || role.toUpperCase() === 'CUSTOMER'
      ? 'CUSTOMER'
      : role.toUpperCase() === 'ADMINISTRATOR' || role.toUpperCase() === 'ADMIN'
      ? 'ADMIN'
      : 'DRIVER';

  return (
    <div className="min-h-[85vh] flex flex-col md:flex-row gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <aside className="w-full md:w-64 shrink-0 rounded-xl border border-brand-border bg-white p-4 flex flex-col justify-between shadow-sm">
        <div className="space-y-6">
          <div className="pb-4 border-b border-brand-border">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-white font-black text-sm">RN</div>
              <span className="text-lg font-extrabold text-brand-text">RideNova</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-brand-muted">Access Tier</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-brand-secondary text-brand-primary border border-brand-primary/30 tracking-wider">{canonicalRole}</span>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => item.action ? item.action() : setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-brand-secondary text-brand-primary-dark border border-brand-primary/30 font-semibold' : 'text-brand-muted hover:bg-brand-secondary hover:text-brand-text'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && <span className="rounded-full bg-brand-primary text-white px-1.5 py-0.2 text-[10px] font-bold">{item.badge}</span>}
                  {item.highlight && <span className="h-2 w-2 rounded-full bg-brand-success animate-ping" />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-brand-border space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="h-8 w-8 rounded-full bg-brand-secondary border border-brand-primary/30 flex items-center justify-center text-xs font-bold text-brand-primary">{user?.name?.charAt(0) || role.charAt(0)}</div>
            <div className="truncate">
              <p className="text-xs font-semibold text-brand-text truncate">{user?.name}</p>
              <p className="text-[11px] text-brand-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 rounded-lg border border-brand-border bg-white py-2 text-xs font-medium text-brand-danger hover:bg-brand-secondary transition-colors">
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 rounded-xl border border-brand-border bg-white p-6 shadow-sm flex flex-col">
        {children}
      </main>
    </div>
  );
};
