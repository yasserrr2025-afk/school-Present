import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oidcwnszlghaaqgcrway.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZGN3bnN6bGdoYWFxZ2Nyd2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzOTM4ODEsImV4cCI6MjA4Nzk2OTg4MX0.vhdAnOGRN_RjjGkHHnMe9mxKJll4WvtXCWwjsQ78lZ0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);