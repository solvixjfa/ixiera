import { supabase } from './shared.js';

// === PASSWORD TOGGLE FUNCTION ===
function setupPasswordToggle() {
  const passwordInput = document.getElementById('password');
  const toggleButton = document.getElementById('password-toggle');
  
  if (!passwordInput || !toggleButton) return;

  toggleButton.addEventListener('click', function() {
    // Toggle password visibility
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Update icon
    const icon = this.querySelector('i');
    if (type === 'text') {
      icon.setAttribute('data-feather', 'eye-off');
    } else {
      icon.setAttribute('data-feather', 'eye');
    }
    
    // Refresh feather icons
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  });
}

// === LOGIN HANDLER ===
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (!form) return;

  // ✅ Setup password toggle
  setupPasswordToggle();

  // ✅ AUTO-FILL EMAIL & PASSWORD DARI LOCALSTORAGE
  const savedEmail = localStorage.getItem('saved_email');
  const savedPassword = localStorage.getItem('saved_password');
  
  if (savedEmail) {
    document.getElementById('email').value = savedEmail;
  }
  if (savedPassword) {
    document.getElementById('password').value = savedPassword;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    // ✅ SIMPAN EMAIL & PASSWORD UNTUK NEXT TIME
    localStorage.setItem('saved_email', email);
    localStorage.setItem('saved_password', password);

    // 🔐 Login ke Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert('❌ Login gagal: ' + error.message);
      return;
    }

    // ✅ Redirect ke index.html setelah login sukses
    window.location.href = 'index.html';
  });

  // ✅ Refresh feather icons setelah DOM loaded
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
});

// === CEK SESSION (untuk halaman internal) ===
export async function checkAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (!session || error) {
    window.location.href = 'login.html';
    return null;
  }

  // Optional: validasi admin jika diperlukan
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', session.user.email)
    .single();

  if (adminError || !adminUser) {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
    return null;
  }

  return { session, adminUser };
}

// === LOGOUT ===
export async function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      // ✅ HAPUS SAVED CREDENTIALS SAAT LOGOUT
      localStorage.removeItem('saved_email');
      localStorage.removeItem('saved_password');
      await supabase.auth.signOut();
      window.location.href = 'login.html';
    });
  }
}

export function updateUserInfo(user) {
  const userNameEl = document.getElementById('user-name');
  const userRoleEl = document.getElementById('user-role');
  
  if (userNameEl) userNameEl.textContent = user.email || 'CEO';
  if (userRoleEl) userRoleEl.textContent = 'CEO';
}