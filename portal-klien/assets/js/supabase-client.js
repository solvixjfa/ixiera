/*
================================================================================
| SUPABASE CLIENT & HELPERS (FIXED VERSION)                                    |
| Description: Initializes Supabase and provides helper functions.             |
| FIX: Functions are attached to the 'window' object to make them globally     |
|      accessible and prevent 'is not defined' errors.                         |
================================================================================
*/

// 1. Supabase Configuration
// --------------------------------------------------------------
const SUPABASE_URL = "https://xtarsaurwclktwhhryas.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXJzYXVyd2Nsa3R3aGhyeWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDM1ODksImV4cCI6MjA2NzM3OTU4OX0.ZAgs8NbZs8F2GuBVfiFYuyqOLrRC1hemdMyE-i4riYI";

// 2. Initialize Supabase Client
// --------------------------------------------------------------
const { createClient } = supabase;
const dbClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 3. Helper Functions (Attached to 'window' for global access)
// --------------------------------------------------------------

/**
 * Displays a Bootstrap Notify toast message.
 * @param {string} message - The message to display.
 * @param {string} type - The type of notification (e.g., 'success', 'warning', 'danger').
 * @param {string} icon - The Font Awesome icon class (e.g., 'fa fa-check').
 */
window.showNotification = function(message, type = "success", icon = "fa fa-check") {
  $.notify(
    {
      icon: icon,
      title: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize type
      message: message,
    },
    {
      type: type,
      placement: {
        from: "top",
        align: "right",
      },
      time: 2000, // Increased time for better readability
    }
  );
}

/**
 * Shows or hides the main loading spinner overlay.
 * @param {boolean} show - True to show the spinner, false to hide it.
 */
window.toggleLoadingSpinner = function(show) {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) {
    spinner.style.display = show ? "flex" : "none";
  }
}

/**
 * A simple utility to get the current user session.
 * This is now globally accessible.
 */
window.getCurrentUser = async function() {
    const { data: { session }, error } = await dbClient.auth.getSession();
    if (error) {
        console.error("Error getting session:", error);
        return null;
    }
    if (!session) {
        console.warn("No active user session. RLS might block queries.");
    }
    return session ? session.user : null;
}


// Example of how you might handle auth state changes globally
dbClient.auth.onAuthStateChange((event, session) => {
    console.log(`Auth event: ${event}`);
    if (event === 'SIGNED_IN') {
        console.log('User signed in:', session.user.email);
        // Update username display on sign-in
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay && session.user.user_metadata.full_name) {
            usernameDisplay.textContent = session.user.user_metadata.full_name;
        }
    } else if (event === 'SIGNED_OUT') {
        console.log('User signed out.');
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = '/sign-in.html';
        }, 500);
    }
});

// Logout functionality
document.addEventListener('DOMContentLoaded', () => {
    const logoutButtons = document.querySelectorAll('#logoutButton, #logoutButtonDropdown');
    logoutButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            toggleLoadingSpinner(true);
            await dbClient.auth.signOut();
            toggleLoadingSpinner(false);
        });
    });
});


console.log("Supabase client initialized.");

