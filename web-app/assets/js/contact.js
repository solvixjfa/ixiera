import { getSupabase } from './supabase-client.js';
const supabase = getSupabase();

class ContactFormHandler {
    constructor() {
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Contact Form Handler...');
        await this.displaySelectedPackage();
        this.setupFormSubmission();
        this.setupEventListeners();
    }

    async displaySelectedPackage() {
        const urlParams = new URLSearchParams(window.location.search);
        const packageSlug = urlParams.get('package');

        console.log('🔍 Checking for package:', packageSlug);

        if (packageSlug) {
            try {
                const packageData = await this.getPackageData(packageSlug);
                if (packageData) {
                    console.log('✅ Package found:', packageData.name);
                    this.showPackageSection(packageData);
                    this.addPackageToForm(packageData);
                } else {
                    console.log('❌ Package not found');
                }
            } catch (error) {
                console.error('Error displaying package:', error);
            }
        }
    }

    async getPackageData(slug) {
        try {
            console.log('📦 Fetching package data for:', slug);
            
            // Coba dari Supabase dulu
            const { data, error } = await supabase
                .from('pricing_packages')
                .select('*')
                .eq('slug', slug)
                .single();

            if (!error && data) {
                console.log('✅ Package data from Supabase:', data.name);
                return data;
            }

            console.log('❌ Supabase error, trying cache...');

            // Fallback: coba dari cache pricing
            const cachedPricing = localStorage.getItem('ixiera_pricing_data');
            if (cachedPricing) {
                console.log('📦 Checking cache...');
                const cacheData = JSON.parse(cachedPricing);
                if (cacheData.data && Array.isArray(cacheData.data)) {
                    const packageFromCache = cacheData.data.find(pkg => pkg.slug === slug);
                    if (packageFromCache) {
                        console.log('✅ Package from cache:', packageFromCache.name);
                        return packageFromCache;
                    }
                }
            }

            console.log('❌ Package not found in cache');
            return null;

        } catch (error) {
            console.error('❌ Error getting package data:', error);
            return null;
        }
    }

    showPackageSection(packageData) {
        const section = document.getElementById('selected-package-section');
        const packageName = document.getElementById('selected-package-name');
        const packageTagline = document.getElementById('selected-package-tagline');
        const packagePrice = document.getElementById('selected-package-price');
        const packageBadge = document.getElementById('selected-package-badge');

        console.log('🎨 Rendering package section with:', packageData);

        if (section && packageData) {
            packageName.textContent = packageData.name;
            packageTagline.textContent = packageData.tagline;
            packagePrice.textContent = packageData.price_display;
            packageBadge.textContent = packageData.badge_text || 'Special Offer';
            
            section.style.display = 'block';
            
            // Scroll ke section package
            setTimeout(() => {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }

    addPackageToForm(packageData) {
        const form = document.getElementById('order-form');
        if (!form) {
            console.log('❌ Form not found');
            return;
        }

        console.log('📝 Adding package to form:', packageData.name);

        // Hapus field package yang sudah ada (jika ada)
        this.removeExistingPackageFields(form);

        // Tambahkan hidden fields untuk package
        const packageFields = [
            { name: 'selected_package', value: packageData.name },
            { name: 'package_slug', value: packageData.slug },
            { name: 'package_price', value: packageData.price_display },
            { name: 'source', value: 'pricing_page' }
        ];

        packageFields.forEach(field => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = field.name;
            input.value = field.value;
            form.appendChild(input);
        });

        // Auto-fill service type berdasarkan package
        this.autoFillServiceType(packageData);
        
        // Auto-fill project requirements dengan template
        this.autoFillProjectRequirements(packageData);
    }

    removeExistingPackageFields(form) {
        const fieldNames = ['selected_package', 'package_slug', 'package_price', 'source'];
        fieldNames.forEach(fieldName => {
            const existingField = form.querySelector(`[name="${fieldName}"]`);
            if (existingField) {
                existingField.remove();
            }
        });
    }

    autoFillServiceType(packageData) {
        const serviceTypeSelect = document.getElementById('serviceType');
        if (serviceTypeSelect && !serviceTypeSelect.value) {
            const serviceMap = {
                'starter': 'Websites & Systems',
                'growth': 'Business Automation', 
                'business': 'Business Automation',
                'enterprise': 'Growth Partnership'
            };
            
            const mappedService = serviceMap[packageData.slug];
            if (mappedService) {
                serviceTypeSelect.value = mappedService;
                console.log('✅ Auto-filled service type:', mappedService);
            }
        }
    }

    autoFillProjectRequirements(packageData) {
        const requirementsTextarea = document.getElementById('projectRequirements');
        if (requirementsTextarea && !requirementsTextarea.value.trim()) {
            const template = `I'm interested in the ${packageData.name} package - ${packageData.tagline}

Key features I need:
${this.getKeyFeatures(packageData)}

Timeline: ${packageData.timeline}
Budget: ${packageData.price_display}

Looking forward to discussing this further!`;
            
            requirementsTextarea.value = template;
            console.log('✅ Auto-filled project requirements');
        }
    }

    getKeyFeatures(packageData) {
        if (!packageData.deliverables) return '-';
        
        try {
            const features = typeof packageData.deliverables === 'string' 
                ? JSON.parse(packageData.deliverables) 
                : packageData.deliverables;
            
            return features.slice(0, 3).map(feature => `• ${feature}`).join('\n');
        } catch (error) {
            return '-';
        }
    }

    setupEventListeners() {
        // Tombol ganti package
        const changePackageBtn = document.getElementById('change-package-btn');
        if (changePackageBtn) {
            changePackageBtn.addEventListener('click', () => {
                window.location.href = 'pricing.html';
            });
        }

        // Reset package fields jika form di-reset
        const form = document.getElementById('order-form');
        if (form) {
            form.addEventListener('reset', () => {
                this.removeExistingPackageFields(form);
                const packageSection = document.getElementById('selected-package-section');
                if (packageSection) {
                    packageSection.style.display = 'none';
                }
            });
        }
    }

    setupFormSubmission() {
        const form = document.getElementById('order-form');
        if (!form) {
            console.log('❌ Form not found for submission setup');
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        const buttonText = submitButton?.querySelector('.button-text');
        const spinner = submitButton?.querySelector('.spinner-border');
        const formMessage = document.getElementById('form-message');

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!this.validateForm(form)) {
                return;
            }

            const originalButtonText = buttonText?.textContent || 'Send Project Request';
            submitButton.disabled = true;
            if (buttonText) buttonText.textContent = 'Sending...';
            if (spinner) spinner.style.display = 'inline-block';
            if (formMessage) formMessage.innerHTML = '';

            try {
                const formData = this.collectFormData(form);
                console.log('📤 Submitting form data:', formData);
                
                const result = await this.submitForm(formData);

                if (result.success) {
                    this.showSuccessMessage(formMessage);
                    form.reset();
                    this.hidePackageSection();
                } else {
                    throw new Error(result.error || 'Failed to send message');
                }

            } catch (error) {
                console.error('❌ Form submission error:', error);
                this.showErrorMessage(formMessage, error.message);
            } finally {
                submitButton.disabled = false;
                if (buttonText) buttonText.textContent = originalButtonText;
                if (spinner) spinner.style.display = 'none';
            }
        });
    }

    validateForm(form) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });

        return isValid;
    }

    collectFormData(form) {
        return {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            serviceType: document.getElementById('serviceType').value,
            projectRequirements: document.getElementById('projectRequirements').value,
            budget: document.getElementById('budget').value,
            currency: document.getElementById('currency').value,
            deadline: document.getElementById('deadline').value || null,
            // Include package data dari hidden fields
            selected_package: form.querySelector('[name="selected_package"]')?.value || null,
            package_slug: form.querySelector('[name="package_slug"]')?.value || null,
            package_price: form.querySelector('[name="package_price"]')?.value || null,
            source: form.querySelector('[name="source"]')?.value || 'contact_page'
        };
    }

    async submitForm(formData) {
        const { data, error } = await supabase.functions.invoke('submit-order', {
            body: formData,
        });

        if (error) {
            console.error('❌ Supabase function error:', error);
            throw new Error('Failed to send your message. Please try again later.');
        }

        if (data && data.error) {
            throw new Error(data.error);
        }

        return { success: true, data };
    }

   showSuccessMessage(formMessage) {
    // Dapatkan form data dari form
    const formData = {
        email: document.getElementById('email').value,
        name: document.getElementById('fullName').value
    };

    if (formMessage) {
        formMessage.innerHTML = `
            <div class="alert elegant-alert elegant-alert-success alert-dismissible fade show" role="alert">
                <strong>✅ Thank you, ${formData.name}!</strong> Your project inquiry has been submitted.
                <br><strong>You can now access your dashboard with email: ${formData.email}</strong>
            </div>
        `;
        
        // SIMPAN EMAIL UNTUK DASHBOARD
        localStorage.setItem('dashboard_email', formData.email);
        
        // TAMPILKAN LINK KE DASHBOARD (TIDAK AUTO REDIRECT)
        setTimeout(() => {
            formMessage.innerHTML += `
                <div class="alert alert-info mt-3">
                    <a href="dashboard.html" class="btn btn-dark">Go to Dashboard</a>
                    to track your project progress
                </div>
            `;
        }, 1000);
    }
}

    showErrorMessage(formMessage, message) {
        if (formMessage) {
            formMessage.innerHTML = `
                <div class="alert elegant-alert elegant-alert-danger alert-dismissible fade show" role="alert">
                    <strong>❌ Error:</strong> ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }
    }

    hidePackageSection() {
        const packageSection = document.getElementById('selected-package-section');
        if (packageSection) {
            packageSection.style.display = 'none';
        }
    }
}

// Initialize ketika DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded - Initializing contact form...');
    new ContactFormHandler();
});