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
    }

    initializeAnimations() {
        // Initialize AOS jika belum di-init oleh main.js
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

        loginToggle.addEventListener('click', () => {
            this.currentForm = 'login';
            loginToggle.classList.add('active');
            registerToggle.classList.remove('active');
            loginForm.classList.remove('d-none');
            registerForm.classList.add('d-none');
        });

        registerToggle.addEventListener('click', () => {
            this.currentForm = 'register';
            registerToggle.classList.add('active');
            loginToggle.classList.remove('active');
            registerForm.classList.remove('d-none');
            loginForm.classList.add('d-none');
        });
    }

    setupFormSubmissions() {
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });
    }

    setupEventListeners() {
        document.getElementById('forgot-password').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const loginBtn = document.querySelector('#login-form button[type="submit"]');
        const loginText = document.getElementById('login-text');
        const spinner = document.getElementById('login-spinner');
        const messageDiv = document.getElementById('login-message');

        if (!email || !password) {
            this.showMessage(messageDiv, 'Email dan password harus diisi', 'error');
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
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const registerBtn = document.querySelector('#register-form button[type="submit"]');
        const registerText = document.getElementById('register-text');
        const spinner = document.getElementById('register-spinner');
        const messageDiv = document.getElementById('register-message');

        // Validation
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

        registerBtn.disabled = true;
        registerText.textContent = 'Mendaftarkan...';
        spinner.classList.remove('d-none');

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    // NO email verification untuk hemat quota
                    emailRedirectTo: null,
                    data: {
                        full_name: name,
                        email_verified: true, // Auto-verify
                        signup_method: 'direct'
                    }
                }
            });

            if (error) throw error;

            // Auto-create user profile
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
        const email = document.getElementById('login-email').value || '';
        const message = `Halo Ixiera, saya lupa password untuk email: ${email}`;
        window.open(`https://wa.me/6285702373412?text=${encodeURIComponent(message)}`, '_blank');
    }

    showMessage(messageDiv, message, type) {
        const bgColor = type === 'success' ? 'alert-success' : 'alert-danger';
        messageDiv.innerHTML = `
            <div class="alert ${bgColor} alert-dismissible fade show">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }

    showSuccessAnimation(messageDiv, message) {
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

// Initialize setelah DOM dan main.js loaded
document.addEventListener('DOMContentLoaded', () => {
    // Tunggu sedikit untuk memastikan main.js sudah loaded
    setTimeout(() => {
        new AuthHandler();
    }, 100);
});