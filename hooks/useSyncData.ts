import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { invalidateCache } from '../services/storage';

export const useSyncData = (table: string, callback?: () => void) => {
    useEffect(() => {
        const channel = supabase
            .channel(`public:${table}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: table }, (payload) => {
                console.log(`Realtime update on ${table}`, payload);
                if (table === 'students') {
                    invalidateCache();
                }
                if (callback) {
                    callback();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [table, callback]);
};
