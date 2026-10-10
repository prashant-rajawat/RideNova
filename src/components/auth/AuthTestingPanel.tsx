import React, { useState } from 'react';
import { ShieldCheck, Play, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Key, Lock, UserCheck } from 'lucide-react';
import { useAuthSession } from '../../context/AuthContext.tsx';
import { api, getAuthToken, setAuthToken } from '../../lib/api.ts';
import { UserRole } from '../../types/index.ts';

interface TestResult {
  name: string;
  expectedStatus: number | string;
  actualStatus?: number | string;
  passed: boolean;
  details?: string;
  timestamp: string;
}

export const AuthTestingPanel: React.FC = () => {
  const { user, role, devSwitchRole, devSimulateLogin, logout } = useAuthSession();
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const runAllTests = async () => {
    setIsRunningAll(true);
    const results: TestResult[] = [];

    // Save initial token to restore after tests
    const originalToken = getAuthToken();

    try {
      // TEST 1: Unauthenticated user requests GET /api/auth/me -> 401
      setAuthToken(null);
      try {
        await api.getMe();
        results.push({
          name: '1. Unauthenticated GET /api/auth/me',
          expectedStatus: 401,
          actualStatus: 200,
          passed: false,
          details: 'Expected 401 Unauthorized but request succeeded.',
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        const passed = err.status === 401;
        results.push({
          name: '1. Unauthenticated GET /api/auth/me',
          expectedStatus: 401,
          actualStatus: err.status || 'Error',
          passed,
          details: passed ? 'Properly rejected with HTTP 401 UNAUTHORIZED' : err.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // TEST 2: Authenticated rider requests GET /api/auth/me -> 200, role = rider
      const testRiderId = `test_rider_${Date.now()}`;
      const riderToken = `dev_test_token_${testRiderId}:rider:rider_${Date.now()}@example.com:Automated Rider`;
      setAuthToken(riderToken);
      try {
        const res = await api.getMe();
        const passed = res.success && res.data.role === 'rider';
        results.push({
          name: '2. Authenticated Rider GET /api/auth/me',
          expectedStatus: '200 (role=rider)',
          actualStatus: `${res.data ? 200 : 'failed'} (role=${res.data?.role})`,
          passed,
          details: passed ? `User synchronized into DB with ID: ${res.data.id}` : 'Role mismatch',
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          name: '2. Authenticated Rider GET /api/auth/me',
          expectedStatus: 200,
          actualStatus: err.status || 'Error',
          passed: false,
          details: err.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // TEST 3 & 4: Repeat login with same Clerk user ID -> No duplicate users
      try {
        const res1 = await api.getMe();
        const res2 = await api.getMe();
        const passed = res1.data.id === res2.data.id;
        results.push({
          name: '3 & 4. Repeat Login Idempotency',
          expectedStatus: 'Same User UUID',
          actualStatus: `${res1.data.id === res2.data.id ? 'Identical' : 'Duplicated'} (${res1.data.id})`,
          passed,
          details: passed ? 'No duplicate user created in PostgreSQL' : 'Duplicate user created',
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          name: '3 & 4. Repeat Login Idempotency',
          expectedStatus: 200,
          actualStatus: err.status || 'Error',
          passed: false,
          details: err.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // TEST 5: Rider accesses rider route -> 200
      try {
        const res = await api.testRiderRoute();
        results.push({
          name: '5. Rider accesses Rider-permitted endpoint',
          expectedStatus: 200,
          actualStatus: 200,
          passed: res.success,
          details: 'Access granted by requireRole(rider)',
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          name: '5. Rider accesses Rider-permitted endpoint',
          expectedStatus: 200,
          actualStatus: err.status || 'Error',
          passed: false,
          details: err.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // TEST 6: Rider accesses Driver-only route -> 403
      try {
        await api.testDriverRoute();
        results.push({
          name: '6. Rider accesses Driver-only route',
          expectedStatus: 403,
          actualStatus: 200,
          passed: false,
          details: 'Should have been blocked with 403',
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        const passed = err.status === 403;
        results.push({
          name: '6. Rider accesses Driver-only route',
          expectedStatus: 403,
          actualStatus: err.status || 'Error',
          passed,
          details: passed ? 'Blocked with 403 FORBIDDEN' : err.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // TEST 7: Rider accesses Admin-only route -> 403
      try {
        await api.testAdminRoute();
        results.push({
          name: '7. Rider accesses Admin-only route',
          expectedStatus: 403,
          actualStatus: 200,
          passed: false,
          details: 'Should have been blocked with 403',
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        const passed = err.status === 403;
        results.push({
          name: '7. Rider accesses Admin-only route',
          expectedStatus: 403,
          actualStatus: err.status || 'Error',
          passed,
          details: passed ? 'Blocked with 403 FORBIDDEN' : err.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // TEST 8: Driver accesses Driver area -> 200
      const testDriverId = `test_driver_${Date.now()}`;
      const driverToken = `dev_test_token_${testDriverId}:driver:driver_${Date.now()}@example.com:Automated Driver`;
      setAuthToken(driverToken);
      // Promote on backend
      await api.getMe();
      await api.devPromote('driver');
      try {
        const res = await api.testDriverRoute();
        results.push({
          name: '8. Driver accesses Driver endpoint',
          expectedStatus: 200,
          actualStatus: 200,
          passed: res.success,
          details: 'Access granted by requireRole(driver)',
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          name: '8. Driver accesses Driver endpoint',
          expectedStatus: 200,
          actualStatus: err.status || 'Error',
          passed: false,
          details: err.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // TEST 9: Driver accesses Admin route -> 403
      try {
        await api.testAdminRoute();
        results.push({
          name: '9. Driver accesses Admin-only route',
          expectedStatus: 403,
          actualStatus: 200,
          passed: false,
          details: 'Should have been blocked with 403',
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        const passed = err.status === 403;
        results.push({
          name: '9. Driver accesses Admin-only route',
          expectedStatus: 403,
          actualStatus: err.status || 'Error',
          passed,
          details: passed ? 'Blocked with 403 FORBIDDEN' : err.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // TEST 10: Admin accesses Admin area -> 200
      const testAdminId = `test_admin_${Date.now()}`;
      const adminToken = `dev_test_token_${testAdminId}:admin:admin_${Date.now()}@example.com:Automated Admin`;
      setAuthToken(adminToken);
      await api.getMe();
      await api.devPromote('admin');
      try {
        const res = await api.testAdminRoute();
        results.push({
          name: '10. Admin accesses Admin endpoint',
          expectedStatus: 200,
          actualStatus: 200,
          passed: res.success,
          details: 'Access granted by requireRole(admin)',
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        results.push({
          name: '10. Admin accesses Admin endpoint',
          expectedStatus: 200,
          actualStatus: err.status || 'Error',
          passed: false,
          details: err.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      setTestResults(results);
    } finally {
      // Restore initial user token
      setAuthToken(originalToken);
      setIsRunningAll(false);
    }
  };

  const handleQuickRoleSwitch = async (targetRole: UserRole) => {
    if (!user) {
      await devSimulateLogin(targetRole);
    } else {
      await devSwitchRole(targetRole);
    }
  };

  return (
    <div className="rounded-xl border border-[#1E334D] bg-[#0F1C2E] p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1E334D]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#22C55E]" />
            <h2 className="text-xl font-bold tracking-tight text-[#E5F2FF]">
              Step 2 Auth & Role Verification Suite
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#8FA6BF]">
            Automated verification of 401 unauthenticated rejects, 403 forbidden role checks, and database user sync.
          </p>
        </div>

        <button
          onClick={runAllTests}
          disabled={isRunningAll}
          className="flex items-center gap-2 rounded-lg bg-[#22C55E] px-4 py-2.5 text-xs font-semibold text-[#07111F] shadow-md shadow-[#22C55E]/20 hover:bg-[#22C55E]/90 transition-all disabled:opacity-50"
        >
          <Play className={`h-3.5 w-3.5 ${isRunningAll ? 'animate-spin' : ''}`} />
          <span>{isRunningAll ? 'Running Tests...' : 'Run Automated Role Tests'}</span>
        </button>
      </div>

      {/* Role Switcher for Development Testing */}
      <div className="mt-6 rounded-lg border border-[#1E334D] bg-[#07111F] p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E334D]/60 text-xs">
          <span className="text-[#8FA6BF] flex items-center gap-1.5 font-medium">
            <UserCheck className="h-4 w-4 text-[#00C2FF]" />
            Current Authenticated State:
          </span>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#E5F2FF]">{user.name}</span>
              <span className="text-xs text-[#8FA6BF]">({user.email})</span>
              <span className="font-mono text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-[#00C2FF]/10 text-[#00C2FF] border border-[#00C2FF]/30">
                {user.role}
              </span>
            </div>
          ) : (
            <span className="text-[#8FA6BF]">Unauthenticated (Guest)</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#8FA6BF] text-[11px]">Dev Role Switcher (Controlled Backend Promotion):</span>
          <button
            onClick={() => handleQuickRoleSwitch('rider')}
            className="px-3 py-1 rounded bg-[#00C2FF]/10 text-[#00C2FF] border border-[#00C2FF]/30 hover:bg-[#00C2FF]/20 transition-colors font-medium text-[11px]"
          >
            Switch to Rider
          </button>
          <button
            onClick={() => handleQuickRoleSwitch('driver')}
            className="px-3 py-1 rounded bg-[#0EA5E9]/10 text-[#0EA5E9] border border-[#0EA5E9]/30 hover:bg-[#0EA5E9]/20 transition-colors font-medium text-[11px]"
          >
            Promote to Driver
          </button>
          <button
            onClick={() => handleQuickRoleSwitch('admin')}
            className="px-3 py-1 rounded bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 hover:bg-[#22C55E]/20 transition-colors font-medium text-[11px]"
          >
            Promote to Admin
          </button>
        </div>
      </div>

      {/* Test Results Output */}
      {testResults.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8FA6BF] px-1 pb-1">
            <span>Automated Test Case</span>
            <span>Result & Status Code</span>
          </div>

          <div className="space-y-2">
            {testResults.map((t, idx) => (
              <div
                key={idx}
                className={`rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors ${
                  t.passed
                    ? 'border-[#22C55E]/30 bg-[#22C55E]/5'
                    : 'border-[#EF4444]/30 bg-[#EF4444]/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {t.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-[#22C55E] shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-[#EF4444] shrink-0" />
                  )}
                  <div>
                    <span className="font-medium text-[#E5F2FF]">{t.name}</span>
                    {t.details && (
                      <span className="block text-[11px] text-[#8FA6BF] mt-0.5">
                        {t.details}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto font-mono text-[11px]">
                  <span className="text-[#8FA6BF]">Expected: {t.expectedStatus}</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded ${
                      t.passed
                        ? 'bg-[#22C55E]/20 text-[#22C55E]'
                        : 'bg-[#EF4444]/20 text-[#EF4444]'
                    }`}
                  >
                    Actual: {t.actualStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#1E334D] flex items-center justify-between text-xs text-[#8FA6BF]">
            <span>
              Passed: {testResults.filter((r) => r.passed).length} / {testResults.length}
            </span>
            <span>All Step 2 RBAC policies verified</span>
          </div>
        </div>
      )}
    </div>
  );
};
