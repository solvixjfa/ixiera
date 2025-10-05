import { getSupabase } from './supabase-client.js';

class DynamicPricing {
    constructor() {
        this.CACHE_KEYS = {
            PRICING_DATA: 'ixiera_pricing_data',
            CACHE_TIMESTAMP: 'ixiera_pricing_timestamp'
        };
        this.CACHE_DURATION = 30 * 60 * 1000; // 30 menit cache
        this.supabase = null;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Dynamic Pricing...');
        await this.initializeSupabase();
        
        // CLEAR CACHE DULU - ini solusi utama
        this.clearCache();
        
        await this.loadPricingData();
        this.hideLoading();
    }

    async initializeSupabase() {
        try {
            if (typeof getSupabase === 'function') {
                this.supabase = getSupabase();
                console.log('✅ Supabase connected for pricing');
            } else {
                console.warn('⚠️ getSupabase function not found, using fallback data');
            }
        } catch (error) {
            console.error('❌ Supabase connection failed:', error);
        }
    }

    async loadPricingData() {
        // Priority 1: Coba dari Supabase DULU, baru cache
        try {
            if (!this.supabase) {
                throw new Error('No Supabase connection');
            }

            console.log('🌐 Fetching FRESH data from Supabase...');
            const { data: packages, error } = await this.supabase
                .from('pricing_packages')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) {
                console.error('❌ Supabase query error:', error);
                throw error;
            }
            
            if (packages && packages.length > 0) {
                console.log(`✅ Loaded ${packages.length} packages from Supabase:`, 
                    packages.map(p => p.name));
                
                // Simpan ke cache untuk next time
                this.cachePricing(packages);
                this.renderPricing(packages);
                return;
            } else {
                console.warn('⚠️ No packages found in Supabase');
                throw new Error('No packages found');
            }

        } catch (error) {
            console.error('❌ Failed to load from Supabase:', error);
            
            // Priority 2: Cek cache sebagai fallback
            const cachedData = this.getCachedPricing();
            if (cachedData) {
                console.log('📦 Using cached pricing data as fallback');
                this.renderPricing(cachedData);
            } else {
                // Priority 3: Fallback ke data lokal
                console.log('🔄 Using hardcoded fallback data');
                this.renderFallbackPricing();
            }
        }
    }

    // TAMBAHKAN FUNCTION CLEAR CACHE
    clearCache() {
        try {
            localStorage.removeItem(this.CACHE_KEYS.PRICING_DATA);
            console.log('🗑️ Cache cleared successfully');
        } catch (error) {
            console.log('⚠️ Cache clear failed:', error);
        }
    }

    // Cache Management dengan error handling
    cachePricing(data) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                source: 'supabase'
            };
            localStorage.setItem(this.CACHE_KEYS.PRICING_DATA, JSON.stringify(cacheData));
            console.log('💾 Pricing data cached successfully');
        } catch (error) {
            console.warn('⚠️ Failed to cache pricing data (localStorage may be disabled):', error);
            // Continue without caching
        }
    }

    getCachedPricing() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEYS.PRICING_DATA);
            if (!cached) {
                console.log('📭 No cached pricing data found');
                return null;
            }

            const cacheData = JSON.parse(cached);
            const isExpired = Date.now() - cacheData.timestamp > this.CACHE_DURATION;

            if (isExpired) {
                console.log('🕒 Cached pricing data expired');
                localStorage.removeItem(this.CACHE_KEYS.PRICING_DATA);
                return null;
            }

            console.log('🎯 Using valid cached pricing data');
            return cacheData.data;
        } catch (error) {
            console.warn('⚠️ Error reading cache, clearing corrupted data:', error);
            // Clear corrupted cache
            try {
                localStorage.removeItem(this.CACHE_KEYS.PRICING_DATA);
            } catch (e) {
                // Ignore cleanup errors
            }
            return null;
        }
    }

    renderPricing(packages) {
        const container = document.getElementById('pricing-container');
        if (!container) {
            console.error('❌ Pricing container not found in DOM');
            this.renderFallbackPricing();
            return;
        }

        console.log('🎨 Rendering pricing cards:', packages.length, 'packages');
        
        let html = '';
        
        packages.forEach((pkg, index) => {
            const badge = pkg.badge_text ? 
                `<div class="popular-badge">${pkg.badge_text}</div>` : '';
            
            const featuredClass = pkg.most_popular ? 'featured' : '';
            
            const priceHtml = this.renderPriceDisplay(pkg);
            const highlightsHtml = this.renderHighlights(pkg);
            const featuresHtml = this.renderFeatures(pkg);

            html += `
                <div class="col-lg-3 col-md-6 mb-4" data-aos="fade-up" data-aos-delay="${index * 100}">
                    <div class="pricing-card ${featuredClass}">
                        ${badge}
                        
                        <div class="pricing-header">
                            <div class="pricing-name">${this.escapeHtml(pkg.name)}</div>
                            <div class="pricing-tagline">${this.escapeHtml(pkg.tagline)}</div>
                        </div>

                        <div class="pricing-display">
                            ${priceHtml}
                        </div>

                        <div class="pricing-highlights">
                            ${highlightsHtml}
                        </div>

                        <div class="pricing-features">
                            <ul class="features-list">
                                ${featuresHtml}
                            </ul>
                        </div>

                        <div class="pricing-actions">
                            <button class="btn-detail" onclick="dynamicPricing.showPackageDetail('${pkg.slug}')">
                                Lihat Detail Lengkap
                            </button>
                            <a href="contact.html?package=${pkg.slug}" class="btn-primary">
                                ${pkg.base_price > 0 ? 'Pilih Paket' : 'Konsultasi Gratis'}
                            </a>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        
        // Re-initialize AOS untuk animasi
        if (typeof AOS !== 'undefined') {
            AOS.refresh();
        }
        
        console.log('✅ Pricing rendered successfully');
    }

    renderPriceDisplay(pkg) {
        // Handle berbagai format harga
        if (pkg.is_discounted && pkg.base_price > 0) {
            return `
                <div class="pricing-amount">${this.escapeHtml(pkg.price_display)}</div>
                ${pkg.price_range ? `<div class="pricing-range">${this.escapeHtml(pkg.price_range)}</div>` : ''}
                <div class="pricing-discount">
                    <span class="original-price">${this.formatPrice(pkg.base_price)}</span>
                    <span class="discount-tag">Hemat ${this.calculateDiscount(pkg.base_price, pkg.discounted_price)}%</span>
                </div>
            `;
        } else {
            return `
                <div class="pricing-amount">${this.escapeHtml(pkg.price_display)}</div>
                ${pkg.price_range ? `<div class="pricing-range">${this.escapeHtml(pkg.price_range)}</div>` : ''}
            `;
        }
    }

    renderHighlights(pkg) {
        return `
            <div class="highlight-item">
                <div class="highlight-icon">
                    <i class="bi bi-clock"></i>
                </div>
                <span>${this.escapeHtml(pkg.timeline)}</span>
            </div>
            <div class="highlight-item">
                <div class="highlight-icon">
                    <i class="bi bi-headset"></i>
                </div>
                <span>${this.escapeHtml(pkg.support_duration)}</span>
            </div>
            <div class="highlight-item">
                <div class="highlight-icon">
                    <i class="bi bi-pencil"></i>
                </div>
                <span>${this.escapeHtml(pkg.revision_count)}</span>
            </div>
        `;
    }

    renderFeatures(pkg) {
        // Parse deliverables dengan error handling
        let features = [];
        try {
            if (typeof pkg.deliverables === 'string') {
                features = JSON.parse(pkg.deliverables);
            } else if (Array.isArray(pkg.deliverables)) {
                features = pkg.deliverables;
            } else {
                console.warn('Invalid deliverables format for package:', pkg.slug);
                features = ['Fitur tidak tersedia'];
            }
        } catch (error) {
            console.error('Error parsing deliverables:', error);
            features = ['Error loading features'];
        }

        const visibleFeatures = features.slice(0, 4);
        const remainingCount = features.length - 4;

        let featuresHtml = visibleFeatures.map(feature => `
            <li class="feature-item">
                <i class="bi bi-check-circle feature-icon"></i>
                <span>${this.escapeHtml(feature)}</span>
            </li>
        `).join('');

        if (remainingCount > 0) {
            featuresHtml += `
                <li class="feature-item">
                    <i class="bi bi-plus-circle feature-icon"></i>
                    <span class="more-features" onclick="dynamicPricing.showPackageDetail('${pkg.slug}')">
                        ${remainingCount} fitur lainnya
                    </span>
                </li>
            `;
        }

        return featuresHtml;
    }

    async showPackageDetail(slug) {
        try {
            // Coba dari cache dulu
            const cachedData = this.getCachedPricing();
            let pkg = null;
            
            if (cachedData) {
                pkg = cachedData.find(p => p.slug === slug);
            }

            // Kalau tidak ada di cache, load dari Supabase
            if (!pkg && this.supabase) {
                console.log(`🔍 Loading details for package: ${slug}`);
                const { data, error } = await this.supabase
                    .from('pricing_packages')
                    .select('*')
                    .eq('slug', slug)
                    .single();

                if (error) throw error;
                pkg = data;
            }

            if (pkg) {
                this.showDetailModal(pkg);
            } else {
                throw new Error('Package not found in cache or database');
            }

        } catch (error) {
            console.error('Error loading package detail:', error);
            // Fallback: redirect ke contact page
            window.location.href = `contact.html?package=${slug}`;
        }
    }

    showDetailModal(pkg) {
        // Parse deliverables untuk modal
        let features = [];
        try {
            if (typeof pkg.deliverables === 'string') {
                features = JSON.parse(pkg.deliverables);
            } else if (Array.isArray(pkg.deliverables)) {
                features = pkg.deliverables;
            }
        } catch (error) {
            features = ['Error loading features'];
        }

        const modalHtml = `
            <div class="modal fade pricing-modal" id="packageDetailModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${this.escapeHtml(pkg.name)} - ${this.escapeHtml(pkg.tagline)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="text-center mb-4">
                                <div class="pricing-amount">${this.escapeHtml(pkg.price_display)}</div>
                                ${pkg.price_range ? `<div class="pricing-range">${this.escapeHtml(pkg.price_range)}</div>` : ''}
                            </div>
                            
                            <div class="row mb-4">
                                <div class="col-md-6 mb-3">
                                    <strong><i class="bi bi-clock me-2"></i>Timeline:</strong><br>
                                    <span class="text-muted">${this.escapeHtml(pkg.timeline)}</span>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <strong><i class="bi bi-headset me-2"></i>Support:</strong><br>
                                    <span class="text-muted">${this.escapeHtml(pkg.support_duration)}</span>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <strong><i class="bi bi-pencil me-2"></i>Revisi:</strong><br>
                                    <span class="text-muted">${this.escapeHtml(pkg.revision_count)}</span>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <strong><i class="bi bi-people me-2"></i>Cocok Untuk:</strong><br>
                                    <span class="text-muted">${this.escapeHtml(pkg.target_audience || 'Semua bisnis')}</span>
                                </div>
                            </div>

                            <h6 class="mb-3">Yang Termasuk dalam Paket:</h6>
                            <ul class="features-list">
                                ${features.map(feature => `
                                    <li class="feature-item">
                                        <i class="bi bi-check-circle feature-icon"></i>
                                        <span>${this.escapeHtml(feature)}</span>
                                    </li>
                                `).join('')}
                            </ul>

                            ${pkg.process_description ? `
                                <div class="mt-4">
                                    <h6 class="mb-3">Proses Pengerjaan:</h6>
                                    <p class="text-muted">${this.escapeHtml(pkg.process_description)}</p>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
                            <a href="contact.html?package=${pkg.slug}" class="btn btn-primary">
                                ${pkg.base_price > 0 ? 'Pilih Paket Ini' : 'Konsultasi Gratis'}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('packageDetailModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('packageDetailModal'));
        modal.show();
    }

    // Utility functions
    formatPrice(price) {
        if (price === 0) return 'Custom';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(price);
    }

    calculateDiscount(original, discounted) {
        if (original === 0 || discounted === 0) return 0;
        return Math.round(((original - discounted) / original) * 100);
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    hideLoading() {
        const loading = document.getElementById('pricing-loading');
        if (loading) {
            loading.style.display = 'none';
            console.log('👋 Loading indicator hidden');
        }
    }

    renderFallbackPricing() {
        console.log('🔄 Rendering fallback pricing data');
        
        const container = document.getElementById('pricing-container');
        if (!container) {
            console.error('❌ Cannot render fallback - container not found');
            return;
        }

        // Comprehensive fallback data
        const fallbackPackages = [
            {
                name: 'STARTER',
                slug: 'starter',
                tagline: 'Website Profesional untuk Mulai Online',
                price_display: 'Rp 1.200.000',
                timeline: '3-5 hari kerja',
                support_duration: '14 hari support',
                revision_count: '1x revisi minor',
                deliverables: [
                    'Landing page profesional (1-3 section)',
                    'Mobile responsive design',
                    'Formulir kontak + WhatsApp',
                    'Domain .com (tahun pertama)',
                    'Hosting + SSL gratis',
                    'Optimasi kecepatan loading',
                    '1x revisi design minor',
                    'Support 14 hari setelah launch'
                ],
                base_price: 1500000,
                discounted_price: 1200000,
                is_discounted: true,
                badge_text: 'Early Bird'
            },
            {
                name: 'GROWTH',
                slug: 'growth',
                tagline: 'Website + Otomasi untuk Bisnis Berkembang',
                price_display: 'Rp 4.500.000',
                timeline: '10-14 hari kerja',
                support_duration: '30 hari support',
                revision_count: '2x revisi',
                deliverables: [
                    'Semua fitur STARTER',
                    'Website multi-halaman (5-8 page)',
                    'Blog/Portfolio dinamis',
                    'Otomasi formulir multi-channel',
                    'Email profesional',
                    'Google Analytics setup',
                    'SEO basic optimization',
                    'Training penggunaan 30 menit'
                ],
                base_price: 4500000,
                discounted_price: 4500000,
                is_discounted: false,
                most_popular: true,
                badge_text: 'PALING POPULER'
            },
            {
                name: 'BUSINESS',
                slug: 'business',
                tagline: 'Solusi Custom untuk Scale Up',
                price_display: 'Custom Pricing',
                price_range: 'Rp 8-25 juta',
                timeline: '3-6 minggu',
                support_duration: '60 hari support',
                revision_count: 'Unlimited revisi scope',
                deliverables: [
                    'E-commerce system lengkap',
                    'Client portal multi-user',
                    'Workflow automation custom',
                    'Integrasi payment gateway',
                    'Dashboard admin advanced',
                    'CRM pipeline automation',
                    'Multi-platform integration',
                    'Dedicated project manager'
                ],
                base_price: 0,
                discounted_price: 0,
                is_discounted: false,
                badge_text: 'Custom Solution'
            },
            {
                name: 'ENTERPRISE',
                slug: 'enterprise',
                tagline: 'Solusi Custom untuk Perusahaan',
                price_display: 'Custom Pricing',
                price_range: 'Mulai Rp 30 juta',
                timeline: '2-4 bulan',
                support_duration: 'SLA-based',
                revision_count: 'Unlimited revisi',
                deliverables: [
                    'Custom development dari nol',
                    'Integrasi sistem existing',
                    'API development custom',
                    'Multi-tier architecture',
                    'Security audit & compliance',
                    'Dedicated support team',
                    'SLA agreement',
                    'Maintenance package'
                ],
                base_price: 0,
                discounted_price: 0,
                is_discounted: false,
                badge_text: 'Enterprise Grade'
            }
        ];

        this.renderPricing(fallbackPackages);
        this.hideLoading();
        
        // Cache fallback data untuk prevent repeated API calls
        try {
            this.cachePricing(fallbackPackages);
        } catch (error) {
            // Ignore cache errors for fallback
        }
    }
}

// Robust initialization dengan comprehensive error handling
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Content Loaded - Initializing pricing...');
    
    try {
        window.dynamicPricing = new DynamicPricing();
    } catch (error) {
        console.error('💥 Critical error initializing DynamicPricing:', error);
        
        const container = document.getElementById('pricing-container');
        const loading = document.getElementById('pricing-loading');
        
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle display-4 mb-3 d-block"></i>
                        <h5>Terjadi Kesalahan Sistem</h5>
                        <p class="mb-3">Maaf, kami sedang mengalami gangguan teknis. Silakan hubungi kami langsung untuk informasi pricing.</p>
                        <div class="d-flex gap-2 justify-content-center flex-wrap">
                            <a href="contact.html" class="btn btn-primary">
                                <i class="bi bi-envelope"></i> Hubungi Kami
                            </a>
                            <a href="https://wa.me/6285702373412" class="btn btn-success" target="_blank">
                                <i class="bi bi-whatsapp"></i> WhatsApp
                            </a>
                            <button onclick="location.reload()" class="btn btn-outline-primary">
                                <i class="bi bi-arrow-clockwise"></i> Refresh
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (loading) loading.style.display = 'none';
    }
});

// Export untuk testing/development
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicPricing;
}