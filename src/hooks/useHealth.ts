import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../lib/api.ts';
import { ApiHealthResponse, DbHealthResponse } from '../types/index.ts';

export interface UseHealthReturn {
  apiHealth: ApiHealthResponse | null;
  dbHealth: DbHealthResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  apiError: string | null;
  dbError: string | null;
  refresh: () => Promise<void>;
  lastChecked: Date | null;
}

export function useHealth(): UseHealthReturn {
  const [apiHealth, setApiHealth] = useState<ApiHealthResponse | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealthData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setApiError(null);
    setDbError(null);

    try {
      const [apiRes, dbRes] = await Promise.allSettled([
        api.getApiHealth(),
        api.getDbHealth(),
      ]);

      if (apiRes.status === 'fulfilled') {
        setApiHealth(apiRes.value);
      } else {
        const err = apiRes.reason as ApiError;
        setApiError(err.message || 'Failed to reach API server');
      }

      if (dbRes.status === 'fulfilled') {
        setDbHealth(dbRes.value);
      } else {
        const err = dbRes.reason as ApiError;
        setDbError(err.message || 'Failed to query database health');
      }

      setLastChecked(new Date());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData(true);
  }, [fetchHealthData]);

  const refresh = useCallback(async () => {
    await fetchHealthData(false);
  }, [fetchHealthData]);

  return {
    apiHealth,
    dbHealth,
    isLoading,
    isRefreshing,
    apiError,
    dbError,
    refresh,
    lastChecked,
  };
}
