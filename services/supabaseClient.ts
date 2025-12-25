
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nbeevahhwvmrunmnyzak.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iZWV2YWhod3ZtcnVubW55emFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNTEwMzIsImV4cCI6MjA4MTkyNzAzMn0.2MQjNubKsDqlnbaIQeboMpATwCjJUGuJem_In1TmNbI';

// Création d'un singleton sécurisé
let instance: any = null;

export const getSupabase = () => {
  if (!instance) {
    instance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'janghup-session'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }
  return instance;
};

export const supabase = getSupabase();
