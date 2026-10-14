/**
 * RideNova — Full-Stack Cab Booking Platform
 * Step 1: Project Foundation, Architecture & Database Foundation (Completed)
 * Step 2: Clerk Authentication + Rider / Driver / Admin Role System (Completed)
 * Step 3: Google Maps + Route Planning + Fare Estimation + Ride Booking (Completed)
 */

import React, { useState } from 'react';
import {
  Car,
  Shield,
  Database,
  Server,
  Key,
  Layers,
  ArrowRight,
  CheckCircle,
  FileCode,
  Terminal,
  Lock,
  UserCheck,
  MapPin,
  Navigation,
} from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { HealthWidget } from './components/HealthWidget.tsx';
import { ArchitectureOverview } from './components/ArchitectureOverview.tsx';
import { SchemaViewerModal } from './components/SchemaViewerModal.tsx';
import { RoadmapCard } from './components/RoadmapCard.tsx';
import { SignInPage } from './components/auth/SignInPage.tsx';
import { SignUpPage } from './components/auth/SignUpPage.tsx';
import { RiderDashboard } from './components/dashboards/RiderDashboard.tsx';
import { DriverDashboard } from './components/dashboards/DriverDashboard.tsx';
import { AdminDashboard } from './components/dashboards/AdminDashboard.tsx';
import { ProfilePage } from './components/profile/ProfilePage.tsx';
import { AccessDeniedPage } from './components/auth/AccessDeniedPage.tsx';
import { AuthTestingPanel } from './components/auth/AuthTestingPanel.tsx';
import { BookingPage } from './components/booking/BookingPage.tsx';
import { useHealth } from './hooks/useHealth.ts';
import { useAuthSession } from './context/AuthContext.tsx';

export default function App() {
  const health = useHealth();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthSession();
  const [currentRoute, setCurrentRoute] = useState<string>('home');
  const [attemptedRole, setAttemptedRole] = useState<string>('');
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /**
   * Safe Route Navigation with Role Guards
   */
  const handleNavigate = (targetRoute: string) => {
    // 1. Rider Route Guard
    if (targetRoute === 'rider') {
      if (!isAuthenticated) {
        setCurrentRoute('sign-in');
        return;
      }
      if (user?.role !== 'rider' && user?.role !== 'admin') {
        setAttemptedRole('rider');
        setCurrentRoute('access-denied');
        return;
      }
      setCurrentRoute('rider');
      return;
    }

    // 2. Book Ride Route Guard (Rider only)
    if (targetRoute === 'book-ride') {
      if (!isAuthenticated) {
        setCurrentRoute('sign-in');
        return;
      }
      if (user?.role !== 'rider' && user?.role !== 'admin') {
        setAttemptedRole('rider');
        setCurrentRoute('access-denied');
        return;
      }
      setCurrentRoute('book-ride');
      return;
    }

    // 3. Driver Route Guard
    if (targetRoute === 'driver') {
      if (!isAuthenticated) {
        setCurrentRoute('sign-in');
        return;
      }
      if (user?.role !== 'driver' && user?.role !== 'admin') {
        setAttemptedRole('driver');
        setCurrentRoute('access-denied');
        return;
      }
      setCurrentRoute('driver');
      return;
    }

    // 4. Admin Route Guard
    if (targetRoute === 'admin') {
      if (!isAuthenticated) {
        setCurrentRoute('sign-in');
        return;
      }
      if (user?.role !== 'admin') {
        setAttemptedRole('admin');
        setCurrentRoute('access-denied');
        return;
      }
      setCurrentRoute('admin');
      return;
    }

    // 5. Profile Route Guard
    if (targetRoute === 'profile') {
      if (!isAuthenticated) {
        setCurrentRoute('sign-in');
        return;
      }
      setCurrentRoute('profile');
      return;
    }

    // Default routes
    setCurrentRoute(targetRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const coreTablesSummary = [
    { name: 'users', role: 'Riders, Drivers & Admins profile mapping (Clerk)', count: '9 fields', pKey: 'UUID' },
    { name: 'drivers', role: 'Driver verification, status & geolocation', count: '11 fields', pKey: 'UUID' },
    { name: 'vehicles', role: 'Economy, Comfort & Premium fleet records', count: '9 fields', pKey: 'UUID' },
    { name: 'rides', role: 'Core lifecycle, multi-status & fare tracking', count: '22 fields', pKey: 'UUID' },
    { name: 'ride_stops', role: 'Multi-stop waypoints ordering & coordinates', count: '7 fields', pKey: 'UUID' },
    { name: 'payments', role: 'Stripe Payment Intents & transaction status', count: '11 fields', pKey: 'UUID' },
    { name: 'driver_earnings', role: 'Gross fare, platform fee split & net payouts', count: '9 fields', pKey: 'UUID' },
    { name: 'reviews', role: '1-5 star driver feedback & review comments', count: '8 fields', pKey: 'UUID' },
    { name: 'promo_codes', role: 'Discount vouchers, caps & usage limits', count: '12 fields', pKey: 'UUID' },
    { name: 'notifications', role: 'In-app and push notification queue', count: '7 fields', pKey: 'UUID' },
    { name: 'support_tickets', role: 'Grievance ticketing across 6 categories', count: '9 fields', pKey: 'UUID' },
  ];

  return (
    <div className="min-h-screen bg-[#07111F] text-[#E5F2FF] flex flex-col selection:bg-[#00C2FF]/30 selection:text-[#E5F2FF]">
      {/* Navigation Top Bar */}
      <Navbar
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onOpenSchema={() => setIsSchemaModalOpen(true)}
        onScrollToSection={scrollToSection}
        apiConnected={Boolean(health.apiHealth?.success)}
      />

      <main className="flex-1">
        {/* Route Views */}
        {currentRoute === 'sign-in' && <SignInPage onNavigate={handleNavigate} />}

        {currentRoute === 'sign-up' && <SignUpPage onNavigate={handleNavigate} />}

        {currentRoute === 'book-ride' && <BookingPage onNavigate={handleNavigate} />}

        {currentRoute === 'rider' && <RiderDashboard onNavigate={handleNavigate} />}

        {currentRoute === 'driver' && <DriverDashboard onNavigate={handleNavigate} />}

        {currentRoute === 'admin' && <AdminDashboard onNavigate={handleNavigate} />}

        {currentRoute === 'profile' && <ProfilePage onNavigate={handleNavigate} />}

        {currentRoute === 'access-denied' && (
          <AccessDeniedPage attemptedRole={attemptedRole} onNavigate={handleNavigate} />
        )}

        {/* Home / Overview View */}
        {currentRoute === 'home' && (
          <>
            {/* Hero Section */}
            <section id="hero" className="relative overflow-hidden border-b border-[#1E334D] py-16 sm:py-24">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-[#00C2FF]/10 via-[#0EA5E9]/5 to-transparent blur-3xl pointer-events-none -z-10" />

              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#00C2FF] mb-4 tracking-wide uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00C2FF] animate-pulse"></span>
                    Step 4 Active · Driver Dashboard + Realtime Requests + Secure Assignment
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#E5F2FF] leading-[1.15]">
                    RideNova
                  </h1>

                  <p className="mt-3 text-xl sm:text-2xl font-medium text-[#0EA5E9]">
                    Your ride. Your route. Your time.
                  </p>

                  <p className="mt-4 text-base sm:text-lg text-[#8FA6BF] leading-relaxed">
                    Full-stack cab and ride-booking platform. Step 4 connects rider bookings with driver dispatch: live availability toggling, incoming request queue with earnings calculations, atomic race-condition safe driver assignment, and trip lifecycle execution.
                  </p>

                  {/* Action Buttons */}
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <button
                      onClick={() => handleNavigate('book-ride')}
                      className="flex items-center gap-2.5 rounded-lg bg-[#00C2FF] px-5 py-3 text-sm font-semibold text-[#07111F] shadow-lg shadow-[#00C2FF]/20 hover:bg-[#00C2FF]/90 transition-all active:scale-95"
                    >
                      <Navigation className="h-4 w-4" />
                      <span>Book a Ride (Rider)</span>
                    </button>

                    <button
                      onClick={() => handleNavigate('driver')}
                      className="flex items-center gap-2 rounded-lg border border-[#0EA5E9]/50 bg-[#0EA5E9]/10 px-5 py-3 text-sm font-semibold text-[#00C2FF] hover:bg-[#0EA5E9]/20 transition-all"
                    >
                      <Car className="h-4 w-4" />
                      <span>Driver Dashboard (Step 4)</span>
                    </button>

                    <button
                      onClick={() => scrollToSection('auth-testing')}
                      className="flex items-center gap-2 text-sm font-medium text-[#8FA6BF] hover:text-[#E5F2FF] px-2 py-3 transition-colors"
                    >
                      <Lock className="h-4 w-4" />
                      <span>Security & Role Tests</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Highlights */}
                  <div className="mt-10 pt-6 border-t border-[#1E334D]/80 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#8FA6BF]">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-[#22C55E]" />
                      <span>Multi-Stop Waypoints (Max 3)</span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-[#22C55E]" />
                      <span>Dynamic Tiered Fare Engine</span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-[#22C55E]" />
                      <span>Status: requested (No Fake Driver)</span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-[#22C55E]" />
                      <span>Duplicate Click Protection</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Step 2 & 3 Interactive Role & Route Testing Suite */}
            <section id="auth-testing" className="py-12 sm:py-16">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <AuthTestingPanel />
              </div>
            </section>

            {/* Section 1: System Health Diagnostics */}
            <section id="system-health" className="py-12 sm:py-16 bg-[#07111F]">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <HealthWidget health={health} />
              </div>
            </section>

            {/* Section 2: Architecture & Tier Boundaries */}
            <section id="architecture" className="py-12 sm:py-16">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <ArchitectureOverview />
              </div>
            </section>

            {/* Section 3: Database Schema Foundation */}
            <section id="database" className="py-12 sm:py-16 bg-[#07111F]">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="rounded-xl border border-[#1E334D] bg-[#0F1C2E] p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#1E334D]">
                    <div>
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-[#00C2FF]" />
                        <h2 className="text-xl font-bold tracking-tight text-[#E5F2FF]">
                          Database Foundation (11 Core Tables)
                        </h2>
                      </div>
                      <p className="mt-1 text-xs text-[#8FA6BF]">
                        PostgreSQL tables with UUID primary keys, clerk_user_id unique indexing, and rides table storing live requests.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsSchemaModalOpen(true)}
                      className="flex items-center gap-2 rounded-lg bg-[#00C2FF] px-4 py-2 text-xs font-semibold text-[#07111F] hover:bg-[#00C2FF]/90 transition-colors"
                    >
                      <FileCode className="h-3.5 w-3.5" />
                      <span>View SQL Migration Details</span>
                    </button>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {coreTablesSummary.map((tbl, i) => (
                      <div
                        key={tbl.name}
                        onClick={() => setIsSchemaModalOpen(true)}
                        className="group cursor-pointer rounded-lg border border-[#1E334D] bg-[#07111F] p-4 transition-all hover:border-[#00C2FF]/50 hover:bg-[#07111F]/80"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-[#1E334D]/60">
                          <span className="font-mono text-xs font-bold text-[#00C2FF] group-hover:text-[#E5F2FF]">
                            {tbl.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#8FA6BF]">
                            #{String(i + 1).padStart(2, '0')}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-[#8FA6BF] leading-relaxed min-h-[36px]">
                          {tbl.role}
                        </p>

                        <div className="mt-3 pt-2 border-t border-[#1E334D]/40 flex items-center justify-between text-[11px]">
                          <span className="text-[#8FA6BF] font-mono">{tbl.count}</span>
                          <span className="text-[#0EA5E9] font-mono">{tbl.pKey} PK</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Project Roadmap */}
            <section id="roadmap" className="py-12 sm:py-16">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <RoadmapCard />
              </div>
            </section>
          </>
        )}
      </main>

      {/* Schema Inspector Modal */}
      <SchemaViewerModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
