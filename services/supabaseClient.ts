
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gajnkirxwkxajrfnlrwf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdham5raXJ4d2t4YWpyZm5scndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2OTAzNjEsImV4cCI6MjA4MjI2NjM2MX0.C35lgyVwdoa1fVuNlQ8ekb86Y6WwDG2FPDMnv3IrGzs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
