import React, { useState } from 'react';
import { X, Database, Key, ShieldCheck, ListFilter, Copy, Check } from 'lucide-react';

interface SchemaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TableDefinition {
  name: string;
  category: string;
  description: string;
  fields: { name: string; type: string; constraints: string }[];
  indexes: string[];
}

const SCHEMA_DATA: TableDefinition[] = [
  {
    name: 'users',
    category: 'Authentication & Identity',
    description: 'Stores core account profiles. Clerk user ID mapped, roles: rider, driver, admin.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY (gen_random_uuid)' },
      { name: 'clerk_user_id', type: 'VARCHAR(255)', constraints: 'UNIQUE, NOT NULL' },
      { name: 'role', type: 'VARCHAR(50)', constraints: "CHECK (role IN ('rider','driver','admin'))" },
      { name: 'name', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
      { name: 'email', type: 'VARCHAR(255)', constraints: 'UNIQUE, NOT NULL' },
      { name: 'phone', type: 'VARCHAR(50)', constraints: 'NULLABLE' },
      { name: 'profile_image_url', type: 'TEXT', constraints: 'NULLABLE' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT NOW()' },
    ],
    indexes: ['idx_users_clerk_user_id', 'idx_users_role', 'idx_users_email'],
  },
  {
    name: 'drivers',
    category: 'Fleet & Personnel',
    description: 'Driver status lifecycle (pending, approved, suspended, active) and geolocation.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'user_id', type: 'UUID', constraints: 'REFERENCES users(id) ON DELETE CASCADE, UNIQUE' },
      { name: 'license_number', type: 'VARCHAR(100)', constraints: 'NOT NULL' },
      { name: 'vehicle_id', type: 'UUID', constraints: 'REFERENCES vehicles(id)' },
      { name: 'status', type: 'VARCHAR(50)', constraints: "CHECK (status IN ('pending','approved','suspended','active'))" },
      { name: 'is_online', type: 'BOOLEAN', constraints: 'DEFAULT FALSE' },
      { name: 'current_latitude', type: 'DOUBLE PRECISION', constraints: 'NULLABLE' },
      { name: 'current_longitude', type: 'DOUBLE PRECISION', constraints: 'NULLABLE' },
      { name: 'rating', type: 'NUMERIC(3,2)', constraints: 'CHECK (rating >= 1.00 AND <= 5.00)' },
      { name: 'total_rides', type: 'INTEGER', constraints: 'DEFAULT 0, CHECK (>= 0)' },
      { name: 'created_at / updated_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT NOW()' },
    ],
    indexes: ['idx_drivers_user_id', 'idx_drivers_is_online', 'idx_drivers_status', 'idx_drivers_location (lat,lng)'],
  },
  {
    name: 'vehicles',
    category: 'Fleet & Personnel',
    description: 'Registered vehicles: economy, comfort, premium.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'driver_id', type: 'UUID', constraints: 'REFERENCES drivers(id) ON DELETE CASCADE' },
      { name: 'vehicle_type', type: 'VARCHAR(50)', constraints: "CHECK (vehicle_type IN ('economy','comfort','premium'))" },
      { name: 'make', type: 'VARCHAR(100)', constraints: 'NOT NULL' },
      { name: 'model', type: 'VARCHAR(100)', constraints: 'NOT NULL' },
      { name: 'color', type: 'VARCHAR(50)', constraints: 'NOT NULL' },
      { name: 'registration_number', type: 'VARCHAR(100)', constraints: 'UNIQUE, NOT NULL' },
      { name: 'year', type: 'INTEGER', constraints: 'CHECK (year BETWEEN 1990 AND 2050)' },
      { name: 'created_at / updated_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT NOW()' },
    ],
    indexes: ['idx_vehicles_driver_id', 'idx_vehicles_registration'],
  },
  {
    name: 'rides',
    category: 'Core Transportation Engine',
    description: 'Central lifecycle entity: requested, accepted, driver_arriving, driver_arrived, ride_started, ride_completed, cancelled.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'rider_id', type: 'UUID', constraints: 'REFERENCES users(id) ON DELETE RESTRICT' },
      { name: 'driver_id', type: 'UUID', constraints: 'REFERENCES drivers(id) ON DELETE SET NULL' },
      { name: 'pickup_address, pickup_lat, pickup_lng', type: 'TEXT, DOUBLE', constraints: 'NOT NULL' },
      { name: 'destination_address, dest_lat, dest_lng', type: 'TEXT, DOUBLE', constraints: 'NOT NULL' },
      { name: 'distance_km, estimated_duration_minutes', type: 'NUMERIC, INT', constraints: 'CHECK (>= 0)' },
      { name: 'estimated_fare, final_fare', type: 'NUMERIC(10,2)', constraints: 'CHECK (>= 0)' },
      { name: 'ride_type', type: 'VARCHAR(50)', constraints: "CHECK (ride_type IN ('economy','comfort','premium'))" },
      { name: 'status', type: 'VARCHAR(50)', constraints: 'CHECK (status IN requested...cancelled)' },
      { name: 'requested_at, accepted_at, started_at, completed_at, cancelled_at', type: 'TIMESTAMPTZ', constraints: 'Lifecycle timestamps' },
      { name: 'cancellation_reason', type: 'TEXT', constraints: 'NULLABLE' },
    ],
    indexes: ['idx_rides_rider_id', 'idx_rides_driver_id', 'idx_rides_status', 'idx_rides_created_at'],
  },
  {
    name: 'ride_stops',
    category: 'Core Transportation Engine',
    description: 'Multi-stop waypoint support per PDF requirement.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'ride_id', type: 'UUID', constraints: 'REFERENCES rides(id) ON DELETE CASCADE' },
      { name: 'stop_order', type: 'INTEGER', constraints: 'CHECK (stop_order >= 1)' },
      { name: 'address, latitude, longitude', type: 'TEXT, DOUBLE', constraints: 'NOT NULL' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT NOW()' },
    ],
    indexes: ['idx_ride_stops_ride_id', 'uq_ride_stop_order (ride_id, stop_order UNIQUE)'],
  },
  {
    name: 'payments',
    category: 'Billing & Transactions',
    description: 'Financial transactions linked to rides and Stripe payment intents.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'ride_id', type: 'UUID', constraints: 'REFERENCES rides(id) ON DELETE RESTRICT' },
      { name: 'rider_id', type: 'UUID', constraints: 'REFERENCES users(id) ON DELETE RESTRICT' },
      { name: 'amount', type: 'NUMERIC(10,2)', constraints: 'CHECK (amount >= 0)' },
      { name: 'currency', type: 'VARCHAR(10)', constraints: "DEFAULT 'USD'" },
      { name: 'payment_method', type: 'VARCHAR(50)', constraints: "DEFAULT 'card'" },
      { name: 'stripe_payment_intent_id', type: 'VARCHAR(255)', constraints: 'UNIQUE' },
      { name: 'status', type: 'VARCHAR(50)', constraints: "CHECK (status IN ('pending','processing','succeeded','failed','refunded'))" },
      { name: 'paid_at', type: 'TIMESTAMPTZ', constraints: 'NULLABLE' },
    ],
    indexes: ['idx_payments_ride_id', 'idx_payments_rider_id', 'idx_payments_status', 'idx_payments_stripe_intent'],
  },
  {
    name: 'driver_earnings',
    category: 'Billing & Transactions',
    description: 'Gross fare, platform fee deduction, and net driver payout calculation.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'driver_id', type: 'UUID', constraints: 'REFERENCES drivers(id) ON DELETE CASCADE' },
      { name: 'ride_id', type: 'UUID', constraints: 'REFERENCES rides(id) ON DELETE CASCADE' },
      { name: 'gross_amount, platform_fee, driver_amount', type: 'NUMERIC(10,2)', constraints: 'CHECK (>= 0)' },
      { name: 'currency', type: 'VARCHAR(10)', constraints: "DEFAULT 'USD'" },
      { name: 'status', type: 'VARCHAR(50)', constraints: "CHECK (status IN ('pending','processed','paid','withheld'))" },
    ],
    indexes: ['idx_driver_earnings_driver_id', 'idx_driver_earnings_ride_id'],
  },
  {
    name: 'reviews',
    category: 'Quality & Trust',
    description: '1-5 star feedback with optional comment per completed ride.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'ride_id', type: 'UUID', constraints: 'REFERENCES rides(id) ON DELETE CASCADE' },
      { name: 'rider_id', type: 'UUID', constraints: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'driver_id', type: 'UUID', constraints: 'REFERENCES drivers(id) ON DELETE CASCADE' },
      { name: 'rating', type: 'INTEGER', constraints: 'CHECK (rating BETWEEN 1 AND 5)' },
      { name: 'comment', type: 'TEXT', constraints: 'NULLABLE' },
    ],
    indexes: ['idx_reviews_driver_id', 'idx_reviews_ride_id', 'uq_ride_rider_review (UNIQUE)'],
  },
  {
    name: 'promo_codes',
    category: 'Growth & Incentives',
    description: 'Discounts (percentage/fixed) with validity window and usage quotas.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'code', type: 'VARCHAR(50)', constraints: 'UNIQUE, NOT NULL' },
      { name: 'discount_type', type: 'VARCHAR(50)', constraints: "CHECK (discount_type IN ('percentage','fixed'))" },
      { name: 'discount_value', type: 'NUMERIC(10,2)', constraints: 'CHECK (discount_value > 0)' },
      { name: 'minimum_fare, maximum_discount', type: 'NUMERIC(10,2)', constraints: 'CHECK (>= 0)' },
      { name: 'usage_limit, used_count', type: 'INTEGER', constraints: 'Quotas' },
      { name: 'starts_at, expires_at', type: 'TIMESTAMPTZ', constraints: 'Validity window' },
      { name: 'is_active', type: 'BOOLEAN', constraints: 'DEFAULT TRUE' },
    ],
    indexes: ['idx_promo_codes_code', 'idx_promo_codes_is_active'],
  },
  {
    name: 'notifications',
    category: 'Engagement & Alerts',
    description: 'User push/in-app alert queue with read state tracking.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'user_id', type: 'UUID', constraints: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'type, title', type: 'VARCHAR', constraints: 'NOT NULL' },
      { name: 'message', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'is_read', type: 'BOOLEAN', constraints: 'DEFAULT FALSE' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT NOW()' },
    ],
    indexes: ['idx_notifications_user_id', 'idx_notifications_is_read'],
  },
  {
    name: 'support_tickets',
    category: 'Safety & Grievance',
    description: 'Customer support tickets across payment, ride, driver, lost item, technical, or other.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'user_id', type: 'UUID', constraints: 'REFERENCES users(id) ON DELETE CASCADE' },
      { name: 'category', type: 'VARCHAR(50)', constraints: "CHECK (category IN ('payment','ride','driver','lost_item','technical','other'))" },
      { name: 'subject', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
      { name: 'description', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'status', type: 'VARCHAR(50)', constraints: "CHECK (status IN ('open','in_progress','resolved','closed'))" },
      { name: 'priority', type: 'VARCHAR(50)', constraints: "CHECK (priority IN ('low','medium','high','urgent'))" },
      { name: 'created_at / updated_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT NOW()' },
    ],
    indexes: ['idx_support_tickets_user_id', 'idx_support_tickets_status', 'idx_support_tickets_category'],
  },
];

export const SchemaViewerModal: React.FC<SchemaViewerModalProps> = ({ isOpen, onClose }) => {
  const [selectedTable, setSelectedTable] = useState<string>(SCHEMA_DATA[0].name);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const current = SCHEMA_DATA.find((t) => t.name === selectedTable) || SCHEMA_DATA[0];

  const handleCopySqlRef = () => {
    navigator.clipboard.writeText(`-- Table: ${current.name}\n-- See backend/src/db/migrations/001_initial_schema.sql`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4 bg-[#FFFFFF]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E21D2B]/10 text-[#E21D2B]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#171717]">
                Supabase PostgreSQL Schema Reference
              </h3>
              <p className="text-xs text-[#737373]">
                All 11 Core Models Defined for Step 1 · Migration 001_initial_schema.sql
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#737373] hover:bg-[#E5E5E5] hover:text-[#171717] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Table Selector Sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#E5E5E5] bg-[#FFFFFF]/50 p-3 overflow-y-auto max-h-48 md:max-h-full">
            <span className="block px-3 py-2 text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
              Tables (11 Required)
            </span>
            <div className="space-y-1">
              {SCHEMA_DATA.map((t, idx) => (
                <button
                  key={t.name}
                  onClick={() => setSelectedTable(t.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                    selectedTable === t.name
                      ? 'bg-[#E21D2B]/15 text-[#E21D2B] font-semibold border border-[#E21D2B]/30'
                      : 'text-[#737373] hover:bg-[#E5E5E5]/40 hover:text-[#171717]'
                  }`}
                >
                  <span className="font-mono">{t.name}</span>
                  <span className="text-[10px] text-[#737373]">{idx + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table Details */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E5E5]">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-mono font-bold text-[#E21D2B]">{current.name}</h4>
                  <span className="text-xs text-[#737373]">·</span>
                  <span className="text-xs text-[#737373]">{current.category}</span>
                </div>
                <p className="mt-1 text-xs text-[#737373]">{current.description}</p>
              </div>

              <button
                onClick={handleCopySqlRef}
                className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#737373] hover:text-[#171717]"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#15803D]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'SQL Ref'}</span>
              </button>
            </div>

            {/* Field Definitions Table */}
            <div>
              <h5 className="text-xs font-semibold text-[#171717] mb-2.5 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-[#E21D2B]" />
                Column Definitions & Constraints
              </h5>
              <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] bg-[#FFFFFF]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E5E5E5] bg-[#FFFFFF] text-[11px] text-[#737373]">
                    <tr>
                      <th className="px-3.5 py-2.5 font-semibold">Column</th>
                      <th className="px-3.5 py-2.5 font-semibold">Type</th>
                      <th className="px-3.5 py-2.5 font-semibold">Constraints / Rules</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]/60 font-mono">
                    {current.fields.map((f) => (
                      <tr key={f.name} className="hover:bg-[#E5E5E5]/20">
                        <td className="px-3.5 py-2 text-[#171717] font-medium">{f.name}</td>
                        <td className="px-3.5 py-2 text-[#E21D2B]">{f.type}</td>
                        <td className="px-3.5 py-2 text-[#737373] font-sans text-[11px]">{f.constraints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Indexes */}
            <div>
              <h5 className="text-xs font-semibold text-[#171717] mb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#15803D]" />
                Indexes Enforced
              </h5>
              <div className="flex flex-wrap gap-2">
                {current.indexes.map((idx) => (
                  <span
                    key={idx}
                    className="font-mono text-[11px] text-[#737373] bg-[#FFFFFF] px-2.5 py-1 rounded border border-[#E5E5E5]"
                  >
                    {idx}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[#E5E5E5] px-6 py-3 bg-[#FFFFFF] text-xs text-[#737373]">
          <span>Migration file: <code>backend/src/db/migrations/001_initial_schema.sql</code></span>
          <button
            onClick={onClose}
            className="rounded-lg bg-[#E5E5E5] px-4 py-1.5 text-xs font-semibold text-[#171717] hover:bg-[#E5E5E5]/80"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
