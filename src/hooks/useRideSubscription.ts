
import { useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import { useAuthSession } from '../context/AuthContext.tsx';

export function useRideSubscription(rideId: string, onUpdate: () => void) {
  const { token } = useAuthSession();

  useEffect(() => {
    if (!rideId || !token || !supabase) return;

    // Supabase Realtime with RLS requires authentication
    // The client should be initialized with the token or set via auth headers
    supabase.auth.setSession({ access_token: token, refresh_token: '' });

    const channel = supabase
      .channel(`ride-${rideId}`)
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

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [rideId, token, onUpdate]);
}
