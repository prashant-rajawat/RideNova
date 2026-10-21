/**
 * RideNova — Full-Stack Cab Booking Platform
 * Step 1: Project Foundation, Architecture & Database Foundation (Completed)
 * Step 2: Clerk Authentication + Rider / Driver / Admin Role System (Completed)
 * Step 3: Google Maps + Route Planning + Fare Estimation + Ride Booking (Completed)
 */

import React, { useState, useEffect } from 'react';
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
import { ParcelBookingPage } from './components/parcel/ParcelBookingPage.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { SplashScreen } from './components/auth/SplashScreen.tsx';
import { useHealth } from './hooks/useHealth.ts';
import { useAuthSession } from './context/AuthContext.tsx';

export default function App() {
  const health = useHealth();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthSession();
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    try {
      return sessionStorage.getItem('ridenova_route') || 'home';
    } catch {
      return 'home';
    }
  });
  const [attemptedRole, setAttemptedRole] = useState<string>('');
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      if (['home', 'sign-in', 'sign-up'].includes(currentRoute)) {
        handleNavigate(user?.role === 'admin' ? 'admin' : user?.role === 'driver' ? 'driver' : 'rider');
      }
    } else {
      if (['home', 'admin', 'driver', 'rider', 'book-ride', 'profile'].includes(currentRoute)) {
        handleNavigate('sign-in');
      }
    }
  }, [isAuthenticated, authLoading, currentRoute]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigate = (targetRoute: string) => {
    try {
      sessionStorage.setItem('ridenova_route', targetRoute);
    } catch {
      // ignore storage errors
    }
    setCurrentRoute(targetRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authLoading) {
    return <SplashScreen />;
  }

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
        {/* Public Routes */}
        {currentRoute === 'home' && <LandingPage onNavigate={handleNavigate} />}
        {currentRoute === 'sign-in' && <SignInPage onNavigate={handleNavigate} />}
        {currentRoute === 'sign-up' && <SignUpPage onNavigate={handleNavigate} />}
        
        {/* Protected Admin Route */}
        {currentRoute === 'admin' && (
          !isAuthenticated ? (
            <SignInPage onNavigate={handleNavigate} />
          ) : user?.role !== 'admin' ? (
            <AccessDeniedPage attemptedRole="admin" onNavigate={handleNavigate} />
          ) : (
            <AdminDashboard onNavigate={handleNavigate} />
          )
        )}

        {/* Protected Driver Route */}
        {currentRoute === 'driver' && (
          !isAuthenticated ? (
            <SignInPage onNavigate={handleNavigate} />
          ) : user?.role !== 'driver' && user?.role !== 'admin' ? (
            <AccessDeniedPage attemptedRole="driver" onNavigate={handleNavigate} />
          ) : (
            <DriverDashboard onNavigate={handleNavigate} />
          )
        )}

        {/* Protected Rider / Customer Route */}
        {currentRoute === 'rider' && (
          !isAuthenticated ? (
            <SignInPage onNavigate={handleNavigate} />
          ) : (
            <RiderDashboard onNavigate={handleNavigate} />
          )
        )}

        {/* Protected Booking Route */}
        {currentRoute === 'book-ride' && (
          !isAuthenticated ? (
            <SignInPage onNavigate={handleNavigate} />
          ) : (
            <BookingPage onNavigate={handleNavigate} />
          )
        )}

        {/* Protected Parcel Booking Route */}
        {currentRoute === 'book-parcel' && (
          !isAuthenticated ? (
            <SignInPage onNavigate={handleNavigate} />
          ) : (
            <ParcelBookingPage onNavigate={handleNavigate} />
          )
        )}

        {/* Protected Profile Route */}
        {currentRoute === 'profile' && (
          !isAuthenticated ? (
            <SignInPage onNavigate={handleNavigate} />
          ) : (
            <ProfilePage onNavigate={handleNavigate} />
          )
        )}

        {currentRoute === 'access-denied' && (
          <AccessDeniedPage attemptedRole={attemptedRole || 'restricted'} onNavigate={handleNavigate} />
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


