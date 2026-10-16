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
import { LandingPage } from './components/LandingPage.tsx';
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
    <div className="min-h-screen bg-[#FFFFFF] text-[#171717] flex flex-col selection:bg-[#E21D2B]/30 selection:text-[#171717]">
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

        {currentRoute === 'home' && <LandingPage onNavigate={handleNavigate} />}
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
