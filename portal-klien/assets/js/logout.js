/*
================================================================================
| JAVASCRIPT LOGIC FOR THE LOGOUT PAGE                                         |
| Description: Automatically logs the user out using Supabase and redirects    |
|              them to the sign-in page upon loading.                          |
| FIX: Wrapped logic in 'supabase-ready' event listener to ensure dbClient     |
|      is defined before use.                                                  |
================================================================================
*/

// Menunggu sinyal 'supabase-ready' dari supabase-client.js
document.addEventListener('supabase-ready', () => {
  
  /**
   * Performs the user logout process.
   * This function is called as soon as Supabase is ready.
   */
  async function performLogout() {
    try {
      // Display a message in the console for debugging purposes.
      console.log("Attempting to log out...");

      // Call the signOut method from the Supabase client.
      // Menggunakan window.dbClient untuk memastikan kita mendapat variabel global
      const { error } = await window.dbClient.auth.signOut();

      // If there's an error during logout, log it and show a notification.
      if (error) {
        throw error; // Pass the error to the catch block.
      }

      // onAuthStateChange di supabase-client.js akan menangani redirect secara otomatis.
      // Baris di bawah ini sebenarnya tidak diperlukan lagi, tapi kita biarkan sebagai cadangan.
      console.log("Logout successful. Redirecting via onAuthStateChange...");
      setTimeout(() => {
        window.location.href = 'sign-in.html';
      }, 1500); // 1.5-second delay before redirect.

    } catch (error) {
      // Handle any errors that occurred during the process.
      console.error("Logout failed:", error.message);
      
      // Optionally, notify the user that logout failed.
      if (window.showNotification) {
        window.showNotification("Logout failed. Please try again.", "danger");
      }

      // Redirect back to the dashboard if logout fails, as the session is likely still active.
      setTimeout(() => {
        window.location.href = 'index.html'; // Arahkan ke index jika gagal, bukan 404
      }, 2000);
    }
  }

  // Execute the logout function automatically when the page loads.
  performLogout();
});

