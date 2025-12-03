// ===== SUPABASE CONFIGURATION =====
console.log('🔧 Loading Supabase configuration...');

// Your Supabase Configuration
const SUPABASE_URL = 'https://armthhnachqtropqlegl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybXRoaG5hY2hxdHJvcHFsZWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MDI4NDksImV4cCI6MjA3NDI3ODg0OX0.mSNqVDB4qPu9ZVHJPKW_88k9iM4ibwYZmUzYnRRpUy0';

// Initialize Supabase Client
let supabaseClient;

try {
    if (window.supabase) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            }
        });
        console.log('✅ Supabase client initialized');
        
        // Test connection
        testConnection();
    } else {
        console.error('❌ Supabase library not loaded');
        createMockClient();
    }
} catch (error) {
    console.error('❌ Error initializing Supabase:', error);
    createMockClient();
}

// Test connection function
async function testConnection() {
    try {
        const { data, error } = await supabaseClient
            .from('leads')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.warn('⚠️ Supabase connection test failed:', error.message);
            console.log('📊 Using demo mode (mock data)');
        } else {
            console.log('✅ Supabase connected successfully');
        }
    } catch (err) {
        console.warn('⚠️ Supabase test error:', err.message);
    }
}

// Create mock client for demo mode
function createMockClient() {
    console.log('🔄 Creating mock Supabase client for demo mode');
    
    supabaseClient = {
        from: (table) => ({
            select: (columns, options) => {
                console.log(`📊 Mock select from ${table}`);
                return Promise.resolve({ 
                    data: window.demoData?.[table] || [], 
                    error: null 
                });
            },
            insert: (data) => {
                console.log(`📝 Mock insert into ${table}:`, data);
                if (window.demoData?.[table]) {
                    window.demoData[table].push({ ...data[0], id: Date.now().toString() });
                }
                return Promise.resolve({ data: null, error: null });
            },
            update: (data) => {
                console.log(`✏️ Mock update in ${table}:`, data);
                return Promise.resolve({ data: null, error: null });
            },
            delete: () => {
                console.log(`🗑️ Mock delete from ${table}`);
                return Promise.resolve({ data: null, error: null });
            }
        }),
        channel: (name) => ({
            on: () => ({ subscribe: () => ({}) })
        })
    };
}

// Demo data for mock mode
window.demoData = {
    leads: []
};

// Export to window
window.supabaseClient = supabaseClient;

console.log('✅ Configuration loaded');