import React, { useState, useMemo } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  Calendar,
  Copy,
  Trash2,
  Edit3,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  AlertCircle,
  Tag,
  Clock,
  Percent,
  IndianRupee,
  ShieldAlert,
  ChevronRight,
  Filter,
  Check,
  X,
  AlertTriangle,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import { PromoCode } from '../../types/index.ts';
import { api } from '../../lib/api.ts';

interface PromoManagementProps {
  promos: PromoCode[];
  onRefresh: () => void;
}

type PromoStatus = 'active' | 'scheduled' | 'expired' | 'inactive';
type FilterType = 'all' | 'active' | 'scheduled' | 'expired' | 'inactive';
type SortType = 'newest' | 'redemptions' | 'discount' | 'code';

export const PromoManagement: React.FC<PromoManagementProps> = ({ promos, onRefresh }) => {
  // Filters & Search
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');

  // Modals & Action States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PromoCode | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<PromoCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);

  // Loading & Feedback
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Helper to trigger transient toasts
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for restricted clipboard in iframe
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedCode(code);
      showToast(`Promo code ${code} copied to clipboard!`, 'info');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      showToast(`Code: ${code}`, 'info');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      showToast('Promo codes updated successfully.', 'success');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Determine promo status accurately based on current timestamp
  const getPromoStatus = (p: PromoCode): PromoStatus => {
    if (!p.is_active) return 'inactive';
    const now = new Date();
    const start = p.starts_at ? new Date(p.starts_at) : null;
    const expires = p.expires_at ? new Date(p.expires_at) : null;

    if (start && start > now) return 'scheduled';
    if (expires && expires < now) return 'expired';
    return 'active';
  };

  // Status metrics summary
  const summary = useMemo(() => {
    let active = 0;
    let scheduled = 0;
    let expired = 0;
    let inactive = 0;
    let redemptions = 0;

    promos.forEach((p) => {
      const st = getPromoStatus(p);
      if (st === 'active') active++;
      else if (st === 'scheduled') scheduled++;
      else if (st === 'expired') expired++;
      else if (st === 'inactive') inactive++;
      redemptions += Number(p.used_count || 0);
    });

    return {
      total: promos.length,
      active,
      scheduled,
      expired,
      inactive,
      redemptions,
    };
  }, [promos]);

  // Filter & sort logic
  const filteredAndSortedPromos = useMemo(() => {
    return promos
      .filter((p) => {
        const matchesSearch =
          p.code.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          p.discount_type.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          `${p.discount_value}`.includes(searchTerm.trim());

        const status = getPromoStatus(p);
        const matchesFilter = filter === 'all' || filter === status;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'redemptions') {
          return (b.used_count || 0) - (a.used_count || 0);
        }
        if (sortBy === 'discount') {
          return Number(b.discount_value) - Number(a.discount_value);
        }
        if (sortBy === 'code') {
          return a.code.localeCompare(b.code);
        }
        return 0;
      });
  }, [promos, searchTerm, filter, sortBy]);

  // Toggle active/inactive
  const handleToggleActive = async (promo: PromoCode) => {
    const nextState = !promo.is_active;
    setActionLoadingId(promo.id);
    try {
      const res = await api.updatePromo(promo.id, { is_active: nextState });
      if (res.success) {
        showToast(
          `Promo code ${promo.code} ${nextState ? 'activated' : 'deactivated'} successfully.`,
          'success'
        );
        onRefresh();
      } else {
        showToast(res.message || 'Failed to update promo status.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update promo status.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Perform permanent deletion or safe deactivation
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.used_count > 0) {
      // Deactivate instead
      setActionLoadingId(deleteTarget.id);
      try {
        const res = await api.updatePromo(deleteTarget.id, { is_active: false });
        if (res.success) {
          showToast(`Promo ${deleteTarget.code} has redemptions and was deactivated instead.`, 'info');
          setDeleteTarget(null);
          onRefresh();
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to deactivate promo.', 'error');
      } finally {
        setActionLoadingId(null);
      }
      return;
    }

    setActionLoadingId(deleteTarget.id);
    try {
      const res = await api.deletePromo(deleteTarget.id);
      if (res.success) {
        showToast(`Promo code ${deleteTarget.code} deleted permanently.`, 'success');
        setDeleteTarget(null);
        onRefresh();
      } else {
        showToast(res.message || 'Failed to delete promo code.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete promo code.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick schedule save
  const handleSaveSchedule = async (startsAt: string | null, expiresAt: string | null) => {
    if (!scheduleTarget) return;
    setActionLoadingId(scheduleTarget.id);
    try {
      const res = await api.updatePromo(scheduleTarget.id, {
        starts_at: startsAt || null,
        expires_at: expiresAt || null,
      });
      if (res.success) {
        showToast(`Schedule updated for ${scheduleTarget.code}.`, 'success');
        setScheduleTarget(null);
        onRefresh();
      } else {
        showToast(res.message || 'Failed to update schedule.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update schedule.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4 pb-12 animate-fade-in text-[#171717]">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold border transition-all animate-slide-up ${
            toast.type === 'success'
              ? 'bg-[#15803D] text-white border-[#15803D]'
              : toast.type === 'error'
              ? 'bg-[#E21D2B] text-white border-[#E21D2B]'
              : 'bg-[#171717] text-white border-[#171717]'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-white" />
          ) : (
            <Tag className="h-4 w-4 shrink-0 text-white" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-white/80 hover:text-white"
            aria-label="Close notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#FFF1F2] text-[#E21D2B]">
                <Tag className="h-4 w-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-[#171717] tracking-tight">
                Promo Codes & Campaigns
              </h2>
            </div>
            <p className="text-xs text-[#737373]">
              Create, schedule, manage, and track promotional offers across RideNova.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-xl border border-[#E5E5E5] bg-white hover:bg-[#FAFAFA] text-xs font-semibold text-[#171717] flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
              title="Refresh promo records"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#737373] ${isRefreshing ? 'animate-spin text-[#E21D2B]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#E21D2B] hover:bg-[#BE1622] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>+ Create Promo Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-xl border border-[#E5E5E5] bg-white shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#737373] block truncate">
            Total Promo Codes
          </span>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#171717]">{summary.total}</p>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl border border-[#86EFAC]/40 bg-[#DCFCE7]/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#15803D] block truncate">Active</span>
            <span className="h-2 w-2 rounded-full bg-[#15803D] animate-pulse" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#15803D]">{summary.active}</p>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl border border-[#FCD34D]/40 bg-[#FEF3C7]/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#B45309] block truncate">Scheduled</span>
            <Calendar className="h-3 w-3 text-[#B45309]" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#B45309]">{summary.scheduled}</p>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl border border-[#FCA5A5]/40 bg-[#FEE2E2]/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#DC2626] block truncate">Expired</span>
            <Clock className="h-3 w-3 text-[#DC2626]" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#DC2626]">{summary.expired}</p>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl border border-[#E5E5E5] bg-white shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#737373] block truncate">Inactive</span>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#737373]">{summary.inactive}</p>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl border border-[#E21D2B]/20 bg-[#FFF1F2]/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#E21D2B] block truncate">
              Total Redemptions
            </span>
            <Sparkles className="h-3 w-3 text-[#E21D2B]" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#E21D2B]">{summary.redemptions}</p>
        </div>
      </div>

      {/* Search, Filter Tabs & Sort Toolbar */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#737373]" />
            <input
              type="text"
              placeholder="Search by code (e.g. WELCOME50, RIDENOVA)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#E5E5E5] bg-white text-xs text-[#171717] placeholder-[#737373]/60 focus:border-[#E21D2B] focus:outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-[#737373] hover:text-[#171717]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#737373]" />
            <span className="text-[11px] font-semibold text-[#737373]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="rounded-xl border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="redemptions">Most Redemptions</option>
              <option value="discount">Highest Discount</option>
              <option value="code">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(
            [
              { id: 'all', label: 'All', count: summary.total },
              { id: 'active', label: 'Active', count: summary.active, color: 'text-[#15803D]' },
              { id: 'scheduled', label: 'Scheduled', count: summary.scheduled, color: 'text-[#B45309]' },
              { id: 'expired', label: 'Expired', count: summary.expired, color: 'text-[#DC2626]' },
              { id: 'inactive', label: 'Inactive', count: summary.inactive, color: 'text-[#737373]' },
            ] as const
          ).map((tab) => {
            const isSelected = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#171717] text-white shadow-xs'
                    : 'bg-[#FAFAFA] text-[#737373] hover:bg-[#F5F5F5] border border-[#E5E5E5]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-[#171717] border border-[#E5E5E5]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Promo Code Cards List */}
      {filteredAndSortedPromos.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8 sm:p-12 text-center shadow-xs">
          <Tag className="mx-auto h-10 w-10 text-[#737373] opacity-40 mb-3" />
          <h3 className="text-base font-bold text-[#171717]">No Promo Codes Found</h3>
          <p className="mt-1 text-xs text-[#737373] max-w-sm mx-auto">
            {searchTerm || filter !== 'all'
              ? 'No promotional offers match your current search or filter criteria.'
              : 'No promotional codes have been created yet. Launch your first campaign!'}
          </p>
          {(searchTerm || filter !== 'all') ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilter('all');
              }}
              className="mt-4 px-4 py-2 rounded-xl border border-[#E5E5E5] bg-white text-xs font-bold text-[#E21D2B] hover:bg-[#FFF1F2] transition-all"
            >
              Clear Filters
            </button>
          ) : (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create Promo Code
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredAndSortedPromos.map((promo) => {
            const status = getPromoStatus(promo);
            const isPercentage = promo.discount_type === 'percentage';
            const isCopied = copiedCode === promo.code;
            const isLoading = actionLoadingId === promo.id;

            return (
              <div
                key={promo.id}
                className="rounded-2xl border border-[#E5E5E5] bg-white p-4 shadow-xs hover:border-[#E21D2B]/40 hover:shadow-md transition-all duration-150 flex flex-col justify-between gap-3 relative group"
              >
                {/* Header row: Code, Copy, Status Badge */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-base text-[#171717] tracking-wider px-2 py-0.5 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                        {promo.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(promo.code)}
                        className="p-1.5 rounded-lg text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-colors"
                        title="Copy code to clipboard"
                        aria-label={`Copy code ${promo.code}`}
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-[#15803D]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Status Pill */}
                    {status === 'active' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" />
                        Active
                      </span>
                    )}
                    {status === 'scheduled' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D]/60">
                        <Calendar className="h-2.5 w-2.5" />
                        Scheduled
                      </span>
                    )}
                    {status === 'expired' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]/60">
                        <Clock className="h-2.5 w-2.5" />
                        Expired
                      </span>
                    )}
                    {status === 'inactive' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F5F5F5] text-[#737373] border border-[#E5E5E5]">
                        <PauseCircle className="h-2.5 w-2.5" />
                        Inactive
                      </span>
                    )}
                  </div>

                  {/* Discount Callout */}
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-2xl font-black text-[#E21D2B]">
                      {isPercentage ? `${promo.discount_value}% OFF` : `₹${promo.discount_value} OFF`}
                    </span>
                    <span className="text-[11px] font-semibold text-[#737373]">
                      {isPercentage ? 'Percentage Discount' : 'Fixed Savings'}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F5F5F5] text-xs">
                    <div>
                      <span className="text-[10px] text-[#737373] block uppercase font-bold">Min Fare</span>
                      <span className="font-semibold text-[#171717]">
                        {promo.minimum_fare > 0 ? `₹${promo.minimum_fare}` : 'No minimum'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#737373] block uppercase font-bold">Max Cap</span>
                      <span className="font-semibold text-[#171717]">
                        {promo.maximum_discount ? `₹${promo.maximum_discount}` : isPercentage ? 'No cap' : 'N/A'}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-[#737373]">Redemptions</span>
                        <span className="font-bold text-[#171717]">
                          {promo.used_count} / {promo.usage_limit || '∞'}
                        </span>
                      </div>
                      {promo.usage_limit && (
                        <div className="w-full bg-[#F5F5F5] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              promo.used_count >= promo.usage_limit ? 'bg-[#DC2626]' : 'bg-[#E21D2B]'
                            }`}
                            style={{
                              width: `${Math.min(100, (promo.used_count / promo.usage_limit) * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Schedule times if present */}
                    {(promo.starts_at || promo.expires_at) && (
                      <div className="col-span-2 text-[10px] text-[#737373] space-y-0.5 bg-[#FAFAFA] p-2 rounded-lg border border-[#E5E5E5]/60">
                        {promo.starts_at && (
                          <div className="flex items-center justify-between">
                            <span>Starts:</span>
                            <span className="font-medium text-[#171717]">
                              {new Date(promo.starts_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                        {promo.expires_at && (
                          <div className="flex items-center justify-between">
                            <span>Expires:</span>
                            <span className="font-medium text-[#171717]">
                              {new Date(promo.expires_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between gap-1">
                  {/* Status Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(promo)}
                    disabled={isLoading}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      promo.is_active
                        ? 'bg-[#FEF3C7] text-[#B45309] hover:bg-[#FDE68A]'
                        : 'bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0]'
                    } disabled:opacity-50`}
                    title={promo.is_active ? 'Deactivate promo code' : 'Activate promo code'}
                  >
                    {isLoading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : promo.is_active ? (
                      <>
                        <PauseCircle className="h-3.5 w-3.5" />
                        <span>Deactivate</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-3.5 w-3.5" />
                        <span>Activate</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Quick Schedule Button */}
                    <button
                      type="button"
                      onClick={() => setScheduleTarget(promo)}
                      className="p-1.5 rounded-lg border border-[#E5E5E5] text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFA] transition-colors"
                      title="Set schedule & validity dates"
                      aria-label="Schedule promo"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => setEditTarget(promo)}
                      className="p-1.5 rounded-lg border border-[#E5E5E5] text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFA] transition-colors"
                      title="Edit promo code fields"
                      aria-label="Edit promo"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(promo)}
                      className="p-1.5 rounded-lg border border-[#E5E5E5] text-[#DC2626] hover:bg-[#FEE2E2] hover:border-[#FCA5A5] transition-colors"
                      title={promo.used_count > 0 ? 'Cannot delete used promo (deactivate instead)' : 'Delete promo code'}
                      aria-label="Delete promo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE PROMO MODAL */}
      {isCreateOpen && (
        <PromoFormModal
          mode="create"
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            showToast('New promo code created successfully!', 'success');
            onRefresh();
          }}
        />
      )}

      {/* EDIT PROMO MODAL */}
      {editTarget && (
        <PromoFormModal
          mode="edit"
          initialData={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            showToast(`Promo code ${editTarget.code} updated successfully!`, 'success');
            onRefresh();
          }}
        />
      )}

      {/* SCHEDULE MODAL */}
      {scheduleTarget && (
        <ScheduleModal
          promo={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          onSave={handleSaveSchedule}
        />
      )}

      {/* DELETE CONFIRMATION DIALOG (In-App, no window.confirm) */}
      {deleteTarget && (
        <DeleteConfirmModal
          promo={deleteTarget}
          isLoading={actionLoadingId === deleteTarget.id}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleExecuteDelete}
        />
      )}
    </div>
  );
};

// ============================================================================
// CREATE & EDIT PROMO CODE MODAL
// ============================================================================
interface PromoFormModalProps {
  mode: 'create' | 'edit';
  initialData?: PromoCode;
  onClose: () => void;
  onSuccess: () => void;
}

const PromoFormModal: React.FC<PromoFormModalProps> = ({ mode, initialData, onClose, onSuccess }) => {
  const [code, setCode] = useState(initialData?.code || '');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    initialData?.discount_type || 'percentage'
  );
  const [discountValue, setDiscountValue] = useState<number>(initialData?.discount_value ?? 20);
  const [minimumFare, setMinimumFare] = useState<number>(initialData?.minimum_fare ?? 0);
  const [hasMaxCap, setHasMaxCap] = useState<boolean>(Boolean(initialData?.maximum_discount));
  const [maximumDiscount, setMaximumDiscount] = useState<number>(initialData?.maximum_discount ?? 100);

  const [hasUsageLimit, setHasUsageLimit] = useState<boolean>(Boolean(initialData?.usage_limit));
  const [usageLimit, setUsageLimit] = useState<number>(initialData?.usage_limit ?? 100);

  // Scheduling options
  const [hasStartsAt, setHasStartsAt] = useState<boolean>(Boolean(initialData?.starts_at));
  const [startsAt, setStartsAt] = useState<string>(
    initialData?.starts_at ? new Date(initialData.starts_at).toISOString().slice(0, 16) : ''
  );

  const [hasExpiresAt, setHasExpiresAt] = useState<boolean>(Boolean(initialData?.expires_at));
  const [expiresAt, setExpiresAt] = useState<string>(
    initialData?.expires_at ? new Date(initialData.expires_at).toISOString().slice(0, 16) : ''
  );

  const [isActive, setIsActive] = useState<boolean>(initialData?.is_active ?? true);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode) {
      setFormError('Promo code cannot be empty.');
      return;
    }

    if (!/^[A-Z0-9_-]{2,30}$/.test(cleanCode)) {
      setFormError('Promo code must be 2-30 characters (letters, numbers, underscores, hyphens).');
      return;
    }

    if (discountValue <= 0) {
      setFormError('Discount value must be greater than zero.');
      return;
    }

    if (discountType === 'percentage' && discountValue > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    if (hasExpiresAt && hasStartsAt && startsAt && expiresAt) {
      if (new Date(expiresAt) <= new Date(startsAt)) {
        setFormError('Expiration date must be strictly after the start date.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        code: cleanCode,
        discount_type: discountType,
        discount_value: Number(discountValue),
        minimum_fare: Number(minimumFare) || 0,
        maximum_discount: discountType === 'percentage' && hasMaxCap ? Number(maximumDiscount) : undefined,
        usage_limit: hasUsageLimit ? Number(usageLimit) : undefined,
        starts_at: hasStartsAt && startsAt ? new Date(startsAt).toISOString() : undefined,
        expires_at: hasExpiresAt && expiresAt ? new Date(expiresAt).toISOString() : undefined,
        is_active: isActive,
      };

      if (mode === 'create') {
        const res = await api.createPromo(payload);
        if (res.success) {
          onSuccess();
        } else {
          setFormError(res.message || 'Failed to create promo code.');
        }
      } else if (initialData) {
        const res = await api.updatePromo(initialData.id, payload);
        if (res.success) {
          onSuccess();
        } else {
          setFormError(res.message || 'Failed to update promo code.');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-[#E5E5E5] my-auto space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#FFF1F2] text-[#E21D2B]">
              <Tag className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-[#171717]">
              {mode === 'create' ? 'Create New Promo Code' : `Edit Promo: ${initialData?.code}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error notification */}
        {formError && (
          <div className="flex items-center gap-2 rounded-xl border border-[#B91C1C]/30 bg-[#B91C1C]/10 p-3 text-xs text-[#B91C1C]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Promo Code Input */}
          <div>
            <label className="block text-xs font-bold text-[#171717] mb-1">
              Promo Voucher Code <span className="text-[#E21D2B]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER50, RIDEFAST"
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3.5 py-2.5 font-mono uppercase font-bold text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-[10px] text-[#737373]">UPPERCASE</span>
            </div>
            <p className="mt-1 text-[11px] text-[#737373]">
              Customers will enter this code at checkout to claim the discount.
            </p>
          </div>

          {/* Discount Type Selector */}
          <div>
            <label className="block text-xs font-bold text-[#171717] mb-1.5">
              Discount Type <span className="text-[#E21D2B]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDiscountType('percentage')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  discountType === 'percentage'
                    ? 'border-[#E21D2B] bg-[#FFF1F2] text-[#E21D2B]'
                    : 'border-[#E5E5E5] bg-white text-[#737373] hover:bg-[#FAFAFA]'
                }`}
              >
                <Percent className="h-3.5 w-3.5" />
                <span>Percentage (%)</span>
              </button>

              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  discountType === 'fixed'
                    ? 'border-[#E21D2B] bg-[#FFF1F2] text-[#E21D2B]'
                    : 'border-[#E5E5E5] bg-white text-[#737373] hover:bg-[#FAFAFA]'
                }`}
              >
                <IndianRupee className="h-3.5 w-3.5" />
                <span>Fixed Amount (₹)</span>
              </button>
            </div>
          </div>

          {/* Discount Value & Min Fare */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#171717] mb-1">
                {discountType === 'percentage' ? 'Percentage Off (%)' : 'Discount Amount (₹)'}{' '}
                <span className="text-[#E21D2B]">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                max={discountType === 'percentage' ? 100 : 5000}
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-mono font-bold text-[#171717] focus:border-[#E21D2B] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#171717] mb-1">
                Min. Ride Fare (₹)
              </label>
              <input
                type="number"
                min="0"
                value={minimumFare}
                onChange={(e) => setMinimumFare(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-mono text-[#171717] focus:border-[#E21D2B] focus:outline-none"
              />
            </div>
          </div>

          {/* Maximum Discount Cap (for percentage discounts) */}
          {discountType === 'percentage' && (
            <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasMaxCap}
                  onChange={(e) => setHasMaxCap(e.target.checked)}
                  className="rounded text-[#E21D2B] focus:ring-[#E21D2B]"
                />
                <span className="font-semibold text-[#171717]">Cap maximum discount amount (₹)</span>
              </label>
              {hasMaxCap && (
                <div className="pt-1">
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 150"
                    value={maximumDiscount}
                    onChange={(e) => setMaximumDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-mono text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-[#737373]">
                    Limits the maximum money saved even on high fares.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Usage Limit */}
          <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasUsageLimit}
                onChange={(e) => setHasUsageLimit(e.target.checked)}
                className="rounded text-[#E21D2B] focus:ring-[#E21D2B]"
              />
              <span className="font-semibold text-[#171717]">Restrict total redemptions</span>
            </label>
            {hasUsageLimit && (
              <div className="pt-1">
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 500"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-mono text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-[#737373]">
                  Promo will automatically expire when this many rides have used it.
                </p>
              </div>
            )}
          </div>

          {/* Scheduling & Validity Window */}
          <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-3">
            <span className="text-[11px] font-bold text-[#171717] block">
              Scheduling & Validity Window
            </span>

            {/* Start Date */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasStartsAt}
                  onChange={(e) => setHasStartsAt(e.target.checked)}
                  className="rounded text-[#E21D2B] focus:ring-[#E21D2B]"
                />
                <span className="text-xs text-[#171717]">Schedule start date/time in future</span>
              </label>
              {hasStartsAt && (
                <input
                  type="datetime-local"
                  required={hasStartsAt}
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                />
              )}
            </div>

            {/* Expiration Date */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasExpiresAt}
                  onChange={(e) => setHasExpiresAt(e.target.checked)}
                  className="rounded text-[#E21D2B] focus:ring-[#E21D2B]"
                />
                <span className="text-xs text-[#171717]">Set expiration date/time</span>
              </label>
              {hasExpiresAt && (
                <input
                  type="datetime-local"
                  required={hasExpiresAt}
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Active status */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-[#E5E5E5] bg-white">
            <div>
              <span className="font-bold text-[#171717] block">Active Status</span>
              <span className="text-[10px] text-[#737373]">
                {isActive ? 'Promo can be used immediately (or when scheduled).' : 'Promo is currently disabled.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isActive ? 'bg-[#15803D]' : 'bg-[#E5E5E5]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#171717] hover:bg-[#F5F5F5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#E21D2B] hover:bg-[#BE1622] text-white text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              {submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>{mode === 'create' ? 'Publish Promo Code' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// QUICK SCHEDULE MODAL
// ============================================================================
interface ScheduleModalProps {
  promo: PromoCode;
  onClose: () => void;
  onSave: (startsAt: string | null, expiresAt: string | null) => Promise<void>;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ promo, onClose, onSave }) => {
  const [startsAt, setStartsAt] = useState<string>(
    promo.starts_at ? new Date(promo.starts_at).toISOString().slice(0, 16) : ''
  );
  const [expiresAt, setExpiresAt] = useState<string>(
    promo.expires_at ? new Date(promo.expires_at).toISOString().slice(0, 16) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (startsAt && expiresAt) {
      if (new Date(expiresAt) <= new Date(startsAt)) {
        setError('Expiration date must be after the start date.');
        return;
      }
    }

    setSaving(true);
    try {
      await onSave(
        startsAt ? new Date(startsAt).toISOString() : null,
        expiresAt ? new Date(expiresAt).toISOString() : null
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update schedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E5E5E5] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#FEF3C7] text-[#B45309]">
              <Calendar className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-[#171717]">Schedule: {promo.code}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-[#B91C1C]/30 bg-[#B91C1C]/10 p-3 text-xs text-[#B91C1C]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-[#171717] mb-1">
              Start Date & Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-[#737373]">
              Leave empty to make the promo active immediately.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#171717] mb-1">
              Expiration Date & Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-[#737373]">
              Leave empty for an ongoing promotion with no expiry.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={() => {
                setStartsAt('');
                setExpiresAt('');
              }}
              className="text-[11px] text-[#737373] hover:text-[#E21D2B] hover:underline"
            >
              Clear Both Dates
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-3.5 py-2 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#171717] hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-[#E21D2B] hover:bg-[#BE1622] text-white text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>Save Schedule</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// DELETE CONFIRMATION DIALOG (In-App, no window.confirm)
// ============================================================================
interface DeleteConfirmModalProps {
  promo: PromoCode;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  promo,
  isLoading,
  onClose,
  onConfirm,
}) => {
  const hasRedemptions = promo.used_count > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E5E5E5] space-y-4">
        {/* Warning Icon */}
        <div className="flex items-center gap-3">
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
              hasRedemptions ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-[#FEE2E2] text-[#DC2626]'
            }`}
          >
            {hasRedemptions ? <ShieldAlert className="h-6 w-6" /> : <Trash2 className="h-6 w-6" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-[#171717]">
              {hasRedemptions ? 'Cannot Delete Redeemed Code' : 'Delete Promo Code?'}
            </h3>
            <p className="text-xs font-mono font-bold text-[#E21D2B]">{promo.code}</p>
          </div>
        </div>

        {/* Descriptive Body */}
        {hasRedemptions ? (
          <div className="space-y-2 text-xs text-[#737373]">
            <p>
              This promo code has already been redeemed{' '}
              <strong className="text-[#171717]">{promo.used_count} time(s)</strong> by customers.
            </p>
            <p className="bg-[#FFF1F2] border border-[#E21D2B]/20 p-2.5 rounded-xl text-[#B91C1C] leading-relaxed">
              To preserve transaction history, ride receipts, and financial audit records, promo codes with existing redemptions cannot be erased. You can deactivate it instead so riders can no longer apply it.
            </p>
          </div>
        ) : (
          <div className="space-y-2 text-xs text-[#737373]">
            <p>
              Are you sure you want to permanently delete promo code{' '}
              <strong className="text-[#171717]">{promo.code}</strong>?
            </p>
            <p className="bg-[#FAFAFA] border border-[#E5E5E5] p-2.5 rounded-xl leading-relaxed">
              This code has 0 redemptions and will be permanently removed from the database. This action cannot be undone.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E5E5]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#171717] hover:bg-[#F5F5F5] transition-colors"
          >
            Cancel
          </button>

          {hasRedemptions ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              {isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>Deactivate Promo Instead</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-[#E21D2B] hover:bg-[#BE1622] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              {isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>Permanently Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
