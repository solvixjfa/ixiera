import { getSupabase } from './supabase-client.js';

class AuthHandler {
    constructor() {
        this.supabase = getSupabase();
        this.currentForm = 'login';
        this.init();
    }

    init() {
        this.setupFormToggles();
        this.setupFormSubmissions();
        this.setupEventListeners();
        this.initializeAnimations();
        this.setupGoogleLogin();
    }

    initializeAnimations() {
        if (typeof AOS !== 'undefined' && !AOS.initialized) {
            AOS.init({
                duration: 800,
                easing: 'ease-in-out',
                once: true,
                mirror: false
            });
        }
        console.log('🎯 Auth Handler Initialized');
    }

    setupFormToggles() {
        const loginToggle = document.getElementById('login-toggle');
        const registerToggle = document.getElementById('register-toggle');
        const loginForm = document.getElementById('login-form-container');
        const registerForm = document.getElementById('register-form-container');

        if (loginToggle && registerToggle) {
            loginToggle.addEventListener('click', () => {
                this.currentForm = 'login';
                loginToggle.classList.add('active');
                registerToggle.classList.remove('active');
                if (loginForm) loginForm.classList.remove('d-none');
                if (registerForm) registerForm.classList.add('d-none');
            });

            registerToggle.addEventListener('click', () => {
                this.currentForm = 'register';
                registerToggle.classList.add('active');
                loginToggle.classList.remove('active');
                if (registerForm) registerForm.classList.remove('d-none');
                if (loginForm) loginForm.classList.add('d-none');
            });
        }
    }

    setupFormSubmissions() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegister();
            });
        }
    }

    setupEventListeners() {
        const forgotPassword = document.getElementById('forgot-password');
        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleForgotPassword();
            });
        }
    }

    setupGoogleLogin() {
        const googleLoginBtn = document.getElementById('google-login');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', async () => {
                await this.handleGoogleLogin();
            });
        }
    }

    async handleGoogleLogin() {
        const googleBtn = document.getElementById('google-login');
        const googleSpinner = document.getElementById('google-spinner');
        
        if (!googleBtn) {
            console.error('Google login button not found');
            return;
        }

        console.log('🚀 Starting Google OAuth...');

        googleBtn.disabled = true;
        if (googleSpinner) {
            googleSpinner.classList.remove('d-none');
        }
        googleBtn.style.opacity = '0.7';

        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth-callback.html`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent'
                    }
                }
            });

            if (error) {
                console.error('❌ Supabase OAuth error:', error);
                throw error;
            }

            console.log('✅ OAuth initiated successfully:', data);

        } catch (error) {
            console.error('❌ Google login failed:', error);
            
            const messageDiv = document.getElementById('login-message');
            if (messageDiv) {
                this.showMessage(messageDiv, 'Gagal login dengan Google. Silakan coba lagi.', 'error');
            }
            
            googleBtn.disabled = false;
            if (googleSpinner) {
                googleSpinner.classList.add('d-none');
            }
            googleBtn.style.opacity = '1';
        }
    }

    async handleOAuthCallback() {
        console.log('🔄 Handling OAuth callback...');
        
        try {
            const { data, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('❌ Session error:', error);
                throw error;
            }

            if (data.session) {
                console.log('✅ User authenticated:', data.session.user);
                
                await this.createOrUpdateUserProfile(data.session.user);
                
                console.log('🔄 Redirecting to dashboard...');
                window.location.href = 'dashboard.html';
            } else {
                console.error('❌ No session found');
                window.location.href = 'login.html?error=no_session';
            }
        } catch (error) {
            console.error('❌ OAuth callback error:', error);
            window.location.href = 'login.html?error=auth_failed';
        }
    }

    async createOrUpdateUserProfile(user) {
        try {
            const { data: existingProfile, error: fetchError } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('Error fetching profile:', fetchError);
                return;
            }

            if (!existingProfile) {
                const { error: insertError } = await this.supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                        email: user.email,
                        avatar_url: user.user_metadata?.avatar_url,
                        email_verified: true,
                        signup_method: 'google',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (insertError) {
                    console.error('Error creating profile:', insertError);
                } else {
                    console.log('✅ User profile created');
                }
            } else {
                console.log('✅ User profile already exists');
            }
        } catch (error) {
            console.error('Error in createOrUpdateUserProfile:', error);
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;
        const loginBtn = document.querySelector('#login-form button[type="submit"]');
        const loginText = document.getElementById('login-text');
        const spinner = document.getElementById('login-spinner');
        const messageDiv = document.getElementById('login-message');

        if (!email || !password) {
            this.showMessage(messageDiv, 'Email dan password harus diisi', 'error');
            return;
        }

        if (!loginBtn || !loginText || !spinner) {
            console.error('Login elements not found');
            return;
        }

        loginBtn.disabled = true;
        loginText.textContent = 'Memproses...';
        spinner.classList.remove('d-none');

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            this.showMessage(messageDiv, 'Login berhasil! Mengarahkan ke dashboard...', 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);

        } catch (error) {
            console.error('Login error:', error);
            this.showMessage(messageDiv, 'Email atau password salah', 'error');
        } finally {
            loginBtn.disabled = false;
            loginText.textContent = 'Masuk ke Dashboard';
            spinner.classList.add('d-none');
        }
    }

    async handleRegister() {
        const name = document.getElementById('register-name')?.value;
        const email = document.getElementById('register-email')?.value;
        const password = document.getElementById('register-password')?.value;
        const confirmPassword = document.getElementById('register-confirm-password')?.value;
        const registerBtn = document.querySelector('#register-form button[type="submit"]');
        const registerText = document.getElementById('register-text');
        const spinner = document.getElementById('register-spinner');
        const messageDiv = document.getElementById('register-message');

        if (!name || !email || !password || !confirmPassword) {
            this.showMessage(messageDiv, 'Semua field harus diisi', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage(messageDiv, 'Password dan konfirmasi password tidak cocok', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage(messageDiv, 'Password minimal 6 karakter', 'error');
            return;
        }

        if (!registerBtn || !registerText || !spinner) {
            console.error('Register elements not found');
            return;
        }

        registerBtn.disabled = true;
        registerText.textContent = 'Mendaftarkan...';
        spinner.classList.remove('d-none');

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    emailRedirectTo: null,
                    data: {
                        full_name: name,
                        email_verified: true,
                        signup_method: 'direct'
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                await this.createUserProfile(data.user.id, name, email);
            }

            this.showSuccessAnimation(messageDiv, 'Pendaftaran berhasil! Anda akan diarahkan...');

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);

        } catch (error) {
            console.error('Register error:', error);
            this.showMessage(messageDiv, 'Gagal mendaftar. Email mungkin sudah digunakan', 'error');
        } finally {
            registerBtn.disabled = false;
            registerText.textContent = 'Daftar Sekarang';
            spinner.classList.add('d-none');
        }
    }

    async createUserProfile(userId, name, email) {
        const { error } = await this.supabase
            .from('profiles')
            .upsert({
                id: userId,
                full_name: name,
                email: email,
                email_verified: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('Profile creation error:', error);
        }
    }

    handleForgotPassword() {
        const emailInput = document.getElementById('login-email');
        const email = emailInput ? emailInput.value : '';
        const message = `Halo Ixiera, saya lupa password untuk email: ${email}`;
        window.open(`https://wa.me/6285702373412?text=${encodeURIComponent(message)}`, '_blank');
    }

    showMessage(messageDiv, message, type) {
        if (!messageDiv) return;
        
        const bgColor = type === 'success' ? 'alert-success' : 'alert-danger';
        messageDiv.innerHTML = `
            <div class="alert ${bgColor} alert-dismissible fade show">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }

    showSuccessAnimation(messageDiv, message) {
        if (!messageDiv) return;
        
        messageDiv.innerHTML = `
            <div class="success-animation">
                <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                    <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
                <p class="mt-3 fw-semibold">${message}</p>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const authHandler = new AuthHandler();
    
    if (window.location.pathname.includes('auth-callback.html')) {
        console.log('🔄 Detected auth callback page');
        authHandler.handleOAuthCallback();
    }
});

export default AuthHandler;