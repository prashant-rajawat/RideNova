import React, { useState } from 'react';
import { Menu, X, Shield, Activity, Database, GitBranch, User, LogIn, LogOut, ChevronDown } from 'lucide-react';
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
  onOpenSchema,
  onScrollToSection,
  apiConnected,
}) => {
  const { user, isAuthenticated, logout } = useAuthSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleNavClick = (id: string) => {
    if (currentRoute !== 'home') {
      onNavigate('home');
      setTimeout(() => onScrollToSection(id), 100);
    } else {
      onScrollToSection(id);
    }
    setMobileMenuOpen(false);
  };

  const getDashboardRoute = () => {
    if (!user) return 'sign-in';
    if (user.role === 'driver') return 'driver';
    if (user.role === 'admin') return 'admin';
    return 'rider';
  };

  const roleBadgeColors = {
    rider: 'bg-[#E21D2B]/15 text-[#E21D2B] border-[#E21D2B]/30',
    driver: 'bg-[#E21D2B]/15 text-[#E21D2B] border-[#E21D2B]/30',
    admin: 'bg-[#15803D]/15 text-[#15803D] border-[#15803D]/30',
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E5E5E5] bg-[#FFFFFF]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single text wordmark brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="group flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#E21D2B] to-[#E21D2B] text-[#FFFFFF] font-black text-lg shadow-sm">
              RN
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-[#171717] group-hover:text-[#E21D2B] transition-colors">
                RideNova
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#737373]">
          <button
            onClick={() => onNavigate('home')}
            className={`hover:text-[#171717] transition-colors whitespace-nowrap ${currentRoute === 'home' ? 'text-[#E21D2B] font-semibold' : ''}`}
          >
            Overview
          </button>

          {/* Direct Role Dashboard Links for testing Step 2 */}
          <button
            onClick={() => onNavigate('rider')}
            className={`hover:text-[#171717] transition-colors whitespace-nowrap ${currentRoute === 'rider' ? 'text-[#E21D2B] font-semibold' : ''}`}
          >
            Rider
          </button>
          <button
            onClick={() => onNavigate('driver')}
            className={`hover:text-[#171717] transition-colors whitespace-nowrap ${currentRoute === 'driver' ? 'text-[#E21D2B] font-semibold' : ''}`}
          >
            Driver
          </button>
          <button
            onClick={() => onNavigate('admin')}
            className={`hover:text-[#171717] transition-colors whitespace-nowrap ${currentRoute === 'admin' ? 'text-[#15803D] font-semibold' : ''}`}
          >
            Admin
          </button>

          <button
            onClick={() => handleNavClick('system-health')}
            className="hover:text-[#171717] transition-colors whitespace-nowrap"
          >
            API & Diagnostics
          </button>
        </nav>

        {/* Zone 3: Authentication Actions & Status */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#737373] border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 bg-[#FFFFFF]">
            <span
              className={`h-2 w-2 rounded-full ${
                apiConnected ? 'bg-[#15803D] ring-2 ring-[#15803D]/20' : 'bg-[#B45309] ring-2 ring-[#B45309]/20'
              }`}
            />
            <span className="text-[11px]">{apiConnected ? 'API Online' : 'Connecting'}</span>
          </div>

          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#171717] hover:border-[#E21D2B] transition-all"
              >
                <div className="h-5 w-5 rounded-full bg-[#E5E5E5] flex items-center justify-center font-bold text-[10px] text-[#E21D2B]">
                  {user.name.charAt(0)}
                </div>
                <span className="font-medium max-w-[100px] truncate">{user.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${roleBadgeColors[user.role]}`}
                >
                  {user.role}
                </span>
                <ChevronDown className="h-3 w-3 text-[#737373]" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-2 shadow-2xl z-50 animate-fade-in">
                  <div className="px-3 py-2 border-b border-[#E5E5E5] text-xs">
                    <p className="font-semibold text-[#171717] truncate">{user.name}</p>
                    <p className="text-[11px] text-[#737373] truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate(getDashboardRoute());
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#171717] hover:bg-[#E5E5E5] rounded-md transition-colors"
                    >
                      My Dashboard ({user.role})
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('profile');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#171717] hover:bg-[#E5E5E5] rounded-md transition-colors"
                    >
                      View Profile
                    </button>
                  </div>
                  <div className="pt-1 border-t border-[#E5E5E5]">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                        onNavigate('home');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#B91C1C] hover:bg-[#B91C1C]/10 rounded-md transition-colors flex items-center gap-1.5"
                    >
                      <LogOut className="h-3 w-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('sign-in')}
                className="rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-semibold text-[#171717] hover:border-[#E21D2B] hover:text-[#E21D2B] transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('sign-up')}
                className="flex items-center gap-1.5 rounded-lg bg-[#E21D2B] px-3.5 py-1.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#E21D2B]/90 transition-all shadow-sm shadow-[#E21D2B]/20"
              >
                <span>Sign Up</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-[#737373] hover:bg-[#FFFFFF] hover:text-[#171717] focus:outline-none"
            aria-label="Toggle Navigation Menu"
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
              RideNova Navigation
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#737373]">
              <span className={`h-2 w-2 rounded-full ${apiConnected ? 'bg-[#15803D]' : 'bg-[#B45309]'}`} />
              <span>{apiConnected ? 'API Online' : 'Connecting'}</span>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('home');
              }}
              className="text-left text-sm font-medium text-[#171717] hover:text-[#E21D2B] py-1"
            >
              Overview & Architecture
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('rider');
              }}
              className="text-left text-sm font-medium text-[#171717] hover:text-[#E21D2B] py-1"
            >
              Rider Area
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('driver');
              }}
              className="text-left text-sm font-medium text-[#171717] hover:text-[#E21D2B] py-1"
            >
              Driver Area
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('admin');
              }}
              className="text-left text-sm font-medium text-[#171717] hover:text-[#15803D] py-1"
            >
              Admin Console
            </button>
          </div>

          <div className="pt-3 border-t border-[#E5E5E5]">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#737373]">
                  <span>Signed in as: <strong className="text-[#171717]">{user.name}</strong></span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${roleBadgeColors[user.role]}`}>
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('profile');
                  }}
                  className="w-full text-center rounded-lg border border-[#E5E5E5] py-2 text-xs font-semibold text-[#171717]"
                >
                  Manage Profile
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    onNavigate('home');
                  }}
                  className="w-full text-center rounded-lg border border-[#B91C1C]/30 text-[#B91C1C] py-2 text-xs font-semibold"
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
                  className="rounded-lg border border-[#E5E5E5] py-2 text-xs font-semibold text-[#171717]"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('sign-up');
                  }}
                  className="rounded-lg bg-[#E21D2B] py-2 text-xs font-semibold text-[#FFFFFF]"
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
