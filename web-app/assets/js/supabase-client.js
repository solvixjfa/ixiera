
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/+esm';

const supabaseUrl = 'https://xtarsaurwclktwhhryas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXJzYXVyd2Nsa3R3aGhyeWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDM1ODksImV4cCI6MjA2NzM3OTU4OX0.ZAgs8NbZs8F2GuBVfiFYuyqOLrRC1hemdMyE-i4riYI';

// Buat instance klien Supabase dengan error handling
let supabaseInstance = null;

try {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
    console.log('✅ Supabase client initialized successfully');
} catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    // Fallback ke dummy client
    supabaseInstance = createFallbackClient();
}

const getSupabase = () => {
    return supabaseInstance;
};

// Fallback client jika CDN/Supabase error
function createFallbackClient() {
    console.warn('⚠️ Using fallback Supabase client');
    return {
        from: (table) => ({
            select: () => ({
                eq: () => ({
                    order: () => Promise.resolve({ data: [], error: null })
                })
            }),
            single: () => Promise.resolve({ data: null, error: new Error('Supabase unavailable') })
        }),
        auth: {
            signIn: () => Promise.resolve({ error: 'Supabase unavailable' }),
            signOut: () => Promise.resolve({ error: 'Supabase unavailable' })
        }
    };
}

export { getSupabase };