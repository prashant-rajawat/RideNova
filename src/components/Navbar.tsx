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
    rider: 'bg-[#00C2FF]/15 text-[#00C2FF] border-[#00C2FF]/30',
    driver: 'bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30',
    admin: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1E334D] bg-[#07111F]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single text wordmark brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="group flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#00C2FF] to-[#0EA5E9] text-[#07111F] font-black text-lg shadow-sm">
              RN
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-[#E5F2FF] group-hover:text-[#00C2FF] transition-colors">
                RideNova
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#8FA6BF]">
          <button
            onClick={() => onNavigate('home')}
            className={`hover:text-[#E5F2FF] transition-colors whitespace-nowrap ${currentRoute === 'home' ? 'text-[#00C2FF] font-semibold' : ''}`}
          >
            Overview
          </button>

          {/* Direct Role Dashboard Links for testing Step 2 */}
          <button
            onClick={() => onNavigate('rider')}
            className={`hover:text-[#E5F2FF] transition-colors whitespace-nowrap ${currentRoute === 'rider' ? 'text-[#00C2FF] font-semibold' : ''}`}
          >
            Rider
          </button>
          <button
            onClick={() => onNavigate('driver')}
            className={`hover:text-[#E5F2FF] transition-colors whitespace-nowrap ${currentRoute === 'driver' ? 'text-[#0EA5E9] font-semibold' : ''}`}
          >
            Driver
          </button>
          <button
            onClick={() => onNavigate('admin')}
            className={`hover:text-[#E5F2FF] transition-colors whitespace-nowrap ${currentRoute === 'admin' ? 'text-[#22C55E] font-semibold' : ''}`}
          >
            Admin
          </button>

          <button
            onClick={() => handleNavClick('system-health')}
            className="hover:text-[#E5F2FF] transition-colors whitespace-nowrap"
          >
            API & Diagnostics
          </button>
        </nav>

        {/* Zone 3: Authentication Actions & Status */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#8FA6BF] border border-[#1E334D] rounded-lg px-2.5 py-1.5 bg-[#0F1C2E]">
            <span
              className={`h-2 w-2 rounded-full ${
                apiConnected ? 'bg-[#22C55E] ring-2 ring-[#22C55E]/20' : 'bg-[#F59E0B] ring-2 ring-[#F59E0B]/20'
              }`}
            />
            <span className="text-[11px]">{apiConnected ? 'API Online' : 'Connecting'}</span>
          </div>

          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-lg border border-[#1E334D] bg-[#0F1C2E] px-3 py-1.5 text-xs text-[#E5F2FF] hover:border-[#00C2FF] transition-all"
              >
                <div className="h-5 w-5 rounded-full bg-[#1E334D] flex items-center justify-center font-bold text-[10px] text-[#00C2FF]">
                  {user.name.charAt(0)}
                </div>
                <span className="font-medium max-w-[100px] truncate">{user.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${roleBadgeColors[user.role]}`}
                >
                  {user.role}
                </span>
                <ChevronDown className="h-3 w-3 text-[#8FA6BF]" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[#1E334D] bg-[#0F1C2E] p-2 shadow-2xl z-50 animate-fade-in">
                  <div className="px-3 py-2 border-b border-[#1E334D] text-xs">
                    <p className="font-semibold text-[#E5F2FF] truncate">{user.name}</p>
                    <p className="text-[11px] text-[#8FA6BF] truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate(getDashboardRoute());
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#E5F2FF] hover:bg-[#1E334D] rounded-md transition-colors"
                    >
                      My Dashboard ({user.role})
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('profile');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#E5F2FF] hover:bg-[#1E334D] rounded-md transition-colors"
                    >
                      View Profile
                    </button>
                  </div>
                  <div className="pt-1 border-t border-[#1E334D]">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                        onNavigate('home');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 rounded-md transition-colors flex items-center gap-1.5"
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
                className="rounded-lg border border-[#1E334D] bg-[#0F1C2E] px-3.5 py-1.5 text-xs font-semibold text-[#E5F2FF] hover:border-[#00C2FF] hover:text-[#00C2FF] transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('sign-up')}
                className="flex items-center gap-1.5 rounded-lg bg-[#00C2FF] px-3.5 py-1.5 text-xs font-semibold text-[#07111F] hover:bg-[#00C2FF]/90 transition-all shadow-sm shadow-[#00C2FF]/20"
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
            className="rounded-lg p-2 text-[#8FA6BF] hover:bg-[#0F1C2E] hover:text-[#E5F2FF] focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-[#1E334D] bg-[#0F1C2E] px-4 py-5 sm:hidden space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E334D]">
            <span className="text-xs font-semibold text-[#8FA6BF] uppercase tracking-wider">
              RideNova Navigation
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#8FA6BF]">
              <span className={`h-2 w-2 rounded-full ${apiConnected ? 'bg-[#22C55E]' : 'bg-[#F59E0B]'}`} />
              <span>{apiConnected ? 'API Online' : 'Connecting'}</span>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('home');
              }}
              className="text-left text-sm font-medium text-[#E5F2FF] hover:text-[#00C2FF] py-1"
            >
              Overview & Architecture
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('rider');
              }}
              className="text-left text-sm font-medium text-[#E5F2FF] hover:text-[#00C2FF] py-1"
            >
              Rider Area
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('driver');
              }}
              className="text-left text-sm font-medium text-[#E5F2FF] hover:text-[#0EA5E9] py-1"
            >
              Driver Area
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('admin');
              }}
              className="text-left text-sm font-medium text-[#E5F2FF] hover:text-[#22C55E] py-1"
            >
              Admin Console
            </button>
          </div>

          <div className="pt-3 border-t border-[#1E334D]">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#8FA6BF]">
                  <span>Signed in as: <strong className="text-[#E5F2FF]">{user.name}</strong></span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${roleBadgeColors[user.role]}`}>
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('profile');
                  }}
                  className="w-full text-center rounded-lg border border-[#1E334D] py-2 text-xs font-semibold text-[#E5F2FF]"
                >
                  Manage Profile
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    onNavigate('home');
                  }}
                  className="w-full text-center rounded-lg border border-[#EF4444]/30 text-[#EF4444] py-2 text-xs font-semibold"
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
                  className="rounded-lg border border-[#1E334D] py-2 text-xs font-semibold text-[#E5F2FF]"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('sign-up');
                  }}
                  className="rounded-lg bg-[#00C2FF] py-2 text-xs font-semibold text-[#07111F]"
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
