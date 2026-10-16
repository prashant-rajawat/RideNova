import React, { useState } from 'react';
import { Menu, X, ChevronDown, LogOut, User, Settings, ShieldCheck } from 'lucide-react';
import { useAuthSession } from '../context/AuthContext.tsx';

interface NavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenSchema: () => void;
  onScrollToSection: (id: string) => void;
  apiConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  apiConnected,
}) => {
  const { user, isAuthenticated, logout } = useAuthSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const roleBadgeColors = {
    rider: 'bg-[#FFF1F2] text-[#E21D2B] border-[#E21D2B]/30',
    driver: 'bg-[#FFF1F2] text-[#E21D2B] border-[#E21D2B]/30',
    admin: 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30',
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E5E5E5] bg-[#FFFFFF] shadow-2xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isAuthenticated && user) {
                if (user.role === 'admin') onNavigate('admin');
                else if (user.role === 'driver') onNavigate('driver');
                else onNavigate('rider');
              } else {
                onNavigate('home');
              }
            }}
            className="group flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E21D2B] text-[#FFFFFF] font-black text-lg shadow-sm">
              RN
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-[#171717] group-hover:text-[#E21D2B] transition-colors">
                RideNova
              </span>
              {isAuthenticated && user?.role === 'admin' && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#737373]">
                  Admin Console
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Zone 2: Role-Aware Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#737373]">
          {!isAuthenticated ? (
            <button
              onClick={() => onNavigate('home')}
              className={`hover:text-[#171717] transition-colors ${currentRoute === 'home' ? 'text-[#E21D2B] font-semibold' : ''}`}
            >
              Overview
            </button>
          ) : user?.role === 'admin' ? (
            <>
              <button
                onClick={() => onNavigate('admin')}
                className={`hover:text-[#171717] transition-colors ${currentRoute === 'admin' ? 'text-[#E21D2B] font-semibold' : ''}`}
              >
                Overview
              </button>
            </>
          ) : (
            <button
              onClick={() => onNavigate(user?.role === 'driver' ? 'driver' : 'rider')}
              className="text-[#171717] font-semibold"
            >
              Dashboard
            </button>
          )}
        </nav>

        {/* Zone 3: API Status & Profile Dropdown */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#737373] border border-[#E5E5E5] rounded-full px-3 py-1.5 bg-[#FAFAFA]">
            <span
              className={`h-2 w-2 rounded-full ${
                apiConnected ? 'bg-[#15803D]' : 'bg-[#B45309]'
              }`}
            />
            <span className="text-[11px] font-semibold">{apiConnected ? 'API Online' : 'Connecting'}</span>
          </div>

          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#171717] hover:border-[#E21D2B] transition-all shadow-2xs"
              >
                <div className="h-7 w-7 rounded-full bg-[#FFF1F2] border border-[#E21D2B]/30 flex items-center justify-center font-bold text-xs text-[#E21D2B]">
                  {user.name.charAt(0)}
                </div>
                <div className="text-left leading-tight">
                  <span className="font-bold text-[#171717] block max-w-[110px] truncate">{user.name}</span>
                  <span className="text-[10px] font-medium text-[#737373] uppercase tracking-wider">
                    {user.role === 'admin' ? 'Administrator' : user.role === 'driver' ? 'Driver' : 'Customer'}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 text-[#737373]" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-2 shadow-2xl z-50 animate-fade-in text-xs space-y-1">
                  <div className="px-3 py-2 border-b border-[#E5E5E5]">
                    <p className="font-bold text-[#171717] truncate">{user.name}</p>
                    <p className="text-[11px] text-[#737373] truncate">{user.email}</p>
                    <span className={`mt-1.5 inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${roleBadgeColors[user.role]}`}>
                      {user.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate(user.role === 'admin' ? 'admin' : user.role === 'driver' ? 'driver' : 'rider');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] rounded-lg transition-colors flex items-center gap-2"
                    >
                      <User className="h-3.5 w-3.5 text-[#E21D2B]" />
                      <span>My Dashboard</span>
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('profile');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-[#171717] hover:bg-[#FAFAFA] rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Settings className="h-3.5 w-3.5 text-[#737373]" />
                      <span>Account Settings</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-[#E5E5E5]">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                        onNavigate('home');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-[#B91C1C]/10 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('sign-in')}
                className="rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-semibold text-[#171717] hover:border-[#E21D2B] transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('sign-up')}
                className="rounded-lg bg-[#E21D2B] px-3.5 py-1.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#BE1622] transition-all shadow-xs"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-[#737373] hover:bg-[#FAFAFA] hover:text-[#171717]"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-[#E5E5E5] bg-[#FFFFFF] px-4 py-5 sm:hidden space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
              RideNova Menu
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#737373]">
              <span className={`h-2 w-2 rounded-full ${apiConnected ? 'bg-[#15803D]' : 'bg-[#B45309]'}`} />
              <span>{apiConnected ? 'API Online' : 'Connecting'}</span>
            </div>
          </div>

          <div className="pt-2">
            {isAuthenticated && user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
                  <div className="h-9 w-9 rounded-full bg-[#FFF1F2] text-[#E21D2B] font-bold flex items-center justify-center">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-[#171717]">{user.name}</p>
                    <p className="text-[11px] text-[#737373]">{user.email}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate(user.role === 'admin' ? 'admin' : user.role === 'driver' ? 'driver' : 'rider');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-[#FFF1F2] text-[#E21D2B] font-bold text-xs"
                >
                  My Dashboard ({user.role})
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('profile');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg border border-[#E5E5E5] text-[#171717] font-medium text-xs"
                >
                  Account Settings
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    onNavigate('home');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-[#B91C1C]/10 text-[#B91C1C] font-semibold text-xs"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('sign-in');
                  }}
                  className="rounded-lg border border-[#E5E5E5] py-2.5 text-xs font-semibold text-[#171717]"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('sign-up');
                  }}
                  className="rounded-lg bg-[#E21D2B] py-2.5 text-xs font-semibold text-[#FFFFFF]"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
