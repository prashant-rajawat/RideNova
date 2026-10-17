import { useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import { useAuthSession } from '../context/AuthContext.tsx';

export function useRideSubscription(rideId: string, onUpdate: () => void) {
  const { token } = useAuthSession();

  useEffect(() => {
    if (!rideId || !token) return;

    if (supabase) {
      try {
        supabase.auth.setSession({ access_token: token, refresh_token: '' });
      } catch {
        // ignore
      }
    }

    let channel: any = null;
    if (supabase) {
      try {
        channel = supabase
          .channel(`ride-${rideId}-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'rides',
              filter: `id=eq.${rideId}`,
            },
            () => {
              onUpdate();
            }
          )
          .subscribe();
      } catch {
        // ignore realtime errors
      }
    }

    // Reliable polling fallback (every 3 seconds) to ensure instant updates without manual refresh
    const pollInterval = setInterval(() => {
      onUpdate();
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      if (supabase && channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [rideId, token, onUpdate]);
}
