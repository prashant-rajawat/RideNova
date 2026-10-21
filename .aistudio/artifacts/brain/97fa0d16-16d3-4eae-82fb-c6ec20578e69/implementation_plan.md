# Scheduled Advance Ride Booking System

RideNova will implement a premium Scheduled Advance Booking system, allowing customers to reserve rides up to 90 days in advance with 100% upfront payment and manual administrative review before dispatch.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions have been confirmed by the user in Phase 1:
- **Advance Payment Policy**: Customers must pay 100% of the estimated fare at the time of booking.
- **Approval Workflow**: Every scheduled booking requires manual administrative approval after payment.
- **Cancellation Policy**: Fees will be calculated as a percentage of the estimated fare.

## 1. Overview & Core Concept
- **What It Does**: Enables "Schedule a Ride" functionality separate from "Ride Now".
- **Target Audience**: Customers planning rides (e.g., airport trips, meetings).
- **Key Value**: Provides booking reliability, secures upfront fare, and adds an admin check layer for quality control.

## 2. User Experience & Visual Design
- **Booking Flow**: A clean toggle between "Ride Now" and "Schedule a Ride". The scheduling flow guides the user through Date/Time selection, Route, Fare Review, 100% Payment, and Status tracking.
- **Admin Dashboard**: A new "Scheduled Bookings" queue with status filters (Awaiting Payment, Awaiting Approval, Approved, etc.).
- **Visuals**: Maintain the white/red/black theme. Use distinct status badges (e.g., "Pending Review", "Approved", "Driver Assigned").

## 3. Key Product Decisions & Trade-Offs
- **Decision 1: Admin Approval Queue**: Manual review for *all* scheduled bookings.
  - *Chosen Approach*: State machine: `BOOKED` -> `PAID` -> `PENDING_REVIEW` -> `APPROVED` -> `DISPATCH`.
  - *Why*: Ensures high service quality and prevents dispatcher overloading for invalid trips.
- **Decision 2: 100% Upfront Payment**:
  - *Chosen Approach*: Immediate Stripe capture at booking completion.
  - *Why*: Secures booking and simplifies subsequent settlement.

## 4. Technical Architecture & Data Strategy

```
┌─────────────────┐       ┌─────────────────┐
│ Customer UI     │ ◄───► │ API Proxy       │
└─────────────────┘       └────────┬────────┘
                                   │
┌─────────────────┐       ┌────────▼────────┐       ┌─────────────────┐
│ Driver UI       │ ◄───► │ Ride Services   │ ◄───► │ PostgreSQL DB   │
└─────────────────┘       └────────┬────────┘       └─────────────────┘
                                   │
┌─────────────────┐       ┌────────▼────────┐
│ Admin UI        │ ◄───► │ Scheduler / Cron│
└─────────────────┘       └────────┬────────┘
```

- **Data Model**: Extend `rides` table with `scheduled_at`, `booking_mode` ('on-demand' | 'scheduled'), `payment_status`, `admin_review_status`, and `reviewed_at`.
- **Background Scheduler**: A server-side cron service checks for upcoming `APPROVED_AWAITING_DRIVER` bookings to trigger assignment within the dispatch window.
- **Realtime**: Use existing Socket.io/polling to update status across all dashboards.
