/*
================================================================================
| SUPABASE CLIENT & HELPERS (FINAL CLEAN VERSION)                              |
| Description: Initializes the Supabase client and provides global helpers     |
|              for the entire application.                                     |
================================================================================
*/

document.addEventListener('DOMContentLoaded', () => {
    
    // Pastikan library Supabase sudah dimuat sebelum melanjutkan.
    // Ini adalah pengecekan terakhir yang tidak akan mengganggu tampilan.
    if (typeof supabase === 'undefined') {
        console.error("Supabase library not loaded. Check script order in HTML.");
        return;
    }

    // Konfigurasi dan inisialisasi klien
    const SUPABASE_URL = "https://xtarsaurwclktwhhryas.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXJzYXVyd2Nsa3R3aGhyeWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDM1ODksImV4cCI6MjA2NzM3OTU4OX0.ZAgs8NbZs8F2GuBVfiFYuyqOLrRC1hemdMyE-i4riYI";
    
    const dbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Jadikan dbClient bisa diakses secara global oleh skrip lain
    window.dbClient = dbClient;

    // --- Helper Functions Global ---
    window.showNotification = function(message, type = "success", icon = "fa fa-check") {
        if (typeof $ !== 'undefined' && $.notify) {
            $.notify({ icon: icon, title: type.charAt(0).toUpperCase() + type.slice(1), message: message }, { type: type, placement: { from: "top", align: "right" }, time: 2000 });
        }
    }

    window.toggleLoadingSpinner = function(show) {
        const spinner = document.getElementById("loadingSpinner");
        if (spinner) spinner.style.display = show ? "flex" : "none";
    }

    window.getCurrentUser = async function() {
        const { data: { session }, error } = await window.dbClient.auth.getSession();
        if (error) {
            console.error("Error getting session:", error);
            return null;
        }
        return session ? session.user : null;
    }

    // --- Auth State Listener ---
    window.dbClient.auth.onAuthStateChange((event, session) => {
        console.log(`Auth event: ${event}`);
        if (event === 'SIGNED_OUT') {
            if (!window.location.pathname.includes('sign-in.html')) {
                 window.location.href = 'sign-in.html';
            }
        }
    });

    // --- Logout Button Listener Global ---
    const logoutButtons = document.querySelectorAll('#logoutButton, #logoutButtonDropdown');
    logoutButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            window.toggleLoadingSpinner(true);
            await window.dbClient.auth.signOut();
        });
    });

    console.log("Supabase client initialized successfully.");

    // Kirim sinyal bahwa Supabase sudah siap untuk digunakan skrip lain
    document.dispatchEvent(new Event('supabase-ready'));
});

