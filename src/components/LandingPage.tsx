import React from 'react';
import { Navigation, Shield, Car, ArrowRight } from 'lucide-react';

export const LandingPage = ({ onNavigate }: { onNavigate: (route: string) => void }) => {
  return (
    <div className="flex flex-col min-h-screen bg-white text-brand-text">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <img
          src="/src/assets/images/hero_ridenova_landing_1792059996556.jpg"
          alt="Premium electric cab in a modern city at dusk"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent" />
        
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.1]">
            Ride smarter, <span className="text-brand-primary">go further.</span>
          </h1>
          <p className="mt-6 text-xl md:text-2xl text-brand-muted font-medium max-w-2xl mx-auto">
            Experience premium, reliable, and sustainable cab services powered by RideNova.
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <button
              onClick={() => onNavigate('book-ride')}
              className="flex items-center gap-2 bg-brand-primary text-white font-semibold px-8 py-4 rounded-lg hover:bg-brand-primary-dark transition-all text-lg"
            >
              Book Your Ride <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => onNavigate('sign-up')}
              className="bg-white border border-brand-border text-brand-text font-semibold px-8 py-4 rounded-lg hover:bg-brand-secondary transition-all text-lg"
            >
              Join as Driver
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">Why choose RideNova?</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <div className="p-8 border border-brand-border rounded-xl bg-white shadow-sm">
              <Car className="h-10 w-10 text-brand-primary mb-6" />
              <h3 className="text-xl font-semibold mb-3">Premium Fleet</h3>
              <p className="text-brand-muted">Modern, maintained electric vehicles ensuring comfort and sustainability on every trip.</p>
            </div>
            <div className="p-8 border border-brand-border rounded-xl bg-white shadow-sm">
              <Shield className="h-10 w-10 text-brand-primary mb-6" />
              <h3 className="text-xl font-semibold mb-3">Safe & Verified</h3>
              <p className="text-brand-muted">Real-time driver tracking, secure payments, and background-verified professionals for your peace of mind.</p>
            </div>
            <div className="p-8 border border-brand-border rounded-xl bg-white shadow-sm">
              <Navigation className="h-10 w-10 text-brand-primary mb-6" />
              <h3 className="text-xl font-semibold mb-3">Reliable Timing</h3>
              <p className="text-brand-muted">Optimized routing engine ensures accurate ETAs and on-time arrivals, every time.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
